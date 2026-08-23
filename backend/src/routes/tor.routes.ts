import { Router } from "express"
import {
  getTorById,
  listTorDepartments,
  listTorLocalOffices,
  listTors,
} from "@/controllers/tor.controller"
import { optionalAuth } from "@/middleware/auth.middleware"

const router = Router()

router.get("/", optionalAuth, listTors)
router.get("/departments", listTorDepartments)
router.get("/local-offices", listTorLocalOffices)
router.get("/:id", optionalAuth, getTorById)

export default router
