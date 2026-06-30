"use server"

import type { HttpTypes } from "@medusajs/types"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { DEFAULT_COUNTRY_CODE, sdk } from "./config"
import {
  getAuthHeaders,
  getCartId,
  removeAuthToken,
  removeCartId,
  setAuthToken,
  setCartId,
} from "./cookies"
import {
  getDefaultRegion,
  listCartPaymentMethods,
  listCartShippingMethods,
  requireDealerSession,
  retrieveCart,
  retrieveCartById,
  retrieveDealerProfile,
} from "./data"
import { getStoreName } from "./format"
import type { DealerAddress, DealerProfile, DealerSession } from "./types"

export type ActionState = {
  error?: string
}

type DeliveryMethod = "ship" | "pickup" | "route"
type PaymentTiming = "pay_now" | "pay_at_pickup" | "pay_on_route"

type CartAddressInput = {
  first_name: string
  last_name: string
  company?: string
  address_1: string
  address_2?: string
  city: string
  province: string
  postal_code: string
  country_code: string
  phone?: string
}

const deliveryMethods = new Set<DeliveryMethod>(["ship", "pickup", "route"])
const paymentTimings = new Set<PaymentTiming>([
  "pay_now",
  "pay_at_pickup",
  "pay_on_route",
])

function parseQuantity(value: FormDataEntryValue | null) {
  const quantity = Number(value)

  if (!Number.isInteger(quantity) || quantity < 1) {
    throw new Error("Quantity must be at least 1.")
  }

  if (quantity > 99) {
    throw new Error("Quantity cannot exceed 99.")
  }

  return quantity
}

function getString(formData: FormData, key: string) {
  const value = formData.get(key)
  return typeof value === "string" ? value.trim() : ""
}

function parseDeliveryMethod(value: FormDataEntryValue | null): DeliveryMethod {
  const method = typeof value === "string" ? value : ""

  if (!deliveryMethods.has(method as DeliveryMethod)) {
    throw new Error("Choose a delivery method.")
  }

  return method as DeliveryMethod
}

function parsePaymentTiming(
  value: FormDataEntryValue | null,
  deliveryMethod: DeliveryMethod
): PaymentTiming {
  const timing = typeof value === "string" ? value : ""

  if (!paymentTimings.has(timing as PaymentTiming)) {
    throw new Error("Choose a payment option.")
  }

  if (timing === "pay_at_pickup" && deliveryMethod !== "pickup") {
    throw new Error("Pay at pickup is only available for pickup orders.")
  }

  if (timing === "pay_on_route" && deliveryMethod !== "route") {
    throw new Error("Pay on route is only available for route delivery.")
  }

  if (deliveryMethod === "ship" && timing !== "pay_now") {
    throw new Error("Shipped dealer orders must be paid online before shipping.")
  }

  return timing as PaymentTiming
}

function assertDeliveryMethodAllowed(
  session: DealerSession,
  deliveryMethod: DeliveryMethod
) {
  if (deliveryMethod === "pickup" && session.dealerProfile.allow_pickup !== true) {
    throw new Error("Pickup is not enabled for this dealer account.")
  }

  if (
    deliveryMethod === "route" &&
    session.dealerProfile.allow_route_delivery !== true
  ) {
    throw new Error("Route delivery is not enabled for this dealer account.")
  }
}

function getNameParts(session: DealerSession) {
  const firstName = session.customer.first_name?.trim() || "Aozoom"
  const lastName = session.customer.last_name?.trim() || "Dealer"

  return { firstName, lastName }
}

function normalizeCountryCode(address?: DealerAddress | null) {
  return (
    address?.country_code ||
    address?.country ||
    DEFAULT_COUNTRY_CODE ||
    "us"
  )
    .trim()
    .toLowerCase()
}

function getDealerProfileAddress(profile: DealerProfile) {
  return profile.shipping_address || profile.billing_address || null
}

function requireAddressField(value: string | null | undefined, label: string) {
  const normalized = value?.trim()

  if (!normalized) {
    throw new Error(`${label} is required.`)
  }

  return normalized
}

