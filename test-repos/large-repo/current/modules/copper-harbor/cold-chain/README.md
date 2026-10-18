# copper-harbor / cold-chain

Synthetic local route adapter owned by the copper-harbor operations module.

| Contract | Value |
| --- | --- |
| Schema | 2 |
| Transit | 4200 seconds |
| Weight ceiling | 40 kg |
| Base quote | 725 cents |
| Retry policy | reliability.retryPolicy: 3 total attempts, 10 ms delay |
| Service tier | controlled |
| Parcel ceiling | 12 |

Exports are in index.js; buildPayload validates local limits before calling injected transport.
Run `npm run test:routes` from the root. Boundary behavior is covered in tests/.
