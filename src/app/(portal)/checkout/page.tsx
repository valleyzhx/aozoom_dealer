import Link from "next/link"
import {
  getDealerSession,
  listCartPaymentMethods,
  listCartShippingMethods,
  retrieveCart,
} from "@/lib/data"
import { formatMoney, getStoreName } from "@/lib/format"
import { DealerCheckoutForm } from "@/components/dealer-checkout-form"
import { DealerStripePayment } from "@/components/dealer-stripe-payment"
import { EmptyState, SectionHeader } from "@/components/portal-shell"
import type { DealerAddress, DealerSession } from "@/lib/types"

type CheckoutPageProps = {
  searchParams: Promise<{
    payment?: string
    error?: string
  }>
}

function isStripeProvider(providerId?: string) {
  return (
    providerId?.startsWith("pp_stripe_") ||
    providerId?.startsWith("pp_medusa-")
  )
}

function isManualProvider(providerId?: string) {
  return providerId?.startsWith("pp_system_default")
}

function getAddress(session: DealerSession): DealerAddress | null {
  return (
    session.dealerProfile.shipping_address ||
    session.dealerProfile.billing_address ||
    null
  )
}

function getCountryCode(address?: DealerAddress | null) {
  return (address?.country_code || address?.country || "us").toLowerCase()
}

function getAddressSummary(address?: DealerAddress | null) {
  if (!address) {
    return "No dealer address is on file yet."
  }

  return [
    address.address_1,
    address.address_2,
    [address.city, address.province, address.postal_code]
      .filter(Boolean)
      .join(", "),
    getCountryCode(address).toUpperCase(),
  ]
    .filter(Boolean)
    .join(" · ")
}

function getNameParts(session: DealerSession) {
  return {
    first_name: session.customer.first_name || "Aozoom",
    last_name: session.customer.last_name || "Dealer",
  }
}

function getOptionAmount(option: {
  amount?: number | null
  calculated_amount?: number | null
}) {
  return Number(option.amount ?? option.calculated_amount ?? 0)
}

function getPaymentSessionDataValue(
  data: Record<string, unknown> | null | undefined,
  key: string
) {
  const value = data?.[key]
  return typeof value === "string" ? value : undefined
}

