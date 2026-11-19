import { Router } from "express"

import { getAdminOverview } from "@/controllers/admin-overview.controller"
import { requireAuth, requireRole } from "@/middleware/auth.middleware"

const router = Router()

router.use(requireAuth, requireRole("admin"))

router.get("/", getAdminOverview)

export default router
