"use client"

import Script from "next/script"
import { useCallback, useEffect, useRef, useState } from "react"
import { completeDealerStripeOrderAction } from "@/lib/actions"

type BillingDetails = {
  name: string
  email: string
  phone?: string
  address: {
    city?: string
    country?: string
    line1?: string
    line2?: string
    postal_code?: string
    state?: string
  }
}

type DealerStripePaymentProps = {
  accountId?: string
  billingDetails: BillingDetails
  cartId: string
  clientSecret: string
  publishableKey: string
}

type StripeElement = {
  mount: (target: HTMLElement) => void
  unmount: () => void
}

type StripeElements = {
  create: (type: "payment", options?: Record<string, unknown>) => StripeElement
  submit: () => Promise<{ error?: { message?: string } }>
}

type StripeClient = {
  elements: (options: { clientSecret: string }) => StripeElements
  confirmPayment: (options: {
    elements: StripeElements
    clientSecret: string
    confirmParams: {
      return_url: string
      payment_method_data: {
        billing_details: BillingDetails
      }
    }
    redirect: "if_required"
  }) => Promise<{
    error?: {
      message?: string
      payment_intent?: { status?: string }
    }
    paymentIntent?: { status?: string }
  }>
}

type StripeFactoryWithOptions = (
  key: string,
  options?: { stripeAccount?: string }
) => StripeClient

declare global {
  interface Window {
    Stripe?: StripeFactoryWithOptions
  }
}

export function DealerStripePayment({
  accountId,
  billingDetails,
  cartId,
  clientSecret,
  publishableKey,
}: DealerStripePaymentProps) {
  const mountRef = useRef<HTMLDivElement | null>(null)
  const stripeRef = useRef<StripeClient | null>(null)
  const elementsRef = useRef<StripeElements | null>(null)
  const paymentElementRef = useRef<StripeElement | null>(null)
  const [ready, setReady] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const mountStripe = useCallback(() => {
    if (
      !window.Stripe ||
      !mountRef.current ||
      stripeRef.current ||
      elementsRef.current
    ) {
      return
    }

    const stripe = window.Stripe(
      publishableKey,
      accountId ? { stripeAccount: accountId } : undefined
    )
    const elements = stripe.elements({ clientSecret })
    const paymentElement = elements.create("payment", {
      layout: "accordion",
    })

    paymentElement.mount(mountRef.current)
    stripeRef.current = stripe
    elementsRef.current = elements
    paymentElementRef.current = paymentElement
    setReady(true)
  }, [accountId, clientSecret, publishableKey])

  useEffect(() => {
    mountStripe()

    return () => {
      paymentElementRef.current?.unmount()
      paymentElementRef.current = null
      elementsRef.current = null
      stripeRef.current = null
    }
  }, [mountStripe])

  const completeOrder = async () => {
    const formData = new FormData()
    formData.set("cart_id", cartId)
    const result = await completeDealerStripeOrderAction(formData)

    if (result?.error) {
      setError(result.error)
      setSubmitting(false)
    }
  }

  const submitPayment = async () => {
    const stripe = stripeRef.current
    const elements = elementsRef.current

    if (!stripe || !elements) {
      setError("Card payment is still loading. Please try again.")
      return
    }

    setSubmitting(true)
    setError(null)

    const { error: submitError } = await elements.submit()

    if (submitError) {
      setError(submitError.message || "Please check your card details.")
      setSubmitting(false)
      return
    }

    const result = await stripe.confirmPayment({
      elements,
      clientSecret,
      confirmParams: {
        return_url: `${window.location.origin}/api/capture-payment/${cartId}`,
        payment_method_data: {
          billing_details: billingDetails,
        },
      },
      redirect: "if_required",
    })

    if (result.error) {
      const status = result.error.payment_intent?.status

      if (status === "requires_capture" || status === "succeeded") {
        await completeOrder()
        return
      }

      setError(result.error.message || "Payment failed. Please try again.")
      setSubmitting(false)
      return
    }

    const status = result.paymentIntent?.status

    if (status === "requires_capture" || status === "succeeded") {
      await completeOrder()
      return
    }

    setError("Payment was not completed. Please try again.")
    setSubmitting(false)
  }

  return (
    <div className="card checkout-card">
      <Script
        src="https://js.stripe.com/v3"
        strategy="afterInteractive"
        onLoad={mountStripe}
      />
      <div>
        <p className="stat-label">Secure Card Payment</p>
        <h2>Pay Now</h2>
      </div>
      <div ref={mountRef} className="stripe-payment-element" />
      {!ready ? (
        <p className="muted" style={{ marginTop: 12 }}>
          Loading secure card payment...
        </p>
      ) : null}
      {error ? <div className="error">{error}</div> : null}
      <button
        className="btn btn-primary checkout-submit"
        type="button"
        disabled={!ready || submitting}
        onClick={submitPayment}
      >
        {submitting ? "Processing..." : "Pay and Place Order"}
      </button>
    </div>
  )
}
