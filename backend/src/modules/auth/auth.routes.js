import { Router } from "express";
import { rateLimit } from "express-rate-limit";
import { authenticate } from "../../middleware/auth.js";
import { validate } from "../../lib/validation.js";
import { loginSchema } from "./auth.validation.js";
import * as controller from "./auth.controller.js";
const router = Router();
const loginLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 50,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      message: "Too many login attempts. Try again later.",
      details: [],
    },
  },
});
router.post("/login", loginLimit, validate(loginSchema), controller.login);
router.post("/logout", controller.logout);
router.get("/me", authenticate, controller.me);
export default router;
