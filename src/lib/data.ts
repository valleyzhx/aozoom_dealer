import { redirect } from "next/navigation"
import type { HttpTypes } from "@medusajs/types"
import { DEFAULT_COUNTRY_CODE, sdk } from "./config"
import { getAuthHeaders, getCartId } from "./cookies"
import type { DealerProfile, DealerSession } from "./types"

export const PRODUCT_LISTING_FIELDS = [
  "id",
  "title",
  "handle",
  "thumbnail",
  "*images",
  "*variants.calculated_price",
  "variants.sku",
  "variants.title",
  "variants.thumbnail",
  "+variants.inventory_quantity",
  "+variants.manage_inventory",
  "+variants.allow_backorder",
  "*variants.options",
  "*variants.options.option",
  "*categories",
].join(",")

export async function listRegions() {
  return sdk.client
    .fetch<{ regions: HttpTypes.StoreRegion[] }>("/store/regions", {
      method: "GET",
      cache: "force-cache",
    })
    .then(({ regions }) => regions)
    .catch(() => [])
}

export async function getDefaultRegion() {
  const regions = await listRegions()

  return (
    regions.find((region) =>
      region.countries?.some(
        (country) => country.iso_2 === DEFAULT_COUNTRY_CODE
      )
    ) ?? regions[0]
  )
}

export async function retrieveCustomer() {
  const headers = await getAuthHeaders()

  const authorization =
    "authorization" in headers ? headers.authorization : undefined

  if (!authorization) {
    return null
  }

  return sdk.client
    .fetch<{ customer: HttpTypes.StoreCustomer }>("/store/customers/me", {
      method: "GET",
      query: {
        fields: "+metadata",
      },
      headers,
      cache: "no-store",
    })
    .then(({ customer }) => customer)
    .catch(() => null)
}

type RetrieveDealerProfileOptions = {
  throwOnError?: boolean
}

export async function retrieveDealerProfile(
  token?: string,
  options: RetrieveDealerProfileOptions = {}
) {
  const headers: { authorization: string } | Record<string, never> = token
    ? { authorization: `Bearer ${token}` }
    : await getAuthHeaders()

  const authorization =
    "authorization" in headers && typeof headers.authorization === "string"
      ? headers.authorization
      : ""

  if (!authorization) {
    return null
  }

  try {
    const { dealer_profile } = await sdk.client.fetch<{
      dealer_profile: DealerProfile | null
    }>(
      "/store/customers/me/dealer-profile",
      {
        method: "GET",
        headers: { authorization },
        cache: "no-store",
      }
    )

    return dealer_profile
  } catch (error) {
    if (options.throwOnError) {
      throw error
    }

    return null
  }
}

export async function getDealerSession(): Promise<DealerSession | null> {
  const [customer, dealerProfile] = await Promise.all([
    retrieveCustomer(),
    retrieveDealerProfile(),
  ])

  if (!customer || !dealerProfile) {
    return null
  }

  return {
    customer: {
      id: customer.id,
      email: customer.email,
      first_name: customer.first_name,
      last_name: customer.last_name,
      company_name: (customer as { company_name?: string | null })
        .company_name,
    },
    dealerProfile,
  }
}

export async function requireDealerSession() {
  const session = await getDealerSession()

  if (!session) {
    redirect("/login")
  }

  return session
}

export async function listProductCategories() {
  return sdk.client
    .fetch<{ product_categories: HttpTypes.StoreProductCategory[] }>(
      "/store/product-categories",
      {
        method: "GET",
        query: {
          fields:
            "id,name,handle,is_active,is_internal,*category_children,parent_category.id,parent_category.name,parent_category.handle,+metadata",
          limit: 200,
        },
        cache: "force-cache",
      }
    )
    .then(({ product_categories }) => product_categories)
    .catch(() => [])
}

function getCategoryLabel(category: HttpTypes.StoreProductCategory) {
  return category.name || category.handle || category.id || "Untitled category"
}

export function getProductFamilyCategories(
  categories: HttpTypes.StoreProductCategory[]
) {
  const categoriesById = new Map(
    categories
      .filter((category) => category.id)
      .map((category) => [category.id, category])
  )
  const productsCategory = categories.find(
    (category) => category.handle === "products"
  )
  const rawChildren = productsCategory?.category_children?.length
    ? productsCategory.category_children
    : categories.filter(
        (category) => category.parent_category?.handle === "products"
      )
  const children = rawChildren.map((category) => {
    const fullCategory = categoriesById.get(category.id)

    return fullCategory
      ? {
          ...category,
          ...fullCategory,
          name: category.name || fullCategory.name,
          handle: category.handle || fullCategory.handle,
          category_children:
            category.category_children || fullCategory.category_children,
        }
      : category
  })

  return [...children]
    .filter((category) => {
      const extended = category as HttpTypes.StoreProductCategory & {
        is_active?: boolean
        is_internal?: boolean
      }

      return extended.is_active !== false && extended.is_internal !== true
    })
    .sort((a, b) =>
      getCategoryLabel(a).localeCompare(getCategoryLabel(b), undefined, {
        numeric: true,
        sensitivity: "base",
      })
    )
}

