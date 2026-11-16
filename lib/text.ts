export function normName(value: string): string {
  const titles = new Set(["mr", "mrs", "ms", "miss", "alhaji", "alhaja", "chief", "mallam", "dr", "hajiya"]);
  const tokens = value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean);
  while (tokens.length && titles.has(tokens[0])) tokens.shift();
  return tokens.join(" ");
}

export function displayName(value: string): string {
  const cleaned = normName(value);
  if (!cleaned) return value.trim();
  return cleaned.replace(/\b[a-z]/g, (letter) => letter.toUpperCase());
}

export function normPhone(value: string): string {
  let digits = value.replace(/\D/g, "");
  if (digits.startsWith("234")) digits = `0${digits.slice(3)}`;
  if (digits.length === 10) digits = `0${digits}`;
  return digits.length >= 10 ? digits.slice(-11) : "";
}

export function normPlace(value: string): string {
  const drop = new Set(["branch", "shop", "store", "stores", "the", "outlet"]);
  const text = value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\bmkt\b/g, "market")
    .replace(/\brd\b/g, "road");
  return text
    .split(/\s+/)
    .filter((token) => token && !drop.has(token))
    .join(" ");
}

export function normItem(value: string): string {
  const drop = new Set(["capsule", "capsules", "tablet", "tablets", "pack", "packs"]);
  let text = value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\blitres?\b/g, "l")
    .replace(/\bgrams?\b/g, "g");
  text = text.replace(/(\d)\s+(mg|ml|g|kg|l)\b/g, "$1$2");
  text = text
    .split(/\s+/)
    .filter((token) => token && !drop.has(token))
    .map((token) => (token.length > 4 && token.endsWith("s") && !token.endsWith("ss") ? token.slice(0, -1) : token))
    .join(" ");
  return text.replace(/\bsachet\b/g, "sachet");
}

export function numberFrom(value: string): number {
  const cleaned = value.replace(/[^\d.-]/g, "");
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function naira(value: number): string {
  const rounded = Math.round(Math.abs(value));
  const body = rounded.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return `${value < 0 ? "-" : ""}₦${body}`;
}

export function monthLabel(key: string): string {
  const [year, month] = key.split("-").map(Number);
  const names = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  return `${names[(month || 1) - 1]} ${year}`;
}

export function monthKey(date: string): string {
  return date.slice(0, 7);
}

export function sameTokens(left: string, right: string): boolean {
  if (!left || !right) return false;
  if (left === right) return true;
  const a = left.split(" ");
  const b = new Set(right.split(" "));
  const shorter = a.length <= right.split(" ").length ? a : right.split(" ");
  const longer = shorter === a ? b : new Set(a);
  return shorter.every((token) => longer.has(token));
}

export function jaroWinkler(left: string, right: string): number {
  if (left === right) return 1;
  if (!left.length || !right.length) return 0;
  const matchDistance = Math.max(0, Math.floor(Math.max(left.length, right.length) / 2) - 1);
  const leftMatches = new Array(left.length).fill(false);
  const rightMatches = new Array(right.length).fill(false);
  let matches = 0;
  for (let i = 0; i < left.length; i++) {
    const start = Math.max(0, i - matchDistance);
    const end = Math.min(i + matchDistance + 1, right.length);
    for (let j = start; j < end; j++) {
      if (rightMatches[j] || left[i] !== right[j]) continue;
      leftMatches[i] = true;
      rightMatches[j] = true;
      matches++;
      break;
    }
  }
  if (!matches) return 0;
  let transpositions = 0;
  let k = 0;
  for (let i = 0; i < left.length; i++) {
    if (!leftMatches[i]) continue;
    while (!rightMatches[k]) k++;
    if (left[i] !== right[k]) transpositions++;
    k++;
  }
  const jaro = (matches / left.length + matches / right.length + (matches - transpositions / 2) / matches) / 3;
  let prefix = 0;
  while (prefix < 4 && left[prefix] === right[prefix]) prefix++;
  return jaro + prefix * 0.1 * (1 - jaro);
}

export function columnKey(file: string, column: string): string {
  return `${file}::${column}`;
}
