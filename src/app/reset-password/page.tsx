import Link from "next/link"
import { AozoomLogo } from "@/components/logo"
import { ResetPasswordForm } from "@/components/reset-password-form"

type ResetPasswordPageProps = {
  searchParams: Promise<{
    token?: string | string[]
  }>
}

export default async function ResetPasswordPage({
  searchParams,
}: ResetPasswordPageProps) {
  const params = await searchParams
  const tokenParam = params.token
  const token = Array.isArray(tokenParam) ? tokenParam[0] : tokenParam
  const hasToken = Boolean(token)

  return (
    <main className="login-shell">
      <section className="login-card">
        <AozoomLogo />
        <p className="eyebrow" style={{ marginTop: 28 }}>
          Dealer Center
        </p>
        <h1>{hasToken ? "Create a new password." : "Reset your password."}</h1>
        <p className="muted" style={{ marginTop: 12, color: "#cbd5e1" }}>
          {hasToken
            ? "Choose a new password for your approved dealer account."
            : "Enter your dealer account email and we will send password reset instructions if the account exists."}
        </p>
        <div style={{ marginTop: 28 }}>
          <ResetPasswordForm token={token} />
        </div>
        <p style={{ marginTop: 20, color: "#94a3b8", fontSize: 13 }}>
          Need help? Contact{" "}
          <Link className="auth-link" href="mailto:sales@aozoomusa.com">
            sales@aozoomusa.com
          </Link>
          .
        </p>
      </section>
    </main>
  )
}
