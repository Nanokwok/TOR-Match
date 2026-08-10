"use client"

import { useState, useTransition, type FormEvent } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"

import { AuthShell } from "@/components/auth/auth-shell"
import { GoogleAuthButton } from "@/components/auth/google-auth-button"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { loginWithEmailAction, loginWithGoogleAction } from "@/actions/auth"

export function LoginForm() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [rememberMe, setRememberMe] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)

    startTransition(async () => {
      const result = await loginWithEmailAction({ email, password, rememberMe })
      if (!result.ok) {
        setError(result.error)
        return
      }
      router.push("/browse")
    })
  }

  function handleGoogleLogin() {
    setError(null)
    startTransition(async () => {
      const result = await loginWithGoogleAction()
      if (!result.ok) {
        setError(result.error)
        return
      }
      router.push("/browse")
    })
  }

  return (
    <AuthShell>
      <div className="space-y-8">
        <div className="space-y-2 text-center">
          <h1 className="text-3xl font-semibold tracking-tight text-[#0088C9]">
            Log In
          </h1>
          <p className="text-sm text-muted-foreground">
            Welcome back. Let me help your work!
          </p>
        </div>

        <div className="space-y-5">
          <GoogleAuthButton
            label="Login with Google"
            onClick={handleGoogleLogin}
          />

          <div className="relative flex items-center gap-3">
            <div className="h-px flex-1 bg-border" />
            <span className="text-xs text-muted-foreground">or</span>
            <div className="h-px flex-1 bg-border" />
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="login-email">Email</Label>
              <Input
                id="login-email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@company.com"
                className="h-11 border-neutral-300 bg-white"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="login-password">Password</Label>
              <Input
                id="login-password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="••••••••"
                className="h-11 border-neutral-300 bg-white"
              />
            </div>

            <label className="flex items-center gap-2 text-sm text-foreground">
              <Checkbox
                checked={rememberMe}
                onCheckedChange={(checked) => setRememberMe(checked === true)}
              />
              Remember me
            </label>

            {error ? (
              <p className="text-sm text-destructive">{error}</p>
            ) : null}

            <Button
              type="submit"
              disabled={isPending}
              className="h-11 w-full bg-primary text-primary-foreground hover:bg-primary/90"
            >
              {isPending ? "Signing in..." : "Log In"}
            </Button>
          </form>
        </div>

        <p className="text-center text-sm text-muted-foreground">
          Don&apos;t have an account yet?{" "}
          <Link
            href="/signup"
            className="font-medium text-[#0088C9] underline-offset-4 hover:underline"
          >
            Create one now
          </Link>
        </p>
      </div>
    </AuthShell>
  )
}
