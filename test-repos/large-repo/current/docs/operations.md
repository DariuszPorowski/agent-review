# Local operations, revision 2

Transport is an in-memory injected object. Tests never open sockets or contact carriers.
All hub names, shipments, prices, and terminal entries are synthetic original data.
Retry tests inject no-wait sleep, so the test suite has no wall-clock backoff cost.

Policy v2 moves storage to seconds and nests reliability settings. The intended feature also adds parcel limits, service tiers, and weekend cold-chain deferral.

Do not deploy this fixture or use it to model actual shipping charges.
