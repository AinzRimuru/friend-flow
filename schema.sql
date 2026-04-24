CREATE TABLE IF NOT EXISTS articles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    friend_url TEXT NOT NULL,
    title TEXT NOT NULL,
    url TEXT NOT NULL UNIQUE,
    publish_time TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_articles_friend_url ON articles(friend_url);
CREATE INDEX IF NOT EXISTS idx_articles_publish_time ON articles(publish_time);

CREATE TABLE IF NOT EXISTS fetch_status (
    friend_url TEXT PRIMARY KEY,
    last_fetch_time TEXT,
    status TEXT DEFAULT 'pending',
    consecutive_failures INTEGER DEFAULT 0,
    next_retry_time TEXT,
    stopped INTEGER DEFAULT 0,
    error_message TEXT
);
