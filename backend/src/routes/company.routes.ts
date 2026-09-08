import { Router } from "express"
import { getMyCompany, upsertMyCompany } from "@/controllers/company.controller"
import { requireAuth } from "@/middleware/auth.middleware"

const router = Router()

router.get("/me", requireAuth, getMyCompany)
router.put("/me", requireAuth, upsertMyCompany)

export default router
