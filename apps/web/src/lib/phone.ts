export function localMobile(value: string) {
  const digits = value.replace(/\D/g, '');
  return digits.length > 10 ? digits.slice(-10) : digits;
}

export function isIndianMobile(value: string) {
  return /^[6-9]\d{9}$/.test(localMobile(value));
}
