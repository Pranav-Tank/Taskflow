import health from "./modules/health/health.routes.js";
import express from "express";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import { rateLimit } from "express-rate-limit";
import { config } from "./config.js";
import { authenticate } from "./middleware/auth.js";
import authRoutes from "./modules/auth/auth.routes.js";
import projects from "./modules/projects/project.routes.js";
import tasks from "./modules/tasks/task.routes.js";
import users from "./modules/users/user.routes.js";
import analytics from "./modules/analytics/analytics.routes.js";
import { AppError, errorHandler } from "./lib/errors.js";
export const app = express();
app.disable("x-powered-by");
app.use(helmet());
app.use(
  express.json({
    limit: "32kb",
  }),
);
app.use(cookieParser());
app.use("/api", (req, res, next) => {
  if (
    !["GET", "HEAD", "OPTIONS"].includes(req.method) &&
    req.headers.origin &&
    req.headers.origin !== config.origin
  )
    return next(new AppError("Request origin is not allowed", 403));
  next();
});
app.use("/api/health", health);
app.use(
  "/api",
  rateLimit({
    windowMs: 5 * 60 * 1000,
    limit: 1000,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    message: {
      success: false,
      error: {
        message: "Too many requests. Please try again shortly.",
        details: [],
      },
    },
  }),
);
app.use("/api/auth", authRoutes);
app.use("/api", authenticate);
app.use("/api/projects", projects);
app.use("/api/tasks", tasks);
app.use("/api/users", users);
app.use("/api", analytics);
app.use((req, res, next) => next(new AppError("Route not found", 404)));
app.use(errorHandler);
