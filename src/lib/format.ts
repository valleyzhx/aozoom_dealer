import type { HttpTypes } from "@medusajs/types"
import type { DealerProfile } from "./types"

export function formatMoney(amount?: number | null, currencyCode = "usd") {
  if (typeof amount !== "number") {
    return "Unavailable"
  }

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currencyCode.toUpperCase(),
  }).format(amount)
}

export function formatShortDate(value?: string | Date | null) {
  if (!value) {
    return "Not set"
  }

  const date = value instanceof Date ? value : new Date(value)

  if (Number.isNaN(date.getTime())) {
    return "Not set"
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date)
}

export function getDealerTier(profile: DealerProfile) {
  const value = getDealerTierKey(profile)

  if (value === "platinum") {
    return "Platinum"
  }

  if (value === "gold") {
    return "Gold"
  }

  return "Silver"
}

export function getStoreName(
  profile: DealerProfile,
  customer: DealerSessionCustomer
) {
  return (
    profile.store_name ||
    profile.dba_name ||
    profile.company_legal_name ||
    customer.company_name ||
    customer.first_name ||
    "Dealer"
  )
}

type DealerSessionCustomer = {
  first_name?: string | null
  company_name?: string | null
}

export type DealerTierKey = "silver" | "gold" | "platinum"

export function getDealerTierKey(profile: DealerProfile): DealerTierKey {
  const value = (
    profile.dealer_group_tier ||
    profile.dealer_group_code ||
    profile.dealer_group_name ||
    profile.approved_tier ||
    "silver"
  )
    .toLowerCase()
    .trim()

  if (value.includes("platinum") || value.includes("elite")) {
    return "platinum"
  }

  if (value.includes("gold") || value.includes("pro")) {
    return "gold"
  }

  return "silver"
}

export function getVariantLabel(variant?: HttpTypes.StoreProductVariant | null) {
  if (!variant) {
    return "Default"
  }

  const values = ((variant.options ?? []) as { value?: string }[])
    .map((option) => option.value?.trim())
    .filter(Boolean)

  return values.join(" / ") || variant.title || variant.sku || "Default"
}

export function getCheapestVariant(product: HttpTypes.StoreProduct) {
  const variants = product.variants ?? []

  return [...variants].sort((a, b) => {
    const aPrice = a.calculated_price?.calculated_amount ?? Number.MAX_VALUE
    const bPrice = b.calculated_price?.calculated_amount ?? Number.MAX_VALUE

    return aPrice - bPrice
  })[0]
}

export function isVariantInStock(
  variant?: HttpTypes.StoreProductVariant | null
) {
  if (!variant) {
    return false
  }

  const inventoryQuantity = Number(
    (variant as { inventory_quantity?: number | null }).inventory_quantity ?? 0
  )
  const manageInventory = Boolean(
    (variant as { manage_inventory?: boolean | null }).manage_inventory
  )
  const allowBackorder = Boolean(
    (variant as { allow_backorder?: boolean | null }).allow_backorder
  )

  return !manageInventory || inventoryQuantity > 0 || allowBackorder
}
