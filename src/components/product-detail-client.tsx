"use client"

import Image from "next/image"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { useEffect, useMemo, useState } from "react"
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

function collectImages(
  product: HttpTypes.StoreProduct,
  variant?: HttpTypes.StoreProductVariant | null
) {
  const urls = [
    variant?.thumbnail,
    product.thumbnail,
    ...(product.images ?? []).map((image) => image.url),
  ].filter((url): url is string => Boolean(url))

  return Array.from(new Set(urls))
}

export function ProductDetailClient({
  product,
}: {
  product: HttpTypes.StoreProduct
}) {
  const initialVariant = getCheapestVariant(product)
  const [selectedVariantId, setSelectedVariantId] = useState(
    initialVariant?.id || ""
  )
  const [imageIndex, setImageIndex] = useState(0)
  const variant = getSelectedVariant(product, selectedVariantId)
  const variants = product.variants ?? []
  const hasMultipleVariants = variants.length > 1
  const images = useMemo(
    () => collectImages(product, variant),
    [product, variant]
  )
  const safeImageIndex = images.length
    ? Math.min(imageIndex, images.length - 1)
    : 0
  const image = images[safeImageIndex]
  const price = variant?.calculated_price
  const inStock = isVariantInStock(variant)

  useEffect(() => {
    setImageIndex(0)
  }, [selectedVariantId])

  function showPreviousImage() {
    setImageIndex((current) =>
      images.length ? (current - 1 + images.length) % images.length : 0
    )
  }

  function showNextImage() {
    setImageIndex((current) =>
      images.length ? (current + 1) % images.length : 0
    )
  }

  return (
    <div className="product-detail-grid">
      <div className="card product-gallery">
        <div className="gallery-main">
          {image ? (
            <Image
              src={image}
              alt=""
              width={560}
              height={420}
              priority
            />
          ) : null}
          {images.length > 1 ? (
            <>
              <button
                className="gallery-nav gallery-nav-left"
                type="button"
                aria-label="Previous product image"
                onClick={showPreviousImage}
              >
                <ChevronLeft size={18} aria-hidden="true" />
              </button>
              <button
                className="gallery-nav gallery-nav-right"
                type="button"
                aria-label="Next product image"
                onClick={showNextImage}
              >
                <ChevronRight size={18} aria-hidden="true" />
              </button>
            </>
          ) : null}
        </div>

        {images.length > 1 ? (
          <div className="gallery-thumbs" aria-label="Product image carousel">
            {images.map((item, index) => (
              <button
                key={item}
                className={`gallery-thumb ${
                  index === safeImageIndex ? "active" : ""
                }`}
                type="button"
                aria-label={`Show product image ${index + 1}`}
                onClick={() => setImageIndex(index)}
              >
                <Image src={item} alt="" width={72} height={72} />
              </button>
            ))}
          </div>
        ) : null}
      </div>

      <div className="card product-purchase-panel">
        <p className="stat-label">Selected Variant</p>
        <h2 style={{ marginTop: 10 }}>{getVariantLabel(variant)}</h2>

        {hasMultipleVariants ? (
          <div className="field" style={{ marginTop: 16 }}>
            <label htmlFor="detail-variant">Variant</label>
            <select
              id="detail-variant"
              className="variant-select"
              value={variant?.id || ""}
              onChange={(event) => setSelectedVariantId(event.target.value)}
            >
              {variants.map((item) => (
                <option key={item.id} value={item.id}>
                  {getVariantOptionLabel(item)}
                </option>
              ))}
            </select>
          </div>
        ) : null}

        <p className="muted" style={{ marginTop: 14 }}>
          SKU: {variant?.sku || "Not set"}
        </p>
        <p className="stat-value">
          {formatMoney(price?.calculated_amount, price?.currency_code || "usd")}
        </p>
        <p className="muted" style={{ marginTop: 8 }}>
          {inStock ? "In stock" : "Out of stock"}
        </p>
        <form
          action={addToCartAction}
          style={{ display: "flex", gap: 10, marginTop: 20 }}
        >
          <input type="hidden" name="variant_id" value={variant?.id || ""} />
          <input
            className="qty"
            type="number"
            name="quantity"
            min="1"
            max="99"
            defaultValue="1"
          />
          <button
            className="btn btn-primary"
            type="submit"
            disabled={!variant?.id || !inStock}
          >
            Add to Cart
          </button>
        </form>
      </div>
    </div>
  )
}
