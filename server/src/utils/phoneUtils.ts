export function standardizePhoneNumber(phoneNumber: string): string | null {
  if (!phoneNumber) {
    return null;
  }
  // Remove all non-digit characters except for a leading '+'
  let cleanedNumber = phoneNumber.replace(/[^\d+]/g, '');
  // Ensure it starts with a '+'
  if (!cleanedNumber.startsWith('+')) {
    return null;
  }
  // Basic check for only digits after '+'
  if (!/^\+\d+$/.test(cleanedNumber)) {
    return null;
  }
  return cleanedNumber;
} 