import express from "express"
import helmet from "helmet"
import cors from "cors"
import cookieParser from "cookie-parser"
import morgan from "morgan"
import { env } from "@/config/env"
import routes from "@/routes"
import { errorMiddleware, notFoundMiddleware } from "@/middleware/error.middleware"
import { createApiRateLimiter } from "@/middleware/rate-limit.middleware"
import { rejectMongoOperators } from "@/middleware/reject-operators.middleware"

export function createApp() {
  const app = express()

  app.set("trust proxy", 1)

  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          baseUri: ["'self'"],
          fontSrc: ["'self'", "https:", "data:"],
          formAction: ["'self'"],
          frameAncestors: ["'none'"],
          imgSrc: ["'self'", "data:", "https:"],
          objectSrc: ["'none'"],
          scriptSrc: ["'self'"],
          scriptSrcAttr: ["'none'"],
          styleSrc: ["'self'", "https:", "'unsafe-inline'"],
          upgradeInsecureRequests: [],
        },
      },
      hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true,
      },
      xContentTypeOptions: true,
      frameguard: {
        action: "deny",
      },
      referrerPolicy: {
        policy: "strict-origin-when-cross-origin",
      },
      crossOriginResourcePolicy: {
        policy: "cross-origin",
      },
    })
  )

  app.use(
    cors({
      origin: env.corsOrigin,
      credentials: true,
      // Spelled out rather than left to the package defaults, which reflect whatever
      // method or header a preflight asks for.
      methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Authorization"],
      maxAge: 600,
    })
  )
  app.use(express.json())
  app.use(cookieParser())
  if (env.nodeEnv !== "test") {
    app.use(morgan(env.nodeEnv === "production" ? "combined" : "dev"))
  }

  // Before the routes, so a throttled client costs a counter lookup and nothing more.
  app.use("/api", createApiRateLimiter())
  // Body and query are parsed by now. Path parameters belong to the routes, so
  // each controller checks its own ids (isValidObjectId) before querying.
  app.use("/api", rejectMongoOperators)
  app.use("/api", routes)

  app.use(notFoundMiddleware)
  app.use(errorMiddleware)

  return app
}
