import { Router } from "express"
import {
  deleteNotification,
  listNotifications,
  markAllAsRead,
  markAsRead,
} from "@/controllers/notification.controller"
import { requireAuth } from "@/middleware/auth.middleware"

const router = Router()

router.use(requireAuth)
router.get("/", listNotifications)
router.patch("/:id/read", markAsRead)
router.patch("/read-all", markAllAsRead)
router.delete("/:id", deleteNotification)

export default router
