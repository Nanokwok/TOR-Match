import { Schema, model, type InferSchemaType, type HydratedDocument } from "mongoose"

export const SYSTEM_SETTINGS_SINGLETON_KEY = "default"

export const DEFAULT_ADMIN_SYSTEM_SETTINGS = {
  scraperEnabled: true,
  scraperIntervalMinutes: 30,
  ocrWorkers: 4,
  autoApproveEnabled: true,
  autoApproveThreshold: 90,
  notifyOnOcrFailure: true,
  notifyOnNewSignup: true,
  maintenanceMode: false,
  adminSessionMinutes: 30,
  /** Sender and reply address for notification emails (see email.service). */
  supportEmail: "tormatch1234@gmail.com",
} as const

const systemSettingsSchema = new Schema(
  {
    singletonKey: {
      type: String,
      default: SYSTEM_SETTINGS_SINGLETON_KEY,
      unique: true,
      immutable: true,
    },
    scraperEnabled: {
      type: Boolean,
      default: DEFAULT_ADMIN_SYSTEM_SETTINGS.scraperEnabled,
    },
    scraperIntervalMinutes: {
      type: Number,
      default: DEFAULT_ADMIN_SYSTEM_SETTINGS.scraperIntervalMinutes,
      min: 5,
    },
    ocrWorkers: {
      type: Number,
      default: DEFAULT_ADMIN_SYSTEM_SETTINGS.ocrWorkers,
      min: 1,
      max: 16,
    },
    autoApproveEnabled: {
      type: Boolean,
      default: DEFAULT_ADMIN_SYSTEM_SETTINGS.autoApproveEnabled,
    },
    autoApproveThreshold: {
      type: Number,
      default: DEFAULT_ADMIN_SYSTEM_SETTINGS.autoApproveThreshold,
      min: 50,
      max: 100,
    },
    notifyOnOcrFailure: {
      type: Boolean,
      default: DEFAULT_ADMIN_SYSTEM_SETTINGS.notifyOnOcrFailure,
    },
    notifyOnNewSignup: {
      type: Boolean,
      default: DEFAULT_ADMIN_SYSTEM_SETTINGS.notifyOnNewSignup,
    },
    maintenanceMode: {
      type: Boolean,
      default: DEFAULT_ADMIN_SYSTEM_SETTINGS.maintenanceMode,
    },
    adminSessionMinutes: {
      type: Number,
      default: DEFAULT_ADMIN_SYSTEM_SETTINGS.adminSessionMinutes,
      min: 5,
      max: 120,
    },
    supportEmail: {
      type: String,
      default: DEFAULT_ADMIN_SYSTEM_SETTINGS.supportEmail,
      trim: true,
      lowercase: true,
    },
  },
  {
    timestamps: true,
  }
)

export type SystemSettingsDoc = HydratedDocument<InferSchemaType<typeof systemSettingsSchema>>

export const SystemSettings = model("SystemSettings", systemSettingsSchema)