function getCategoryAndChildIds(category?: HttpTypes.StoreProductCategory) {
  if (!category) {
    return undefined
  }

  const ids = new Set<string>([category.id])
  category.category_children?.forEach((child) => ids.add(child.id))

  return Array.from(ids)
}

export async function listDealerProducts({
  page = 1,
  categoryHandle,
  limit = 24,
}: {
  page?: number
  categoryHandle?: string
  limit?: number
}) {
  await requireDealerSession()
  const region = await getDefaultRegion()
  const headers = await getAuthHeaders()
  const allCategories = await listProductCategories()
  const productFamilyCategories = getProductFamilyCategories(allCategories)
  const activeCategory = productFamilyCategories.find(
    (category) => category.handle === categoryHandle
  )
  const categoryIds = getCategoryAndChildIds(activeCategory)

  if (!region) {
    return {
      products: [],
      count: 0,
      page,
      limit,
      productFamilyCategories,
      activeCategory,
    }
  }

  const offset = Math.max(page - 1, 0) * limit

  const response = await sdk.client
    .fetch<{ products: HttpTypes.StoreProduct[]; count: number }>(
      "/store/products",
      {
        method: "GET",
        query: {
          limit,
          offset,
          region_id: region.id,
          fields: PRODUCT_LISTING_FIELDS,
          ...(categoryIds?.length ? { category_id: categoryIds } : {}),
        },
        headers,
        cache: "no-store",
      }
    )
    .catch(() => ({ products: [], count: 0 }))

  return {
    products: [...response.products].sort((a, b) =>
      (a.title || a.handle || "").localeCompare(b.title || b.handle || "", undefined, {
        numeric: true,
        sensitivity: "base",
      })
    ),
    count: response.count,
    page,
    limit,
    productFamilyCategories,
    activeCategory,
  }
}

export async function retrieveDealerProduct(handle: string) {
  await requireDealerSession()
  const region = await getDefaultRegion()
  const headers = await getAuthHeaders()

  if (!region) {
    return null
  }

  return sdk.client
    .fetch<{ products: HttpTypes.StoreProduct[] }>("/store/products", {
      method: "GET",
      query: {
        handle,
        limit: 1,
        region_id: region.id,
        fields: PRODUCT_LISTING_FIELDS,
      },
      headers,
      cache: "no-store",
    })
    .then(({ products }) => products[0] ?? null)
    .catch(() => null)
}

export async function retrieveCart() {
  return retrieveCartById()
}

export async function retrieveCartById(cartId?: string) {
  cartId ??= await getCartId()

  if (!cartId) {
    return null
  }

  const headers = await getAuthHeaders()

  if (!("authorization" in headers)) {
    return null
  }

  return sdk.client
    .fetch<{ cart: HttpTypes.StoreCart }>(`/store/carts/${cartId}`, {
      method: "GET",
      query: {
        fields:
          "*items,*items.product,*items.variant,*items.thumbnail,*items.metadata,+items.total,*region,*region.countries,*shipping_address,*billing_address,+shipping_methods.name,*shipping_methods,*promotions,*payment_collection,*payment_collection.payment_sessions,+item_subtotal,+shipping_subtotal,+discount_subtotal,+tax_total,+total",
      },
      headers,
      cache: "no-store",
    })
    .then(({ cart }) => cart)
    .catch(() => null)
}

export async function listCartShippingMethods(cartId: string) {
  await requireDealerSession()
  const headers = await getAuthHeaders()

  return sdk.client
    .fetch<{ shipping_options: HttpTypes.StoreCartShippingOption[] }>(
      "/store/shipping-options",
      {
        method: "GET",
        query: {
          cart_id: cartId,
        },
        headers,
        cache: "no-store",
      }
    )
    .then(({ shipping_options }) => shipping_options)
    .catch(() => [])
}

export async function listCartPaymentMethods(regionId?: string | null) {
  await requireDealerSession()

  if (!regionId) {
    return []
  }

  const headers = await getAuthHeaders()

  return sdk.client
    .fetch<{ payment_providers: { id: string }[] }>(
      "/store/payment-providers",
      {
        method: "GET",
        query: {
          region_id: regionId,
        },
        headers,
        cache: "no-store",
      }
    )
    .then(({ payment_providers }) =>
      payment_providers.sort((a, b) => a.id.localeCompare(b.id))
    )
    .catch(() => [])
}

export async function listOrders(limit = 20, offset = 0) {
  await requireDealerSession()
  const headers = await getAuthHeaders()

  return sdk.client
    .fetch<{ orders: HttpTypes.StoreOrder[]; count?: number }>(
      "/store/orders",
      {
        method: "GET",
        query: {
          limit,
          offset,
          order: "-created_at",
          fields: "+metadata,*items,*items.variant,*items.product",
        },
        headers,
        cache: "no-store",
      }
    )
    .catch(() => ({ orders: [], count: 0 }))
}
