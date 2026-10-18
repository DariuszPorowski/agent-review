# amber-bay / oversize

Synthetic local route adapter owned by the amber-bay operations module.

| Contract | Value |
| --- | --- |
| Schema | 2 |
| Transit | 4140 seconds |
| Weight ceiling | 120 kg |
| Base quote | 725 cents |
| Retry policy | reliability.retryPolicy: 3 total attempts, 10 ms delay |
| Service tier | freight |
| Parcel ceiling | 12 |

Exports are in index.js; buildPayload validates local limits before calling injected transport.
Run `npm run test:routes` from the root. Boundary behavior is covered in tests/.
