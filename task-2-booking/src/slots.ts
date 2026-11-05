import type { Booking, Master, Service } from './types.ts';
import { fromMinutes, overlaps, toMinutes, weekday, TZ_OFFSET } from './time.ts';

export const SLOT_STEP_MIN = 15;

// Свободные слоты мастера на дату, 'HH:mm' по Алматы
export function getSlots(
  master: Master,
  service: Service,
  date: string,
  bookings: Booking[],
): string[] {
  const day = master.schedule[weekday(date)];

  if (!day) return [];

  const result: string[] = [];
  const dayStart = toMinutes(day.from);
  const dayEnd = toMinutes(day.to);

  // Время начала и окончания рабочего дня
  const now = Date.now();

  for (
    let start = dayStart;
    start + service.durationMin <= dayEnd;
    start += SLOT_STEP_MIN
  ) {
    const end = start + service.durationMin;

    // Не показываем слоты, которые уже начались или прошли
    const slotStart = Date.parse(`${date}T${fromMinutes(start)}:00${TZ_OFFSET}`);

    if (slotStart <= now) continue;

    const slotRange = { start, end };

    // Проверяем перерывы мастера
    const intersectsBreak = day.breaks.some((breakTime) =>
      overlaps(slotRange, {
        start: toMinutes(breakTime.from),
        end: toMinutes(breakTime.to),
      }),
    );

    if (intersectsBreak) continue;

    // Проверяем существующие записи этого мастера
    const intersectsBooking = bookings.some((booking) => {
      if (booking.masterId !== master.id) return false;
      if (booking.status === 'cancelled') return false;

      const bookingStart = Date.parse(booking.start);
      const bookingEnd = Date.parse(booking.end);

      const slotEnd = Date.parse(`${date}T${fromMinutes(end)}:00${TZ_OFFSET}`);

      return slotStart < bookingEnd && bookingStart < slotEnd;
    });

    if (intersectsBooking) continue;

    result.push(fromMinutes(start));
  }

  return result;
}