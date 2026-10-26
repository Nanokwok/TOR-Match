import { Router } from "express"

import { getAdminOverview } from "@/controllers/admin-overview.controller"
import { requireAuth, requireRole } from "@/middleware/auth.middleware"

const router = Router()

router.get("/", requireAuth, requireRole("admin"), getAdminOverview)

export default router
