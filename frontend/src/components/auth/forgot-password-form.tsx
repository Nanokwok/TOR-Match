"use client"

import { useState, useTransition, type FormEvent } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import {
  ArrowLeft,
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  Mail,
  RefreshCw,
} from "lucide-react"

import { AuthShell } from "@/components/auth/auth-shell"
import { useLocale } from "@/components/i18n/locale-provider"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  requestPasswordResetAction,
  resetPasswordAction,
} from "@/actions/auth"

type FlowStep = "request" | "sent" | "reset" | "success"

export function ForgotPasswordForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { t } = useLocale()

  const urlToken = searchParams.get("token") || ""
  const urlStep = searchParams.get("step")

  const [step, setStep] = useState<FlowStep>(() => {
    if (urlToken || urlStep === "reset") return "reset"
    return "request"
  })

  const [email, setEmail] = useState("")
  const token = urlToken || "mock_reset_token_dev"
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  const [error, setError] = useState<string | null>(null)
  const [infoNotice, setInfoNotice] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleRequestReset(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setInfoNotice(null)

    console.log("[Forgot Password] Request reset link initiated:", {
      email,
      timestamp: new Date().toISOString(),
    })

    startTransition(async () => {
      const result = await requestPasswordResetAction({ email })
      if (!result.ok) {
        setError(result.error)
        return
      }

      console.log("[Forgot Password] Reset link request succeeded for:", email)
      setStep("sent")
    })
  }

  function handleResendEmail() {
    setError(null)
    console.log("[Forgot Password] Resend reset link clicked for email:", {
      email,
      timestamp: new Date().toISOString(),
    })

    startTransition(async () => {
      const result = await requestPasswordResetAction({ email })
      if (!result.ok) {
        setError(result.error)
        return
      }

      console.log("[Forgot Password] Resend email dispatched to:", email)
      setInfoNotice(t("auth.emailResentNotice"))
    })
  }

  function handleResetPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setInfoNotice(null)

    if (newPassword !== confirmPassword) {
      setError(t("auth.passwordMismatch"))
      return
    }

    if (newPassword.length < 8) {
      setError(t("auth.passwordMinLength"))
      return
    }

    console.log("[Forgot Password] Reset password form submitted:", {
      email,
      token,
      newPasswordLength: newPassword.length,
      timestamp: new Date().toISOString(),
    })

    startTransition(async () => {
      // Future API call / Server action placeholder
      const result = await resetPasswordAction({ token, password: newPassword })
      if (!result.ok) {
        setError(result.error)
        return
      }

      console.log("[Forgot Password] Password reset completed successfully for:", email)
      setStep("success")
    })
  }

  function handleBackToLogin() {
    console.log("[Forgot Password] User initiated navigation back to /login")
    router.push("/login")
  }

  return (
    <AuthShell>
      <div className="space-y-8">
        {step === "request" && (
          <>
            <div className="space-y-2 text-center">
              <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-[#0088C9]/10 text-[#0088C9]">
                <KeyRound className="h-6 w-6" />
              </div>
              <h1 className="text-3xl font-semibold tracking-tight text-[#0088C9]">
                {t("auth.forgotPasswordTitle")}
              </h1>
              <p className="text-sm text-muted-foreground">
                {t("auth.forgotPasswordSubtitle")}
              </p>
            </div>

            <form onSubmit={handleRequestReset} className="space-y-5">
              <div className="space-y-1.5">
                <Label htmlFor="forgot-email">{t("common.email")}</Label>
                <Input
                  id="forgot-email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="you@company.com"
                  className="h-11 border-neutral-300 bg-white"
                  autoFocus
                />
              </div>

              {error && <p className="text-sm text-destructive">{error}</p>}

              <Button
                type="submit"
                disabled={isPending}
                className="h-11 w-full bg-primary text-primary-foreground hover:bg-primary/90"
              >
                {isPending ? t("auth.sendingResetLink") : t("auth.sendResetLink")}
              </Button>

              <div className="pt-2 text-center">
                <Link
                  href="/login"
                  onClick={() => console.log("[Forgot Password] Clicked 'Back to Log In' link")}
                  className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground"
                >
                  <ArrowLeft className="h-4 w-4" />
                  {t("auth.backToLogin")}
                </Link>
              </div>
            </form>
          </>
        )}

        {step === "sent" && (
          <>
            <div className="space-y-3 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
                <Mail className="h-7 w-7" />
              </div>
              <h1 className="text-3xl font-semibold tracking-tight text-[#0088C9]">
                {t("auth.resetLinkSentTitle")}
              </h1>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {t("auth.resetLinkSentDesc", { email: email || "your email" })}
              </p>
            </div>

            <div className="space-y-4">
              {infoNotice && (
                <div className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-center text-sm text-emerald-800">
                  {infoNotice}
                </div>
              )}
              {error && <p className="text-center text-sm text-destructive">{error}</p>}

              <Button
                type="button"
                variant="outline"
                disabled={isPending}
                onClick={handleResendEmail}
                className="h-11 w-full gap-2 border-neutral-300 bg-white hover:bg-neutral-50"
              >
                <RefreshCw className={`h-4 w-4 ${isPending ? "animate-spin" : ""}`} />
                {t("auth.resendEmail")}
              </Button>

              <div className="text-center pt-2">
                <Link
                  href="/login"
                  onClick={() => console.log("[Forgot Password] Clicked 'Back to Log In' from sent view")}
                  className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground"
                >
                  <ArrowLeft className="h-4 w-4" />
                  {t("auth.backToLogin")}
                </Link>
              </div>
            </div>
          </>
        )}

        {step === "reset" && (
          <>
            <div className="space-y-2 text-center">
              <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-[#0088C9]/10 text-[#0088C9]">
                <KeyRound className="h-6 w-6" />
              </div>
              <h1 className="text-3xl font-semibold tracking-tight text-[#0088C9]">
                {t("auth.newPasswordTitle")}
              </h1>
              <p className="text-sm text-muted-foreground">
                {t("auth.newPasswordSubtitle")}
              </p>
            </div>

            <form onSubmit={handleResetPassword} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="reset-new-password">{t("auth.newPassword")}</Label>
                <div className="relative">
                  <Input
                    id="reset-new-password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="new-password"
                    required
                    minLength={8}
                    value={newPassword}
                    onChange={(event) => setNewPassword(event.target.value)}
                    placeholder="••••••••"
                    className="h-11 border-neutral-300 bg-white pr-10"
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => {
                      console.log("[Forgot Password] Toggle new password visibility:", !showPassword)
                      setShowPassword((prev) => !prev)
                    }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="reset-confirm-password">{t("auth.confirmPassword")}</Label>
                <div className="relative">
                  <Input
                    id="reset-confirm-password"
                    type={showConfirmPassword ? "text" : "password"}
                    autoComplete="new-password"
                    required
                    minLength={8}
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    placeholder="••••••••"
                    className="h-11 border-neutral-300 bg-white pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      console.log(
                        "[Forgot Password] Toggle confirm password visibility:",
                        !showConfirmPassword
                      )
                      setShowConfirmPassword((prev) => !prev)
                    }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600"
                    aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              {error && <p className="text-sm text-destructive">{error}</p>}

              <Button
                type="submit"
                disabled={isPending}
                className="h-11 w-full bg-primary text-primary-foreground hover:bg-primary/90"
              >
                {isPending ? t("auth.resettingPassword") : t("auth.resetPasswordButton")}
              </Button>

              <div className="flex justify-center pt-2">
                <button
                  type="button"
                  onClick={() => {
                    console.log("[Forgot Password] Cancel reset, switch back to request step")
                    setStep("request")
                  }}
                  className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground"
                >
                  <ArrowLeft className="h-4 w-4" />
                  {t("common.cancel")}
                </button>
              </div>
            </form>
          </>
        )}

        {step === "success" && (
          <div className="space-y-6 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
              <CheckCircle2 className="h-8 w-8" />
            </div>
            <div className="space-y-2">
              <h1 className="text-3xl font-semibold tracking-tight text-[#0088C9]">
                {t("auth.resetSuccessTitle")}
              </h1>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {t("auth.resetSuccessDesc")}
              </p>
            </div>

            <Button
              type="button"
              onClick={handleBackToLogin}
              className="h-11 w-full bg-primary text-primary-foreground hover:bg-primary/90"
            >
              {t("auth.returnToLogin")}
            </Button>
          </div>
        )}
      </div>
    </AuthShell>
  )
}
