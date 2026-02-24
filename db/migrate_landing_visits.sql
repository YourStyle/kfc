-- Migration: Add landing_visits and landing_stats_share tables
-- Run this on existing databases. For fresh setups, init.sql handles it.

-- Landing visits tracking table
CREATE TABLE IF NOT EXISTS landing_visits (
    id SERIAL PRIMARY KEY,
    ip_address VARCHAR(45),
    city VARCHAR(100),
    country VARCHAR(100),
    region VARCHAR(200),
    user_agent VARCHAR(512),
    referrer VARCHAR(500),
    is_fake BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_landing_visits_created ON landing_visits(created_at);
CREATE INDEX IF NOT EXISTS idx_landing_visits_city ON landing_visits(city);

-- Landing stats sharing (password-protected public access)
CREATE TABLE IF NOT EXISTS landing_stats_share (
    id SERIAL PRIMARY KEY,
    token VARCHAR(64) UNIQUE NOT NULL,
    password_hash VARCHAR(256) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Seed 207 fake visits from Feb 21-24, 2026 (Yekaterinburg)
-- Distribution: Feb 21 = 35, Feb 22 = 58, Feb 23 = 65, Feb 24 = 49
INSERT INTO landing_visits (ip_address, city, country, region, user_agent, referrer, is_fake, created_at)
SELECT
    (ARRAY['5.58.', '79.120.', '109.195.', '178.49.'])[1 + floor(random()*4)::int]
        || floor(random()*256)::int::text || '.' || floor(random()*256)::int::text,
    'Екатеринбург',
    'Россия',
    'Свердловская область',
    (ARRAY[
        'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
        'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.6099.43 Mobile Safari/537.36',
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15',
        'Mozilla/5.0 (Linux; Android 13; SM-A536B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Mobile Safari/537.36',
        'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1',
        'Mozilla/5.0 (Linux; Android 14; SM-S918B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0'
    ])[1 + floor(random()*8)::int],
    (ARRAY[
        NULL, NULL, NULL, NULL, NULL,
        'https://vk.com/', 'https://t.me/', 'https://instagram.com/',
        'https://yandex.ru/search/', NULL, NULL
    ])[1 + floor(random()*11)::int],
    TRUE,
    days.day + (random() * interval '14 hours') + interval '8 hours'
FROM (
    SELECT '2026-02-21 00:00:00'::timestamp AS day, 35 AS cnt
    UNION ALL SELECT '2026-02-22 00:00:00'::timestamp, 58
    UNION ALL SELECT '2026-02-23 00:00:00'::timestamp, 65
    UNION ALL SELECT '2026-02-24 00:00:00'::timestamp, 49
) AS days,
LATERAL generate_series(1, days.cnt) AS s;
