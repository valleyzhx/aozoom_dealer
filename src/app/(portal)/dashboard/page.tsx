import Link from "next/link"
import {
  ClipboardList,
  FileText,
  PackageSearch,
  ShieldCheck,
  ShoppingCart,
  Star,
  Tags,
  Truck,
  type LucideIcon,
} from "lucide-react"
import type { HttpTypes } from "@medusajs/types"
import { requireDealerSession, retrieveCart, listOrders } from "@/lib/data"
import {
  type DealerTierKey,
  formatMoney,
  formatShortDate,
  getDealerTier,
  getDealerTierKey,
  getStoreName,
} from "@/lib/format"
import { SectionHeader } from "@/components/portal-shell"

const DEALER_TIER_ORDER: DealerTierKey[] = ["silver", "gold", "platinum"]
const DEALER_ORDER_METRIC_PAGE_SIZE = 100
const DEALER_ORDER_METRIC_MAX_ORDERS = 1000

type TierDefinition = {
  key: DealerTierKey
  name: string
  requirement: string
  benefit: string
  reached: boolean
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="card">
      <p className="stat-label">{label}</p>
      <p className="stat-value">{value}</p>
    </div>
  )
}

function ActionCard({
  href,
  title,
  description,
  icon: Icon,
}: {
  href: string
  title: string
  description: string
  icon: LucideIcon
}) {
  return (
    <Link href={href} className="card">
      <div style={{ display: "flex", justifyContent: "space-between", gap: 16 }}>
        <h2>{title}</h2>
        <Icon color="#ef4b2a" aria-hidden="true" />
      </div>
      <p className="muted" style={{ marginTop: 14 }}>
        {description}
      </p>
    </Link>
  )
}

function getOneYearAgo() {
  const date = new Date()
  date.setFullYear(date.getFullYear() - 1)

  return date
}

function parseDate(value?: string | Date | null) {
  if (!value) {
    return null
  }

  const date = value instanceof Date ? value : new Date(value)

  return Number.isNaN(date.getTime()) ? null : date
}

function isCountedDealerOrder(order: HttpTypes.StoreOrder) {
  const status = String(order.status || "").toLowerCase()

  return status !== "canceled" && status !== "cancelled" && status !== "archived"
}

async function listOrdersForDealerMetrics() {
  const orders: HttpTypes.StoreOrder[] = []
  const oneYearAgo = getOneYearAgo()

  for (
    let offset = 0;
    offset < DEALER_ORDER_METRIC_MAX_ORDERS;
    offset += DEALER_ORDER_METRIC_PAGE_SIZE
  ) {
    const page = await listOrders(DEALER_ORDER_METRIC_PAGE_SIZE, offset)
    const pageOrders = page.orders ?? []

    if (pageOrders.length === 0) {
      break
    }

    orders.push(...pageOrders)

    const oldestOrder = pageOrders[pageOrders.length - 1]
    const oldestCreatedAt = parseDate(oldestOrder?.created_at)

    if (
      pageOrders.length < DEALER_ORDER_METRIC_PAGE_SIZE ||
      (oldestCreatedAt && oldestCreatedAt < oneYearAgo)
    ) {
      break
    }
  }

  return orders
}

function getTrailingYearOrderMetrics(orders: HttpTypes.StoreOrder[]) {
  const cutoff = getOneYearAgo()
  const trailingOrders = orders.filter((order) => {
    const createdAt = parseDate(order.created_at)

    return createdAt && createdAt >= cutoff && isCountedDealerOrder(order)
  })
  const currencyCode = trailingOrders[0]?.currency_code || "usd"
  const totalSpend = trailingOrders.reduce(
    (sum, order) => sum + Number(order.total || 0),
    0
  )

  return {
    orderCount: trailingOrders.length,
    totalSpend,
    currencyCode,
  }
}

function getTierDefinitions(currentTier: DealerTierKey): TierDefinition[] {
  const currentTierIndex = DEALER_TIER_ORDER.indexOf(currentTier)

  return [
    {
      key: "silver",
      name: "Silver",
      requirement: "Approved dealer account",
      benefit: "Up to 40% off",
      reached: currentTierIndex >= DEALER_TIER_ORDER.indexOf("silver"),
    },
    {
      key: "gold",
      name: "Gold",
      requirement: "$1,000 completed spend in the past 12 months",
      benefit: "Up to 50% off",
      reached: currentTierIndex >= DEALER_TIER_ORDER.indexOf("gold"),
    },
    {
      key: "platinum",
      name: "Platinum",
      requirement: "$3,000 completed spend in the past 12 months",
      benefit: "Up to 60% off",
      reached: currentTierIndex >= DEALER_TIER_ORDER.indexOf("platinum"),
    },
  ]
}

function TierIcon({ tier }: { tier: TierDefinition }) {
  return (
    <span className={`tier-icon tier-${tier.key}`}>
      <Star size={15} fill="currentColor" aria-hidden="true" />
    </span>
  )
}

