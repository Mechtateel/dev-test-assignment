# Implementation Notes

## Task 1 — Order Dispatch

- Implemented branch selection using pickup point, manual assignment,
  city and geographic distance rules.
- Added nearest branch selection using geographic coordinates.
- Added daily branch capacity limits.
- Added idempotent order assignment to prevent duplicate load counting.
- Manual assignments bypass daily capacity limits.
- Added API endpoints for branches, orders and branch load.

## Task 2 — Online Booking

- Implemented 15-minute booking slot generation.
- Added working schedule and weekday validation.
- Excluded slots overlapping with master breaks.
- Excluded slots occupied by active bookings.
- Cancelled bookings do not block availability.
- Booking timestamps are compared using the Almaty timezone (UTC+5).
- Excluded past booking slots.
- Adjacent time intervals are not considered overlapping.

## Verification

Commands used:

- `npm test`
- `npm run typecheck`

All 19 automated tests pass.
TypeScript type checking completes without errors.