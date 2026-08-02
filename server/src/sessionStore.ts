import { Store, SessionData } from "express-session";
import { db } from "./db";

type Callback = (err?: unknown) => void;

export class SqliteSessionStore extends Store {
  constructor() {
    super();
    db.prepare("DELETE FROM sessions WHERE expires IS NOT NULL AND expires < ?").run(Date.now());
  }

  get(sid: string, callback: (err: unknown, session?: SessionData | null) => void) {
    try {
      const row = db.prepare("SELECT sess, expires FROM sessions WHERE sid = ?").get(sid) as
        | { sess: string; expires: number | null }
        | undefined;
      if (!row) return callback(null, null);
      if (row.expires !== null && row.expires < Date.now()) {
        db.prepare("DELETE FROM sessions WHERE sid = ?").run(sid);
        return callback(null, null);
      }
      callback(null, JSON.parse(row.sess));
    } catch (err) {
      callback(err);
    }
  }

  set(sid: string, session: SessionData, callback?: Callback) {
    try {
      const expires = session.cookie?.expires
        ? new Date(session.cookie.expires).getTime()
        : Date.now() + 1000 * 60 * 60 * 24 * 30;
      db.prepare(
        `INSERT INTO sessions (sid, sess, expires) VALUES (?, ?, ?)
         ON CONFLICT(sid) DO UPDATE SET sess = excluded.sess, expires = excluded.expires`
      ).run(sid, JSON.stringify(session), expires);
      callback?.();
    } catch (err) {
      callback?.(err);
    }
  }

  destroy(sid: string, callback?: Callback) {
    try {
      db.prepare("DELETE FROM sessions WHERE sid = ?").run(sid);
      callback?.();
    } catch (err) {
      callback?.(err);
    }
  }

  touch(sid: string, session: SessionData, callback?: Callback) {
    this.set(sid, session, callback);
  }
}
