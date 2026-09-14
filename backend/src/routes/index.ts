import { Router } from "express"
import authRoutes from "@/routes/auth.routes"
import torRoutes from "@/routes/tor.routes"
import torDraftRoutes from "@/routes/tor-draft.routes"
import companyRoutes from "@/routes/company.routes"
import workspaceRoutes from "@/routes/workspace.routes"
import notificationRoutes from "@/routes/notification.routes"
import notificationSettingsRoutes from "@/routes/notification-settings.routes"

const router = Router()

router.get("/health", (_req, res) => res.status(200).json({ ok: true }))

router.use("/auth", authRoutes)
router.use("/tors", torRoutes)
router.use("/tor-drafts", torDraftRoutes)
router.use("/companies", companyRoutes)
router.use("/workspace", workspaceRoutes)
router.use("/notifications", notificationRoutes)
router.use("/notification-settings", notificationSettingsRoutes)

export default router
