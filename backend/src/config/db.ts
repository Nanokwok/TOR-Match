import mongoose from "mongoose"
import { env } from "@/config/env"

mongoose.set("strictQuery", true)

export async function connectDB(): Promise<void> {
  mongoose.connection.on("connected", () => {
    console.log("[db] MongoDB connected")
  })
  mongoose.connection.on("error", (error) => {
    console.error("[db] MongoDB connection error:", error)
  })
  mongoose.connection.on("disconnected", () => {
    console.warn("[db] MongoDB disconnected")
  })

  await mongoose.connect(env.mongodbUri)
}

export async function disconnectDB(): Promise<void> {
  await mongoose.disconnect()
}
