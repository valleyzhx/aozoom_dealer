# Aozoom Dealer Center

Standalone B2B portal for approved Aozoom dealers.

This project uses the same Medusa backend as the B2C storefront, but it has a separate frontend and a dealer-first UX.

## Local Setup

```bash
cp .env.example .env.local
node .yarn/releases/yarn-4.12.0.cjs install
node .yarn/releases/yarn-4.12.0.cjs dev
```

Default local URL:

```txt
http://localhost:7000
```

## Required Environment Variables

```txt
NEXT_PUBLIC_MEDUSA_BACKEND_URL=http://localhost:9000
NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY=pk_xxx
NEXT_PUBLIC_CONSUMER_STORE_URL=http://localhost:8000
```

## Phase 1 Scope

- Dealer-only login
- Dealer profile gate via `/store/customers/me/dealer-profile`
- Dashboard
- Quick-order product table
- Cart quantity management
- Order history
- Dealer documents shell
- Checkout planning page

Medusa Admin remains unchanged. Dealer identity, price lists, customer groups, orders, products, and inventory still live in the existing Medusa backend.
