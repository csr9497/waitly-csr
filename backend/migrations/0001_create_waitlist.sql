CREATE TABLE IF NOT EXISTS waitlist (
  email     TEXT PRIMARY KEY,
  joined_at TEXT NOT NULL,
  country   TEXT
);