export default async function DashboardPage() {
  const session = await requireDealerSession()
  const [cart, orders] = await Promise.all([
    retrieveCart().catch(() => null),
    listOrdersForDealerMetrics().catch(() => []),
  ])
  const storeName = getStoreName(session.dealerProfile, session.customer)
  const tier = getDealerTier(session.dealerProfile)
  const tierKey = getDealerTierKey(session.dealerProfile)
  const tiers = getTierDefinitions(tierKey)
  const cartCount =
    cart?.items?.reduce((sum, item) => sum + Number(item.quantity || 0), 0) ?? 0
  const {
    orderCount: trailingYearOrderCount,
    totalSpend: trailingYearTotalSpend,
    currencyCode: trailingYearCurrencyCode,
  } = getTrailingYearOrderMetrics(orders)

  return (
    <>
      <section className="card hero-card">
        <p className="eyebrow">Aozoom Dealer Center</p>
        <h1>Hi {storeName}</h1>
        <p style={{ marginTop: 12, color: "#cbd5e1" }}>
          Dealer pricing, quick reorder, order history, and business resources
          in one focused workspace.
        </p>
      </section>

      <div className="grid stats">
        <StatCard label="Dealer Level" value={tier} />
        <StatCard
          label="Valid Until"
          value={formatShortDate(session.dealerProfile.dealer_valid_until)}
        />
        <StatCard
          label="Past 12-Month Spend"
          value={formatMoney(trailingYearTotalSpend, trailingYearCurrencyCode)}
        />
        <StatCard
          label="Past 12-Month Orders"
          value={String(trailingYearOrderCount)}
        />
      </div>

      <SectionHeader
        eyebrow="Quick Actions"
        title="Run the daily dealer workflow"
      />
      <div className="grid cards-3">
        <ActionCard
          href="/products"
          title="Quick Order"
          description="Use a compact SKU table with dealer pricing and one-line add to cart."
          icon={PackageSearch}
        />
        <ActionCard
          href="/cart"
          title="Cart"
          description={`Review ${cartCount} cart item${
            cartCount === 1 ? "" : "s"
          } before checkout and dealer shipment selection.`}
          icon={ShoppingCart}
        />
        <ActionCard
          href="/orders"
          title="Orders"
          description="Review order history and open order status."
          icon={ClipboardList}
        />
        <ActionCard
          href="/documents"
          title="Documents"
          description="Catalog, warranty, MAP policy, and marketing asset access."
          icon={FileText}
        />
      </div>

      <SectionHeader
        eyebrow="Benefits"
        title="Dealer Benefits Center"
        description="Milestones are based on completed order spend over the past 12 months. Dealer level is reviewed automatically every 6 months."
      />

      <div className="benefits-grid">
        <section className="card milestone-card">
          <div className="milestone-head">
            <div>
              <p className="stat-label">Dealer Group Levels</p>
              <h2>Milestones</h2>
            </div>
            <span className="tier-current">
              <TierIcon tier={tiers.find((item) => item.key === tierKey) || tiers[0]} />
              {tier}
            </span>
          </div>

          <div className="tier-roadmap">
            {tiers.map((item, index) => (
              <div key={item.key} className="tier-step">
                <div className="tier-marker">
                  <TierIcon tier={item} />
                  {index < tiers.length - 1 ? (
                    <span
                      className={
                        item.reached
                          ? "tier-connector reached"
                          : "tier-connector"
                      }
                    />
                  ) : null}
                </div>
                <div>
                  <h3>{item.name}</h3>
                  <p
                    className={
                      item.reached
                        ? "tier-requirement reached"
                        : "tier-requirement"
                    }
                  >
                    {item.requirement}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="card">
          <div className="benefit-title">
            <Tags size={20} color="#ef4b2a" aria-hidden="true" />
            <h2>Tier Benefits</h2>
          </div>
          <div className="benefit-table-shell">
            <table className="benefit-table">
              <thead>
                <tr>
                  <th>Level</th>
                  <th>Benefit</th>
                </tr>
              </thead>
              <tbody>
                {tiers.map((item) => (
                  <tr key={item.key}>
                    <td>
                      <span className="tier-name">
                        <TierIcon tier={item} />
                        {item.name}
                      </span>
                    </td>
                    <td>{item.benefit}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="muted" style={{ marginTop: 12 }}>
            Your dealer level is automatically reviewed and updated every 6
            months.
          </p>
        </section>

        <section className="card benefit-note">
          <Truck size={20} color="#ef4b2a" aria-hidden="true" />
          <div>
            <h2>Dealer Shipping</h2>
            <p className="muted">
              Dealer orders qualify for <strong>free shipping</strong> on
              orders <strong>over $99.99</strong>. Dealer shipment fee is shown
              at checkout when applicable.
            </p>
          </div>
        </section>

        <section className="card benefit-note">
          <ShieldCheck size={20} color="#ef4b2a" aria-hidden="true" />
          <div>
            <h2>Dealer Account</h2>
            <p className="muted">
              Store information and account details stay connected to your
              approved dealer profile.
            </p>
          </div>
        </section>
      </div>
    </>
  )
}