export default async function CheckoutPage({
  searchParams,
}: CheckoutPageProps) {
  const params = await searchParams
  const [cart, session] = await Promise.all([
    retrieveCart(),
    getDealerSession(),
  ])

  if (!cart?.items?.length || !session) {
    return (
      <>
        <SectionHeader eyebrow="Checkout" title="Dealer Checkout" />
        <EmptyState
          title="No items ready for checkout"
          description="Add products from the dealer product list before placing an order."
        />
        <Link href="/products" className="btn btn-primary" style={{ width: "fit-content" }}>
          Quick Order
        </Link>
      </>
    )
  }

  const [shippingOptions, paymentMethods] = await Promise.all([
    listCartShippingMethods(cart.id),
    listCartPaymentMethods(cart.region_id),
  ])
  const currencyCode = cart.currency_code || cart.region?.currency_code || "usd"
  const profileAddress = getAddress(session)
  const nameParts = getNameParts(session)
  const defaultAddress = cart.shipping_address || profileAddress
  const storeName = getStoreName(session.dealerProfile, session.customer)
  const hasManualPayment = paymentMethods.some((method) =>
    isManualProvider(method.id)
  )
  const hasStripeProvider = paymentMethods.some((method) =>
    isStripeProvider(method.id)
  )
  const stripePublishableKey =
    process.env.NEXT_PUBLIC_STRIPE_KEY ||
    process.env.NEXT_PUBLIC_MEDUSA_PAYMENTS_PUBLISHABLE_KEY ||
    ""
  const stripeAccountId =
    process.env.NEXT_PUBLIC_MEDUSA_PAYMENTS_ACCOUNT_ID || undefined
  const hasStripePayment = hasStripeProvider
  const activeStripeSession = cart.payment_collection?.payment_sessions?.find(
    (session) => session.status === "pending" && isStripeProvider(session.provider_id)
  )
  const clientSecret = getPaymentSessionDataValue(
    activeStripeSession?.data as Record<string, unknown> | null,
    "client_secret"
  )
  const cardMode =
    params.payment === "card" &&
    activeStripeSession &&
    clientSecret &&
    stripePublishableKey

  const addressDefaults = {
    email:
      cart.email ||
      session.customer.email ||
      session.dealerProfile.email ||
      "",
    first_name: cart.shipping_address?.first_name || nameParts.first_name,
    last_name: cart.shipping_address?.last_name || nameParts.last_name,
    company:
      cart.shipping_address?.company ||
      getStoreName(session.dealerProfile, session.customer),
    address_1: defaultAddress?.address_1 || "",
    address_2: defaultAddress?.address_2 || "",
    city: defaultAddress?.city || "",
    province: defaultAddress?.province || "",
    postal_code: defaultAddress?.postal_code || "",
    country_code: getCountryCode(defaultAddress),
    phone: cart.shipping_address?.phone || session.dealerProfile.phone || "",
  }

  const billingAddress = cart.billing_address || cart.shipping_address
  const billingDetails = {
    name: `${billingAddress?.first_name || nameParts.first_name} ${
      billingAddress?.last_name || nameParts.last_name
    }`.trim(),
    email: addressDefaults.email,
    phone: billingAddress?.phone || undefined,
    address: {
      city: billingAddress?.city || undefined,
      country: billingAddress?.country_code || undefined,
      line1: billingAddress?.address_1 || undefined,
      line2: billingAddress?.address_2 || undefined,
      postal_code: billingAddress?.postal_code || undefined,
      state: billingAddress?.province || undefined,
    },
  }

  return (
    <>
      <SectionHeader
        eyebrow="Checkout"
        title="Dealer Checkout"
        description="Choose shipping, or use pickup and route delivery when they are enabled for this dealer account."
      />

      {params.error === "payment_failed" ? (
        <div className="error">
          Card payment was not completed. Please try again or choose another
          approved payment option.
        </div>
      ) : null}

      <div className="checkout-layout">
        <div className="checkout-main">
          {cardMode ? (
            <DealerStripePayment
              accountId={stripeAccountId}
              billingDetails={billingDetails}
              cartId={cart.id}
              clientSecret={clientSecret}
              publishableKey={stripePublishableKey}
            />
          ) : (
            <DealerCheckoutForm
              addressDefaults={addressDefaults}
              allowPickup={session.dealerProfile.allow_pickup === true}
              allowRouteDelivery={
                session.dealerProfile.allow_route_delivery === true
              }
              dealerAddressSummary={getAddressSummary(profileAddress)}
              hasManualPayment={hasManualPayment}
              hasStripePayment={hasStripePayment}
              shippingOptions={shippingOptions.map((option) => ({
                id: option.id,
                name: option.name || "Delivery option",
                amount: getOptionAmount(option),
                amountLabel: formatMoney(getOptionAmount(option), currencyCode),
                disabled: Boolean(
                  (option as { insufficient_inventory?: boolean })
                    .insufficient_inventory
                ),
              }))}
            />
          )}
        </div>

        <aside className="card checkout-summary-card">
          <p className="stat-label">Order Summary</p>
          <h2>{storeName}</h2>
          <div className="summary-lines">
            {cart.items.map((item) => (
              <div key={item.id} className="summary-line">
                <span>
                  <strong>{item.product_title || item.title}</strong>
                  <small>
                    {item.variant_title} · Qty {item.quantity}
                  </small>
                </span>
                <strong>{formatMoney(item.total, currencyCode)}</strong>
              </div>
            ))}
          </div>
          <div className="summary-totals">
            <div>
              <span>Subtotal</span>
              <strong>
                {formatMoney(
                  (cart as { item_subtotal?: number | null }).item_subtotal ??
                    cart.subtotal,
                  currencyCode
                )}
              </strong>
            </div>
            <div>
              <span>Shipping</span>
              <strong>
                {formatMoney(
                  (cart as { shipping_subtotal?: number | null })
                    .shipping_subtotal ?? cart.shipping_total,
                  currencyCode
                )}
              </strong>
            </div>
            <div>
              <span>Tax</span>
              <strong>{formatMoney(cart.tax_total, currencyCode)}</strong>
            </div>
            <div className="summary-total">
              <span>Total</span>
              <strong>{formatMoney(cart.total, currencyCode)}</strong>
            </div>
          </div>
          {cardMode ? (
            <Link href="/checkout" className="btn btn-secondary checkout-back">
              Edit Delivery
            </Link>
          ) : null}
        </aside>
      </div>
    </>
  )
}
