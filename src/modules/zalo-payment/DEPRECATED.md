DEPRECATED

This module provided ZaloPay payment integration for the Q-Commerce project.
It has been deprecated and removed from active configuration. Do not use this module in production.

If you need to re-enable ZaloPay in the future:
- Re-add the provider entry in `medusa-config.ts`.
- Ensure the required environment variables (`ZALOPAY_*`) are securely provided.

For current payments, use the configured providers such as `stripe` or `cod`.
