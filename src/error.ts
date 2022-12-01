import { Header, ResponseHeaders } from "./http";
import { Method } from "./http";

export interface Problem {
  type: string;
  status: number;
  title?: string;
  detail?: string;
  instance?: string;
}

export type ErrorInit = Omit<Problem, "status">;

const problemJsonContentType = "application/problem+json";

const newErrorResponse = (
  problem: Problem,
  headers?: ResponseHeaders
): Response =>
  new Response(JSON.stringify(problem), {
    status: problem.status,
    headers: { [Header.ContentType]: problemJsonContentType, ...headers },
  });

export const error = (status: number, payload: ErrorInit): Response =>
  newErrorResponse({ status, ...payload });

export const methodNotAllowedError = (
  actual: string,
  allowed: ReadonlyArray<Method>
): Response =>
  newErrorResponse(
    {
      type: "/problems/method-not-allowed",
      status: 405,
      title: "Method Not Allowed",
      detail: `This method is not allowed: '${actual}'`,
    },
    {
      Allow: allowed.join(", "),
    }
  );
