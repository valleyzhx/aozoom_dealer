import Link from "next/link"
import { notFound } from "next/navigation"
import { retrieveDealerProduct } from "@/lib/data"
import { ProductDetailClient } from "@/components/product-detail-client"
import { SectionHeader } from "@/components/portal-shell"

type ProductPageProps = {
  params: Promise<{ handle: string }>
}

export default async function ProductPage({ params }: ProductPageProps) {
  const { handle } = await params
  const product = await retrieveDealerProduct(handle)

  if (!product) {
    notFound()
  }

  return (
    <>
      <SectionHeader
        eyebrow="Product Detail"
        title={product.title}
        description="Dealer detail view is intentionally compact. B2B buyers mostly need SKU, price, availability, and quick reorder."
        action={
          <Link className="btn btn-secondary" href="/products">
            Back to Products
          </Link>
        }
      />

      <ProductDetailClient product={product} />
    </>
  )
}
