from flask import Blueprint, render_template_string, redirect, url_for, request, flash
from flask_login import login_required
from app import db
from app.models import Level

bp = Blueprint('level_editor', __name__)

LEVEL_EDITOR_TEMPLATE = '''
<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Конструктор уровней - ROSTIC'S Admin</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
    <link href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.0/font/bootstrap-icons.css" rel="stylesheet">
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
    <style>
        :root {
            --primary: #6366f1;
            --primary-dark: #4f46e5;
            --success: #10b981;
            --warning: #f59e0b;
            --danger: #ef4444;
            --info: #06b6d4;
            --dark: #1e293b;
            --light: #f8fafc;
        }

        * { font-family: 'Inter', sans-serif; }
        body { background: var(--light); min-height: 100vh; }

        .sidebar {
            width: 260px;
            background: var(--dark);
            min-height: 100vh;
            position: fixed;
            left: 0;
            top: 0;
            padding: 1.5rem;
        }

        .sidebar-brand {
            color: white;
            font-size: 1.25rem;
            font-weight: 700;
            display: flex;
            align-items: center;
            gap: 0.75rem;
            padding-bottom: 1.5rem;
            border-bottom: 1px solid rgba(255,255,255,0.1);
            margin-bottom: 1.5rem;
            text-decoration: none;
        }

        .sidebar-brand i { color: var(--primary); font-size: 1.5rem; }

        .nav-section {
            color: rgba(255,255,255,0.4);
            font-size: 0.7rem;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 1px;
            margin-bottom: 0.75rem;
            padding-left: 0.75rem;
        }

        .sidebar-nav { list-style: none; padding: 0; margin: 0 0 1.5rem 0; }

        .sidebar-nav a {
            color: rgba(255,255,255,0.7);
            text-decoration: none;
            display: flex;
            align-items: center;
            gap: 0.75rem;
            padding: 0.75rem;
            border-radius: 10px;
            transition: all 0.2s;
            font-weight: 500;
            font-size: 0.9rem;
        }

        .sidebar-nav a:hover { background: rgba(255,255,255,0.08); color: white; }
        .sidebar-nav a.active { background: var(--primary); color: white; }
        .sidebar-nav i { font-size: 1.1rem; opacity: 0.8; }

        .main-content { margin-left: 260px; padding: 2rem; }

        .page-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 2rem;
        }

        .page-title { font-size: 1.75rem; font-weight: 700; color: var(--dark); margin: 0; }

        .card {
            background: white;
            border-radius: 16px;
            border: 1px solid #e2e8f0;
            box-shadow: 0 1px 3px rgba(0,0,0,0.05);
            margin-bottom: 1.5rem;
        }

        .card-header {
            padding: 1.25rem 1.5rem;
            border-bottom: 1px solid #e2e8f0;
            background: transparent;
        }

        .card-title { font-weight: 600; color: var(--dark); margin: 0; font-size: 1rem; }
        .card-body { padding: 1.5rem; }

        .form-label { font-weight: 600; color: var(--dark); font-size: 0.875rem; margin-bottom: 0.5rem; }

        .form-control, .form-select {
            border: 2px solid #e2e8f0;
            border-radius: 10px;
            padding: 0.625rem 1rem;
            font-size: 0.9rem;
            transition: all 0.2s;
        }

        .form-control:focus, .form-select:focus {
            border-color: var(--primary);
            box-shadow: 0 0 0 4px rgba(99, 102, 241, 0.15);
            outline: none;
        }

        .btn {
            font-weight: 500;
            border-radius: 10px;
            padding: 0.625rem 1.25rem;
            font-size: 0.9rem;
            transition: all 0.2s;
        }

        .btn-primary { background: var(--primary); border: none; color: white; }
        .btn-primary:hover { background: var(--primary-dark); transform: translateY(-1px); }
        .btn-success { background: var(--success); border: none; }
        .btn-danger { background: var(--danger); border: none; }
        .btn-outline-secondary { border: 2px solid #e2e8f0; color: var(--dark); }
        .btn-outline-secondary:hover { background: #f1f5f9; color: var(--dark); }

        /* Level List */
        .level-list { max-height: calc(100vh - 300px); overflow-y: auto; }

        .level-item {
            display: flex;
            align-items: center;
            padding: 1rem;
            background: #f8fafc;
            border-radius: 12px;
            margin-bottom: 0.75rem;
            cursor: pointer;
            transition: all 0.2s;
            border: 2px solid transparent;
        }

        .level-item:hover { background: #f1f5f9; }
        .level-item.active { border-color: var(--primary); background: #eef2ff; }

        .level-order {
            width: 36px;
            height: 36px;
            background: var(--primary);
            color: white;
            border-radius: 8px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: 600;
            margin-right: 1rem;
            font-size: 0.9rem;
        }

        .level-info { flex: 1; }
        .level-name { font-weight: 600; color: var(--dark); font-size: 0.9rem; }
        .level-meta { font-size: 0.8rem; color: #64748b; }

        .level-status {
            padding: 0.25rem 0.75rem;
            border-radius: 6px;
            font-size: 0.75rem;
            font-weight: 500;
        }

        .level-status.active { background: #dcfce7; color: #166534; }
        .level-status.inactive { background: #fee2e2; color: #991b1b; }

        /* Grid Preview */
        .grid-container {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 3px;
            padding: 1.5rem;
            background: #f8fafc;
            border-radius: 12px;
            border: 2px dashed #e2e8f0;
        }

        .grid-row { display: flex; gap: 3px; }

        .grid-cell {
            width: 44px;
            height: 44px;
            background: white;
            border: 2px solid #e2e8f0;
            border-radius: 8px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 22px;
            transition: all 0.2s;
            cursor: pointer;
            user-select: none;
        }

        .grid-cell:hover { border-color: var(--primary); transform: scale(1.05); }
        .grid-cell:active { transform: scale(0.95); }

        /* Item Types */
        .item-type-list { display: flex; flex-wrap: wrap; gap: 0.75rem; }

        .item-type-badge {
            display: flex;
            align-items: center;
            gap: 0.5rem;
            padding: 0.5rem 1rem;
            background: #f1f5f9;
            border-radius: 10px;
            cursor: pointer;
            transition: all 0.2s;
            font-size: 0.875rem;
            font-weight: 500;
            border: 2px solid transparent;
        }

        .item-type-badge:hover { background: #e2e8f0; }
        .item-type-badge.active { background: #eef2ff; border-color: var(--primary); color: var(--primary); }
        .item-type-badge span { font-size: 1.25rem; }

        /* Stats */
        .stats-row {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 1rem;
            margin-top: 1.5rem;
        }

        .stat-box {
            background: #f8fafc;
            border-radius: 10px;
            padding: 1rem;
            text-align: center;
        }

        .stat-box.primary { background: #eef2ff; }
        .stat-box.success { background: #ecfdf5; }
        .stat-box.warning { background: #fffbeb; }

        .stat-value { font-size: 1.5rem; font-weight: 700; color: var(--dark); }
        .stat-label { font-size: 0.75rem; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; }

        /* Targets */
        .target-card {
            background: #f8fafc;
            border-radius: 10px;
            padding: 1rem;
            margin-bottom: 0.75rem;
            display: flex;
            align-items: center;
            gap: 1rem;
        }

        .target-card .emoji { font-size: 1.75rem; }
        .target-card .form-control { width: 100px; }
        .target-card .remove-btn { color: var(--danger); cursor: pointer; margin-left: auto; }

        .alert { border: none; border-radius: 10px; }
        .alert-success { background: #dcfce7; color: #166534; }

        @media (max-width: 768px) {
            .sidebar { display: none; }
            .main-content { margin-left: 0; }
        }
    </style>
</head>
<body>
    <aside class="sidebar">
        <a href="/admin" class="sidebar-brand">
            <i class="bi bi-controller"></i>
            <span>ROSTIC'S Admin</span>
        </a>

        <div class="nav-section">Главная</div>
        <ul class="sidebar-nav">
            <li><a href="/admin"><i class="bi bi-grid-1x2"></i> Дашборд</a></li>
        </ul>

        <div class="nav-section">Пользователи</div>
        <ul class="sidebar-nav">
            <li><a href="/admin/user/"><i class="bi bi-people"></i> Все пользователи</a></li>
            <li><a href="/admin/progress/"><i class="bi bi-graph-up"></i> Прогресс</a></li>
            <li><a href="/admin/activity/"><i class="bi bi-activity"></i> Активность</a></li>
        </ul>

        <div class="nav-section">Игра</div>
        <ul class="sidebar-nav">
            <li><a href="/admin/level/"><i class="bi bi-layers"></i> Уровни</a></li>
            <li><a href="/level-editor/" class="active"><i class="bi bi-grid-3x3-gap"></i> Конструктор</a></li>
            <li><a href="/admin/session/"><i class="bi bi-joystick"></i> Сессии</a></li>
        </ul>

        <div class="nav-section">Система</div>
        <ul class="sidebar-nav">
            <li><a href="/admin/adminuser/"><i class="bi bi-shield-lock"></i> Админы</a></li>
            <li><a href="/auth/logout"><i class="bi bi-box-arrow-left"></i> Выход</a></li>
        </ul>
    </aside>

    <main class="main-content">
        <div class="page-header">
            <h1 class="page-title">Конструктор уровней</h1>
        </div>

        {% with messages = get_flashed_messages(with_categories=true) %}
            {% if messages %}
                {% for category, message in messages %}
                    <div class="alert alert-{{ category }} mb-4">{{ message }}</div>
                {% endfor %}
            {% endif %}
        {% endwith %}

        <div class="row">
            <div class="col-md-3">
                <div class="card">
                    <div class="card-header">
                        <h3 class="card-title"><i class="bi bi-layers me-2"></i>Уровни</h3>
                    </div>
                    <div class="card-body">
                        <button class="btn btn-primary w-100 mb-3" onclick="createNewLevel()">
                            <i class="bi bi-plus-lg me-2"></i>Новый уровень
                        </button>
                        <div class="level-list">
                            {% for level in levels %}
                            <div class="level-item {% if current_level and current_level.id == level.id %}active{% endif %}"
                                 onclick="loadLevel({{ level.id }})">
                                <div class="level-order">{{ level.order }}</div>
                                <div class="level-info">
                                    <div class="level-name">{{ level.name }}</div>
                                    <div class="level-meta">{{ level.grid_width }}×{{ level.grid_height }} | {{ level.max_moves }} ходов</div>
                                </div>
                                <span class="level-status {% if level.is_active %}active{% else %}inactive{% endif %}">
                                    {% if level.is_active %}Вкл{% else %}Выкл{% endif %}
                                </span>
                            </div>
                            {% endfor %}
                        </div>
                    </div>
                </div>
            </div>

            <div class="col-md-9">
                <form id="levelForm" method="POST">
                    <input type="hidden" name="level_id" id="levelId" value="{{ current_level.id if current_level else '' }}">

                    <div class="card">
                        <div class="card-header">
                            <h3 class="card-title"><i class="bi bi-info-circle me-2"></i>Основная информация</h3>
                        </div>
                        <div class="card-body">
                            <div class="row">
                                <div class="col-md-6 mb-3">
                                    <label class="form-label">Название уровня</label>
                                    <input type="text" name="name" id="levelName" class="form-control"
                                           value="{{ current_level.name if current_level else 'Новый уровень' }}" required>
                                </div>
                                <div class="col-md-3 mb-3">
                                    <label class="form-label">Порядок</label>
                                    <input type="number" name="order" id="levelOrder" class="form-control"
                                           value="{{ current_level.order if current_level else 1 }}" min="1">
                                </div>
                                <div class="col-md-3 mb-3">
                                    <label class="form-label">Статус</label>
                                    <select name="is_active" id="levelActive" class="form-select">
                                        <option value="1" {% if not current_level or current_level.is_active %}selected{% endif %}>Активен</option>
                                        <option value="0" {% if current_level and not current_level.is_active %}selected{% endif %}>Отключён</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="card">
                        <div class="card-header">
                            <h3 class="card-title"><i class="bi bi-grid-3x3 me-2"></i>Настройки поля</h3>
                        </div>
                        <div class="card-body">
                            <div class="row mb-4">
                                <div class="col-md-3 mb-3">
                                    <label class="form-label">Ширина</label>
                                    <input type="number" name="grid_width" id="gridWidth" class="form-control"
                                           value="{{ current_level.grid_width if current_level else 7 }}"
                                           min="5" max="9" onchange="updateGrid()">
                                </div>
                                <div class="col-md-3 mb-3">
                                    <label class="form-label">Высота</label>
                                    <input type="number" name="grid_height" id="gridHeight" class="form-control"
                                           value="{{ current_level.grid_height if current_level else 7 }}"
                                           min="5" max="9" onchange="updateGrid()">
                                </div>
                                <div class="col-md-3 mb-3">
                                    <label class="form-label">Макс. ходов</label>
                                    <input type="number" name="max_moves" id="maxMoves" class="form-control"
                                           value="{{ current_level.max_moves if current_level else 30 }}" min="5" max="100" onchange="updateStats()">
                                </div>
                            </div>

                            <label class="form-label">Типы предметов</label>
                            <div class="item-type-list mb-4" id="itemTypeList"></div>
                            <input type="hidden" name="item_types" id="itemTypes" value="{{ ','.join(current_level.item_types) if current_level and current_level.item_types else 'chicken,burger,fries,cola,bucket' }}">

                            <label class="form-label">Предпросмотр <small class="text-muted">(клик по ячейке — установить препятствие)</small></label>
                            <div class="grid-container" id="gridPreview"></div>
                            <input type="hidden" name="obstacles" id="obstaclesJson" value='{{ current_level.obstacles | tojson if current_level and current_level.obstacles else "[]" }}'>

                            <div class="stats-row">
                                <div class="stat-box primary">
                                    <div class="stat-value" id="statCells">49</div>
                                    <div class="stat-label">Всего ячеек</div>
                                </div>
                                <div class="stat-box success">
                                    <div class="stat-value" id="statTypes">5</div>
                                    <div class="stat-label">Типов предметов</div>
                                </div>
                                <div class="stat-box warning">
                                    <div class="stat-value" id="statMoves">30</div>
                                    <div class="stat-label">Макс. ходов</div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="card">
                        <div class="card-header">
                            <h3 class="card-title"><i class="bi bi-bullseye me-2"></i>Цели уровня</h3>
                        </div>
                        <div class="card-body">
                            <p class="text-muted mb-3">Установите цели, которых игрокам нужно достичь для прохождения уровня.</p>
                            <div id="targetsContainer"></div>

                            <div class="dropdown">
                                <button class="btn btn-outline-secondary dropdown-toggle" type="button" data-bs-toggle="dropdown">
                                    <i class="bi bi-plus-lg me-2"></i>Добавить цель
                                </button>
                                <ul class="dropdown-menu">
                                    <li><a class="dropdown-item" href="#" onclick="addCollectTarget(); return false;">
                                        <i class="bi bi-collection me-2"></i>Собрать предметы
                                    </a></li>
                                    <li><a class="dropdown-item" href="#" onclick="addScoreTarget(); return false;">
                                        <i class="bi bi-star me-2"></i>Минимум очков
                                    </a></li>
                                    <li><a class="dropdown-item" href="#" onclick="addComboTarget(); return false;">
                                        <i class="bi bi-lightning me-2"></i>Комбо-цели
                                    </a></li>
                                </ul>
                            </div>
                            <input type="hidden" name="targets" id="targetsJson" value='{{ current_level.targets | tojson if current_level and current_level.targets else "{}" }}'>
                        </div>
                    </div>

                    <div class="card">
                        <div class="card-body">
                            <div class="d-flex gap-3">
                                <button type="submit" class="btn btn-primary btn-lg">
                                    <i class="bi bi-check-lg me-2"></i>Сохранить
                                </button>
                                {% if current_level %}
                                <button type="button" class="btn btn-danger btn-lg" onclick="deleteLevel({{ current_level.id }})">
                                    <i class="bi bi-trash me-2"></i>Удалить
                                </button>
                                {% endif %}
                            </div>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    </main>

    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"></script>
    <script>
        const ITEMS = {
            chicken: { emoji: '🍗', name: 'Курочка' },
            burger: { emoji: '🍔', name: 'Бургер' },
            fries: { emoji: '🍟', name: 'Картошка' },
            cola: { emoji: '🥤', name: 'Кола' },
            bucket: { emoji: '🧺', name: 'Баскет' }
        };

        let selectedItemTypes = [];
        let targets = {};
        let obstacles = [];  // Array of {row, col} positions

        document.addEventListener('DOMContentLoaded', function() {
            const itemTypesValue = document.getElementById('itemTypes').value;
            selectedItemTypes = itemTypesValue ? itemTypesValue.split(',') : ['chicken', 'burger', 'fries', 'cola', 'bucket'];

            try {
                const targetsValue = document.getElementById('targetsJson').value;
                targets = targetsValue ? JSON.parse(targetsValue) : {};
            } catch(e) { targets = {}; }

            try {
                const obstaclesValue = document.getElementById('obstaclesJson').value;
                obstacles = obstaclesValue ? JSON.parse(obstaclesValue) : [];
            } catch(e) { obstacles = []; }

            renderItemTypes();
            updateGrid();
            renderTargets();
        });

        function renderItemTypes() {
            const container = document.getElementById('itemTypeList');
            container.innerHTML = '';

            for (const [key, item] of Object.entries(ITEMS)) {
                const isActive = selectedItemTypes.includes(key);
                const badge = document.createElement('div');
                badge.className = `item-type-badge ${isActive ? 'active' : ''}`;
                badge.innerHTML = `<span>${item.emoji}</span> ${item.name}`;
                badge.onclick = () => toggleItemType(key);
                container.appendChild(badge);
            }

            document.getElementById('itemTypes').value = selectedItemTypes.join(',');
            document.getElementById('statTypes').textContent = selectedItemTypes.length;
        }

        function toggleItemType(type) {
            const index = selectedItemTypes.indexOf(type);
            if (index > -1) {
                if (selectedItemTypes.length > 2) selectedItemTypes.splice(index, 1);
            } else {
                selectedItemTypes.push(type);
            }
            renderItemTypes();
            updateGrid();
        }

        function updateGrid() {
            const width = parseInt(document.getElementById('gridWidth').value) || 7;
            const height = parseInt(document.getElementById('gridHeight').value) || 7;
            const container = document.getElementById('gridPreview');
            container.innerHTML = '';

            // Clean up obstacles that are outside new grid bounds
            obstacles = obstacles.filter(o => o.row < height && o.col < width);
            updateObstaclesJson();

            for (let y = 0; y < height; y++) {
                const row = document.createElement('div');
                row.className = 'grid-row';
                for (let x = 0; x < width; x++) {
                    const cell = document.createElement('div');
                    cell.className = 'grid-cell';
                    cell.dataset.row = y;
                    cell.dataset.col = x;

                    // Check if this cell is an obstacle
                    const isObstacle = obstacles.some(o => o.row === y && o.col === x);

                    if (isObstacle) {
                        cell.style.background = '#4a5568';
                        cell.style.borderColor = '#2d3748';
                        cell.innerHTML = '📦';
                        cell.title = 'Препятствие (клик чтобы удалить)';
                    } else {
                        const randomType = selectedItemTypes[Math.floor(Math.random() * selectedItemTypes.length)];
                        cell.textContent = ITEMS[randomType]?.emoji || '?';
                        cell.title = 'Клик чтобы поставить препятствие';
                    }

                    cell.onclick = () => toggleObstacle(y, x);
                    row.appendChild(cell);
                }
                container.appendChild(row);
            }

            const obstacleCount = obstacles.length;
            document.getElementById('statCells').textContent = (width * height) - obstacleCount;
            updateStats();
        }

        function toggleObstacle(row, col) {
            const existingIndex = obstacles.findIndex(o => o.row === row && o.col === col);
            if (existingIndex >= 0) {
                obstacles.splice(existingIndex, 1);
            } else {
                obstacles.push({ row, col });
            }
            updateObstaclesJson();
            updateGrid();
        }

        function updateObstaclesJson() {
            document.getElementById('obstaclesJson').value = JSON.stringify(obstacles);
        }

        function updateStats() {
            document.getElementById('statMoves').textContent = document.getElementById('maxMoves').value || 30;
        }

        function renderTargets() {
            const container = document.getElementById('targetsContainer');
            container.innerHTML = '';

            if (targets.collect) {
                for (const [item, count] of Object.entries(targets.collect)) {
                    container.appendChild(createTargetCard('collect', item, count, ITEMS[item]?.emoji || '?'));
                }
            }
            if (targets.min_score) {
                container.appendChild(createTargetCard('score', 'min_score', targets.min_score, '⭐'));
            }
            if (targets.combos) {
                for (const [combo, count] of Object.entries(targets.combos)) {
                    container.appendChild(createTargetCard('combo', combo, count, '⚡'));
                }
            }
            updateTargetsJson();
        }

        function createTargetCard(type, key, value, emoji) {
            const card = document.createElement('div');
            card.className = 'target-card';

            let label = '';
            if (type === 'collect') label = `Собрать: ${ITEMS[key]?.name || key}`;
            else if (type === 'score') label = 'Минимум очков';
            else if (type === 'combo') label = `${key.replace('_match', '')} комбо`;

            card.innerHTML = `
                <span class="emoji">${emoji}</span>
                <div class="flex-grow-1">
                    <div class="fw-semibold">${label}</div>
                    <input type="number" class="form-control form-control-sm mt-2"
                           value="${value}" min="1" onchange="updateTargetValue(this, '${type}', '${key}')">
                </div>
                <i class="bi bi-x-circle remove-btn fs-5" onclick="removeTarget('${type}', '${key}')"></i>
            `;
            return card;
        }

        function addCollectTarget() {
            const item = selectedItemTypes.find(t => !targets.collect || !targets.collect[t]) || selectedItemTypes[0];
            if (!targets.collect) targets.collect = {};
            targets.collect[item] = 10;
            renderTargets();
        }

        function addScoreTarget() {
            targets.min_score = 1000;
            renderTargets();
        }

        function addComboTarget() {
            if (!targets.combos) targets.combos = {};
            const comboTypes = ['4_match', '5_match', 'L_match', 'T_match'];
            const available = comboTypes.find(c => !targets.combos[c]);
            if (available) {
                targets.combos[available] = 2;
                renderTargets();
            }
        }

        function updateTargetValue(input, type, key) {
            const value = parseInt(input.value) || 1;
            if (type === 'collect') targets.collect[key] = value;
            else if (type === 'score') targets.min_score = value;
            else if (type === 'combo') targets.combos[key] = value;
            updateTargetsJson();
        }

        function removeTarget(type, key) {
            if (type === 'collect' && targets.collect) {
                delete targets.collect[key];
                if (Object.keys(targets.collect).length === 0) delete targets.collect;
            } else if (type === 'score') {
                delete targets.min_score;
            } else if (type === 'combo' && targets.combos) {
                delete targets.combos[key];
                if (Object.keys(targets.combos).length === 0) delete targets.combos;
            }
            renderTargets();
        }

        function updateTargetsJson() {
            document.getElementById('targetsJson').value = JSON.stringify(targets);
        }

        function createNewLevel() { window.location.href = '/level-editor/'; }
        function loadLevel(id) { window.location.href = '/level-editor/' + id; }

        function deleteLevel(id) {
            if (confirm('Вы уверены, что хотите удалить этот уровень?')) {
                fetch('/level-editor/' + id + '/delete', { method: 'POST' })
                    .then(() => window.location.href = '/level-editor/');
            }
        }
    </script>
</body>
</html>
'''


