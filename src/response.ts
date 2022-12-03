import { base16 } from "rfc4648";

import { Problem } from "./api";
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

const newErrorResponse = async (
  problem: ProblemInit,
  headers?: ResponseHeaders
): Promise<Response> => {
  const responseBody = JSON.stringify(problem);
  return new Response(responseBody, {
    status: problem.status,
    headers: {
      [Header.ContentType]: ContentType.Problem,
      [Header.ContentLength]: responseBody.length.toString(10),
      [Header.CacheControl]: "no-cache",
      [Header.AccessControlAllowOrigin]: "*",
      [Header.ETag]: await etagFromResponseBody(responseBody),
      ...headers,
    },
  });
};

export const ErrorResponse = {
  methodNotAllowed: async (
    actual: string,
    allowed: ReadonlyArray<Method>
  ): Promise<Response> =>
    newErrorResponse(
      {
        type: "/problems/method-not-allowed",
        status: 405,
        title: "Method Not Allowed",
        detail: `The method '${actual}' is not allowed for this endpoint.`,
      },
      {
        Allow: allowed.join(", "),
      }
    ),
  endpointNotFound: async (url: URL): Promise<Response> =>
    newErrorResponse({
      type: "/problems/endpoint-not-found",
      title: "Endpoint Not Found",
      status: 404,
      detail: `There is no such endpoint '${url.pathname}'.`,
      instance: url.pathname,
    }),
  malformedRequest: async (
    detail: string,
    instance: string
  ): Promise<Response> =>
    newErrorResponse({
      type: "/problems/malformed-request",
      title: "Malformed Request",
      status: 400,
      detail,
      instance,
    }),
  artifactNotFound: async (artifactId: string): Promise<Response> =>
    newErrorResponse({
      type: "/problems/artifact-not-found",
      title: "Artifact Not Found",
      status: 404,
      detail: `Artifact with ID '${artifactId}' not found.`,
      instance: `/artifacts/${artifactId}`,
    }),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  unexpectedError: async (reason: any): Promise<Response> =>
    newErrorResponse({
      type: "/problems/unexpected-error",
      title: "Unexpected Error",
      status: 500,
      detail: reason.toString(),
    }),
};

export type JsonValue =
  | string
  | number
  | boolean
  | null
  | { readonly [property: string]: JsonValue }
  | ReadonlyArray<JsonValue>;

export type JsonObject = Readonly<Record<string, JsonValue>>;

export const OKResponse = {
  json: async (
    status: number,
    obj?: JsonObject,
    headers?: ResponseHeaders
  ): Promise<Response> => {
    const responseBody = JSON.stringify(obj);

    return new Response(responseBody, {
      status,
      headers: {
        [Header.ContentType]: ContentType.Json,
        [Header.ContentLength]: responseBody.length.toString(10),
        [Header.CacheControl]: "no-cache",
        [Header.AccessControlAllowOrigin]: "*",
        [Header.ETag]: await etagFromResponseBody(responseBody),
        ...headers,
      },
    });
  },
};
