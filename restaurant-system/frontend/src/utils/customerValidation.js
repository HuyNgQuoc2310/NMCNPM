import { isValidGmail, isValidVietnamPhone, normalizeContactFieldValue } from "./contactValidation";

export function normalizeCustomerFieldValue(fieldName, fieldValue) {
  return normalizeContactFieldValue(fieldName, fieldValue);
}

export function normalizeCustomerForm(formData = {}) {
  return {
    ...formData,
    full_name: String(formData.full_name || "").trim(),
    phone_number: normalizeCustomerFieldValue("phone_number", formData.phone_number),
    email: String(normalizeCustomerFieldValue("email", formData.email)).trim(),
    address: String(formData.address || "").trim()
  };
}

export function validateCustomerForm(formData = {}) {
  const normalizedValue = normalizeCustomerForm(formData);

  if (!normalizedValue.full_name) {
    return "Tên khách hàng là bắt buộc.";
  }

  if (!isValidVietnamPhone(normalizedValue.phone_number)) {
    return "Số điện thoại phải gồm đúng 10 số Việt Nam và bắt đầu bằng 0.";
  }

  if (normalizedValue.email && !isValidGmail(normalizedValue.email)) {
    return "Email phải có dạng ten@gmail.com.";
  }

  return null;
}
