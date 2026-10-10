import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { randomBytes, scrypt, scryptSync, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

const scryptAsync = promisify(scrypt);
const KEY_LENGTH = 64;

export function openDatabase(filename) {
  if (filename !== ':memory:') mkdirSync(path.dirname(filename), { recursive: true });
  const db = new DatabaseSync(filename);
  db.exec(`
    PRAGMA foreign_keys = ON;
    PRAGMA journal_mode = WAL;
    PRAGMA synchronous = NORMAL;
    PRAGMA busy_timeout = 5000;
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE COLLATE NOCASE,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'user' CHECK(role IN ('user','admin')),
      member_until TEXT,
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS sessions (
      token_hash TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      expires_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS sessions_expiry ON sessions(expires_at);
    CREATE INDEX IF NOT EXISTS sessions_user ON sessions(user_id);
    CREATE TABLE IF NOT EXISTS membership_orders (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      amount INTEGER NOT NULL,
      currency TEXT NOT NULL DEFAULT 'VND',
      duration_days INTEGER NOT NULL DEFAULT 30,
      reference TEXT NOT NULL UNIQUE,
      status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','approved')),
      created_at TEXT NOT NULL,
      approved_at TEXT,
      approved_by TEXT REFERENCES users(id)
    );
    CREATE INDEX IF NOT EXISTS orders_user ON membership_orders(user_id, created_at);
    CREATE UNIQUE INDEX IF NOT EXISTS orders_one_pending ON membership_orders(user_id) WHERE status = 'pending';
    CREATE UNIQUE INDEX IF NOT EXISTS orders_one_pending ON membership_orders(user_id) WHERE status = 'pending';
    CREATE UNIQUE INDEX IF NOT EXISTS orders_one_pending ON membership_orders(user_id) WHERE status = 'pending';
    CREATE TABLE IF NOT EXISTS membership_interests (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS resource_entries (
      id TEXT PRIMARY KEY,
      payload TEXT NOT NULL,
      deleted INTEGER NOT NULL DEFAULT 0 CHECK(deleted IN (0,1)),
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS uploads (
      file TEXT PRIMARY KEY,
      tier TEXT NOT NULL CHECK(tier IN ('free','premium')),
      name TEXT NOT NULL,
      mime TEXT NOT NULL,
      created_at TEXT NOT NULL,
      created_by TEXT NOT NULL REFERENCES users(id)
    );
  `);
  return db;
}

const encode = (salt, key) => `scrypt:${salt}:${key.toString('hex')}`;

// Synchronous variant for the one-off CLI bootstrap; request handlers use the async
// functions below so a burst of logins cannot stall video streaming or uploads.
export function hashPassword(password) {
  const salt = randomBytes(16).toString('hex');
  return encode(salt, scryptSync(password, salt, KEY_LENGTH));
}

export async function hashPasswordAsync(password) {
  const salt = randomBytes(16).toString('hex');
  return encode(salt, await scryptAsync(password, salt, KEY_LENGTH));
}

function parseStored(stored) {
  const [scheme, salt, value] = String(stored).split(':');
  if (scheme !== 'scrypt' || !salt || !value) return null;
  const expected = Buffer.from(value, 'hex');
  return expected.length === KEY_LENGTH ? { salt, expected } : null;
}

export function verifyPassword(password, stored) {
  const parsed = parseStored(stored);
  if (!parsed) return false;
  try { return timingSafeEqual(parsed.expected, scryptSync(password, parsed.salt, KEY_LENGTH)); }
  catch { return false; }
}

export async function verifyPasswordAsync(password, stored) {
  const parsed = parseStored(stored);
  if (!parsed) return false;
  try { return timingSafeEqual(parsed.expected, await scryptAsync(password, parsed.salt, KEY_LENGTH)); }
  catch { return false; }
}

export function publicUser(row) {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role,
    isMember: row.role === 'admin' || Boolean(row.member_until && Date.parse(row.member_until) > Date.now()),
    memberUntil: row.member_until,
  };
}
