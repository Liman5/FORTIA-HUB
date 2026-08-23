export interface PasswordValidationResult {
  hasMinLength: boolean;
  hasUppercase: boolean;
  hasDigit: boolean;
  hasSymbol: boolean;
  isValid: boolean;
  errorMessage?: string;
}

export interface EmailValidationResult {
  isValid: boolean;
  hasAtSymbol: boolean;
  hasValidDomain: boolean;
  hasValidTLD: boolean;
  errorMessage?: string;
}

/**
 * Validates email address format and domain structure:
 * - Must contain '@'
 * - Domain must have at least one dot '.' separating domain name and TLD (e.g. domain.com)
 * - TLD extension must be at least 2 letters (e.g. .com, .org, .fr, .sn, .edu)
 * - No whitespace or invalid special characters in local or domain part
 */
export function validateEmailFormat(email: string): EmailValidationResult {
  const trimmed = email.trim();
  const hasAtSymbol = trimmed.includes('@');
  
  if (!hasAtSymbol) {
    return {
      isValid: false,
      hasAtSymbol: false,
      hasValidDomain: false,
      hasValidTLD: false,
      errorMessage: "L'adresse e-mail doit contenir le symbole '@'."
    };
  }

  const parts = trimmed.split('@');
  if (parts.length !== 2 || !parts[0] || !parts[1]) {
    return {
      isValid: false,
      hasAtSymbol: true,
      hasValidDomain: false,
      hasValidTLD: false,
      errorMessage: "Format d'adresse e-mail incomplet."
    };
  }

  const [localPart, domainPart] = parts;

  // Local part regex check
  const localPartValid = /^[a-zA-Z0-9._%+-]+$/.test(localPart);

  // Domain part validation
  const hasDot = domainPart.includes('.');
  const domainSegments = domainPart.split('.');
  const tld = domainSegments[domainSegments.length - 1];
  const hasValidTLD = Boolean(tld && tld.length >= 2 && /^[a-zA-Z]{2,24}$/.test(tld));
  
  // Full email regex
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,24}$/;
  const isValid = emailRegex.test(trimmed) && localPartValid && hasValidTLD && !domainPart.startsWith('.') && !domainPart.endsWith('.');

  let errorMessage: string | undefined;
  if (!isValid) {
    if (!localPartValid) {
      errorMessage = "La partie identifiant de l'e-mail contient des caractères invalides.";
    } else if (!hasDot) {
      errorMessage = "Le domaine de l'e-mail doit inclure une extension (ex: @domaine.com ou @domaine.sn).";
    } else if (!hasValidTLD) {
      errorMessage = "L'extension de domaine (ex: .com, .fr, .org) doit comporter au moins 2 lettres valides.";
    } else {
      errorMessage = "Format de domaine d'e-mail invalide.";
    }
  }

  return {
    isValid,
    hasAtSymbol,
    hasValidDomain: hasDot && hasValidTLD,
    hasValidTLD,
    errorMessage
  };
}

/**
 * Validates password according to FORTIA HUB mandatory security rules:
 * - Minimum 6 characters
 * - At least 1 uppercase letter (A-Z)
 * - At least 1 digit (0-9)
 * - At least 1 symbol / special character (any non-alphanumeric character like !@#$%...)
 */
export function validatePassword(password: string): PasswordValidationResult {
  const hasMinLength = password.length >= 6;
  const hasUppercase = /[A-Z]/.test(password);
  const hasDigit = /[0-9]/.test(password);
  const hasSymbol = /[^a-zA-Z0-9]/.test(password);

  const isValid = hasMinLength && hasUppercase && hasDigit && hasSymbol;

  let errorMessage: string | undefined;

  if (!isValid) {
    const missing: string[] = [];
    if (!hasMinLength) missing.push("au moins 6 caractères");
    if (!hasUppercase) missing.push("1 lettre majuscule (A-Z)");
    if (!hasDigit) missing.push("1 chiffre (0-9)");
    if (!hasSymbol) missing.push("1 symbole ou caractère spécial (!@#$%...)");

    errorMessage = `Mot de passe refusé. Éléments manquants : ${missing.join(', ')}.`;
  }

  return {
    hasMinLength,
    hasUppercase,
    hasDigit,
    hasSymbol,
    isValid,
    errorMessage
  };
}
