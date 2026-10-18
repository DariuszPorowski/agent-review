# Quote rules

- The quote API and surcharge calculator consume seconds, not minutes or milliseconds.
- A shipment that meets its deadline has no expedite surcharge.
- When an estimator changes its output units, update every conversion at its call sites.
- All monetary amounts are non-negative integer cents.
