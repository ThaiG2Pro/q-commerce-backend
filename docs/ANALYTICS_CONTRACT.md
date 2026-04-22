# Analytics Event Contract

Single source of truth for all PostHog analytics events tracked by this application.

## Critical: actor_id = distinct_id

PostHog uses `actor_id` (passed via `analyticsModuleService.track()`) as the `distinct_id` to identify a person. **All events for the same customer MUST use the same `actor_id` = `customer_id`**, otherwise the PostHog funnel will break — each event would appear as a different user.

```
actor_id = customer_id   →   PostHog distinct_id
```

## Event Schema

Every event sent to PostHog follows this structure:

```typescript
{
  event: string,              // from ANALYTICS_EVENTS constant
  actor_id: string,           // = customer_id (PostHog distinct_id)
  timestamp?: string,         // ISO 8601, optional, default = now
  properties: {
    // Linking (funnel correlation)
    customer_id: string,      // = actor_id (redundant but explicit for queries)
    cart_id: string | null,   // null at customer.created
    order_id: string | null,  // null at customer.created, cart.created

    // Classification
    customer_type: "fake" | "real",  // default "real"
    is_simulated: boolean,           // default false, NEVER undefined
    source: "subscriber" | "script", // default "subscriber"
    schema_version: "1.0",

    // Event-specific (varies per event)
    ...
  }
}
```

## Events

### customer.created

| Property | Type | Notes |
|----------|------|-------|
| email | string | Customer email |
| cart_id | null | Always null |
| order_id | null | Always null |

### cart.created

| Property | Type | Notes |
|----------|------|-------|
| email | string | Customer email |
| cart_id | string | Cart ID |
| order_id | null | Always null |
| currency_code | string \| null | e.g. "vnd" |

### order.placed

| Property | Type | Notes |
|----------|------|-------|
| email | string | Customer email |
| cart_id | string \| null | From order's cart link |
| order_id | string | Order ID |
| total | number \| null | Order total |
| currency_code | string \| null | e.g. "vnd" |
| items_count | number \| null | Number of line items |

### fulfillment.delivered

| Property | Type | Notes |
|----------|------|-------|
| email | string | Customer email |
| order_id | string | Order ID |
| fulfillment_id | string | Fulfillment ID |
| expected_delivery_minutes | number | Default 20 |
| actual_delivery_minutes | number | Computed from timestamps or simulated |
| on_time | boolean | `actual <= expected` |

## Customer Type Detection

```typescript
import { detectCustomerType } from "../analytics"

detectCustomerType("fake+123@example.com") // → "fake"
detectCustomerType("user@gmail.com")       // → "real"
```

Pattern: `fake+*@example.com` → "fake", everything else → "real".

Dev users (e.g. `thai@q-com.com`) already have accounts and never trigger `customer.created`, so they are naturally excluded from the new-customer funnel.

## Two Event Sources

| Source | Tracks | `is_simulated` | `source` |
|--------|--------|----------------|----------|
| Subscribers | Real customers only (fake skipped) | `false` | `"subscriber"` |
| Fake script | Fake customers only | `true` | `"script"` |

Subscribers detect fake email → skip tracking entirely.
Fake script tracks via same `analyticsModuleService.track()` using same contract builders.

## Dependency Map

```
src/analytics/
  constants.ts              ← Event names, schema version, expected delivery minutes
  detect-customer-type.ts   ← detectCustomerType(), isFakeCustomer()
  contracts.ts              ← Types + builder functions (imports constants + detect)
  index.ts                  ← Re-exports everything

src/workflows/
  steps/track-analytics-step.ts  ← Generic step (imports contracts)
  track-analytics.ts             ← Workflow wrapper

src/subscribers/
  customer-created.ts   ← imports contracts + workflow
  cart-created.ts       ← imports contracts + workflow
  order-placed.ts       ← imports contracts + workflow
  delivery-created.ts   ← imports contracts + workflow

src/scripts/fake-orders/
  run.ts                ← imports contracts, resolves analyticsModuleService
```

## Debug Checklist

| Symptom | Likely Cause | Fix |
|---------|-------------|-----|
| Funnel shows each event as different user | `actor_id` not set to `customer_id` | Check builder output |
| `is_simulated` is undefined in PostHog | Builder not called, or manual `.track()` | Always use contract builders |
| Duplicate events for fake customers | Subscriber not skipping fake | Check `isFakeCustomer()` in subscriber |
| Schema drift between subscriber and script | Not using shared contract builders | Import from `src/analytics` |
| Events missing from funnel | `customer_type` filter too restrictive, or `actor_id` mismatch | Check PostHog filter + verify `actor_id` |

## How to Add a New Event

1. Add event name to `ANALYTICS_EVENTS` in `constants.ts`
2. Create builder function in `contracts.ts` following existing pattern
3. Export from `index.ts`
4. Create subscriber (or add to script)
5. Update this doc
