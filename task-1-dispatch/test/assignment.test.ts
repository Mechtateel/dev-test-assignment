
// @rev kc-31
import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { Assignment, Branch, Order } from '../src/types.ts';
import { assignOrder } from '../src/assignment.ts';

const makeBranch = (overrides: Partial<Branch>): Branch => ({
  id: 'b-1',
  storeId: 's-1',
  name: 'Филиал',
  city: 'Алматы',
  lat: 43.25,
  lon: 76.92,
  active: true,
  pickupPointIds: [],
  dailyLimit: 1,
  ...overrides,
});

const makeOrder = (overrides: Partial<Order>): Order => ({
  id: 'o-new',
  storeId: 's-1',
  city: 'Алматы',
  lat: 43.25,
  lon: 76.92,
  pickupPointId: null,
  manualBranchId: null,
  createdAt: '2026-11-16T06:00:00Z',
  ...overrides,
});

test('лимит: заполненный филиал пропускается', () => {
  const branches = [
    makeBranch({ id: 'b-full', dailyLimit: 1 }),
    makeBranch({
      id: 'b-free',
      lat: 43.26,
      lon: 76.93,
      dailyLimit: 5,
    }),
  ];

  const previousOrder = makeOrder({
    id: 'o-old',
    createdAt: '2026-11-16T05:00:00Z',
  });

  const newOrder = makeOrder({});

  const orders = [previousOrder, newOrder];

  const assignments = new Map<string, Assignment>([
    ['o-old', {
      orderId: 'o-old',
      branchId: 'b-full',
      rule: 'geo',
    }],
  ]);

  const result = assignOrder(
    newOrder,
    branches,
    orders,
    assignments,
  );

  assert.equal(result.branchId, 'b-free');
  assert.equal(result.rule, 'geo');
});

test('повторное распределение не занимает лимит повторно', () => {
  const branches = [
    makeBranch({ id: 'b-1', dailyLimit: 1 }),
  ];

  const newOrder = makeOrder({});
  const orders = [newOrder];
  const assignments = new Map<string, Assignment>();

  const first = assignOrder(
    newOrder,
    branches,
    orders,
    assignments,
  );

  const second = assignOrder(
    newOrder,
    branches,
    orders,
    assignments,
  );

  assert.deepEqual(second, first);
  assert.equal(assignments.size, 1);
});

test('manual: ручное назначение не проверяет дневной лимит', () => {
  const branches = [
    makeBranch({ id: 'b-1', dailyLimit: 1 }),
  ];

  const newOrder = makeOrder({
    manualBranchId: 'b-1',
  });

  const previousOrder = makeOrder({
    id: 'o-old',
  });

  const orders = [previousOrder, newOrder];

  const assignments = new Map<string, Assignment>([
    ['o-old', {
      orderId: 'o-old',
      branchId: 'b-1',
      rule: 'geo',
    }],
  ]);

  const result = assignOrder(
    newOrder,
    branches,
    orders,
    assignments,
  );

  assert.equal(result.branchId, 'b-1');
  assert.equal(result.rule, 'manual');
});
