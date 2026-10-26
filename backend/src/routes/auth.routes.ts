import { Router } from "express"
import { login, logout, me, register } from "@/controllers/auth.controller"
import { googleAuthUrl, googleSignIn } from "@/controllers/google-auth.controller"
import { requireAuth } from "@/middleware/auth.middleware"
import { loginRateLimiter } from "@/middleware/rate-limit.middleware"

const router = Router()

router.post("/register", register)
router.post("/login", loginRateLimiter, login)
router.post("/logout", logout)
router.get("/google/url", googleAuthUrl)
router.post("/google", googleSignIn)
router.get("/me", requireAuth, me)

export default router
