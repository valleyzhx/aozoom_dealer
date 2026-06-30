import Link from "next/link"
import { redirect } from "next/navigation"
import {
  BarChart3,
  ClipboardList,
  FileText,
  LayoutDashboard,
  LogOut,
  PackageSearch,
  ShoppingCart,
} from "lucide-react"
import { signOutAction } from "@/lib/actions"
import { getDealerSession, retrieveCart } from "@/lib/data"
import { getDealerTier, getStoreName } from "@/lib/format"
import { AozoomLogo } from "./logo"

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/products", label: "Products", icon: PackageSearch },
  { href: "/cart", label: "Cart", icon: ShoppingCart },
  { href: "/orders", label: "Orders", icon: ClipboardList },
  { href: "/documents", label: "Documents", icon: FileText },
]

export async function PortalShell({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getDealerSession()

  if (!session) {
    redirect("/login")
  }

  const cart = await retrieveCart().catch(() => null)

  const storeName = getStoreName(session.dealerProfile, session.customer)
  const tier = getDealerTier(session.dealerProfile)
  const cartCount =
    cart?.items?.reduce((sum, item) => sum + Number(item.quantity || 0), 0) ?? 0

  return (
    <div className="portal">
      <aside className="sidebar">
        <AozoomLogo />
        <nav className="sidebar-nav" aria-label="Dealer navigation">
          {navItems.map((item) => {
            const Icon = item.icon

            return (
              <Link key={item.href} href={item.href}>
                <span style={{ display: "inline-flex", gap: 9 }}>
                  <Icon size={16} aria-hidden="true" />
                  {item.label}
                </span>
              </Link>
            )
          })}
        </nav>
      </aside>

      <main className="main">
        <header className="topbar">
          <div>
            <strong>{storeName}</strong>
            <span className="muted"> · {tier} Dealer</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Link href="/cart" className="btn btn-secondary">
              <ShoppingCart size={16} aria-hidden="true" />
              Cart {cartCount}
            </Link>
            <form action={signOutAction}>
              <button className="btn btn-secondary" type="submit">
                <LogOut size={16} aria-hidden="true" />
                Sign Out
              </button>
            </form>
          </div>
        </header>
        <div className="content">{children}</div>
      </main>
    </div>
  )
}

export function SectionHeader({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow: string
  title: string
  description?: string
  action?: React.ReactNode
}) {
  return (
    <div className="page-head">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        {description ? <p className="muted" style={{ marginTop: 8 }}>{description}</p> : null}
      </div>
      {action}
    </div>
  )
}

export function EmptyState({
  title,
  description,
}: {
  title: string
  description: string
}) {
  return (
    <div className="card">
      <h2>{title}</h2>
      <p className="muted" style={{ marginTop: 8 }}>
        {description}
      </p>
    </div>
  )
}

export function MetricIcon() {
  return <BarChart3 size={18} aria-hidden="true" />
}
