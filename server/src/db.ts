import path from "node:path";
import fs from "node:fs";
import { DatabaseSync } from "node:sqlite";

const dataDir = path.join(__dirname, "..", "data");
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

const dbPath = path.join(dataDir, "tracker.db");
export const db = new DatabaseSync(dbPath);

db.exec("PRAGMA foreign_keys = ON;");

db.exec(`
CREATE TABLE IF NOT EXISTS user_profile (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  height_cm REAL NOT NULL,
  start_weight_kg REAL NOT NULL,
  goal_weight_kg REAL NOT NULL,
  start_skeletal_muscle_kg REAL,
  goal_skeletal_muscle_kg REAL,
  start_body_fat_pct REAL,
  start_visceral_fat_level REAL,
  phase TEXT NOT NULL DEFAULT 'cutting' CHECK (phase IN ('cutting', 'maintenance')),
  cutting_kcal REAL NOT NULL,
  cutting_protein_min REAL NOT NULL,
  cutting_protein_max REAL NOT NULL,
  maintenance_kcal REAL NOT NULL,
  maintenance_protein_min REAL NOT NULL,
  maintenance_protein_max REAL NOT NULL,
  fat_pct_of_kcal REAL NOT NULL DEFAULT 0.25,
  screen_golf_expiry TEXT,
  gym_expiry TEXT,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
`);

db.exec(`
CREATE TABLE IF NOT EXISTS weight_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  date TEXT UNIQUE NOT NULL,
  weight_kg REAL NOT NULL,
  memo TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
`);

db.exec(`
CREATE TABLE IF NOT EXISTS meal_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  date TEXT NOT NULL,
  slot TEXT NOT NULL CHECK (slot IN ('breakfast', 'lunch', 'snack', 'dinner', 'late_night')),
  food_name TEXT NOT NULL,
  calories REAL NOT NULL DEFAULT 0,
  carbs_g REAL NOT NULL DEFAULT 0,
  protein_g REAL NOT NULL DEFAULT 0,
  fat_g REAL NOT NULL DEFAULT 0,
  photo_path TEXT,
  source TEXT NOT NULL DEFAULT 'manual' CHECK (source IN ('manual', 'gemini', 'url')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
`);

db.exec(`
CREATE TABLE IF NOT EXISTS body_photos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  date TEXT NOT NULL,
  photo_path TEXT NOT NULL,
  angle TEXT,
  memo TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
`);

db.exec(`
CREATE TABLE IF NOT EXISTS exercise_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  date TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('weight', 'running', 'screen_golf', 'boxing', 'other')),
  custom_label TEXT,
  duration_min REAL,
  intensity TEXT,
  memo TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
`);

db.exec(`
CREATE TABLE IF NOT EXISTS weekly_reviews (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  week_start TEXT UNIQUE NOT NULL,
  avg_sleep REAL,
  condition_note TEXT,
  weight_delta REAL,
  next_week_kcal_target REAL,
  next_week_note TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
`);

db.exec(`
CREATE TABLE IF NOT EXISTS sessions (
  sid TEXT PRIMARY KEY,
  sess TEXT NOT NULL,
  expires INTEGER
);
`);

db.exec(`CREATE INDEX IF NOT EXISTS idx_meal_items_date ON meal_items(date);`);
db.exec(`CREATE INDEX IF NOT EXISTS idx_body_photos_date ON body_photos(date);`);
db.exec(`CREATE INDEX IF NOT EXISTS idx_exercise_logs_date ON exercise_logs(date);`);

const existingProfile = db.prepare("SELECT id FROM user_profile WHERE id = 1").get();
if (!existingProfile) {
  db.prepare(
    `INSERT INTO user_profile (
      id, height_cm, start_weight_kg, goal_weight_kg,
      start_skeletal_muscle_kg, goal_skeletal_muscle_kg,
      start_body_fat_pct, start_visceral_fat_level,
      phase, cutting_kcal, cutting_protein_min, cutting_protein_max,
      maintenance_kcal, maintenance_protein_min, maintenance_protein_max,
      fat_pct_of_kcal, screen_golf_expiry, gym_expiry
    ) VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    173, 80.4, 72.0,
    32.1, 32.1,
    28.8, 8,
    "cutting", 2050, 140, 150,
    2400, 130, 140,
    0.25, "2026-08-04", "2026-08-22"
  );
}
