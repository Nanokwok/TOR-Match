"use client"

import { useState, useTransition, type FormEvent } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"

import { AuthShell } from "@/components/auth/auth-shell"
import { GoogleAuthButton } from "@/components/auth/google-auth-button"
import { useLocale } from "@/components/i18n/locale-provider"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  registerWithEmailAction,
  registerWithGoogleAction,
} from "@/actions/auth"

export function SignupForm() {
  const router = useRouter()
  const { t } = useLocale()
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)

    if (password !== confirmPassword) {
      setError(t("auth.passwordMismatch"))
      return
    }

    startTransition(async () => {
      const result = await registerWithEmailAction({ name, email, password })
      if (!result.ok) {
        setError(result.error)
        return
      }
      router.push("/company-setup")
    })
  }

  function handleGoogleRegister() {
    setError(null)
    startTransition(async () => {
      const result = await registerWithGoogleAction()
      if (!result.ok) {
        setError(result.error)
        return
      }
      router.push("/company-setup")
    })
  }

  return (
    <AuthShell>
      <div className="space-y-8">
        <div className="space-y-2 text-center">
          <h1 className="text-3xl font-semibold tracking-tight text-[#0088C9]">
            {t("auth.signupTitle")}
          </h1>
          <p className="text-sm text-muted-foreground">
            {t("auth.signupSubtitle")}
          </p>
        </div>

        <div className="space-y-5">
          <GoogleAuthButton
            label={t("auth.signupGoogle")}
            onClick={handleGoogleRegister}
          />

          <div className="relative flex items-center gap-3">
            <div className="h-px flex-1 bg-border" />
            <span className="text-xs text-muted-foreground">{t("common.or")}</span>
            <div className="h-px flex-1 bg-border" />
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="signup-name">{t("auth.fullName")}</Label>
              <Input
                id="signup-name"
                type="text"
                autoComplete="name"
                required
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder={t("auth.fullNamePlaceholder")}
                className="h-11 border-neutral-300 bg-white"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="signup-email">{t("common.email")}</Label>
              <Input
                id="signup-email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@company.com"
                className="h-11 border-neutral-300 bg-white"
              />
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="signup-password">{t("common.password")}</Label>
                <Input
                  id="signup-password"
                  type="password"
                  autoComplete="new-password"
                  required
                  minLength={8}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="••••••••"
                  className="h-11 border-neutral-300 bg-white"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="signup-confirm-password">
                  {t("auth.confirmPassword")}
                </Label>
                <Input
                  id="signup-confirm-password"
                  type="password"
                  autoComplete="new-password"
                  required
                  minLength={8}
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  placeholder="••••••••"
                  className="h-11 border-neutral-300 bg-white"
                />
              </div>
            </div>

            {error ? (
              <p className="text-sm text-destructive">{error}</p>
            ) : null}

            <Button
              type="submit"
              disabled={isPending}
              className="h-11 w-full bg-primary text-primary-foreground hover:bg-primary/90"
            >
              {isPending ? t("auth.creatingAccount") : t("auth.registerButton")}
            </Button>
          </form>
        </div>

        <p className="text-center text-sm text-muted-foreground">
          {t("auth.hasAccount")}{" "}
          <Link
            href="/login"
            className="font-medium text-[#0088C9] underline-offset-4 hover:underline"
          >
            {t("auth.loginNow")}
          </Link>
        </p>
      </div>
    </AuthShell>
  )
}
