const { dateAtTime, hhmmFromMinutes, minutesFromHHmm } = require("./time");

function overlaps(aStart, aEnd, bStart, bEnd) {
  return aStart < bEnd && bStart < aEnd;
}

function getSlots({
  dateISO,
  serviceDurationMin,
  slotMinutes,
  openTime,
  closeTime,
  breakStart,
  breakEnd,
  existing,
}) {
  const openM = minutesFromHHmm(openTime);
  const closeM = minutesFromHHmm(closeTime);
  const brStartM = breakStart ? minutesFromHHmm(breakStart) : null;
  const brEndM = breakEnd ? minutesFromHHmm(breakEnd) : null;

  const slots = [];
  for (let startM = openM; startM + serviceDurationMin <= closeM; startM += slotMinutes) {
    const startHHmm = hhmmFromMinutes(startM);
    const endHHmm = hhmmFromMinutes(startM + serviceDurationMin);

    if (brStartM !== null && brEndM !== null) {
      const inBreak = overlaps(startM, startM + serviceDurationMin, brStartM, brEndM);
      if (inBreak) continue;
    }

    const startAt = dateAtTime(dateISO, startHHmm);
    const endAt = dateAtTime(dateISO, endHHmm);

    const taken = existing.some((a) => overlaps(startAt, endAt, a.startsAt, a.endsAt));
    if (taken) continue;

    slots.push(startHHmm);
  }
  return slots;
}

module.exports = { getSlots };

