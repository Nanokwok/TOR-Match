import { Router } from "express"
import { login, logout, me, refresh, register } from "@/controllers/auth.controller"
import { googleAuthUrl, googleSignIn } from "@/controllers/google-auth.controller"
import { forgotPassword, resetPasswordWithToken } from "@/controllers/password-reset.controller"
import { requireAuth } from "@/middleware/auth.middleware"
import {
  forgotPasswordRateLimiter,
  loginRateLimiter,
  resetPasswordRateLimiter,
} from "@/middleware/rate-limit.middleware"

const router = Router()

router.post("/register", register)
router.post("/login", loginRateLimiter, login)
router.post("/logout", logout)
router.post("/forgot-password", forgotPasswordRateLimiter, forgotPassword)
router.post("/reset-password", resetPasswordRateLimiter, resetPasswordWithToken)
router.post("/refresh", requireAuth, refresh)
router.get("/google/url", googleAuthUrl)
router.post("/google", googleSignIn)
router.get("/me", requireAuth, me)

export default router
