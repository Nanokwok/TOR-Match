import { Router } from "express"
import { addCard, getBoard, moveCard, removeCard } from "@/controllers/workspace.controller"
import { requireAuth } from "@/middleware/auth.middleware"

const router = Router()

router.use(requireAuth)
router.get("/board", getBoard)
router.post("/cards", addCard)
router.patch("/cards/:id/move", moveCard)
router.delete("/cards/:id", removeCard)

export default router