function buildDealerAddress(session: DealerSession): CartAddressInput {
  const profileAddress = getDealerProfileAddress(session.dealerProfile)

  if (!profileAddress) {
    throw new Error(
      "Dealer profile address is missing. Add a store address before using pickup or route delivery."
    )
  }

  const { firstName, lastName } = getNameParts(session)

  return {
    first_name: firstName,
    last_name: lastName,
    company: getStoreName(session.dealerProfile, session.customer),
    address_1: requireAddressField(profileAddress.address_1, "Dealer address"),
    address_2: profileAddress.address_2?.trim() || "",
    city: requireAddressField(profileAddress.city, "Dealer city"),
    province: requireAddressField(profileAddress.province, "Dealer state"),
    postal_code: requireAddressField(
      profileAddress.postal_code,
      "Dealer ZIP code"
    ),
    country_code: normalizeCountryCode(profileAddress),
    phone: session.dealerProfile.phone?.trim() || "",
  }
}

function buildShippingAddress(
  formData: FormData,
  session: DealerSession
): CartAddressInput {
  const company =
    getString(formData, "company") ||
    getStoreName(session.dealerProfile, session.customer)

  return {
    first_name: requireAddressField(
      getString(formData, "first_name"),
      "First name"
    ),
    last_name: requireAddressField(getString(formData, "last_name"), "Last name"),
    company,
    address_1: requireAddressField(getString(formData, "address_1"), "Address"),
    address_2: getString(formData, "address_2"),
    city: requireAddressField(getString(formData, "city"), "City"),
    province: requireAddressField(getString(formData, "province"), "State"),
    postal_code: requireAddressField(getString(formData, "postal_code"), "ZIP code"),
    country_code: (getString(formData, "country_code") || DEFAULT_COUNTRY_CODE)
      .toLowerCase()
      .trim(),
    phone: getString(formData, "phone"),
  }
}

function getShippingOptionAmount(option: HttpTypes.StoreCartShippingOption) {
  return Number(
    (option as { amount?: number | null; calculated_amount?: number | null })
      .amount ??
      (option as { amount?: number | null; calculated_amount?: number | null })
        .calculated_amount ??
      0
  )
}

function optionName(option: HttpTypes.StoreCartShippingOption) {
  return (option.name || option.id || "").toLowerCase()
}

function isPickupShippingOption(option: HttpTypes.StoreCartShippingOption) {
  return /dealer pickup|pickup|pick up|will call|warehouse/.test(
    optionName(option)
  )
}

function isRouteShippingOption(option: HttpTypes.StoreCartShippingOption) {
  return /route delivery|route|local delivery/.test(optionName(option))
}

function isLocalShippingOptionForDelivery(
  option: HttpTypes.StoreCartShippingOption,
  deliveryMethod: DeliveryMethod
) {
  return deliveryMethod === "pickup"
    ? isPickupShippingOption(option)
    : isRouteShippingOption(option)
}

function isLocalDelivery(deliveryMethod: DeliveryMethod) {
  return deliveryMethod === "pickup" || deliveryMethod === "route"
}

