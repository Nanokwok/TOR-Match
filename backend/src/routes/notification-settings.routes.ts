import { Router } from "express"
import {
  getMyNotificationSettings,
  upsertMyNotificationSettings,
} from "@/controllers/notification-settings.controller"
import { requireAuth } from "@/middleware/auth.middleware"

const router = Router()

router.use(requireAuth)
router.get("/", getMyNotificationSettings)
router.put("/", upsertMyNotificationSettings)

export default router
