import { resolve } from "node:path";
import express from "express";
import { app } from "./app.js";
import { config, checkConfig } from "./config.js";
import { prisma } from "./db.js";
import { checkDatabase } from "./modules/health/health.repository.js";
checkConfig();
await checkDatabase();
// One origin in production: serve the built SPA and API together.
if (config.production) {
  const dist = resolve("../frontend/dist");
  // The API 404 handler is already registered; add SPA serving via a parent app.
  const host = express();
  host.use((req, res, next) =>
    req.path === "/api" || req.path.startsWith("/api/")
      ? app(req, res, next)
      : next(),
  );
  host.use(express.static(dist));
  host.get("/{*path}", (req, res) => res.sendFile(resolve(dist, "index.html")));
  const server = host.listen(config.port, () =>
    console.log("Taskflow: http://localhost:" + config.port),
  );
  process.once("SIGINT", () => server.close(() => prisma.$disconnect()));
  process.once("SIGTERM", () => server.close(() => prisma.$disconnect()));
} else {
  const server = app.listen(config.port, () =>
    console.log("Taskflow API: http://localhost:" + config.port),
  );
  process.once("SIGINT", () => server.close(() => prisma.$disconnect()));
  process.once("SIGTERM", () => server.close(() => prisma.$disconnect()));
}
