import { Router } from "itty-router";
import { getArtifact, listArtifacts } from "./handlers";
import { ErrorResponse } from "./response";
import { defaultPaginationLimit, isBlank, validateLimit } from "./validation";

export interface Env {
  ARTIFACTS_KV: KVNamespace;
  CURSOR_ENCRYPTION_KEY: string;
}

const majorApiVersion = 0;

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

  const limitValidationResult = validateLimit(rawLimit);

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
