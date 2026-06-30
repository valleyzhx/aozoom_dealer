"use client"

import Link from "next/link"
import { useActionState } from "react"
import { loginAction } from "@/lib/actions"

export function LoginForm() {
  const [state, formAction, isPending] = useActionState(loginAction, {})

  return (
    <form action={formAction} className="grid" style={{ gap: 16 }}>
      {state?.error ? <div className="error">{state.error}</div> : null}
      <div className="field">
        <label htmlFor="email">Email</label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
        />
      </div>
      <div className="field">
        <label htmlFor="password">Password</label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
        />
      </div>
      <div className="form-row-end">
        <Link className="auth-link" href="/reset-password">
          Forgot password?
        </Link>
      </div>
      <button className="btn btn-primary" type="submit" disabled={isPending}>
        {isPending ? "Signing in" : "Sign In"}
      </button>
    </form>
  )
}
