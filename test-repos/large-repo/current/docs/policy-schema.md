# Route policy contract, version 2

| Field | Contract |
| --- | --- |
| routeId | Stable hub/service key |
| transitSeconds | Positive seconds for one parcel |
| reliability.retryPolicy | Three total attempts, 10 ms delay by default |
| maxWeightKg | Positive kilograms |
| baseCents | Integer synthetic cents |
| maxParcels | Twelve parcels per shipment |
| serviceTier | Operational classification, not a price multiplier |

The quote API always exposes seconds, regardless of the storage schema.
Additional parcels add two minutes each. Shipment-level retry overrides take precedence;
otherwise dispatch must inherit the route policy and then the shared default.
