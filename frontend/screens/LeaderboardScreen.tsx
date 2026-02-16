import React, { useEffect, useState, useRef } from 'react';
import api, { GlobalLeaderboardEntry, WeeklyLeaderboardEntry } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

type LeaderboardType = 'global' | 'weekly';
type RegionFilter = 'all' | 'moscow' | 'region';

interface LeaderboardScreenProps {
  onBack: () => void;
}

interface MyRankData {
  rank: number;
  total_score: number;
  total_players: number;
  city: 'moscow' | 'region';
  regional_rank: number;
  regional_total_players: number;
}

export function LeaderboardScreen({ onBack }: LeaderboardScreenProps) {
  const { user, isAuthenticated } = useAuth();
  const [type, setType] = useState<LeaderboardType>('global');
  const [regionFilter, setRegionFilter] = useState<RegionFilter>('all');
  const [globalData, setGlobalData] = useState<GlobalLeaderboardEntry[]>([]);
  const [weeklyData, setWeeklyData] = useState<WeeklyLeaderboardEntry[]>([]);
  const [myRank, setMyRank] = useState<MyRankData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loaded, setLoaded] = useState(false);
  const [displayMyScore, setDisplayMyScore] = useState(0);
  const myScoreRafRef = useRef(0);
  const basePath = import.meta.env.BASE_URL || '/';

  useEffect(() => {
    loadData();
  }, [regionFilter]);

  const loadData = async () => {
    setIsLoading(true);
    setLoaded(false);

    const cityParam = regionFilter === 'all' ? undefined : regionFilter;

    const [globalRes, weeklyRes] = await Promise.all([
      api.getGlobalLeaderboard(50, cityParam as 'moscow' | 'region' | undefined),
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
    setTimeout(() => setLoaded(true), 50);
  };

  useEffect(() => {
    if (!myRank) return;
    const target = myRank.total_score;
    const start = performance.now();
    const duration = 800;

    const tick = (now: number) => {
      const elapsed = now - start;
      const t = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplayMyScore(Math.round(target * eased));
      if (t < 1) {
        myScoreRafRef.current = requestAnimationFrame(tick);
      } else {
        myScoreRafRef.current = 0;
      }
    };

    cancelAnimationFrame(myScoreRafRef.current);
    myScoreRafRef.current = requestAnimationFrame(tick);

    return () => { cancelAnimationFrame(myScoreRafRef.current); myScoreRafRef.current = 0; };
  }, [myRank]);

  const currentData = type === 'global' ? globalData : weeklyData;
  const top3 = currentData.slice(0, 3);
  const rest = currentData.slice(3);

  const getScore = (entry: GlobalLeaderboardEntry | WeeklyLeaderboardEntry) => {
    return 'total_score' in entry ? entry.total_score : entry.weekly_score;
  };

  return (
    <div style={styles.container}>
      {/* Background */}
      <div className="leaderboard-bg" style={{
        ...styles.backgroundImage,
        backgroundImage: `url(${basePath}images/background.png)`,
      }} />

      {/* Header */}
      <div style={styles.header}>
        <h1 style={styles.title}>Рейтинг</h1>
      </div>

      {/* Content */}
      <div style={styles.contentContainer}>
        <div style={styles.contentPanel}>
          {/* Type Tabs */}
          <div style={styles.tabs}>
            <button
              className={`lb-tab ${type === 'global' ? 'lb-tab-active' : ''}`}
              style={{
                ...styles.tab,
                ...(type === 'global' ? styles.tabActive : {}),
              }}
              onClick={() => setType('global')}
            >
              🏆 Общий
            </button>
            <button
              className={`lb-tab ${type === 'weekly' ? 'lb-tab-active' : ''}`}
              style={{
                ...styles.tab,
                ...(type === 'weekly' ? styles.tabActive : {}),
              }}
              onClick={() => setType('weekly')}
            >
              📅 Неделя
            </button>
          </div>

          {/* Region Filter Tabs */}
          {type === 'global' && (
            <div style={styles.regionTabs}>
              <button
                className={`region-tab ${regionFilter === 'all' ? 'region-tab-active' : ''}`}
                style={{
                  ...styles.regionTab,
                  ...(regionFilter === 'all' ? styles.regionTabActive : {}),
                }}
                onClick={() => setRegionFilter('all')}
              >
                Все
              </button>
              <button
                className={`region-tab ${regionFilter === 'moscow' ? 'region-tab-active' : ''}`}
                style={{
                  ...styles.regionTab,
                  ...(regionFilter === 'moscow' ? styles.regionTabActive : {}),
                }}
                onClick={() => setRegionFilter('moscow')}
              >
                Москва и МО
              </button>
              <button
                className={`region-tab ${regionFilter === 'region' ? 'region-tab-active' : ''}`}
                style={{
                  ...styles.regionTab,
                  ...(regionFilter === 'region' ? styles.regionTabActive : {}),
                }}
                onClick={() => setRegionFilter('region')}
              >
                Регионы
              </button>
            </div>
          )}

          {currentData.length === 0 && !isLoading ? (
            <div style={styles.empty}>
              <div style={styles.emptyIcon}>🏆</div>
              <h3>Пока пусто</h3>
              <p>Будь первым в рейтинге!</p>
            </div>
          ) : (
            <div style={styles.content}>
              {/* Podium for Top 3 */}
              {top3.length > 0 && (
                <div className={`lb-podium ${loaded ? 'lb-podium-visible' : ''}`} style={styles.podium}>
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
                <div className={`lb-my-rank ${loaded ? 'lb-my-rank-visible' : ''}`} style={styles.myRankCard}>
                  <div style={styles.myRankLeft}>
                    <div style={styles.myRankAvatar}>
                      {user?.username?.charAt(0).toUpperCase() || '?'}
                    </div>
                    <div>
                      <div style={styles.myRankLabel}>
                        {regionFilter !== 'all' ? 'Место в регионе' : 'Твоё место'}
                      </div>
                      <div style={styles.myRankPosition}>
                        #{regionFilter !== 'all' && regionFilter === myRank.city ? myRank.regional_rank : myRank.rank}
                        <span style={styles.myRankOf}>
                          {' '}из {regionFilter !== 'all' && regionFilter === myRank.city ? myRank.regional_total_players : myRank.total_players}
                        </span>
                      </div>
                      {regionFilter === 'all' && myRank.city && (
                        <div style={styles.myRankCity}>
                          {myRank.city === 'moscow' ? '📍 Москва и МО' : '📍 Регион'}
                        </div>
                      )}
                    </div>
                  </div>
                  <div style={styles.myRankScore}>
                    <div style={styles.myRankScoreValue}>{displayMyScore.toLocaleString()}</div>
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
                      className={`lb-entry ${loaded ? 'lb-entry-visible' : ''}`}
                      style={{
                        ...styles.entry,
                        ...(user?.id === entry.user_id ? styles.entryHighlight : {}),
                        animationDelay: loaded ? `${index * 0.05}s` : undefined,
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
                            {entry.completed_levels} уровней
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
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    overflow: 'hidden',
  },
  backgroundImage: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    backgroundRepeat: 'no-repeat',
    zIndex: 0,
  },
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    padding: '20px 20px 15px',
    textAlign: 'center',
  },
  title: {
    color: '#fff',
    margin: 0,
    fontSize: 26,
    fontWeight: 900,
    fontFamily: "'RosticsCeraPro', sans-serif",
    letterSpacing: 0,
    textShadow: '0 0 20px rgba(237, 28, 41, 0.4), 0 2px 10px rgba(0, 0, 0, 0.5)',
    textTransform: 'uppercase',
  },
  contentContainer: {
    position: 'absolute',
    top: 70,
    left: 0,
    right: 0,
    bottom: 80,
    zIndex: 5,
    display: 'flex',
    justifyContent: 'center',
    padding: '0 16px',
  },
  contentPanel: {
    width: '100%',
    maxWidth: 500,
    background: 'linear-gradient(180deg, rgba(21, 21, 21, 0.92) 0%, rgba(30, 30, 30, 0.95) 100%)',
    borderRadius: 20,
    padding: '16px',
    overflowY: 'auto',
    overflowX: 'hidden',
    border: '1px solid rgba(237, 28, 41, 0.25)',
    boxShadow: '0 0 50px rgba(0, 0, 0, 0.5), 0 0 80px rgba(228, 0, 43, 0.08), inset 0 1px 0 rgba(255, 255, 255, 0.08)',
  },
  tabs: {
    display: 'flex',
    gap: 10,
    marginBottom: 10,
  },
  tab: {
    flex: 1,
    padding: '12px 20px',
    border: 'none',
    background: 'linear-gradient(160deg, rgba(30, 30, 30, 0.9) 0%, rgba(40, 40, 40, 0.8) 100%)',
    backdropFilter: 'blur(10px)',
    color: 'rgba(255, 255, 255, 0.6)',
    fontWeight: 700,
    cursor: 'pointer',
    fontSize: 14,
    transition: 'all 0.25s ease',
    fontFamily: "'RosticsCeraPro', sans-serif",
    letterSpacing: 0.5,
    borderRadius: 10,
  },
  tabActive: {
    background: '#ED1C29',
    color: '#fff',
    boxShadow: '0 0 25px rgba(228, 0, 43, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.2)',
  },
  regionTabs: {
    display: 'flex',
    gap: 6,
    marginBottom: 14,
  },
  regionTab: {
    flex: 1,
    padding: '8px 12px',
    border: '1px solid rgba(237, 28, 41, 0.15)',
    background: 'rgba(21, 21, 21, 0.6)',
    color: 'rgba(255, 255, 255, 0.5)',
    fontWeight: 600,
    cursor: 'pointer',
    fontSize: 11,
    transition: 'all 0.2s ease',
    fontFamily: "'RosticsCeraPro', sans-serif",
    borderRadius: 8,
  },
  regionTabActive: {
    background: 'rgba(237, 28, 41, 0.2)',
    color: '#fff',
    borderColor: 'rgba(237, 28, 41, 0.5)',
  },
  loading: {
    textAlign: 'center',
    padding: 60,
    color: 'rgba(255, 255, 255, 0.7)',
    fontFamily: "'RosticsCeraPro', sans-serif",
    fontSize: 18,
  },
  spinner: {
    width: 40,
    height: 40,
    border: '3px solid rgba(255, 100, 120, 0.2)',
    borderTop: '3px solid #FF4D6D',
    borderRadius: '50%',
    margin: '0 auto 20px',
    animation: 'spin 1s linear infinite',
  },
  empty: {
    textAlign: 'center',
    padding: 60,
    color: 'rgba(255, 255, 255, 0.7)',
    fontFamily: "'RosticsCeraPro', sans-serif",
  },
  emptyIcon: {
    fontSize: 60,
    marginBottom: 15,
    filter: 'drop-shadow(0 0 20px rgba(255, 215, 0, 0.4))',
  },
  content: {
    display: 'flex',
    flexDirection: 'column',
    gap: 14,
  },
  podium: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'flex-end',
    gap: 8,
    paddingTop: 10,
    background: 'linear-gradient(180deg, rgba(21, 21, 21, 0.6) 0%, rgba(30, 30, 30, 0.4) 100%)',
    borderRadius: 16,
    padding: '16px 12px 0',
    border: '1px solid rgba(237, 28, 41, 0.15)',
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
    filter: 'drop-shadow(0 0 10px rgba(255, 215, 0, 0.6))',
    animation: 'crownFloat 2s ease-in-out infinite',
  },
  podiumAvatar1: {
    width: 56,
    height: 56,
    borderRadius: '14px 22px 14px 22px',
    background: 'linear-gradient(135deg, #FFD700 0%, #FFA500 100%)',
    color: '#fff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 22,
    fontWeight: 'bold',
    fontFamily: "'RosticsCeraCondensed', sans-serif",
    border: '2px solid rgba(255, 255, 255, 0.3)',
    boxShadow: '0 0 25px rgba(255, 215, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.3)',
  },
  podiumAvatar2: {
    width: 48,
    height: 48,
    borderRadius: '12px 18px 12px 18px',
    background: 'linear-gradient(135deg, #C0C0C0 0%, #A0A0A0 100%)',
    color: '#fff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 18,
    fontWeight: 'bold',
    fontFamily: "'RosticsCeraCondensed', sans-serif",
    border: '2px solid rgba(255, 255, 255, 0.2)',
    boxShadow: '0 0 15px rgba(192, 192, 192, 0.4)',
  },
  podiumAvatar3: {
    width: 48,
    height: 48,
    borderRadius: '12px 18px 12px 18px',
    background: 'linear-gradient(135deg, #CD7F32 0%, #A0522D 100%)',
    color: '#fff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 18,
    fontWeight: 'bold',
    fontFamily: "'RosticsCeraCondensed', sans-serif",
    border: '2px solid rgba(255, 255, 255, 0.2)',
    boxShadow: '0 0 15px rgba(205, 127, 50, 0.4)',
  },
  podiumName: {
    color: '#fff',
    fontWeight: 700,
    fontSize: 12,
    marginTop: 8,
    textAlign: 'center',
    maxWidth: '100%',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    fontFamily: "'RosticsCeraPro', sans-serif",
    textShadow: '0 0 10px rgba(255, 255, 255, 0.2)',
  },
  podiumScore: {
    color: 'rgba(244, 166, 152, 0.8)',
    fontSize: 11,
    marginTop: 2,
    fontFamily: "'RosticsCeraCondensed', sans-serif",
  },
  podiumStand: {
    width: '100%',
    borderRadius: '8px 14px 0 0',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
    color: '#fff',
  },
  podiumStand1: {
    height: 70,
    background: 'linear-gradient(180deg, rgba(255, 215, 0, 0.35) 0%, rgba(255, 165, 0, 0.45) 100%)',
    border: '1px solid rgba(255, 215, 0, 0.4)',
    borderBottom: 'none',
    boxShadow: '0 0 20px rgba(255, 215, 0, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
  },
  podiumStand2: {
    height: 55,
    background: 'linear-gradient(180deg, rgba(192, 192, 192, 0.35) 0%, rgba(160, 160, 160, 0.45) 100%)',
    border: '1px solid rgba(192, 192, 192, 0.4)',
    borderBottom: 'none',
    boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.1)',
  },
  podiumStand3: {
    height: 40,
    background: 'linear-gradient(180deg, rgba(205, 127, 50, 0.35) 0%, rgba(160, 82, 45, 0.45) 100%)',
    border: '1px solid rgba(205, 127, 50, 0.4)',
    borderBottom: 'none',
    boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.1)',
  },
  podiumMedal: {
    fontSize: 22,
    filter: 'drop-shadow(0 2px 4px rgba(0, 0, 0, 0.3))',
  },
  podiumRank: {
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 2,
    fontFamily: "'RosticsCeraCondensed', sans-serif",
  },
  myRankCard: {
    position: 'relative',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    background: 'linear-gradient(135deg, rgba(30, 30, 30, 0.9) 0%, rgba(40, 40, 40, 0.85) 100%)',
    backdropFilter: 'blur(15px)',
    borderRadius: 16,
    padding: 16,
    border: '1px solid rgba(237, 28, 41, 0.3)',
    boxShadow: '0 0 25px rgba(228, 0, 43, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.08)',
  },
  myRankLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
  },
  myRankAvatar: {
    width: 45,
    height: 45,
    borderRadius: '10px 16px 10px 16px',
    background: '#ED1C29',
    color: '#fff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 18,
    fontWeight: 'bold',
    fontFamily: "'RosticsCeraCondensed', sans-serif",
    boxShadow: '0 0 20px rgba(228, 0, 43, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.2)',
  },
  myRankLabel: {
    fontSize: 10,
    color: 'rgba(244, 166, 152, 0.7)',
    marginBottom: 2,
    textTransform: 'uppercase',
    letterSpacing: 1,
    fontWeight: 600,
  },
  myRankPosition: {
    fontSize: 22,
    fontWeight: 800,
    color: '#fff',
    fontFamily: "'RosticsCeraCondensed', sans-serif",
    textShadow: '0 0 15px rgba(255, 100, 120, 0.4)',
  },
  myRankOf: {
    fontSize: 14,
    fontWeight: 'normal',
    color: 'rgba(244, 166, 152, 0.6)',
    fontFamily: "'RosticsCeraPro', sans-serif",
  },
  myRankCity: {
    fontSize: 11,
    color: 'rgba(244, 166, 152, 0.5)',
    marginTop: 2,
    fontFamily: "'RosticsCeraPro', sans-serif",
  },
  myRankScore: {
    textAlign: 'right',
  },
  myRankScoreValue: {
    fontSize: 24,
    fontWeight: 800,
    color: '#fff',
    fontFamily: "'RosticsCeraCondensed', sans-serif",
    textShadow: '0 0 15px rgba(237, 28, 41, 0.4)',
  },
  myRankScoreLabel: {
    fontSize: 10,
    color: 'rgba(244, 166, 152, 0.6)',
    textTransform: 'uppercase',
    letterSpacing: 1,
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
    background: 'linear-gradient(160deg, rgba(21, 21, 21, 0.8) 0%, rgba(40, 40, 40, 0.7) 100%)',
    backdropFilter: 'blur(10px)',
    borderRadius: 12,
    border: '1px solid rgba(237, 28, 41, 0.12)',
    transition: 'all 0.2s ease',
  },
  entryHighlight: {
    background: 'linear-gradient(160deg, rgba(228, 0, 43, 0.2) 0%, rgba(180, 0, 30, 0.15) 100%)',
    border: '1px solid rgba(255, 100, 120, 0.35)',
    boxShadow: '0 0 15px rgba(228, 0, 43, 0.15)',
  },
  rank: {
    width: 28,
    fontSize: 14,
    fontWeight: 'bold',
    color: 'rgba(244, 166, 152, 0.7)',
    textAlign: 'center',
    fontFamily: "'RosticsCeraCondensed', sans-serif",
  },
  entryAvatar: {
    width: 38,
    height: 38,
    borderRadius: 12,
    background: 'linear-gradient(135deg, rgba(60, 60, 60, 0.6) 0%, rgba(40, 40, 40, 0.8) 100%)',
    color: 'rgba(200, 220, 255, 0.9)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 14,
    fontWeight: 'bold',
    fontFamily: "'RosticsCeraCondensed', sans-serif",
    border: '1px solid rgba(237, 28, 41, 0.15)',
  },
  info: {
    flex: 1,
    minWidth: 0,
  },
  username: {
    fontWeight: 700,
    color: '#fff',
    fontSize: 14,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    fontFamily: "'RosticsCeraPro', sans-serif",
  },
  stats: {
    fontSize: 10,
    color: 'rgba(244, 166, 152, 0.6)',
    marginTop: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  score: {
    fontSize: 16,
    fontWeight: 800,
    color: '#fff',
    fontFamily: "'RosticsCeraCondensed', sans-serif",
    textShadow: '0 0 10px rgba(237, 28, 41, 0.3)',
  },
};

// Add animations and styles
const styleSheet = document.createElement('style');
styleSheet.textContent = `
  /* @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@400;500;600;700;800&family=Rajdhani:wght@400;500;600;700&display=swap'); */

  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }

  @keyframes crownFloat {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-4px); }
  }

  /* Tab styles - sci-fi shape */
  .lb-tab {
  }
  .lb-tab:hover:not(.lb-tab-active) {
    background: linear-gradient(160deg, rgba(40, 40, 40, 0.9) 0%, rgba(50, 50, 50, 0.8) 100%) !important;
    color: rgba(255, 255, 255, 0.85);
    box-shadow: 0 0 15px rgba(237, 28, 41, 0.15);
  }
  .lb-tab-active {
    animation: tabPulse 2s ease-in-out infinite;
  }
  @keyframes tabPulse {
    0%, 100% { box-shadow: 0 0 25px rgba(228, 0, 43, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.2); }
    50% { box-shadow: 0 0 35px rgba(228, 0, 43, 0.7), inset 0 1px 0 rgba(255, 255, 255, 0.2); }
  }

  /* Region tab styles */
  .region-tab:hover:not(.region-tab-active) {
    background: rgba(60, 60, 60, 0.4) !important;
    color: rgba(255, 255, 255, 0.8);
  }

  /* Mobile background for leaderboard screen */
  @media (max-width: 500px) {
    .leaderboard-bg {
      background-image: url('/images/backgroundmob.png') !important;
    }
  }

  /* Podium entrance */
  @keyframes lbPodiumIn {
    from { opacity: 0; transform: translateY(25px) scale(0.95); }
    to { opacity: 1; transform: translateY(0) scale(1); }
  }
  .lb-podium { opacity: 0; }
  .lb-podium-visible { animation: lbPodiumIn 0.5s ease-out 0.1s both; }

  /* My rank card entrance */
  @keyframes lbMyRankIn {
    from { opacity: 0; transform: translateX(-15px); }
    to { opacity: 1; transform: translateX(0); }
  }
  .lb-my-rank { opacity: 0; }
  .lb-my-rank-visible { animation: lbMyRankIn 0.4s ease-out 0.3s both; }

  /* List entries stagger */
  @keyframes lbEntryIn {
    from { opacity: 0; transform: translateY(10px); }
    to { opacity: 1; transform: translateY(0); }
  }
  .lb-entry { opacity: 0; }
  .lb-entry-visible { animation: lbEntryIn 0.35s ease-out both; }

  /* prefers-reduced-motion */
  @media (prefers-reduced-motion: reduce) {
    .lb-podium-visible, .lb-my-rank-visible, .lb-entry-visible {
      animation: none !important;
      opacity: 1 !important;
      transform: none !important;
    }
    .lb-tab-active { animation: none !important; }
  }
`;
if (!document.getElementById('leaderboard-styles')) {
  styleSheet.id = 'leaderboard-styles';
  document.head.appendChild(styleSheet);
}
