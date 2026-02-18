from flask import Blueprint, jsonify, request
from app import db
from app.models.game_text import GameText

bp = Blueprint('texts', __name__)


@bp.route('', methods=['GET'])
def get_texts():
    """Get all texts, optionally filtered by section"""
    section = request.args.get('section')

    query = GameText.query
    if section:
        query = query.filter_by(section=section)

    texts = query.all()
    result = {t.key: t.value for t in texts}
    return jsonify(result)
