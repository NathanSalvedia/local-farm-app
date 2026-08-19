export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email.trim());
}

export function isValidPassword(password: string): boolean {
  return password.length >= 6;
}

export interface ValidationResult {
  isValid: boolean;
  error?: string;
}

export function validateEmail(email: string): ValidationResult {
  if (!email.trim()) {
    return { isValid: false, error: 'Email is required.' };
  }
  if (!isValidEmail(email)) {
    return { isValid: false, error: 'Please enter a valid email address.' };
  }
  return { isValid: true };
}

export function validatePassword(password: string): ValidationResult {
  if (!password) {
    return { isValid: false, error: 'Password is required.' };
  }
  if (!isValidPassword(password)) {
    return { isValid: false, error: 'Password must be at least 6 characters long.' };
  }
  return { isValid: true };
}

export function isValidPhoneNumber(phone: string): boolean {
  const phoneRegex = /^\+?[0-9]{10,13}$/;
  return phoneRegex.test(phone.trim().replace(/[\s-]/g, ''));
}

export function validatePhoneNumber(phone: string): ValidationResult {
  if (!phone.trim()) {
    return { isValid: false, error: 'Phone number required.' };
  }
  if (!isValidPhoneNumber(phone)) {
    return { isValid: false, error: 'Please enter a valid phone number.' };
  }
  return { isValid: true };
}
