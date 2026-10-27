function pad2(n) {
  return String(n).padStart(2, "0");
}

function minutesFromHHmm(hhmm) {
  const [h, m] = String(hhmm).split(":").map((x) => Number(x));
  return h * 60 + m;
}

function hhmmFromMinutes(min) {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${pad2(h)}:${pad2(m)}`;
}

function dateAtTime(dateISO, hhmm) {
  return new Date(`${dateISO}T${hhmm}:00`);
}

module.exports = { minutesFromHHmm, hhmmFromMinutes, dateAtTime };

