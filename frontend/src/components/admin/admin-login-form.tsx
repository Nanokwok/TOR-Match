"use client"

import { useState, useTransition, type FormEvent } from "react"
import { useRouter, useSearchParams } from "next/navigation"

import { adminLoginAction } from "@/actions/admin-auth"
import { LanguageSwitcher } from "@/components/i18n/language-switcher"
import { useLocale } from "@/components/i18n/locale-provider"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export function AdminLoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { t } = useLocale()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)

    startTransition(async () => {
      const result = await adminLoginAction({ email, password })
      if (!result.ok) {
        setError(result.error)
        return
      }

      const next = searchParams.get("next")
      router.replace(
        next && next.startsWith("/admin") && !next.startsWith("/admin/login")
          ? next
          : "/admin/overview"
      )
      router.refresh()
    })
  }

  return (
    <div className="relative w-full max-w-sm">
      <div className="absolute -top-12 right-0">
        <LanguageSwitcher variant="light" />
      </div>
      <Card className="w-full">
        <CardHeader>
          <CardTitle>{t("admin.loginTitle")}</CardTitle>
          <CardDescription>{t("admin.loginSubtitle")}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="admin-email">{t("common.email")}</Label>
              <Input
                id="admin-email"
                type="email"
                autoComplete="username"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="admin@example.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="admin-password">{t("common.password")}</Label>
              <Input
                id="admin-password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="••••••••"
              />
            </div>
            {error ? <p className="text-sm text-destructive">{error}</p> : null}
            <Button type="submit" disabled={isPending} className="w-full">
              {isPending ? t("auth.signingIn") : t("admin.loginButton")}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
