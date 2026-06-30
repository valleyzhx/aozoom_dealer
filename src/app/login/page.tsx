import { redirect } from "next/navigation"
import { getDealerSession } from "@/lib/data"
import { AozoomLogo } from "@/components/logo"
import { LoginForm } from "@/components/login-form"

export default async function LoginPage() {
  const session = await getDealerSession()

  if (session) {
    redirect("/dashboard")
  }

  return (
    <main className="login-shell">
      <section className="login-card">
        <AozoomLogo />
        <p className="eyebrow" style={{ marginTop: 28 }}>
          Dealer Center
        </p>
        <h1>Sign in to order with dealer pricing.</h1>
        <p className="muted" style={{ marginTop: 12, color: "#cbd5e1" }}>
          Approved dealer accounts can access quick ordering, order history,
          benefits, and dealer documents.
        </p>
        <div style={{ marginTop: 28 }}>
          <LoginForm />
        </div>
        <p style={{ marginTop: 20, color: "#94a3b8", fontSize: 13 }}>
          Need access? Contact sales@aozoomusa.com.
        </p>
      </section>
    </main>
  )
}
