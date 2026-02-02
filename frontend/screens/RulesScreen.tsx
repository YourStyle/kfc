import React from 'react';

interface RulesScreenProps {
  onBack: () => void;
}

export function RulesScreen({ onBack }: RulesScreenProps) {
  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>Правила игры</h1>
      </div>

      <div style={styles.content}>
        {/* How to Play */}
        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>🎮 Как играть</h2>
          <div style={styles.rulesList}>
            <div style={styles.rule}>
              <span style={styles.ruleNumber}>1</span>
              <p>Меняй местами соседние элементы, чтобы собрать 3 и более одинаковых в ряд</p>
            </div>
            <div style={styles.rule}>
              <span style={styles.ruleNumber}>2</span>
              <p>Совпавшие элементы исчезают, а сверху падают новые</p>
            </div>
            <div style={styles.rule}>
              <span style={styles.ruleNumber}>3</span>
              <p>Выполняй задание уровня до того, как закончатся ходы</p>
            </div>
          </div>
        </div>

        {/* Combos */}
        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>💥 Комбо</h2>
          <div style={styles.comboList}>
            <div style={styles.combo}>
              <span style={styles.comboIcon}>3️⃣</span>
              <div>
                <strong>3 в ряд</strong>
                <p>Базовое совпадение</p>
              </div>
            </div>
            <div style={styles.combo}>
              <span style={styles.comboIcon}>4️⃣</span>
              <div>
                <strong>4 в ряд</strong>
                <p>Бонусные очки x2</p>
              </div>
            </div>
            <div style={styles.combo}>
              <span style={styles.comboIcon}>5️⃣</span>
              <div>
                <strong>5+ в ряд</strong>
                <p>Бонусные очки x3</p>
              </div>
            </div>
          </div>
        </div>

        {/* Level Types */}
        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>🎯 Типы заданий</h2>
          <div style={styles.taskList}>
            <div style={styles.task}>
              <span style={styles.taskIcon}>🍗</span>
              <div>
                <strong>Сбор предметов</strong>
                <p>Собери определённое количество элементов</p>
              </div>
            </div>
            <div style={styles.task}>
              <span style={styles.taskIcon}>⭐</span>
              <div>
                <strong>Набор очков</strong>
                <p>Набери минимальное количество очков</p>
              </div>
            </div>
          </div>
        </div>

        {/* Stars */}
        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>⭐ Система звёзд</h2>
          <div style={styles.starsList}>
            <div style={styles.starItem}>
              <span style={styles.stars}>★☆☆</span>
              <span>Выполни задание</span>
            </div>
            <div style={styles.starItem}>
              <span style={styles.stars}>★★☆</span>
              <span>Набери x1.5 от минимума очков</span>
            </div>
            <div style={styles.starItem}>
              <span style={styles.stars}>★★★</span>
              <span>Набери x2 от минимума очков</span>
            </div>
          </div>
        </div>

        {/* Leaderboard */}
        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>🏆 Рейтинг</h2>
          <p style={styles.text}>
            Твой общий рейтинг складывается из лучших результатов на всех пройденных уровнях.
            Соревнуйся с другими игроками и поднимайся в таблице лидеров!
          </p>
        </div>

        {/* Prizes */}
        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>🎁 Призы</h2>
          <p style={styles.text}>
            Лучшие игроки по итогам акции получат призы от ROSTIC'S!
            Следи за своим местом в рейтинге и набирай больше очков.
          </p>
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    minHeight: '100vh',
    backgroundColor: '#FFF5F5',
    padding: '25px 20px 100px',
    overflowY: 'auto',
  },
  header: {
    marginBottom: 20,
  },
  title: {
    color: '#E4002B',
    margin: 0,
    fontSize: 28,
    fontWeight: 800,
    textAlign: 'center',
    fontFamily: "'Oswald', sans-serif",
  },
  content: {
    maxWidth: 600,
    margin: '0 auto',
  },
  section: {
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 20,
    marginBottom: 15,
    boxShadow: '0 2px 10px rgba(0,0,0,0.05)',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#E4002B',
    marginTop: 0,
    marginBottom: 15,
  },
  rulesList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 15,
  },
  rule: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: 15,
  },
  ruleNumber: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#E4002B',
    color: '#fff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 'bold',
    flexShrink: 0,
  },
  comboList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
  },
  combo: {
    display: 'flex',
    alignItems: 'center',
    gap: 15,
  },
  comboIcon: {
    fontSize: 24,
  },
  taskList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
  },
  task: {
    display: 'flex',
    alignItems: 'center',
    gap: 15,
  },
  taskIcon: {
    fontSize: 28,
  },
  starsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
  },
  starItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 15,
  },
  stars: {
    fontSize: 20,
    color: '#FFD700',
    minWidth: 60,
  },
  text: {
    color: '#666',
    lineHeight: 1.6,
    margin: 0,
  },
};
