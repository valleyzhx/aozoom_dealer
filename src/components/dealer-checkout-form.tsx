"use client"

import { useMemo, useState, useActionState } from "react"
import {
  CreditCard,
  MapPin,
  PackageCheck,
  Route,
  Truck,
} from "lucide-react"
import {
  submitDealerCheckoutAction,
  type ActionState,
} from "@/lib/actions"

type DeliveryMethod = "ship" | "pickup" | "route"
type PaymentTiming = "pay_now" | "pay_at_pickup" | "pay_on_route"

type AddressDefaults = {
  email: string
  first_name: string
  last_name: string
  company: string
  address_1: string
  address_2: string
  city: string
  province: string
  postal_code: string
  country_code: string
  phone: string
}

type ShippingOption = {
  id: string
  name: string
  amount: number
  amountLabel: string
  disabled?: boolean
}

type DealerCheckoutFormProps = {
  addressDefaults: AddressDefaults
  allowPickup: boolean
  allowRouteDelivery: boolean
  dealerAddressSummary: string
  hasManualPayment: boolean
  hasStripePayment: boolean
  shippingOptions: ShippingOption[]
}

function normalizeOptionName(option: ShippingOption) {
  return option.name.trim().toLowerCase()
}

function isPickupShippingOption(option: ShippingOption) {
  return /dealer pickup|pickup|pick up|will call|warehouse/.test(
    normalizeOptionName(option)
  )
}

function isRouteShippingOption(option: ShippingOption) {
  return /route delivery|route|local delivery/.test(normalizeOptionName(option))
}

function getFulfillmentOptions(
  shippingOptions: ShippingOption[],
  deliveryMethod: DeliveryMethod
) {
  if (deliveryMethod === "pickup") {
    return shippingOptions.filter(
      (option) => option.amount === 0 && isPickupShippingOption(option)
    )
  }

  if (deliveryMethod === "route") {
    return shippingOptions.filter(
      (option) => option.amount === 0 && isRouteShippingOption(option)
    )
  }

  return shippingOptions
}

const allDeliveryOptions: Array<{
  value: DeliveryMethod
  title: string
  description: string
  icon: typeof Truck
}> = [
  {
    value: "ship",
    title: "Ship",
    description: "Ship this order by the selected shipping option.",
    icon: Truck,
  },
  {
    value: "pickup",
    title: "Pickup",
    description: "Dealer picks up at Aozoom warehouse and pays on pickup.",
    icon: PackageCheck,
  },
  {
    value: "route",
    title: "Route Delivery",
    description: "Aozoom delivers during route visit and collects on delivery.",
    icon: Route,
  },
]

