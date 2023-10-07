import { Router } from "itty-router";
import { getArtifact, listArtifacts } from "./handlers";
import { ErrorResponse, OKResponse } from "./response";
import { defaultPaginationLimit, isBlank, validateLimit } from "./validation";

export interface Env {
  DB: D1Database;
  ARTIFACTS_KV: KVNamespace;
  CURSOR_ENCRYPTION_KEY: string;
}

const majorApiVersion = 0;

const router = Router({ base: `/v${majorApiVersion}` });

router.options("*", () => OKResponse.options());

router.all("/artifacts/:id", ({ params, method }, env: Env) => {
  if (method !== "GET" && method !== "HEAD") {
    return ErrorResponse.methodNotAllowed(method, ["GET", "HEAD", "OPTIONS"]);
  }

  const artifactId = params?.id;
  if (artifactId === undefined) {
    throw new Error("Failed to parse URL path argument.");
  }

  return getArtifact({ artifactId, db: env.DB, method });
});

router.all("/artifacts/", async ({ method, query }, env: Env) => {
  if (method !== "GET" && method !== "HEAD") {
    return ErrorResponse.methodNotAllowed(method, ["GET", "HEAD", "OPTIONS"]);
  }

  if (query === undefined) {
    return listArtifacts({
      limit: defaultPaginationLimit,
      env,
      method,
    });
  }

  const { limit: rawLimit, cursor: rawCursor } = query;

  const limitValidationResult = await validateLimit(rawLimit);

  if (!limitValidationResult.valid) {
    return limitValidationResult.response;
  }

  const limit = limitValidationResult.value;
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
