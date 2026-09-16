import { Router } from "express"
import {
  getTorById,
  getTorQualification,
  listTorDepartments,
  listTorLocalOffices,
  listTors,
} from "@/controllers/tor.controller"
import { optionalAuth, requireAuth } from "@/middleware/auth.middleware"

const router = Router()

router.get("/", optionalAuth, listTors)
router.get("/departments", listTorDepartments)
router.get("/local-offices", listTorLocalOffices)
router.get("/:id/qualification", requireAuth, getTorQualification)
router.get("/:id", optionalAuth, getTorById)

export default router
