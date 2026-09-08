import express from "express"
import cors from "cors"
import cookieParser from "cookie-parser"
import morgan from "morgan"
import { env } from "@/config/env"
import routes from "@/routes"
import { errorMiddleware, notFoundMiddleware } from "@/middleware/error.middleware"

export function createApp() {
  const app = express()

  app.use(
    cors({
      origin: env.corsOrigin,
      credentials: true,
    })
  )
  app.use(express.json())
  app.use(cookieParser())
  if (env.nodeEnv !== "test") {
    app.use(morgan(env.nodeEnv === "production" ? "combined" : "dev"))
  }

  app.use("/api", routes)

  app.use(notFoundMiddleware)
  app.use(errorMiddleware)

  return app
}
