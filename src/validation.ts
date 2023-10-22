import { Cursor, hashQueryParams } from "./cursor";
import { SortDirection, SortOrder } from "./db/multiple";
import { InconsistentSortParams, MalformedRequest } from "./response";

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

export const defaultSortOrder: SortOrder = "id";
export const defaultSortDirection: SortDirection = "asc";

export const isSortOrder = (sort: string): sort is SortOrder =>
  sort === "id" || sort === "year";

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

export const validateSortOrder = (sort: string): SortOrder => {
  if (isBlank(sort)) return "id";

  // While `id` is a valid sort order, it's not exposed as part of the public
  // API. The `id` sort order is used when the user does not pass a sort order.
  // We don't allow users to pass it explicitly, because the default sort order
  // is technically unspecified.
  if (sort === "id" || !isSortOrder(sort)) {
    throw MalformedRequest({
      detail: `This is not a valid sort order: '${sort}'.`,
      instance: `/artifacts/?sort=${sort}`,
    });
  }

  return sort;
};

export const validateCursor = ({
  cursor,
  ...params
}: {
  cursor: Cursor;
  sort: SortOrder;
  direction: SortDirection;
  identities?: string;
  people?: string;
  decades?: string;
}) => {
  const paramHash = hashQueryParams(params);

  if (cursor.params !== paramHash) {
    throw InconsistentSortParams(params);
  }
};
