import { Router } from "express"
import {
  getTorDraftById,
  listScrapeJobs,
  listTorDrafts,
  publishTorDraft,
  updateTorDraft,
} from "@/controllers/tor-draft.controller"
import { requireAuth, requireRole } from "@/middleware/auth.middleware"

const router = Router()

// Unpublished scrape output — admins only, all of it.
router.use(requireAuth, requireRole("admin"))

// Declared before "/:id" so the literal path is not swallowed as an id.
router.get("/jobs", listScrapeJobs)

router.get("/", listTorDrafts)
router.get("/:id", getTorDraftById)
router.put("/:id", updateTorDraft)
router.post("/:id/publish", publishTorDraft)

export default router
