/**
 * Converts a whole number of seconds into an HH:MM:SS string.
 * Hours are NOT wrapped at 24 (7400s -> 02:03:20), matching the ORBAT format.
 */
function secondsToHMS(totalSeconds) {
  const total = Math.max(0, Math.floor(Number(totalSeconds) || 0));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const secs = total % 60;
  const pad = (n) => String(n).padStart(2, '0');
  return `${pad(hours)}:${pad(minutes)}:${pad(secs)}`;
}

/**
 * Converts an "HH:MM:SS" (or "MM:SS" / "SS") string back into whole seconds.
 * Blank / malformed input safely returns 0.
 */
function hmsToSeconds(hms) {
  if (!hms) return 0;
  const parts = String(hms)
    .trim()
    .split(':')
    .map((p) => parseInt(p, 10))
    .map((n) => (Number.isFinite(n) ? n : 0));

  while (parts.length < 3) parts.unshift(0);
  const [h, m, s] = parts.slice(-3);
  return h * 3600 + m * 60 + s;
}

/**
 * Formats "today" as DD/MM/YYYY in the given IANA timezone.
 */
function todayDDMMYYYY(timeZone = 'Europe/London') {
  const now = new Date();
  const fmt = new Intl.DateTimeFormat('en-GB', {
    timeZone,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
  // en-GB formats as DD/MM/YYYY already
  return fmt.format(now);
}

module.exports = { secondsToHMS, hmsToSeconds, todayDDMMYYYY };
