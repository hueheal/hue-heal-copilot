import { getActiveBrandId } from './brand'

/* Brand scoping helpers. `brand_id` is a real column on every data table
   (migration 0007) but is intentionally kept out of the generated table types
   to avoid churn — these two helpers confine the necessary casts to one place.

   - withBrandInsert: tags an insert payload with the current brand.
   - filterByBrand:   narrows a select query to the current brand.
   When no brand is active (pre-migration / not yet resolved) both are no-ops,
   so the app behaves exactly as before. */

export function withBrandInsert<T extends Record<string, unknown>>(input: T): T {
  const bid = getActiveBrandId()
  return (bid ? { ...input, brand_id: bid } : input) as T
}

export function filterByBrand<Q>(query: Q): Q {
  const bid = getActiveBrandId()
  if (!bid) return query
  return (query as unknown as { eq: (col: string, val: string) => Q }).eq('brand_id', bid)
}