function pickShippingOption(
  options: HttpTypes.StoreCartShippingOption[],
  selectedOptionId: string,
  deliveryMethod: DeliveryMethod
) {
  const available = options.filter(
    (option) => !(option as { insufficient_inventory?: boolean }).insufficient_inventory
  )

  if (!available.length) {
    throw new Error("No shipping or delivery option is available for this cart.")
  }

  const selected = available.find((option) => option.id === selectedOptionId)

  if (isLocalDelivery(deliveryMethod)) {
    const freeOptions = available.filter(
      (option) => getShippingOptionAmount(option) === 0
    )
    const localOptions = freeOptions.filter((option) =>
      isLocalShippingOptionForDelivery(option, deliveryMethod)
    )
    const selectedLocalOption = selected
      ? localOptions.find((option) => option.id === selected.id)
      : null

    if (selected && !selectedLocalOption) {
      throw new Error(
        "Pickup and route delivery must use the matching free ($0) fulfillment option."
      )
    }

    const option = selectedLocalOption ?? localOptions[0]

    if (!option) {
      throw new Error(
        "Pickup and route delivery require a matching free ($0) shipping option. Create a free Dealer Pickup or Route Delivery option and sync its visibility rules in Medusa Admin."
      )
    }

    return option
  }

  if (selected) {
    return selected
  }

  if (selectedOptionId) {
    throw new Error("Selected shipping option is not available for this cart.")
  }

  return [...available].sort(
    (a, b) => getShippingOptionAmount(a) - getShippingOptionAmount(b)
  )[0]
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

async function completeDealerCart(cartId: string) {
  const headers = await getAuthHeaders()
  const cartRes = await sdk.store.cart.complete(cartId, {}, headers)

  if (cartRes.type !== "order") {
    throw new Error("Order could not be completed. Please review the cart.")
  }

  await removeCartId()
  revalidatePath("/cart")
  revalidatePath("/checkout")
  revalidatePath("/orders")
  revalidatePath("/dashboard")

  return cartRes.order
}

export async function loginAction(
  _state: ActionState,
  formData: FormData
): Promise<ActionState> {
  const email = String(formData.get("email") || "").trim().toLowerCase()
  const password = String(formData.get("password") || "")

  if (!email || !password) {
    return { error: "Email and password are required." }
  }

  let token: unknown

  try {
    token = await sdk.auth.login("customer", "emailpass", {
      email,
      password,
    })
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Unable to sign in.",
    }
  }

  try {
    const dealerProfile = await retrieveDealerProfile(token as string, {
      throwOnError: true,
    })

    if (!dealerProfile) {
      return {
        error:
          "This account is not approved for dealer access. Please contact sales@aozoomusa.com.",
      }
    }

    await setAuthToken(token as string)
  } catch (error) {
    return {
      error:
        error instanceof Error
          ? `Dealer access check failed: ${error.message}`
          : "Dealer access check failed.",
    }
  }

  redirect("/dashboard")
}

export async function signOutAction() {
  await removeAuthToken()
  await removeCartId()
  redirect("/login")
}

async function getOrCreateCart() {
  await requireDealerSession()
  const existingCart = await retrieveCart()

  if (existingCart) {
    return existingCart
  }

  const region = await getDefaultRegion()

  if (!region) {
    throw new Error(`No Medusa region found for ${DEFAULT_COUNTRY_CODE}.`)
  }

  const headers = await getAuthHeaders()
  const { cart } = await sdk.store.cart.create(
    {
      region_id: region.id,
      metadata: {
        channel: "dealer_portal",
      },
    },
    {},
    headers
  )

  await setCartId(cart.id)

  return cart
}

export async function addToCartAction(formData: FormData) {
  const variantId = String(formData.get("variant_id") || "")
  const quantity = parseQuantity(formData.get("quantity") || "1")
  const categoryHandle = String(formData.get("category_handle") || "")

  if (!variantId) {
    throw new Error("Missing variant ID.")
  }

  const cart = await getOrCreateCart()
  const headers = await getAuthHeaders()

  await sdk.store.cart.createLineItem(
    cart.id,
    {
      variant_id: variantId,
      quantity,
    },
    {},
    headers
  )

  revalidatePath("/dashboard")
  revalidatePath("/products")
  revalidatePath("/cart")

  redirect(
    categoryHandle
      ? `/products?category=${categoryHandle}`
      : "/products"
  )
}

export async function updateLineItemAction(formData: FormData) {
  const lineId = String(formData.get("line_id") || "")
  const quantity = parseQuantity(formData.get("quantity"))
  const cartId = await getCartId()

  if (!cartId || !lineId) {
    throw new Error("Missing cart or line item.")
  }

  const headers = await getAuthHeaders()

  await sdk.store.cart.updateLineItem(
    cartId,
    lineId,
    { quantity },
    {},
    headers
  )

  revalidatePath("/cart")
  revalidatePath("/dashboard")
}

export async function removeLineItemAction(formData: FormData) {
  const lineId = String(formData.get("line_id") || "")
  const cartId = await getCartId()

  if (!cartId || !lineId) {
    throw new Error("Missing cart or line item.")
  }

  const headers = await getAuthHeaders()
  await sdk.store.cart.deleteLineItem(cartId, lineId, {}, headers)

  revalidatePath("/cart")
  revalidatePath("/dashboard")
}

