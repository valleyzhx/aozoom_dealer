export type DealerAddress = {
  address_1?: string | null
  address_2?: string | null
  city?: string | null
  province?: string | null
  postal_code?: string | null
  country?: string | null
  country_code?: string | null
}

export type DealerProfile = {
  id: string
  status: string
  requested_tier?: string | null
  approved_tier?: string | null
  dealer_group_id?: string | null
  dealer_group_code?: string | null
  dealer_group_name?: string | null
  dealer_group_tier?: string | null
  dealer_valid_from?: string | null
  dealer_valid_until?: string | null
  dealer_valid_months?: number | null
  allow_pickup?: boolean
  allow_route_delivery?: boolean
  pickup_location?: string | null
  route_zone?: string | null
  store_name?: string | null
  company_legal_name?: string | null
  dba_name?: string | null
  business_type?: string | null
  billing_address?: DealerAddress | null
  shipping_address?: DealerAddress | null
  customer_id?: string | null
  email?: string | null
  phone?: string | null
}

export type DealerSession = {
  customer: {
    id: string
    email?: string
    first_name?: string | null
    last_name?: string | null
    company_name?: string | null
  }
  dealerProfile: DealerProfile
}
