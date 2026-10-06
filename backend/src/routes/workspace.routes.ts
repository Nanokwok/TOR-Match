import { Router } from "express"
import {
  addCard,
  getBoard,
  moveCard,
  removeCard,
  removeCardByTorId,
  updateCard,
} from "@/controllers/workspace.controller"
import { requireAuth } from "@/middleware/auth.middleware"

const router = Router()

router.use(requireAuth)
router.get("/board", getBoard)
router.post("/cards", addCard)
router.patch("/cards/:id/move", moveCard)
router.patch("/cards/:id", updateCard)
router.delete("/cards/by-tor/:torId", removeCardByTorId)
router.delete("/cards/:id", removeCard)

export default router
