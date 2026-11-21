"use client"

import { useState, useTransition, type FormEvent } from "react"
import Link from "next/link"
import { ArrowLeft, CheckCircle2, Eye, EyeOff } from "lucide-react"

import { changePasswordAction } from "@/actions/auth"
import { useLocale } from "@/components/i18n/locale-provider"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

type PasswordFieldProps = {
  id: string
  label: string
  value: string
  onChange: (value: string) => void
  autoComplete: "current-password" | "new-password"
  minLength?: number
  autoFocus?: boolean
}

/** A masked password input that can be revealed. Paste and password managers are left working. */
function PasswordField({ id, label, value, onChange, autoComplete, minLength, autoFocus }: PasswordFieldProps) {
  const [visible, setVisible] = useState(false)

  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <div className="relative">
        <Input
          id={id}
          type={visible ? "text" : "password"}
          autoComplete={autoComplete}
          required
          minLength={minLength}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="h-10 pr-10"
          autoFocus={autoFocus}
        />
        <button
          type="button"
          onClick={() => setVisible((previous) => !previous)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          aria-label={visible ? "Hide password" : "Show password"}
        >
          {visible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
        </button>
      </div>
    </div>
  )
}

export function ChangePasswordView() {
  const { t } = useLocale()

  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)
  const [isPending, startTransition] = useTransition()

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setDone(false)

    if (newPassword.length < 8) {
      setError(t("auth.passwordMinLength"))
      return
    }
    if (newPassword !== confirmPassword) {
      setError(t("auth.passwordMismatch"))
      return
    }

    startTransition(async () => {
      const result = await changePasswordAction({ currentPassword, newPassword })
      if (!result.ok) {
        setError(result.error)
        return
      }
      setCurrentPassword("")
      setNewPassword("")
      setConfirmPassword("")
      setDone(true)
    })
  }

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-8 px-6 py-10">
      <div className="space-y-4">
        <Link
          href="/settings"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          {t("appearanceSettings.backToSettings")}
        </Link>

        <header className="space-y-2">
          <h1 className="text-2xl font-semibold text-foreground">{t("passwordSettings.title")}</h1>
          <p className="text-sm text-muted-foreground">{t("passwordSettings.subtitle")}</p>
        </header>
      </div>

      <section className="max-w-md rounded-xl border border-border bg-card p-5">
        <form onSubmit={handleSubmit} className="space-y-4">
          <PasswordField
            id="current-password"
            label={t("passwordSettings.currentPassword")}
            value={currentPassword}
            onChange={setCurrentPassword}
            autoComplete="current-password"
            autoFocus
          />
          <PasswordField
            id="new-password"
            label={t("auth.newPassword")}
            value={newPassword}
            onChange={setNewPassword}
            autoComplete="new-password"
            minLength={8}
          />
          <PasswordField
            id="confirm-new-password"
            label={t("auth.confirmPassword")}
            value={confirmPassword}
            onChange={setConfirmPassword}
            autoComplete="new-password"
            minLength={8}
          />

          <p className="text-xs text-muted-foreground">{t("passwordSettings.hint")}</p>

          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}
          {done && (
            <p
              role="status"
              className="flex items-center gap-2 rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800"
            >
              <CheckCircle2 className="size-4 shrink-0" />
              {t("passwordSettings.success")}
            </p>
          )}

          <Button type="submit" disabled={isPending} className="h-10">
            {isPending ? t("passwordSettings.saving") : t("passwordSettings.submit")}
          </Button>
        </form>
      </section>
    </div>
  )
}
