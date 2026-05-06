export function isValidEmail(email: string) {
  if (!email || typeof email !== "string") return false;
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email.trim());
}

// Strict check for gmail domain (exactly `@gmail.com`)
export function isGmailEmail(email: string) {
  if (!email || typeof email !== "string") return false;
  const normalized = email.trim().toLowerCase();
  // local-part can be anything non-space/non-@, domain must be exactly gmail.com
  const re = /^[^\s@]+@gmail\.com$/i;
  return re.test(normalized);
}

// Validation for event registration form
export function isValidName(name: string) {
  if (!name || typeof name !== "string") return false;
  const trimmed = name.trim();
  return trimmed.length >= 3 && /^[a-zA-Z\s]+$/.test(trimmed);
}

export function isValidAmityEmail(email: string) {
  if (!email || typeof email !== "string") return false;
  const normalized = email.trim().toLowerCase();
  return /^[^\s@]+@s\.amity\.edu$/i.test(normalized);
}

export function isValidMobileNumber(mobile: string) {
  if (!mobile || typeof mobile !== "string") return false;
  const cleaned = mobile.replace(/\D/g, "");
  return cleaned.length === 10;
}

export function isValidRollNumber(roll: string) {
  if (!roll || typeof roll !== "string") return false;
  const trimmed = roll.trim();
  return /^[a-zA-Z0-9]+$/.test(trimmed) && trimmed.length > 0;
}

export function isValidYear(year: number | string) {
  if (year === "" || year === null || year === undefined) return false;
  const y = Number(year);
  return !isNaN(y) && y >= 1 && y <= 5;
}

export default { isValidEmail, isGmailEmail, isValidName, isValidAmityEmail, isValidMobileNumber, isValidRollNumber, isValidYear };
