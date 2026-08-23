import { createApp } from "@/app"
import { connectDB } from "@/config/db"
import { env } from "@/config/env"

async function main() {
  await connectDB()

  const app = createApp()
  const server = app.listen(env.port, () => {
    console.log(`[server] listening on http://localhost:${env.port} (${env.nodeEnv})`)
  })

  const shutdown = (signal: string) => {
    console.log(`[server] received ${signal}, shutting down`)
    server.close(() => process.exit(0))
  }
  process.on("SIGINT", () => shutdown("SIGINT"))
  process.on("SIGTERM", () => shutdown("SIGTERM"))
}

main().catch((error) => {
  console.error("[server] failed to start", error)
  process.exit(1)
})
