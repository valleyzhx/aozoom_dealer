import Link from "next/link"
import { listDealerProducts } from "@/lib/data"
import { ProductTable } from "@/components/product-table"
import { SectionHeader } from "@/components/portal-shell"

type ProductsPageProps = {
  searchParams: Promise<{
    category?: string
    page?: string
  }>
}

export default async function ProductsPage({ searchParams }: ProductsPageProps) {
  const params = await searchParams
  const page = Number(params.page || 1)
  const categoryHandle = params.category
  const result = await listDealerProducts({
    page: Number.isFinite(page) && page > 0 ? page : 1,
    categoryHandle,
  })

  return (
    <>
      <SectionHeader
        eyebrow="Quick Order"
        title="Dealer Product List"
        description={`${result.count} products sorted by name. Dealer prices come from Medusa price lists.`}
        action={
          <Link href="/cart" className="btn btn-primary">
            View Cart
          </Link>
        }
      />

      <nav className="tabs" aria-label="Product categories">
        <Link className={`tab ${!categoryHandle ? "active" : ""}`} href="/products">
          All
        </Link>
        {result.productFamilyCategories.map((category) => (
          <Link
            key={category.id}
            className={`tab ${category.handle === categoryHandle ? "active" : ""}`}
            href={`/products?category=${category.handle}`}
          >
            {category.name || category.handle || "Untitled category"}
          </Link>
        ))}
      </nav>

      <ProductTable
        products={result.products}
        categoryHandle={result.activeCategory?.handle}
      />
    </>
  )
}
