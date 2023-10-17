import { MalformedRequest } from "./response";

export const isBlank = (input: string | undefined | null): boolean =>
  input === undefined || input === null || input === "" || input.trim() === "";

export type CastResult<T> = { valid: true; value: T } | { valid: false };

const toInteger = (input: string): CastResult<number> => {
  if (!/^-?[0-9]+$/.test(input)) return { valid: false };

  return { valid: true, value: parseInt(input, 10) };
};

const minPageSize = 1;
const maxPageSize = 250;
export const defaultPaginationLimit = 10;

export const validateLimit = async (rawLimit: string): Promise<number> => {
  if (isBlank(rawLimit)) return defaultPaginationLimit;

  const castResult = toInteger(rawLimit);

  if (!castResult.valid) {
    throw MalformedRequest({
      detail: "The 'limit' parameter must be an integer.",
      instance: `/artifacts/?limit=${rawLimit}`,
    });
  }

  const limit = castResult.value;

  if (limit < minPageSize) {
    throw MalformedRequest({
      detail: `The 'limit' parameter must be >= ${minPageSize}.`,
      instance: `/artifacts/?limit=${rawLimit}`,
    });
  }

  if (limit > maxPageSize) {
    throw MalformedRequest({
      detail: `The 'limit' parameter must be <= ${maxPageSize}.`,
      instance: `/artifacts/?limit=${rawLimit}`,
    });
  }

  return limit;
};
