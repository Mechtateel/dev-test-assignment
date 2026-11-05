
// @rev kc-31
import type { Assignment, Branch, Order } from './types.ts';
import { assignBranch, findNearestBranch } from './router.ts';

type AssignmentStore = Map<string, Assignment>;

function getAlmatyDate(isoDate: string): string {
  const date = new Date(isoDate);

  if (Number.isNaN(date.getTime())) {
    throw new Error('invalid_order_date');
  }

  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Almaty',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);

  const values = Object.fromEntries(
    parts.map((part) => [part.type, part.value])
  );

  return `${values.year}-${values.month}-${values.day}`;
}

export function getBranchLoad(
  branchId: string,
  date: string,
  orders: Order[],
  assignments: AssignmentStore,
): number {
  return orders.filter((order) => {
    const assignment = assignments.get(order.id);

    return (
      assignment?.branchId === branchId &&
      getAlmatyDate(order.createdAt) === date
    );
  }).length;
}

export function assignOrder(
  order: Order,
  branches: Branch[],
  orders: Order[],
  assignments: AssignmentStore,
): Assignment {
  // Повторный запрос не должен занимать лимит снова.
  const existing = assignments.get(order.id);

  if (existing) {
    return existing;
  }

  // Первоначально выбираем филиал по бизнес-правилам.
  const initial = assignBranch(order, branches);

  if (!initial.branchId || initial.rule === 'manual') {
    assignments.set(order.id, initial);
    return initial;
  }

  const date = getAlmatyDate(order.createdAt);

  const selectedBranch = branches.find(
    (branch) => branch.id === initial.branchId
  );

  if (!selectedBranch) {
    assignments.set(order.id, {
      orderId: order.id,
      branchId: null,
      rule: 'unassigned',
    });

    return assignments.get(order.id)!;
  }

  const currentLoad = getBranchLoad(
    selectedBranch.id,
    date,
    orders,
    assignments,
  );

  // Если лимит ещё не заполнен, оставляем выбранный филиал.
  if (currentLoad < selectedBranch.dailyLimit) {
    assignments.set(order.id, initial);
    return initial;
  }

  // Иначе ищем незаполненные филиалы этого магазина.
  const availableBranches = branches.filter((branch) => {
    if (
      branch.storeId !== order.storeId ||
      !branch.active
    ) {
      return false;
    }

    const load = getBranchLoad(
      branch.id,
      date,
      orders,
      assignments,
    );

    return load < branch.dailyLimit;
  });

  // Выбираем ближайший свободный филиал.
  const nearest = findNearestBranch(order, availableBranches);

  const result: Assignment = nearest
    ? {
        orderId: order.id,
        branchId: nearest.id,
        rule: 'geo',
      }
    : {
        orderId: order.id,
        branchId: null,
        rule: 'unassigned',
      };

  assignments.set(order.id, result);

  return result;
}
