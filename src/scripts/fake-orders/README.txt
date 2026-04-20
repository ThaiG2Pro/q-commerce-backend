Usage: pnpm fake:orders --orders=4 --accounts=4 --cartOnly=false

Notes:
- Script uses the Medusa JS SDK (sdk.client.fetch) to call store endpoints.
- Provide real variant IDs by editing src/scripts/fake-orders/variants.template.json
- To pass args when using medusa exec, add `--` before script args, e.g.:
  pnpm fake:orders -- --orders=4 --accounts=4
- package.json fake:orders now uses ts-node so simple flags work:
  pnpm fake:orders --orders=4 --accounts=4
