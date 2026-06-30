import Link from "next/link"
import { listOrders } from "@/lib/data"
import { formatMoney, formatShortDate } from "@/lib/format"
import { EmptyState, SectionHeader } from "@/components/portal-shell"

export default async function OrdersPage() {
  const { orders } = await listOrders(50, 0)

  if (!orders.length) {
    return (
      <>
        <SectionHeader eyebrow="Orders" title="Order History" />
        <EmptyState
          title="No dealer orders yet"
          description="Orders placed from this dealer account will appear here."
        />
        <Link href="/products" className="btn btn-primary" style={{ width: "fit-content" }}>
          Quick Order
        </Link>
      </>
    )
  }

  return (
    <>
      <SectionHeader
        eyebrow="Orders"
        title="Order History"
        description="Recent dealer orders from your Medusa customer account."
      />
      <div className="table-shell">
        <table className="table">
          <thead>
            <tr>
              <th>Order</th>
              <th>Date</th>
              <th>Status</th>
              <th>Items</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((order) => (
              <tr key={order.id}>
                <td>
                  <strong>
                    {(order.metadata as { public_order_number?: string } | null)
                      ?.public_order_number || order.display_id || order.id}
                  </strong>
                </td>
                <td>{formatShortDate(order.created_at)}</td>
                <td>{order.status}</td>
                <td>{order.items?.length ?? 0}</td>
                <td>{formatMoney(order.total, order.currency_code || "usd")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}
