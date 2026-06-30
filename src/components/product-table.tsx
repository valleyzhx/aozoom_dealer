"use client"

import Link from "next/link"
import Image from "next/image"
import { useState } from "react"
import type { HttpTypes } from "@medusajs/types"
import { addToCartAction } from "@/lib/actions"
import {
  formatMoney,
  getCheapestVariant,
  getVariantLabel,
  isVariantInStock,
} from "@/lib/format"

function getSelectedVariant(
  product: HttpTypes.StoreProduct,
  selectedVariantId: string
) {
  return (
    product.variants?.find((variant) => variant.id === selectedVariantId) ||
    getCheapestVariant(product)
  )
}

function getVariantOptionLabel(variant: HttpTypes.StoreProductVariant) {
  const label = getVariantLabel(variant)
  const sku = variant.sku ? ` · ${variant.sku}` : ""

  return `${label}${sku}`
}

function ProductTableRow({
  product,
  categoryHandle,
}: {
  product: HttpTypes.StoreProduct
  categoryHandle?: string
}) {
  const initialVariant = getCheapestVariant(product)
  const [selectedVariantId, setSelectedVariantId] = useState(
    initialVariant?.id || ""
  )
  const variant = getSelectedVariant(product, selectedVariantId)
  const price = variant?.calculated_price
  const inStock = isVariantInStock(variant)
  const thumbnail = variant?.thumbnail || product.thumbnail
  const variants = product.variants ?? []
  const hasMultipleVariants = variants.length > 1

  return (
    <tr>
      <td>
        <div className="product-cell">
          <span className="thumb">
            {thumbnail ? (
              <Image src={thumbnail} alt="" width={58} height={58} />
            ) : null}
          </span>
          <span>
            <strong>{product.title}</strong>
            <br />
            {product.handle ? (
              <Link className="muted" href={`/products/${product.handle}`}>
                View details
              </Link>
            ) : null}
          </span>
        </div>
      </td>
      <td>
        {hasMultipleVariants ? (
          <select
            className="variant-select"
            value={variant?.id || ""}
            aria-label={`Variant for ${product.title}`}
            onChange={(event) => setSelectedVariantId(event.target.value)}
          >
            {variants.map((item) => (
              <option key={item.id} value={item.id}>
                {getVariantOptionLabel(item)}
              </option>
            ))}
          </select>
        ) : (
          getVariantLabel(variant)
        )}
      </td>
      <td>{variant?.sku || "Not set"}</td>
      <td>
        <strong>
          {formatMoney(price?.calculated_amount, price?.currency_code || "usd")}
        </strong>
      </td>
      <td>{inStock ? "In stock" : "Out"}</td>
      <td>
        <form id={`add-${product.id}`} action={addToCartAction}>
          <input type="hidden" name="variant_id" value={variant?.id || ""} />
          <input
            type="hidden"
            name="category_handle"
            value={categoryHandle || ""}
          />
          <input
            className="qty"
            type="number"
            name="quantity"
            min="1"
            max="99"
            defaultValue="1"
            aria-label={`Quantity for ${product.title}`}
          />
        </form>
      </td>
      <td>
        <button
          className="btn btn-primary"
          form={`add-${product.id}`}
          type="submit"
          disabled={!variant?.id || !inStock}
        >
          Add
        </button>
      </td>
    </tr>
  )
}

export function ProductTable({
  products,
  categoryHandle,
}: {
  products: HttpTypes.StoreProduct[]
  categoryHandle?: string
}) {
  if (!products.length) {
    return (
      <div className="card">
        <h2>No products found</h2>
        <p className="muted" style={{ marginTop: 8 }}>
          Try another category or confirm dealer products are active in Medusa.
        </p>
      </div>
    )
  }

  return (
    <div className="table-shell">
      <table className="table">
        <thead>
          <tr>
            <th>Product</th>
            <th>Variant</th>
            <th>SKU</th>
            <th>Dealer Price</th>
            <th>Inventory</th>
            <th>Qty</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {products.map((product) => (
            <ProductTableRow
              key={product.id}
              product={product}
              categoryHandle={categoryHandle}
            />
          ))}
        </tbody>
      </table>
    </div>
  )
}
