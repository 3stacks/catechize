CREATE TABLE IF NOT EXISTS reminders (
  endpoint  TEXT PRIMARY KEY,
  hour      INTEGER NOT NULL,
  tz        TEXT    NOT NULL,
  next_due  INTEGER,
  last_sent INTEGER
);
CREATE INDEX IF NOT EXISTS reminders_due ON reminders (next_due);
