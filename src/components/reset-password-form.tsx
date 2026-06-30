"use client"

import Link from "next/link"
import { useActionState } from "react"
import {
  requestDealerPasswordResetAction,
  resetDealerPasswordAction,
} from "@/lib/actions"

const initialState = {
  success: false,
}

export function ResetPasswordForm({ token }: { token?: string }) {
  if (token) {
    return <SetNewPasswordForm token={token} />
  }

  return <RequestPasswordResetForm />
}

function RequestPasswordResetForm() {
  const [state, formAction, isPending] = useActionState(
    requestDealerPasswordResetAction,
    initialState
  )

  if (state?.success) {
    return (
      <div className="grid" style={{ gap: 16 }}>
        <div className="success">
          If a dealer account exists for {state.email}, a password reset link
          has been sent.
        </div>
        <Link className="btn btn-secondary" href="/login">
          Back to Sign In
        </Link>
      </div>
    )
  }

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
      <button className="btn btn-primary" type="submit" disabled={isPending}>
        {isPending ? "Sending link" : "Send Reset Link"}
      </button>
      <Link className="btn btn-ghost" href="/login">
        Back to Sign In
      </Link>
    </form>
  )
}

function SetNewPasswordForm({ token }: { token: string }) {
  const [state, formAction, isPending] = useActionState(
    resetDealerPasswordAction,
    initialState
  )

  if (state?.success) {
    return (
      <div className="grid" style={{ gap: 16 }}>
        <div className="success">Your dealer password has been updated.</div>
        <Link className="btn btn-primary" href="/login">
          Sign In
        </Link>
      </div>
    )
  }

  return (
    <form action={formAction} className="grid" style={{ gap: 16 }}>
      <input type="hidden" name="token" value={token} />
      {state?.error ? <div className="error">{state.error}</div> : null}
      <div className="field">
        <label htmlFor="password">New password</label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
        />
      </div>
      <div className="field">
        <label htmlFor="confirm_password">Confirm password</label>
        <input
          id="confirm_password"
          name="confirm_password"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
        />
      </div>
      <button className="btn btn-primary" type="submit" disabled={isPending}>
        {isPending ? "Updating password" : "Update Password"}
      </button>
      <Link className="btn btn-ghost" href="/reset-password">
        Request a New Link
      </Link>
    </form>
  )
}
