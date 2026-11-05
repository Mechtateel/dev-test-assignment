
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getSlots } from '../src/slots.ts';
import { overlaps, toMinutes } from '../src/time.ts';
import type { Booking, Master, Service } from '../src/types.ts';

const day = { from: '10:00', to: '13:00', breaks: [] };

const master: Master = {
  id: 'm-1',
  name: 'Тест',
  schedule: {
    mon: day,
    tue: day,
    wed: day,
    thu: day,
    fri: day,
    sat: null,
    sun: null,
  },
};

const cut: Service = {
  id: 's-cut',
  name: 'Стрижка',
  durationMin: 60,
  masterIds: ['m-1'],
};

const range = (from: string, to: string) => ({
  start: toMinutes(from),
  end: toMinutes(to),
});

test('overlaps: пересекающиеся интервалы', () => {
  assert.equal(
    overlaps(range('10:00', '11:00'), range('10:30', '11:30')),
    true,
  );
});

test('overlaps: запись сразу после другой не пересекается', () => {
  assert.equal(
    overlaps(range('10:00', '11:00'), range('11:00', '12:00')),
    false,
  );
});

test('getSlots: свободный день', () => {
  // 2030-11-18 — понедельник
  const slots = getSlots(master, cut, '2030-11-18', []);

  assert.deepEqual(slots, [
    '10:00', '10:15', '10:30', '10:45',
    '11:00', '11:15', '11:30', '11:45', '12:00',
  ]);
});

test('getSlots: выходной', () => {
  assert.deepEqual(getSlots(master, cut, '2030-11-23', []), []);
});

test('getSlots: слот не пересекает перерыв', () => {
  const masterWithBreak: Master = {
    ...master,
    schedule: {
      ...master.schedule,
      mon: {
        from: '10:00',
        to: '13:00',
        breaks: [{ from: '11:00', to: '11:30' }],
      },
    },
  };

  const slots = getSlots(masterWithBreak, cut, '2030-11-18', []);

  assert.deepEqual(slots, [
    '10:00',
    '11:30',
    '11:45',
    '12:00',
  ]);
});

test('getSlots: занятое время не выдаётся, отменённые записи не мешают', () => {
  const activeBooking: Booking = {
    id: 'b-1',
    masterId: 'm-1',
    serviceId: 's-cut',
    start: '2030-11-18T05:30:00.000Z',
    end: '2030-11-18T06:30:00.000Z',
    clientPhone: '+77000000000',
    status: 'active',
  };

  const cancelledBooking: Booking = {
    ...activeBooking,
    id: 'b-2',
    status: 'cancelled',
  };

  const withoutBookings = getSlots(master, cut, '2030-11-18', []);
  const withActiveBooking = getSlots(master, cut, '2030-11-18', [activeBooking]);
  const withCancelledBooking = getSlots(master, cut, '2030-11-18', [cancelledBooking]);

  assert.ok(!withActiveBooking.includes('10:30'));
  assert.ok(!withActiveBooking.includes('10:00'));

  assert.deepEqual(withCancelledBooking, withoutBookings);
});

test('getSlots: прошедшее время не выдаётся', () => {
  const slots = getSlots(master, cut, '2020-11-16', []);

  assert.deepEqual(slots, []);
});
