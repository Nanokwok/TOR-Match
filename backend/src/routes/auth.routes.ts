import { Router } from "express"
import { changePassword, login, logout, me, refresh, register } from "@/controllers/auth.controller"
import { googleAuthUrl, googleSignIn } from "@/controllers/google-auth.controller"
import { optionalAuth, requireAuth } from "@/middleware/auth.middleware"
import { loginRateLimiter } from "@/middleware/rate-limit.middleware"

const router = Router()

router.post("/register", register)
router.post("/login", loginRateLimiter, login)
router.post("/logout", optionalAuth, logout)
router.post("/refresh", requireAuth, refresh)
router.post("/change-password", requireAuth, changePassword)
router.get("/google/url", googleAuthUrl)
router.post("/google", googleSignIn)
router.get("/me", requireAuth, me)

export default router
