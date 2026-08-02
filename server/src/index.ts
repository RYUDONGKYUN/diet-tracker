import path from "node:path";
import fs from "node:fs";
import dotenv from "dotenv";

dotenv.config();

import express from "express";
import cors from "cors";
import session from "express-session";
import "./db";
import { SqliteSessionStore } from "./sessionStore";
import { authRouter, requireAuth } from "./routes/auth";
import { profileRouter } from "./routes/profile";
import { weightRouter } from "./routes/weight";
import { mealsRouter } from "./routes/meals";
import { exerciseRouter } from "./routes/exercise";
import { bodyPhotosRouter } from "./routes/bodyPhotos";
import { recommendRouter } from "./routes/recommend";
import { weeklyReviewRouter } from "./routes/weeklyReview";

const app = express();
const PORT = Number(process.env.SERVER_PORT) || 4100;
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || "http://localhost:5174";

app.use(cors({ origin: CLIENT_ORIGIN, credentials: true }));
app.use(express.json({ limit: "5mb" }));
app.use(
  session({
    store: new SqliteSessionStore(),
    name: "diet.sid",
    secret: process.env.SESSION_SECRET || "diet-tracker-local-dev-secret",
    resave: false,
    saveUninitialized: false,
    rolling: true,
    cookie: {
      httpOnly: true,
      sameSite: "lax",
      maxAge: 1000 * 60 * 60 * 24 * 90,
    },
  })
);

app.use("/api/auth", authRouter);
app.use("/uploads", requireAuth, express.static(path.join(__dirname, "..", "uploads")));

app.use("/api/profile", requireAuth, profileRouter);
app.use("/api/weight", requireAuth, weightRouter);
app.use("/api/meals", requireAuth, mealsRouter);
app.use("/api/exercise", requireAuth, exerciseRouter);
app.use("/api/body-photos", requireAuth, bodyPhotosRouter);
app.use("/api/recommend", requireAuth, recommendRouter);
app.use("/api/weekly-reviews", requireAuth, weeklyReviewRouter);

app.get("/api/health", (_req, res) => res.json({ ok: true }));

const clientDist = path.join(__dirname, "..", "..", "client", "dist");
if (fs.existsSync(clientDist)) {
  // the service worker and manifest must always revalidate so PWA updates
  // (registerType: "autoUpdate") aren't stuck behind a year-long cache
  const NO_CACHE_FILES = new Set(["sw.js", "workbox-*.js", "manifest.webmanifest", "registerSW.js"]);
  app.use(
    express.static(clientDist, {
      index: false,
      maxAge: "1y",
      immutable: true,
      setHeaders: (res, filePath) => {
        const base = path.basename(filePath);
        const isNoCache = [...NO_CACHE_FILES].some(
          (pattern) => base === pattern || (pattern.includes("*") && base.startsWith("workbox-"))
        );
        if (isNoCache) {
          res.setHeader("Cache-Control", "no-cache");
        }
      },
    })
  );
  app.get(/^(?!\/api|\/uploads).*/, (_req, res) => {
    res.set("Cache-Control", "no-cache");
    res.sendFile(path.join(clientDist, "index.html"));
  });
}

app.listen(PORT, () => {
  console.log(`체지방 트래커 서버 실행 중: http://localhost:${PORT}`);
});
