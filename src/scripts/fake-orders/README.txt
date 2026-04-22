## Fake Orders Script

Generates fake customers, carts, orders, and fulfillments with PostHog analytics tracking.

### Usage

```bash
pnpm fake:orders --orders=10 --ontime-rate=85 --expect-minutes=20
```

### Parameters

| Param | Default | Description |
|-------|---------|-------------|
| `--orders` | 10 | Number of orders to create |
| `--ontime-rate` | 85 | Percentage of on-time deliveries (0-100) |
| `--expect-minutes` | 20 | Expected delivery time in minutes |

### What it does

For each order:
1. Registers a fake customer (`fake+{ts}_{i}@example.com`)
2. Creates a cart, adds a random item, sets address
3. Completes the cart (places order with COD)
4. Admin: creates fulfillment → marks shipped → marks delivered
5. Tracks 4 PostHog events via analytics module using shared contracts

All events are tagged with `customer_type: "fake"`, `is_simulated: true`, `source: "script"`.

Subscribers automatically skip fake customers, so no duplicate events.

### Config

Edit `config.template.ts` for base URL, publishable key, addresses, etc.
Edit `variants.template.json` for available product variants.
