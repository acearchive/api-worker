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

const newErrorResponse = (
  problem: ProblemInit,
  headers?: ResponseHeaders
): Response =>
  new Response(JSON.stringify(problem), {
    status: problem.status,
    headers: {
      [Header.ContentType]: ContentType.Problem,
      ...headers,
    },
  });

export const ErrorResponse = {
  methodNotAllowed: (
    actual: string,
    allowed: ReadonlyArray<Method>
  ): Response =>
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
  endpointNotFound: (url: URL): Response =>
    newErrorResponse({
      type: "/problems/endpoint-not-found",
      title: "Endpoint Not Found",
      status: 404,
      detail: `There is no such endpoint '${url.pathname}'.`,
      instance: url.pathname,
    }),
  malformedRequest: (detail: string, instance: string): Response =>
    newErrorResponse({
      type: "/problems/malformed-request",
      title: "Malformed Request",
      status: 400,
      detail,
      instance,
    }),
  artifactNotFound: (artifactId: string): Response =>
    newErrorResponse({
      type: "/problems/artifact-not-found",
      title: "Artifact Not Found",
      status: 404,
      detail: `Artifact with ID '${artifactId}' not found.`,
      instance: `/artifacts/${artifactId}`,
    }),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  unexpectedError: (reason: any): Response =>
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
  json: (
    status: number,
    obj?: JsonObject,
    headers?: ResponseHeaders
  ): Response =>
    new Response(JSON.stringify(obj), {
      status,
      headers: {
        [Header.ContentType]: ContentType.Json,
        ...headers,
      },
    }),
};
