import React, { useEffect, useState } from 'react';
import api, { GlobalLeaderboardEntry, WeeklyLeaderboardEntry } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

type LeaderboardType = 'global' | 'weekly';

interface LeaderboardScreenProps {
  onBack: () => void;
}

export function LeaderboardScreen({ onBack }: LeaderboardScreenProps) {
  const { user, isAuthenticated } = useAuth();
  const [type, setType] = useState<LeaderboardType>('global');
  const [globalData, setGlobalData] = useState<GlobalLeaderboardEntry[]>([]);
  const [weeklyData, setWeeklyData] = useState<WeeklyLeaderboardEntry[]>([]);
  const [myRank, setMyRank] = useState<{ rank: number; total_score: number; total_players: number } | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);

    const [globalRes, weeklyRes] = await Promise.all([
      api.getGlobalLeaderboard(50),
      api.getWeeklyLeaderboard(50),
    ]);

    if (globalRes.data) {
      setGlobalData(globalRes.data.leaderboard);
    }
    if (weeklyRes.data) {
      setWeeklyData(weeklyRes.data.leaderboard);
    }

    if (isAuthenticated) {
      const rankRes = await api.getMyRank();
      if (rankRes.data) {
        setMyRank(rankRes.data);
      }
    }

    setIsLoading(false);
  };

  const currentData = type === 'global' ? globalData : weeklyData;
  const top3 = currentData.slice(0, 3);
  const rest = currentData.slice(3);

  const getScore = (entry: GlobalLeaderboardEntry | WeeklyLeaderboardEntry) => {
    return 'total_score' in entry ? entry.total_score : entry.weekly_score;
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>Рейтинг</h1>
      </div>

      {/* Tabs */}
      <div style={styles.tabs}>
        <button
          style={{
            ...styles.tab,
            ...(type === 'global' ? styles.tabActive : {}),
          }}
          onClick={() => setType('global')}
        >
          🏆 Общий
        </button>
        <button
          style={{
            ...styles.tab,
            ...(type === 'weekly' ? styles.tabActive : {}),
          }}
          onClick={() => setType('weekly')}
        >
          📅 Неделя
        </button>
      </div>

      {isLoading ? (
        <div style={styles.loading}>
          <div style={styles.spinner}></div>
          <p>Загрузка рейтинга...</p>
        </div>
      ) : currentData.length === 0 ? (
        <div style={styles.empty}>
          <div style={styles.emptyIcon}>🏆</div>
          <h3>Пока пусто</h3>
          <p>Будь первым в рейтинге!</p>
        </div>
      ) : (
        <div style={styles.content}>
          {/* Podium for Top 3 */}
          {top3.length > 0 && (
            <div style={styles.podium}>
              {/* 2nd Place */}
              {top3[1] && (
                <div style={styles.podiumItem}>
                  <div style={styles.podiumAvatar2}>
                    {top3[1].username.charAt(0).toUpperCase()}
                  </div>
                  <div style={styles.podiumName}>{top3[1].username}</div>
                  <div style={styles.podiumScore}>{getScore(top3[1]).toLocaleString()}</div>
                  <div style={{ ...styles.podiumStand, ...styles.podiumStand2 }}>
                    <span style={styles.podiumMedal}>🥈</span>
                    <span style={styles.podiumRank}>2</span>
                  </div>
                </div>
              )}

              {/* 1st Place */}
              {top3[0] && (
                <div style={styles.podiumItem}>
                  <div style={styles.crown}>👑</div>
                  <div style={styles.podiumAvatar1}>
                    {top3[0].username.charAt(0).toUpperCase()}
                  </div>
                  <div style={styles.podiumName}>{top3[0].username}</div>
                  <div style={styles.podiumScore}>{getScore(top3[0]).toLocaleString()}</div>
                  <div style={{ ...styles.podiumStand, ...styles.podiumStand1 }}>
                    <span style={styles.podiumMedal}>🥇</span>
                    <span style={styles.podiumRank}>1</span>
                  </div>
                </div>
              )}

              {/* 3rd Place */}
              {top3[2] && (
                <div style={styles.podiumItem}>
                  <div style={styles.podiumAvatar3}>
                    {top3[2].username.charAt(0).toUpperCase()}
                  </div>
                  <div style={styles.podiumName}>{top3[2].username}</div>
                  <div style={styles.podiumScore}>{getScore(top3[2]).toLocaleString()}</div>
                  <div style={{ ...styles.podiumStand, ...styles.podiumStand3 }}>
                    <span style={styles.podiumMedal}>🥉</span>
                    <span style={styles.podiumRank}>3</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* My Rank Card */}
          {isAuthenticated && myRank && (
            <div style={styles.myRankCard}>
              <div style={styles.myRankLeft}>
                <div style={styles.myRankAvatar}>
                  {user?.username?.charAt(0).toUpperCase() || '?'}
                </div>
                <div>
                  <div style={styles.myRankLabel}>Твоё место</div>
                  <div style={styles.myRankPosition}>#{myRank.rank} <span style={styles.myRankOf}>из {myRank.total_players}</span></div>
                </div>
              </div>
              <div style={styles.myRankScore}>
                <div style={styles.myRankScoreValue}>{myRank.total_score.toLocaleString()}</div>
                <div style={styles.myRankScoreLabel}>очков</div>
              </div>
            </div>
          )}

          {/* Rest of the list */}
          {rest.length > 0 && (
            <div style={styles.list}>
              {rest.map((entry, index) => (
                <div
                  key={entry.user_id}
                  style={{
                    ...styles.entry,
                    ...(user?.id === entry.user_id ? styles.entryHighlight : {}),
                    animationDelay: `${index * 0.05}s`,
                  }}
                >
                  <div style={styles.rank}>{entry.rank}</div>
                  <div style={styles.entryAvatar}>
                    {entry.username.charAt(0).toUpperCase()}
                  </div>
                  <div style={styles.info}>
                    <div style={styles.username}>{entry.username}</div>
                    {'completed_levels' in entry && (
                      <div style={styles.stats}>
                        {entry.completed_levels} уровней • {'⭐'.repeat(Math.min(entry.total_stars, 5))}
                      </div>
                    )}
                  </div>
                  <div style={styles.score}>{getScore(entry).toLocaleString()}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    minHeight: '100vh',
    backgroundColor: '#FFF5F5',
    paddingBottom: 100,
  },
  header: {
    padding: '25px 20px 20px',
  },
  title: {
    color: '#E4002B',
    margin: 0,
    fontSize: 28,
    fontWeight: 800,
    textAlign: 'center',
    fontFamily: "'Oswald', sans-serif",
  },
  tabs: {
    display: 'flex',
    gap: 10,
    padding: '0 20px',
    marginBottom: 20,
  },
  tab: {
    flex: 1,
    padding: '12px 20px',
    borderRadius: 25,
    border: 'none',
    backgroundColor: '#f0f0f0',
    color: '#666',
    fontWeight: 'bold',
    cursor: 'pointer',
    fontSize: 14,
    transition: 'all 0.2s',
  },
  tabActive: {
    backgroundColor: '#E4002B',
    color: '#fff',
  },
  loading: {
    textAlign: 'center',
    padding: 60,
    color: '#888',
  },
  spinner: {
    width: 40,
    height: 40,
    border: '4px solid #f0f0f0',
    borderTop: '4px solid #E4002B',
    borderRadius: '50%',
    margin: '0 auto 20px',
    animation: 'spin 1s linear infinite',
  },
  empty: {
    textAlign: 'center',
    padding: 60,
    color: '#888',
  },
  emptyIcon: {
    fontSize: 60,
    marginBottom: 15,
  },
  content: {
    padding: '0 20px',
  },
  podium: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'flex-end',
    gap: 10,
    marginBottom: 25,
    paddingTop: 20,
  },
  podiumItem: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    flex: 1,
    maxWidth: 110,
  },
  crown: {
    fontSize: 24,
    marginBottom: 5,
    animation: 'bounce 1s ease infinite',
  },
  podiumAvatar1: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#FFD700',
    color: '#fff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 24,
    fontWeight: 'bold',
    border: '3px solid #fff',
    boxShadow: '0 4px 15px rgba(0,0,0,0.15)',
  },
  podiumAvatar2: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#C0C0C0',
    color: '#fff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 20,
    fontWeight: 'bold',
    border: '3px solid #fff',
    boxShadow: '0 4px 10px rgba(0,0,0,0.1)',
  },
  podiumAvatar3: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#CD7F32',
    color: '#fff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 20,
    fontWeight: 'bold',
    border: '3px solid #fff',
    boxShadow: '0 4px 10px rgba(0,0,0,0.1)',
  },
  podiumName: {
    color: '#333',
    fontWeight: 'bold',
    fontSize: 12,
    marginTop: 8,
    textAlign: 'center',
    maxWidth: '100%',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  podiumScore: {
    color: '#888',
    fontSize: 11,
    marginTop: 2,
  },
  podiumStand: {
    width: '100%',
    borderRadius: '10px 10px 0 0',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
    color: '#fff',
  },
  podiumStand1: {
    height: 80,
    backgroundColor: '#E4002B',
  },
  podiumStand2: {
    height: 60,
    backgroundColor: '#FF6B6B',
  },
  podiumStand3: {
    height: 45,
    backgroundColor: '#FFA0A0',
  },
  podiumMedal: {
    fontSize: 24,
  },
  podiumRank: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 2,
  },
  myRankCard: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
  },
  myRankLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
  },
  myRankAvatar: {
    width: 45,
    height: 45,
    borderRadius: 23,
    backgroundColor: '#E4002B',
    color: '#fff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 18,
    fontWeight: 'bold',
  },
  myRankLabel: {
    fontSize: 12,
    color: '#888',
    marginBottom: 2,
  },
  myRankPosition: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#E4002B',
  },
  myRankOf: {
    fontSize: 14,
    fontWeight: 'normal',
    color: '#888',
  },
  myRankScore: {
    textAlign: 'right',
  },
  myRankScoreValue: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
  },
  myRankScoreLabel: {
    fontSize: 11,
    color: '#888',
  },
  list: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },
  entry: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    backgroundColor: '#fff',
    borderRadius: 12,
    boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
  },
  entryHighlight: {
    backgroundColor: '#FFF0F0',
    border: '2px solid #E4002B',
  },
  rank: {
    width: 28,
    fontSize: 14,
    fontWeight: 'bold',
    color: '#888',
    textAlign: 'center',
  },
  entryAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#FFE5E5',
    color: '#E4002B',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 16,
    fontWeight: 'bold',
  },
  info: {
    flex: 1,
    minWidth: 0,
  },
  username: {
    fontWeight: 'bold',
    color: '#333',
    fontSize: 14,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  stats: {
    fontSize: 11,
    color: '#888',
    marginTop: 2,
  },
  score: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#E4002B',
  },
};
