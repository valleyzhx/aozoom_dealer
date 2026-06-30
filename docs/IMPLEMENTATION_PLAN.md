# Aozoom Dealer Center Implementation Plan

## Phase 1 App Shell

Implemented in this scaffold:

- Next.js App Router
- Medusa JS SDK
- Dealer-only login
- Dealer profile gate
- Dashboard
- Products table
- Product detail
- Cart
- Orders
- Documents
- Checkout boundary

## Important Routes

```txt
/login
/dashboard
/products
/products/[handle]
/cart
/orders
/documents
/checkout
```

## Backend Dependencies

Existing backend routes:

```txt
POST auth/customer/emailpass
GET /store/customers/me
GET /store/customers/me/dealer-profile
GET /store/regions
GET /store/product-categories
GET /store/products
POST /store/carts
POST /store/carts/:id/line-items
POST /store/carts/:id/line-items/:line_id
DELETE /store/carts/:id/line-items/:line_id
GET /store/orders
```

The portal relies on auth headers so dealer customer-group price lists can apply.

## Next Backend Work

When ready for production checkout:

1. Add dealer checkout rules endpoint.
2. Add PO number and delivery method metadata.
3. Restrict dealer shipping options cleanly.
4. Add payment terms visibility.
5. Add invoice/statement data source.

## Design Rules

- Keep B2B UI light, dense, and operational.
- Do not add homepage, blog, SEO hub, or marketing content.
- SKU and dealer price must be visible in product lists.
- Avoid hiding workflows behind cards when a table is faster.
