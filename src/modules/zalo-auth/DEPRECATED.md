DEPRECATED

This module provided Zalo authentication integration for the Q-Commerce project.
It has been deprecated and removed from active configuration. Do not use this module in production.

If you need to re-enable Zalo auth in the future:
- Re-add the provider entry in `medusa-config.ts`.
- Restore route handlers under `src/api/auth/zalo`.

For current authentication, use the `emailpass` provider.
