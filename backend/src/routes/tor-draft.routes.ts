import { Router } from "express"
import {
  getTorDraftById,
  listTorDrafts,
  publishTorDraft,
  updateTorDraft,
} from "@/controllers/tor-draft.controller"
import { requireAuth, requireRole } from "@/middleware/auth.middleware"

const router = Router()

// Unpublished draft content — admins only, all of it.
router.use(requireAuth, requireRole("admin"))

router.get("/", listTorDrafts)
router.get("/:id", getTorDraftById)
router.put("/:id", updateTorDraft)
router.post("/:id/publish", publishTorDraft)

export default router
