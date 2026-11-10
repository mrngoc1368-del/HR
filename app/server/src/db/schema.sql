CREATE TABLE IF NOT EXISTS users (
  id            TEXT PRIMARY KEY,
  name          TEXT NOT NULL,
  email         TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role          TEXT NOT NULL CHECK (role IN ('employee','lead','director')),
  title         TEXT NOT NULL,
  team          TEXT NOT NULL,
  phone         TEXT,
  start_month   TEXT,
  base_salary   BIGINT NOT NULL DEFAULT 0,
  allowance     BIGINT NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS sessions (
  id            SERIAL PRIMARY KEY,
  user_id       TEXT NOT NULL REFERENCES users(id),
  token_hash    TEXT NOT NULL UNIQUE,
  expires_at    TIMESTAMPTZ NOT NULL,
  revoked       BOOLEAN NOT NULL DEFAULT FALSE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS leave_balances (
  user_id       TEXT NOT NULL REFERENCES users(id),
  year          INT  NOT NULL,
  annual_total  NUMERIC(4,1) NOT NULL DEFAULT 12,
  annual_used   NUMERIC(4,1) NOT NULL DEFAULT 0,
  sick_total    NUMERIC(4,1) NOT NULL DEFAULT 5,
  sick_used     NUMERIC(4,1) NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, year)
);

CREATE TABLE IF NOT EXISTS leave_requests (
  id            TEXT PRIMARY KEY,
  user_id       TEXT NOT NULL REFERENCES users(id),
  type          TEXT NOT NULL CHECK (type IN ('annual','sick','unpaid')),
  from_date     DATE NOT NULL,
  to_date       DATE NOT NULL,
  half_day      BOOLEAN NOT NULL DEFAULT FALSE,
  days          NUMERIC(4,1) NOT NULL,
  reason        TEXT NOT NULL DEFAULT '',
  status        TEXT NOT NULL CHECK (status IN ('lead','director','approved','rejected')),
  created_at    DATE NOT NULL DEFAULT CURRENT_DATE
);

CREATE TABLE IF NOT EXISTS approval_logs (
  id            SERIAL PRIMARY KEY,
  request_id    TEXT NOT NULL REFERENCES leave_requests(id),
  actor_id      TEXT NOT NULL REFERENCES users(id),
  action        TEXT NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS notifications (
  id            SERIAL PRIMARY KEY,
  user_id       TEXT NOT NULL REFERENCES users(id),
  message       TEXT NOT NULL,
  request_id    TEXT,
  read          BOOLEAN NOT NULL DEFAULT FALSE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS payslips (
  id            SERIAL PRIMARY KEY,
  user_id       TEXT NOT NULL REFERENCES users(id),
  month         TEXT NOT NULL,
  UNIQUE (user_id, month)
);

CREATE TABLE IF NOT EXISTS payslip_items (
  id            SERIAL PRIMARY KEY,
  payslip_id    INT NOT NULL REFERENCES payslips(id) ON DELETE CASCADE,
  kind          TEXT NOT NULL CHECK (kind IN ('earning','deduction')),
  code          TEXT NOT NULL,
  label         TEXT NOT NULL,
  amount        BIGINT NOT NULL
);
