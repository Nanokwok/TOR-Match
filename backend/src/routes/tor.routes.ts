import { Router } from "express"
import {
  getTorById,
  getTorQualification,
  listTorDepartments,
  listTorLocalOffices,
  listTors,
} from "@/controllers/tor.controller"
import { getSelfCheck, saveSelfCheck } from "@/controllers/self-check.controller"
import { optionalAuth, requireAuth } from "@/middleware/auth.middleware"

const router = Router()

router.get("/", optionalAuth, listTors)
router.get("/departments", listTorDepartments)
router.get("/local-offices", listTorLocalOffices)
// Before "/:id", or Express would match the id route against these paths.
router.get("/:id/qualification", requireAuth, getTorQualification)
router.get("/:id/self-check", requireAuth, getSelfCheck)
router.put("/:id/self-check", requireAuth, saveSelfCheck)
router.get("/:id", optionalAuth, getTorById)

export default router
