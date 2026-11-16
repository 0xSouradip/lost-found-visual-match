import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.join(__dirname, '..', 'data');
fs.mkdirSync(dataDir, { recursive: true });

const db = new Database(path.join(dataDir, 'lostfound.db'));
db.pragma('journal_mode = WAL');

db.exec(`
CREATE TABLE IF NOT EXISTS found_items (
  id TEXT PRIMARY KEY,
  session TEXT,
  image_path TEXT,
  category TEXT,
  color TEXT,
  brand TEXT,
  location TEXT,
  found_at TEXT,
  description TEXT,
  verification_question TEXT,
  verification_answer TEXT,
  embedding TEXT,
  status TEXT DEFAULT 'open',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS lost_reports (
  id TEXT PRIMARY KEY,
  session TEXT,
  image_path TEXT,
  text_query TEXT,
  category TEXT,
  color TEXT,
  location TEXT,
  lost_at TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS claims (
  id TEXT PRIMARY KEY,
  found_id TEXT,
  lost_id TEXT,
  session TEXT,
  answer TEXT,
  result TEXT,
  handoff_code TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
`);

export default db;
