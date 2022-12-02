import { Router } from "itty-router";
import { getArtifact, listArtifacts } from "./handlers";
import { ErrorResponse } from "./response";
import { isBlank, toInteger as isInteger } from "./validation";

export interface Env {
  ARTIFACTS_KV: KVNamespace;
  CURSOR_ENCRYPTION_KEY: string;
}

const majorApiVersion = 0;
const defaultPaginationLimit = 10;
const maxPageSize = 250;

const router = Router({ base: `/v${majorApiVersion}` });

router.all("/artifacts/:id", ({ params, method }, env: Env) => {
  if (method !== "GET" && method !== "HEAD") {
    return ErrorResponse.methodNotAllowed(method, ["GET", "HEAD"]);
  }

  const artifactId = params?.id;
  if (artifactId === undefined) {
    throw new Error("Failed to parse URL path argument.");
  }

  return getArtifact({ artifactId, kv: env.ARTIFACTS_KV, method });
});

router.all("/artifacts/", ({ method, query }, env: Env) => {
  if (method !== "GET" && method !== "HEAD") {
    return ErrorResponse.methodNotAllowed(method, ["GET", "HEAD"]);
  }

  if (query === undefined) {
    return listArtifacts({
      limit: defaultPaginationLimit,
      env,
      method,
    });
  }

  const { limit: rawLimit, cursor: rawCursor } = query;

  let limit: number = defaultPaginationLimit;

  if (!isBlank(rawLimit)) {
    const result = isInteger(rawLimit);

    if (!result.valid) {
      return ErrorResponse.malformedRequest(
        "The 'limit' parameter must be an integer.",
        `/artifacts/?limit=${rawLimit}`
      );
    }

    if (result.integer > maxPageSize) {
      return ErrorResponse.malformedRequest(
        `The 'limit' parameter must be less than or equal to ${maxPageSize}.`,
        `/artifacts/?limit=${rawLimit}`
      );
    }

    limit = result.integer;
  }

  const cursor = isBlank(rawCursor) ? undefined : rawCursor;

  return listArtifacts({ limit, cursor, env, method });
});

router.all("*", ({ url }) => ErrorResponse.endpointNotFound(new URL(url)));

const rootRouter = Router();

rootRouter.all(`/v${majorApiVersion}/*`, router.handle);

rootRouter.all("*", ({ url }) => ErrorResponse.endpointNotFound(new URL(url)));

export default {
  fetch: (request: Request, env: Env) =>
    rootRouter.handle(request, env).catch(ErrorResponse.unexpectedError),
};
