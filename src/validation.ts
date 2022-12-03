import { ErrorResponse } from "./response";

export const isBlank = (input: string | undefined | null): boolean =>
  input === undefined || input === null || input === "" || input.trim() === "";

export type CastResult<T> = { valid: true; value: T } | { valid: false };

const toInteger = (input: string): CastResult<number> => {
  if (!/^-?[0-9]+$/.test(input)) return { valid: false };

  return { valid: true, value: parseInt(input, 10) };
};

export type ValidationResult<T> =
  | { valid: true; value: T }
  | { valid: false; response: Response };

const minPageSize = 1;
const maxPageSize = 250;
export const defaultPaginationLimit = 10;

export const validateLimit = async (
  rawLimit: string
): Promise<ValidationResult<number>> => {
  if (isBlank(rawLimit)) return { valid: true, value: defaultPaginationLimit };

  const castResult = toInteger(rawLimit);

  if (!castResult.valid) {
    return {
      valid: false,
      response: await ErrorResponse.malformedRequest(
        "The 'limit' parameter must be an integer.",
        `/artifacts/?limit=${rawLimit}`
      ),
    };
  }

  const limit = castResult.value;

  if (limit < minPageSize) {
    return {
      valid: false,
      response: await ErrorResponse.malformedRequest(
        `The 'limit' parameter must be >= ${minPageSize}.`,
        `/artifacts/?limit=${rawLimit}`
      ),
    };
  }

  if (limit > maxPageSize) {
    return {
      valid: false,
      response: await ErrorResponse.malformedRequest(
        `The 'limit' parameter must be <= ${maxPageSize}.`,
        `/artifacts/?limit=${rawLimit}`
      ),
    };
  }

  return { valid: true, value: limit };
};
