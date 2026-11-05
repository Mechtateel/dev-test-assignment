// @rev kc-31
import type { Assignment, Branch, Order } from './types.ts';
import { distanceKm } from './geo.ts';

export function assignBranch(order: Order, branches: Branch[]): Assignment {
  const own = branches.filter((b) => b.storeId === order.storeId && b.active);

  if (order.manualBranchId) {
    const manual = own.find((b) => b.id === order.manualBranchId);
    if (manual) return { orderId: order.id, branchId: manual.id, rule: 'manual' };
  }

  if (own.length === 1) {
    return { orderId: order.id, branchId: own[0].id, rule: 'single' };
  }

 // Правило pickup_point
if (order.pickupPointId) {
  const pickupBranch = own.find((b) =>
    b.pickupPointIds.includes(order.pickupPointId!)
  );

  if (pickupBranch) {
    return {
      orderId: order.id,
      branchId: pickupBranch.id,
      rule: 'pickup_point',
    };
  }
}

// Правило city
const cityBranches = own.filter(
  (b) => b.city === order.city
);

if (cityBranches.length === 1) {
  return {
    orderId: order.id,
    branchId: cityBranches[0].id,
    rule: 'city',
  };
}

  const geoBranches = cityBranches.length > 1
  ? cityBranches
  : own;

  const nearest = findNearest(order, geoBranches);
  if (nearest) return { orderId: order.id, branchId: nearest.id, rule: 'geo' };

  return { orderId: order.id, branchId: null, rule: 'unassigned' };
}

function findNearest(order: Order, branches: Branch[]): Branch | null {
  if (order.lat === null || order.lon === null) return null;

  let best: Branch | null = null;
  let bestDist = Infinity;
  for (const b of branches) {
    const d = distanceKm(order.lat, order.lon, b.lat, b.lon);
    if (d < bestDist) {
      best = b;
      bestDist = d;
    }
  }
  return best;
}
