import { Router } from "express"
import {
  getAdminCompanyById,
  getAdminCompanyStats,
  listAdminCompanies,
  patchAdminCompanyStatus,
} from "@/controllers/admin-company.controller"
import { getMyCompany, upsertMyCompany } from "@/controllers/company.controller"
import { requireAuth, requireRole } from "@/middleware/auth.middleware"

const router = Router()

router.get("/me", requireAuth, getMyCompany)
router.put("/me", requireAuth, upsertMyCompany)

const requireAdmin = [requireAuth, requireRole("admin")] as const

router.get("/admin/stats", ...requireAdmin, getAdminCompanyStats)
router.get("/admin", ...requireAdmin, listAdminCompanies)
router.get("/admin/:id", ...requireAdmin, getAdminCompanyById)
router.patch("/admin/:id/status", ...requireAdmin, patchAdminCompanyStatus)

export default router
