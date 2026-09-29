import { Router } from "express"

import {
  getAdminSettings,
  resetAdminSettings,
  updateAdminSettings,
} from "@/controllers/admin-settings.controller"
import { requireAuth, requireRole } from "@/middleware/auth.middleware"

const router = Router()

const requireAdmin = [requireAuth, requireRole("admin")] as const

router.use(...requireAdmin)

router.get("/", getAdminSettings)
router.put("/", updateAdminSettings)
router.post("/reset", resetAdminSettings)

export default router
