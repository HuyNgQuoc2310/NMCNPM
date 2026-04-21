export const VIETNAM_PHONE_REGEX = /^0\d{9}$/;
export const GMAIL_REGEX = /^[A-Za-z0-9._%+-]+@gmail\.com$/i;

export function normalizeContactFieldValue(fieldName, fieldValue) {
  const nextValue = String(fieldValue ?? "");

  if (fieldName === "phone_number") {
    return nextValue.replace(/\D/g, "").slice(0, 10);
  }

  if (fieldName === "email") {
    return nextValue.trimStart().toLowerCase();
  }

  return nextValue;
}

export function isValidVietnamPhone(phoneNumber) {
  return VIETNAM_PHONE_REGEX.test(String(phoneNumber || "").trim());
}

export function isValidGmail(email) {
  return GMAIL_REGEX.test(String(email || "").trim());
}
