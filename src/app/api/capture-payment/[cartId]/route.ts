import { NextRequest, NextResponse } from "next/server"
import { revalidatePath } from "next/cache"
import { sdk } from "@/lib/config"
import {
  getAuthHeaders,
  getCartId,
  removeCartId,
} from "@/lib/cookies"
import { retrieveCartById } from "@/lib/data"

type Params = Promise<{ cartId: string }>

function getPaymentDataValue(data: unknown, key: string) {
  if (!data || typeof data !== "object") {
    return undefined
  }

  const value = (data as Record<string, unknown>)[key]
  return typeof value === "string" ? value : undefined
}

function isStripeProvider(providerId?: string) {
  return (
    providerId?.startsWith("pp_stripe_") ||
    providerId?.startsWith("pp_medusa-")
  )
}

async function completeCapturedCart(cartId: string) {
  const activeCartId = await getCartId()

  if (cartId !== activeCartId) {
    return null
  }

  const headers = await getAuthHeaders()
  const cartRes = await sdk.store.cart
    .complete(cartId, {}, headers)
    .catch(() => null)

  if (cartRes?.type !== "order") {
    return null
  }

  await removeCartId()
  revalidatePath("/cart")
  revalidatePath("/checkout")
  revalidatePath("/orders")
  revalidatePath("/dashboard")

  return cartRes.order
}

export async function GET(req: NextRequest, { params }: { params: Params }) {
  const { cartId } = await params
  const { origin, searchParams } = req.nextUrl
  const paymentIntent = searchParams.get("payment_intent")
  const paymentIntentClientSecret = searchParams.get(
    "payment_intent_client_secret"
  )
  const redirectStatus = searchParams.get("redirect_status") || ""

  const failedUrl = new URL("/checkout", origin)
  failedUrl.searchParams.set("payment", "card")
  failedUrl.searchParams.set("error", "payment_failed")

  const cart = await retrieveCartById(cartId)

  if (!cart) {
    return NextResponse.redirect(new URL("/dashboard", origin))
  }

  const paymentSession = cart.payment_collection?.payment_sessions?.find(
    (payment) =>
      isStripeProvider(payment.provider_id) &&
      getPaymentDataValue(payment.data, "id") === paymentIntent
  )

  if (
    !paymentSession ||
    getPaymentDataValue(paymentSession.data, "client_secret") !==
      paymentIntentClientSecret ||
    !["pending", "succeeded"].includes(redirectStatus) ||
    !["pending", "authorized"].includes(paymentSession.status)
  ) {
    return NextResponse.redirect(failedUrl)
  }

  const order = await completeCapturedCart(cartId)

  if (!order) {
    return NextResponse.redirect(failedUrl)
  }

  return NextResponse.redirect(new URL(`/orders?placed=${order.id}`, origin))
}
