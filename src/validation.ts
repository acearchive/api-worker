export const isBlank = (input: string): boolean =>
  input !== "" && input.trim() !== "";

export const isBase64 = (input: string): boolean => {
  try {
    return btoa(atob(input)) === input;
  } catch {
    return false;
  }
};

export const toInteger = (
  input: string
): { valid: true; integer: number } | { valid: false } => {
  if (!/^[0-9]+$/.test(input)) return { valid: false };

  return { valid: true, integer: parseInt(input, 10) };
};
