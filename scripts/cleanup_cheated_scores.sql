-- ============================================================
-- Cleanup script: Remove cheated scores above 18,770 threshold
-- Run against production PostgreSQL database
-- ============================================================

-- 1. Preview: Show affected users BEFORE cleanup
SELECT u.id, u.username, u.total_score, u.email
FROM users u
WHERE u.total_score > 18770
ORDER BY u.total_score DESC;

-- 2. Preview: Show affected user_level_progress records
SELECT ulp.user_id, ulp.level_id, ulp.best_score, u.username
FROM user_level_progress ulp
JOIN users u ON u.id = ulp.user_id
WHERE ulp.best_score > 18770
ORDER BY ulp.best_score DESC;

-- 3. Preview: Show affected game_sessions
SELECT gs.id, gs.user_id, gs.level_id, gs.score, gs.duration_seconds, gs.created_at, u.username
FROM game_sessions gs
JOIN users u ON u.id = gs.user_id
WHERE gs.score > 18770
ORDER BY gs.score DESC;

-- ============================================================
-- EXECUTE CLEANUP (uncomment to run)
-- ============================================================

-- Step A: Cap best_score in user_level_progress to 18770
-- UPDATE user_level_progress
-- SET best_score = 18770
-- WHERE best_score > 18770;

-- Step B: Mark cheated game sessions
-- UPDATE game_sessions
-- SET score = 0, is_won = false
-- WHERE score > 18770;

-- Step C: Recalculate total_score for ALL users from capped best_scores
-- UPDATE users u
-- SET total_score = COALESCE((
--     SELECT SUM(ulp.best_score)
--     FROM user_level_progress ulp
--     WHERE ulp.user_id = u.id
-- ), 0);

-- Step D: Invalidate leaderboard cache (run in Redis CLI)
-- redis-cli KEYS "leaderboard:*" | xargs redis-cli DEL
