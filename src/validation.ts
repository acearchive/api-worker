export const isBlank = (input: string | undefined | null): boolean =>
  input === undefined || input === null || input === "" || input.trim() === "";

export const toInteger = (
  input: string
): { valid: true; integer: number } | { valid: false } => {
  if (!/^[0-9]+$/.test(input)) return { valid: false };

  return { valid: true, integer: parseInt(input, 10) };
};
