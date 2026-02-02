from flask_admin.contrib.sqla import ModelView
from flask_login import current_user
from flask import redirect, url_for
from markupsafe import Markup
from wtforms import TextAreaField
from wtforms.widgets import TextArea
import json


class SecureModelView(ModelView):
    """Base view with authentication"""

    page_size = 25
    can_export = True
    export_types = ['csv', 'json']

    def is_accessible(self):
        return current_user.is_authenticated

    def inaccessible_callback(self, name, **kwargs):
        return redirect(url_for('admin_auth.login'))


class UserModelView(SecureModelView):
    """View for managing game users"""
    column_list = ['id', 'username', 'email', 'is_verified', 'verification_code', 'total_score', 'created_at']
    column_searchable_list = ['username', 'email']
    column_filters = ['is_verified', 'created_at', 'total_score']
    column_sortable_list = ['id', 'username', 'total_score', 'created_at']
    column_default_sort = ('created_at', True)

    can_create = False
    can_delete = True

    form_columns = ['username', 'email', 'is_verified', 'total_score', 'verification_code']

    column_labels = {
        'id': 'ID',
        'username': 'Имя',
        'email': 'Email',
        'is_verified': 'Подтверждён',
        'verification_code': 'Код',
        'total_score': 'Очки',
        'created_at': 'Регистрация'
    }

    def _format_verified(view, context, model, name):
        if model.is_verified:
            return Markup('<span class="badge badge-success">Да</span>')
        return Markup('<span class="badge badge-warning">Нет</span>')

    def _format_code(view, context, model, name):
        if model.verification_code:
            return Markup(f'<code style="background:#f1f5f9;padding:2px 8px;border-radius:4px;">{model.verification_code}</code>')
        return Markup('<span class="text-muted">—</span>')

    column_formatters = {
        'is_verified': _format_verified,
        'verification_code': _format_code
    }


class JSONTextAreaWidget(TextArea):
    pass


class JSONField(TextAreaField):
    widget = JSONTextAreaWidget()

    def _value(self):
        if self.data:
            return json.dumps(self.data, indent=2, ensure_ascii=False)
        return ''

    def process_formdata(self, valuelist):
        if valuelist:
            try:
                self.data = json.loads(valuelist[0])
            except json.JSONDecodeError:
                self.data = {}


class LevelModelView(SecureModelView):
    """View for managing game levels"""
    column_list = ['id', 'name', 'order', 'grid_width', 'grid_height', 'max_moves', 'is_active']
    column_searchable_list = ['name']
    column_filters = ['is_active', 'grid_width', 'grid_height']
    column_sortable_list = ['id', 'name', 'order', 'grid_width', 'grid_height', 'max_moves']
    column_default_sort = 'order'

    can_create = False  # Use level editor instead

    form_columns = ['name', 'order', 'grid_width', 'grid_height', 'max_moves', 'is_active']

    column_labels = {
        'id': 'ID',
        'name': 'Название',
        'order': 'Порядок',
        'grid_width': 'Ширина',
        'grid_height': 'Высота',
        'max_moves': 'Ходы',
        'is_active': 'Активен'
    }


class UserProgressView(SecureModelView):
    """View for user progress"""
    column_list = ['id', 'user', 'level', 'best_score', 'stars', 'attempts_count', 'completed_at']
    column_filters = ['stars', 'completed_at']
    column_sortable_list = ['id', 'best_score', 'stars', 'attempts_count', 'completed_at']
    column_default_sort = ('completed_at', True)

    can_create = False
    can_edit = False
    can_delete = False

    column_labels = {
        'id': 'ID',
        'user': 'Пользователь',
        'level': 'Уровень',
        'best_score': 'Лучший счёт',
        'stars': 'Звёзды',
        'attempts_count': 'Попытки',
        'completed_at': 'Завершён'
    }


class GameSessionView(SecureModelView):
    """View for game sessions"""
    column_list = ['id', 'user', 'level', 'score', 'moves_used', 'is_won', 'duration_seconds', 'created_at']
    column_filters = ['is_won', 'is_completed', 'created_at']
    column_sortable_list = ['id', 'score', 'moves_used', 'duration_seconds', 'created_at']
    column_default_sort = ('created_at', True)

    can_create = False
    can_edit = False
    can_delete = False

    column_labels = {
        'id': 'ID',
        'user': 'Пользователь',
        'level': 'Уровень',
        'score': 'Очки',
        'moves_used': 'Ходов',
        'is_won': 'Победа',
        'duration_seconds': 'Время (сек)',
        'created_at': 'Дата'
    }


class UserActivityView(SecureModelView):
    """View for user activity analytics"""
    column_list = ['id', 'user', 'action', 'ip_address', 'created_at']
    column_searchable_list = ['action', 'ip_address']
    column_filters = ['action', 'created_at']
    column_sortable_list = ['id', 'action', 'created_at']
    column_default_sort = ('created_at', True)

    can_create = False
    can_edit = False
    can_delete = False

    column_labels = {
        'id': 'ID',
        'user': 'Пользователь',
        'action': 'Действие',
        'ip_address': 'IP',
        'created_at': 'Дата'
    }


class AdminUserView(SecureModelView):
    """View for managing admin users"""
    column_list = ['id', 'username', 'is_active', 'created_at']
    column_searchable_list = ['username']
    column_filters = ['is_active']

    form_columns = ['username', 'is_active']

    column_labels = {
        'id': 'ID',
        'username': 'Логин',
        'is_active': 'Активен',
        'created_at': 'Создан'
    }

    def on_model_change(self, form, model, is_created):
        if is_created:
            model.set_password('changeme')
