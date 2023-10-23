import { base16 } from "rfc4648";

import { Problem } from "./api";
import { SortDirection, SortOrder } from "./db/multiple";
import { ContentType, Header, ResponseHeaders } from "./http";
import { Method } from "./http";

type RequiredExcept<T, P extends keyof T> = Required<Omit<T, P>> &
  Partial<Pick<T, P>>;

// While not required by the API spec, we want to make sure we return most of
// the fields in this problem object.
//
// We want to keep the `Problem` type itself 1:1 with the spec to make keeping
// the two in sync as easy as possible.
export type ProblemInit = RequiredExcept<Problem, "instance">;

export type ErrorInit = Omit<ProblemInit, "status">;

const etagFromResponseBody = async (responseBody: string): Promise<string> => {
  const responseBodyDigest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(responseBody)
  );
  const bodyDigestHexStr = base16
    .stringify(new Uint8Array(responseBodyDigest))
    .toLowerCase();

  return `"${bodyDigestHexStr}"`;
};

const commonResponseHeaders = {
  [Header.CacheControl]: "no-cache",
  [Header.AccessControlAllowOrigin]: "*",
  [Header.AccessControlAllowMethods]: "HEAD, GET, OPTIONS",
  [Header.AccessControlAllowHeaders]: "Content-Type",
} as const;

export class ResponseError extends Error {
  readonly problem: Problem;
  readonly headers: Record<string, string>;

  constructor({
    type,
    title,
    status,
    detail,
    instance,
    headers,
  }: {
    type: string;
    title: string;
    status: number;
    detail: string;
    instance?: string;
    headers?: Record<string, string>;
  }) {
    super(detail);

    this.problem = {
      type,
      title,
      status,
      detail,
      instance,
    };

    this.headers = headers ?? {};
  }

  response = async (): Promise<Response> => {
    const responseBody = JSON.stringify(this.problem);

    return new Response(responseBody, {
      status: this.problem.status,
      headers: {
        [Header.ContentType]: ContentType.Problem,
        [Header.ContentLength]: responseBody.length.toString(10),
        [Header.ETag]: await etagFromResponseBody(responseBody),
        ...commonResponseHeaders,
        ...this.headers,
      },
    });
  };
}

export const MethodNotAllowed = (
  actual: string,
  allowed: ReadonlyArray<Method>
): ResponseError =>
  new ResponseError({
    type: "/problems/method-not-allowed",
    title: "Method Not Allowed",
    status: 405,
    detail: `The method '${actual}' is not allowed for this endpoint.`,
    headers: {
      Allow: allowed.join(", "),
    },
  });

export const EndpointNotFound = (url: URL): ResponseError =>
  new ResponseError({
    type: "/problems/endpoint-not-found",
    title: "Endpoint Not Found",
    status: 404,
    detail: `There is no such endpoint: '${url.pathname}'.`,
    instance: url.pathname,
  });

export const MalformedRequest = ({
  detail,
  instance,
}: {
  detail: string;
  instance: string;
}): ResponseError =>
  new ResponseError({
    type: "/problems/malformed-request",
    title: "Malformed Request",
    status: 400,
    detail,
    instance,
  });

export const UnrecognizedQueryParams = ({
  params,
  endpoint,
}: {
  params: Record<string, string>;
  endpoint: string;
}): ResponseError => {
  // If the user passes multiple bad query params, we're only going to show
  // the first one in the error message.
  const badKey = Object.keys(params)[0];
  const badValue = params[badKey];

  return new ResponseError({
    type: "/problems/unrecognized-parameter",
    title: "Unrecognized Query Parameter",
    status: 400,
    detail: `This is not a valid query parameter: '${badKey}'.`,
    instance: `${endpoint}/?${encodeURIComponent(badKey)}=${encodeURIComponent(
      badValue
    )}`,
  });
};

export const InconsistentSortParams = ({
  sort,
  direction,
  identities,
  people,
  decades,
}: {
  sort: SortOrder;
  direction: SortDirection;
  identities?: string;
  people?: string;
  decades?: string;
}): ResponseError => {
  const params = {
    sort: sort === "id" ? undefined : sort,
    direction,
    identities,
    people,
    decades,
  };

  return new ResponseError({
    type: "/problems/inconsistent-sort-params",
    title: "Inconsistent Sort Parameters",
    status: 400,
    detail:
      "The sort/filter parameters have changed since the previous page. You can't change these parameters partway through paging.",
    instance: `/artifacts/?${Object.entries(params)
      .filter(([, value]) => value !== undefined)
      .map(
        ([key, value]) =>
          `${encodeURIComponent(key)}=${encodeURIComponent(value ?? "")}`
      )
      .join("&")}`,
  });
};

export const InvalidCursor = (cursor: string): ResponseError =>
  new ResponseError({
    type: "/problems/invalid-cursor",
    title: "Invalid Cursor",
    status: 400,
    detail:
      "The 'cursor' parameter is not valid. This must be a cursor returned from a previous call to this endpoint.",
    instance: `/artifacts/?cursor=${encodeURIComponent(cursor)}`,
  });

export const ArtifactNotFound = (artifactId: string): ResponseError =>
  new ResponseError({
    type: "/problems/artifact-not-found",
    title: "Artifact Not Found",
    status: 404,
    detail: `Artifact with ID '${artifactId}' not found.`,
    instance: `/artifacts/${encodeURIComponent(artifactId)}`,
  });

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const UnexpectedError = (reason: any): ResponseError =>
  new ResponseError({
    type: "/problems/unexpected-error",
    title: "Unexpected Error",
    status: 500,
    detail: reason.toString(),
  });

export type JsonValue =
  | string
  | number
  | boolean
  | null
  | { readonly [property: string]: JsonValue }
  | ReadonlyArray<JsonValue>;

export type JsonObject = Readonly<Record<string, JsonValue>>;

export const OkResponse = {
  json: async (
    status: number,
    obj?: JsonObject,
    headers?: ResponseHeaders
  ): Promise<Response> => {
    const responseBody = obj === undefined ? undefined : JSON.stringify(obj);

    return new Response(responseBody, {
      status,
      headers: {
        ...(responseBody !== undefined && {
          [Header.ContentType]: ContentType.Json,
          [Header.ContentLength]: responseBody.length.toString(10),
          [Header.ETag]: await etagFromResponseBody(responseBody),
        }),
        ...commonResponseHeaders,
        ...headers,
      },
    });
  },
  options: async (): Promise<Response> =>
    new Response(undefined, { status: 200, headers: commonResponseHeaders }),
};