export async function submitDealerCheckoutAction(
  _state: ActionState,
  formData: FormData
): Promise<ActionState> {
  let redirectTo = ""

  try {
    const session = await requireDealerSession()
    const cartId = await getCartId()

    if (!cartId) {
      throw new Error("Your dealer cart is empty.")
    }

    const cart = await retrieveCartById(cartId)

    if (!cart?.items?.length) {
      throw new Error("Your dealer cart is empty.")
    }

    const deliveryMethod = parseDeliveryMethod(formData.get("delivery_method"))
    const paymentTiming = parsePaymentTiming(
      formData.get("payment_timing"),
      deliveryMethod
    )
    assertDeliveryMethodAllowed(session, deliveryMethod)
    const shippingOptionId = getString(formData, "shipping_option_id")
    const note = getString(formData, "dealer_note")
    const email =
      getString(formData, "email") ||
      session.customer.email ||
      session.dealerProfile.email ||
      ""

    if (!email) {
      throw new Error("Email is required.")
    }

    const address =
      deliveryMethod === "ship"
        ? buildShippingAddress(formData, session)
        : buildDealerAddress(session)

    const headers = await getAuthHeaders()

    const cartUpdate: HttpTypes.StoreUpdateCart = {
      email,
      shipping_address: address,
      billing_address: address,
      metadata: {
        ...((cart.metadata as Record<string, unknown> | null) ?? {}),
        channel: "dealer_portal",
        dealer_checkout: true,
        dealer_delivery_method: deliveryMethod,
        dealer_payment_timing: paymentTiming,
        dealer_checkout_note: note || null,
        dealer_checkout_submitted_at: new Date().toISOString(),
      },
    }

    await sdk.store.cart.update(cartId, cartUpdate, {}, headers)

    const availableShippingOptions = await listCartShippingMethods(cartId)
    const shippingOption = pickShippingOption(
      availableShippingOptions,
      shippingOptionId,
      deliveryMethod
    )

    await sdk.store.cart.addShippingMethod(
      cartId,
      { option_id: shippingOption.id },
      {},
      headers
    )

    const updatedCart = await retrieveCartById(cartId)

    if (!updatedCart) {
      throw new Error("Unable to refresh the dealer cart.")
    }

    const paymentProviders = await listCartPaymentMethods(updatedCart.region_id)

    if (paymentTiming === "pay_now") {
      const stripeProvider =
        paymentProviders.find((provider) => provider.id === "pp_stripe_stripe") ||
        paymentProviders.find((provider) => isStripeProvider(provider.id))

      if (!stripeProvider) {
        throw new Error(
          "Online card payment is not available for this dealer region."
        )
      }

      const stripePublishableKey =
        process.env.NEXT_PUBLIC_STRIPE_KEY ||
        process.env.NEXT_PUBLIC_MEDUSA_PAYMENTS_PUBLISHABLE_KEY

      if (!stripePublishableKey) {
        throw new Error(
          "Stripe publishable key is missing in the dealer portal environment. Set NEXT_PUBLIC_STRIPE_KEY or NEXT_PUBLIC_MEDUSA_PAYMENTS_PUBLISHABLE_KEY."
        )
      }

      await sdk.store.payment.initiatePaymentSession(
        updatedCart,
        { provider_id: stripeProvider.id },
        {},
        headers
      )

      revalidatePath("/checkout")
      redirectTo = "/checkout?payment=card"
    } else {
      const manualProvider = paymentProviders.find((provider) =>
        isManualProvider(provider.id)
      )

      if (!manualProvider) {
        throw new Error(
          "Offline dealer payment is not available for this region. Enable Manual Payment for the region in Medusa Admin."
        )
      }

      await sdk.store.payment.initiatePaymentSession(
        updatedCart,
        { provider_id: manualProvider.id },
        {},
        headers
      )

      const order = await completeDealerCart(cartId)
      redirectTo = `/orders?placed=${order.id}`
    }
  } catch (error) {
    return {
      error:
        error instanceof Error
          ? error.message
          : "Unable to place the dealer order.",
    }
  }

  redirect(redirectTo)
}

export async function completeDealerStripeOrderAction(
  formData: FormData
): Promise<ActionState> {
  let redirectTo = ""

  try {
    await requireDealerSession()
    const cartId = getString(formData, "cart_id")
    const activeCartId = await getCartId()

    if (!cartId || cartId !== activeCartId) {
      throw new Error("Invalid cart for this dealer session.")
    }

    const order = await completeDealerCart(cartId)
    redirectTo = `/orders?placed=${order.id}`
  } catch (error) {
    return {
      error:
        error instanceof Error
          ? error.message
          : "Unable to complete the dealer order.",
    }
  }

  redirect(redirectTo)
}
