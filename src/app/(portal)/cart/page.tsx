import Link from "next/link"
import { removeLineItemAction, updateLineItemAction } from "@/lib/actions"
import { retrieveCart } from "@/lib/data"
import { formatMoney } from "@/lib/format"
import { EmptyState, SectionHeader } from "@/components/portal-shell"

export default async function CartPage() {
  const cart = await retrieveCart()
  const items = cart?.items ?? []

  if (!items.length) {
    return (
      <>
        <SectionHeader eyebrow="Cart" title="Dealer Cart" />
        <EmptyState
          title="Your dealer cart is empty"
          description="Add products from the quick order table to start a dealer order."
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
        eyebrow="Cart"
        title="Dealer Cart"
        description="Adjust order quantities before moving into checkout."
        action={
          <Link href="/checkout" className="btn btn-primary">
            Checkout
          </Link>
        }
      />

      <div className="table-shell">
        <table className="table">
          <thead>
            <tr>
              <th>Item</th>
              <th>SKU</th>
              <th>Price</th>
              <th>Qty</th>
              <th>Total</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id}>
                <td>
                  <strong>{item.product_title || item.title}</strong>
                  <br />
                  <span className="muted">{item.variant_title}</span>
                </td>
                <td>{item.variant_sku || "Not set"}</td>
                <td>
                  {formatMoney(
                    item.unit_price,
                    cart?.currency_code || cart?.region?.currency_code || "usd"
                  )}
                </td>
                <td>
                  <form action={updateLineItemAction} style={{ display: "flex", gap: 8 }}>
                    <input type="hidden" name="line_id" value={item.id} />
                    <input
                      className="qty"
                      name="quantity"
                      type="number"
                      min="1"
                      max="99"
                      defaultValue={item.quantity}
                    />
                    <button className="btn btn-secondary" type="submit">
                      Update
                    </button>
                  </form>
                </td>
                <td>
                  <strong>
                    {formatMoney(
                      item.total,
                      cart?.currency_code || cart?.region?.currency_code || "usd"
                    )}
                  </strong>
                </td>
                <td>
                  <form action={removeLineItemAction}>
                    <input type="hidden" name="line_id" value={item.id} />
                    <button className="btn btn-secondary" type="submit">
                      Remove
                    </button>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="card" style={{ maxWidth: 420, marginLeft: "auto" }}>
        <p className="stat-label">Estimated Total</p>
        <p className="stat-value">
          {formatMoney(
            cart?.total,
            cart?.currency_code || cart?.region?.currency_code || "usd"
          )}
        </p>
        <p className="muted" style={{ marginTop: 8 }}>
          Tax, shipping, and payment terms are finalized at checkout.
        </p>
      </div>
    </>
  )
}
