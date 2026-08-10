"use server"

import {
  getTorById,
  listTorDepartments,
  listTors,
} from "@/server/services/tor.service"
import type { TorListQuery } from "@/types/tor"

export async function searchTorsAction(query: TorListQuery) {
  return listTors(query)
}

export async function getTorAction(id: string) {
  return getTorById(id)
}

export async function getTorDepartmentsAction() {
  return listTorDepartments()
}