export function DealerCheckoutForm({
  addressDefaults,
  allowPickup,
  allowRouteDelivery,
  dealerAddressSummary,
  hasManualPayment,
  hasStripePayment,
  shippingOptions,
}: DealerCheckoutFormProps) {
  const [state, formAction, isPending] = useActionState<ActionState, FormData>(
    submitDealerCheckoutAction,
    {}
  )
  const [deliveryMethod, setDeliveryMethod] =
    useState<DeliveryMethod>("ship")
  const [paymentTiming, setPaymentTiming] =
    useState<PaymentTiming>("pay_now")
  const isLocalDelivery = deliveryMethod === "pickup" || deliveryMethod === "route"

  const allowedPaymentOptions = useMemo(() => {
    const options = [
      {
        value: "pay_now" as PaymentTiming,
        title: "Pay now online",
        description: hasStripePayment
          ? "Pay by card before the order is released."
          : "Online card payment must be configured before checkout can continue.",
        disabled: false,
      },
      {
        value: "pay_at_pickup" as PaymentTiming,
        title: "Pay at pickup",
        description: "Collect payment when the dealer picks up the order.",
        disabled: !hasManualPayment,
      },
      {
        value: "pay_on_route" as PaymentTiming,
        title: "Pay on route delivery",
        description: "Collect payment when Aozoom delivers to the store.",
        disabled: !hasManualPayment,
      },
    ]

    if (deliveryMethod === "pickup") {
      return options.filter((option) => option.value !== "pay_on_route")
    }

    if (deliveryMethod === "route") {
      return options.filter((option) => option.value !== "pay_at_pickup")
    }

    return options.filter((option) => option.value === "pay_now")
  }, [deliveryMethod, hasManualPayment, hasStripePayment])

  const deliveryOptions = useMemo(
    () =>
      allDeliveryOptions.filter((option) => {
        if (option.value === "pickup") {
          return allowPickup
        }

        if (option.value === "route") {
          return allowRouteDelivery
        }

        return true
      }),
    [allowPickup, allowRouteDelivery]
  )

  const setDelivery = (method: DeliveryMethod) => {
    setDeliveryMethod(method)

    if (method === "ship") {
      setPaymentTiming("pay_now")
      return
    }

    if (method === "pickup" && paymentTiming === "pay_on_route") {
      setPaymentTiming(hasStripePayment ? "pay_now" : "pay_at_pickup")
    }

    if (method === "route" && paymentTiming === "pay_at_pickup") {
      setPaymentTiming(hasStripePayment ? "pay_now" : "pay_on_route")
    }
  }

  const selectedPaymentDisabled = allowedPaymentOptions.find(
    (option) => option.value === paymentTiming
  )?.disabled
  const fulfillmentOptions = isLocalDelivery
    ? getFulfillmentOptions(shippingOptions, deliveryMethod)
    : shippingOptions
  const selectedFulfillmentOption = fulfillmentOptions[0]

  const submitLabel =
    paymentTiming === "pay_now"
      ? "Continue to Card Payment"
      : deliveryMethod === "pickup"
        ? "Place Pickup Order"
        : "Place Route Order"

  return (
    <form action={formAction} className="checkout-form">
      <input type="hidden" name="delivery_method" value={deliveryMethod} />
      <input type="hidden" name="payment_timing" value={paymentTiming} />

      {state.error ? <div className="error">{state.error}</div> : null}

      <section className="card checkout-card">
        <div className="checkout-card-head">
          <div>
            <p className="stat-label">Delivery</p>
            <h2>Choose Fulfillment</h2>
          </div>
        </div>
        <div className="option-grid">
          {deliveryOptions.map((option) => {
            const Icon = option.icon
            const active = deliveryMethod === option.value

            return (
              <button
                key={option.value}
                type="button"
                className={`option-card ${active ? "active" : ""}`}
                onClick={() => setDelivery(option.value)}
              >
                <Icon size={20} aria-hidden="true" />
                <span>
                  <strong>{option.title}</strong>
                  <small>{option.description}</small>
                </span>
              </button>
            )
          })}
        </div>

        {isLocalDelivery ? (
          <div className="field" style={{ marginTop: 18 }}>
            <label htmlFor="shipping_option_id">Fulfillment option</label>
            <input
              id="shipping_option_id"
              value={
                selectedFulfillmentOption
                  ? `${selectedFulfillmentOption.name} · ${selectedFulfillmentOption.amountLabel}`
                  : "No free local fulfillment option available"
              }
              disabled
            />
            <input
              type="hidden"
              name="shipping_option_id"
              value={selectedFulfillmentOption?.id || ""}
            />
            {!selectedFulfillmentOption ? (
              <p className="muted" style={{ marginTop: 8 }}>
                Make sure the matching $0 Dealer Pickup or Route Delivery
                option exists and its visibility rules are synced.
              </p>
            ) : null}
          </div>
        ) : (
          <div className="field" style={{ marginTop: 18 }}>
            <label htmlFor="shipping_option_id">Shipping option</label>
            <select
              id="shipping_option_id"
              name="shipping_option_id"
              required
              disabled={!fulfillmentOptions.length}
            >
              {fulfillmentOptions.length ? (
                fulfillmentOptions.map((option) => (
                  <option
                    key={option.id}
                    value={option.id}
                    disabled={option.disabled}
                  >
                    {option.name} · {option.amountLabel}
                  </option>
                ))
              ) : (
                <option value="">No delivery option available</option>
              )}
            </select>
          </div>
        )}
      </section>

      <section className="card checkout-card">
        <div className="checkout-card-head">
          <div>
            <p className="stat-label">Address</p>
            <h2>
              {deliveryMethod === "ship"
                ? "Shipping Address"
                : "Dealer Address On File"}
            </h2>
          </div>
          {deliveryMethod !== "ship" ? (
            <span className="address-chip">
              <MapPin size={15} aria-hidden="true" />
              Store record
            </span>
          ) : null}
        </div>

        <div className="field">
          <label htmlFor="email">Email</label>
          <input
            id="email"
            name="email"
            type="email"
            defaultValue={addressDefaults.email}
            required
          />
        </div>

        {deliveryMethod === "ship" ? (
          <div className="checkout-address-grid">
            <div className="field">
              <label htmlFor="first_name">First name</label>
              <input
                id="first_name"
                name="first_name"
                defaultValue={addressDefaults.first_name}
                required
              />
            </div>
            <div className="field">
              <label htmlFor="last_name">Last name</label>
              <input
                id="last_name"
                name="last_name"
                defaultValue={addressDefaults.last_name}
                required
              />
            </div>
            <div className="field checkout-span-2">
              <label htmlFor="company">Store / company</label>
              <input
                id="company"
                name="company"
                defaultValue={addressDefaults.company}
              />
            </div>
            <div className="field checkout-span-2">
              <label htmlFor="address_1">Address</label>
              <input
                id="address_1"
                name="address_1"
                defaultValue={addressDefaults.address_1}
                required
              />
            </div>
            <div className="field checkout-span-2">
              <label htmlFor="address_2">Apt, suite, unit</label>
              <input
                id="address_2"
                name="address_2"
                defaultValue={addressDefaults.address_2}
              />
            </div>
            <div className="field">
              <label htmlFor="city">City</label>
              <input
                id="city"
                name="city"
                defaultValue={addressDefaults.city}
                required
              />
            </div>
            <div className="field">
              <label htmlFor="province">State</label>
              <input
                id="province"
                name="province"
                defaultValue={addressDefaults.province}
                required
              />
            </div>
            <div className="field">
              <label htmlFor="postal_code">ZIP code</label>
              <input
                id="postal_code"
                name="postal_code"
                defaultValue={addressDefaults.postal_code}
                required
              />
            </div>
            <div className="field">
              <label htmlFor="phone">Phone</label>
              <input
                id="phone"
                name="phone"
                defaultValue={addressDefaults.phone}
              />
            </div>
            <input
              type="hidden"
              name="country_code"
              value={addressDefaults.country_code || "us"}
            />
          </div>
        ) : (
          <p className="muted" style={{ marginTop: 12 }}>
            {dealerAddressSummary}
          </p>
        )}
      </section>

      <section className="card checkout-card">
        <div className="checkout-card-head">
          <div>
            <p className="stat-label">Payment</p>
            <h2>Payment</h2>
          </div>
        </div>
        <div className="option-grid">
          {allowedPaymentOptions.map((option) => {
            const active = paymentTiming === option.value

            return (
              <button
                key={option.value}
                type="button"
                className={`option-card ${active ? "active" : ""}`}
                disabled={option.disabled}
                onClick={() => setPaymentTiming(option.value)}
              >
                <CreditCard size={20} aria-hidden="true" />
                <span>
                  <strong>{option.title}</strong>
                  <small>{option.description}</small>
                </span>
              </button>
            )
          })}
        </div>
      </section>

      <section className="card checkout-card">
        <div className="field">
          <label htmlFor="dealer_note">Order note</label>
          <textarea
            id="dealer_note"
            name="dealer_note"
            rows={4}
            placeholder="Pickup time, route instructions, preferred contact, or special handling."
          />
        </div>
      </section>

      <button
        className="btn btn-primary checkout-submit"
        type="submit"
        disabled={
          isPending ||
          !fulfillmentOptions.length ||
          Boolean(selectedPaymentDisabled)
        }
      >
        {isPending ? "Processing..." : submitLabel}
      </button>
    </form>
  )
}
