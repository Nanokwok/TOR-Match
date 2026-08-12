import { Suspense } from "react"
import type { Metadata } from "next"

import { AdminLoginForm } from "@/components/admin/admin-login-form"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export const metadata: Metadata = {
  title: "Admin Login | TOR Match",
  robots: { index: false, follow: false },
}

export default function AdminLoginPage() {
  return (
    <main className="flex min-h-svh items-center justify-center bg-background p-6">
      <Suspense
        fallback={
          <Card className="w-full max-w-sm">
            <CardHeader>
              <CardTitle>Admin Login</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Loading...
            </CardContent>
          </Card>
        }
      >
        <AdminLoginForm />
      </Suspense>
    </main>
  )
}
