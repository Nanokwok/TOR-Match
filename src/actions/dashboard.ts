"use server"

import { getDashboardData } from "@/server/services/dashboard.service"

export async function getDashboardDataAction() {
  return getDashboardData()
}
