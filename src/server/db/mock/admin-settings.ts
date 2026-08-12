export type AdminSystemSettings = {
  scraperEnabled: boolean
  scraperIntervalMinutes: number
  ocrWorkers: number
  autoApproveEnabled: boolean
  autoApproveThreshold: number
  notifyOnOcrFailure: boolean
  notifyOnNewSignup: boolean
  maintenanceMode: boolean
  adminSessionMinutes: number
  supportEmail: string
}

export const defaultAdminSystemSettings: AdminSystemSettings = {
  scraperEnabled: true,
  scraperIntervalMinutes: 30,
  ocrWorkers: 4,
  autoApproveEnabled: true,
  autoApproveThreshold: 90,
  notifyOnOcrFailure: true,
  notifyOnNewSignup: true,
  maintenanceMode: false,
  adminSessionMinutes: 30,
  supportEmail: "support@tormatch.local",
}
