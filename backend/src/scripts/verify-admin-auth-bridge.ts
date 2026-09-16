process.env.NODE_ENV = process.env.NODE_ENV ?? "development"
if (!process.env.MONGODB_URI) {
  process.env.MONGODB_URI = "mongodb://127.0.0.1:27017/tor-match-auth-bridge-test"
}

async function main() {
  const { requireAuth, requireRole } = await import("../middleware/auth.middleware.js")
  const { ApiError } = await import("../utils/ApiError.js")
  const { signAuthToken } = await import("../utils/jwt.js")
  type NextFunction = import("express").NextFunction
  type Request = import("express").Request
  type Response = import("express").Response

  function runMiddleware(
    req: Partial<Request>,
    middlewares: Array<(req: Request, res: Response, next: NextFunction) => void>
  ): Promise<{ status?: number; error?: InstanceType<typeof ApiError>; passed: boolean }> {
    return new Promise((resolve) => {
      const request = req as Request
      let index = 0

      const next: NextFunction = (err?: unknown) => {
        if (err) {
          const error = err as InstanceType<typeof ApiError>
          resolve({
            passed: false,
            status: error.status,
            error,
          })
          return
        }
        const middleware = middlewares[index]
        index += 1
        if (!middleware) {
          resolve({ passed: true })
          return
        }
        middleware(request, {} as Response, next)
      }

      next()
    })
  }

  const chain = [requireAuth, requireRole("admin")]

  type Case = { name: string; run: () => Promise<void> }

  const cases: Case[] = [
    {
      name: "no token → 401",
      async run() {
        const result = await runMiddleware({ headers: {}, cookies: {} }, chain)
        if (result.status !== 401) {
          throw new Error(`expected 401, got ${result.status}`)
        }
      },
    },
    {
      name: "user JWT → 403",
      async run() {
        const token = signAuthToken({
          sub: "user-1",
          email: "user@example.com",
          role: "user",
        })
        const result = await runMiddleware(
          { headers: { authorization: `Bearer ${token}` }, cookies: {} },
          chain
        )
        if (result.status !== 403) {
          throw new Error(`expected 403, got ${result.status}`)
        }
      },
    },
    {
      name: "admin JWT Bearer → allow",
      async run() {
        const token = signAuthToken({
          sub: "admin-1",
          email: "admin@example.com",
          role: "admin",
        })
        const result = await runMiddleware(
          { headers: { authorization: `Bearer ${token}` }, cookies: {} },
          chain
        )
        if (!result.passed) {
          throw new Error(
            `expected allow, got ${result.status} ${result.error?.message}`
          )
        }
      },
    },
  ]

  let failed = 0
  for (const testCase of cases) {
    try {
      await testCase.run()
      console.log(`PASS  ${testCase.name}`)
    } catch (error) {
      failed += 1
      console.error(`FAIL  ${testCase.name}`)
      console.error(`      ${error instanceof Error ? error.message : error}`)
    }
  }

  if (failed > 0) {
    console.error(`\n${failed}/${cases.length} failed`)
    process.exit(1)
  }
  console.log(`\n${cases.length}/${cases.length} passed (middleware / Bearer / role)`)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