@bp.route('/', methods=['GET', 'POST'])
@bp.route('/<int:level_id>', methods=['GET', 'POST'])
@login_required
def editor(level_id=None):
    levels = Level.query.order_by(Level.order).all()
    current_level = None

    if level_id:
        current_level = Level.query.get_or_404(level_id)

    if request.method == 'POST':
        level_id = request.form.get('level_id')

        if level_id:
            level = Level.query.get(level_id)
        else:
            level = Level()
            db.session.add(level)

        level.name = request.form.get('name', 'Новый уровень')
        level.order = int(request.form.get('order', 1))
        level.grid_width = int(request.form.get('grid_width', 7))
        level.grid_height = int(request.form.get('grid_height', 7))
        level.max_moves = int(request.form.get('max_moves', 30))

        # item_types stored as PostgreSQL array
        item_types_str = request.form.get('item_types', 'chicken,burger,fries,cola,bucket')
        level.item_types = [t.strip() for t in item_types_str.split(',') if t.strip()]

        level.is_active = request.form.get('is_active') == '1'

        import json
        try:
            level.targets = json.loads(request.form.get('targets', '{}'))
        except:
            level.targets = {}

        try:
            level.obstacles = json.loads(request.form.get('obstacles', '[]'))
        except:
            level.obstacles = []

        db.session.commit()
        flash('Уровень сохранён!', 'success')
        return redirect(url_for('level_editor.editor', level_id=level.id))

    return render_template_string(LEVEL_EDITOR_TEMPLATE, levels=levels, current_level=current_level)


@bp.route('/<int:level_id>/delete', methods=['POST'])
@login_required
def delete_level(level_id):
    level = Level.query.get_or_404(level_id)
    db.session.delete(level)
    db.session.commit()
    flash('Уровень удалён!', 'success')
    return redirect(url_for('level_editor.editor'))
