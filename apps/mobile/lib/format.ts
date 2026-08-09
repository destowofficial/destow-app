// Money and distance, formatted once so every screen agrees.
//
// Money arrives as integer paise and is never turned into a float on the way to
// the screen: a fare that has been through a float and back is how a display and
// a receipt end up a paisa apart.
export function rupees(paise: number): string {
  const whole = Math.trunc(paise / 100);
  return `₹${whole.toLocaleString('en-IN')}`;
}

export function km(metres: number): string {
  return `${Math.round(metres / 1000).toLocaleString('en-IN')} km`;
}

const DAY = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function shortDate(iso: string | Date): string {
  const d = typeof iso === 'string' ? new Date(iso) : iso;
  return `${d.getDate()} ${MON[d.getMonth()]}`;
}

export function dayDate(iso: string | Date): string {
  const d = typeof iso === 'string' ? new Date(iso) : iso;
  return `${DAY[d.getDay()]}, ${d.getDate()} ${MON[d.getMonth()]}`;
}

export function time(iso: string | Date): string {
  const d = typeof iso === 'string' ? new Date(iso) : iso;
  return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false });
}

/** "14–17 Aug" for a round trip, which is how every trip here reads. */
export function tripDates(fromIso: string, toIso: string | null): string {
  const a = new Date(fromIso);
  if (!toIso) return dayDate(a);
  const b = new Date(toIso);
  return a.getMonth() === b.getMonth()
    ? `${a.getDate()}–${b.getDate()} ${MON[a.getMonth()]}`
    : `${shortDate(a)} – ${shortDate(b)}`;
}
