-- Backend DB schema (business master data + wide-table results)
-- Database/user creation is environment-specific; create them outside or adapt this script.

CREATE TABLE IF NOT EXISTS projects (
  id            VARCHAR(64)  NOT NULL PRIMARY KEY,
  name          VARCHAR(255) NOT NULL,
  description   TEXT         NULL,
  created_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS requirements (
  id            VARCHAR(64)  NOT NULL PRIMARY KEY,
  project_id    VARCHAR(64)  NOT NULL,
  title         VARCHAR(255) NOT NULL,
  phase         VARCHAR(32)  NOT NULL DEFAULT 'demo',
  status        VARCHAR(32)  NOT NULL DEFAULT 'draft',
  created_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_requirements_project_id (project_id)
);

