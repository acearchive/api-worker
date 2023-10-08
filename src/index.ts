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

router.all("/artifacts/:id", async ({ params, method, query }, env: Env) => {
  if (method !== "GET" && method !== "HEAD") {
    return await ErrorResponse.methodNotAllowed(method, [
      "GET",
      "HEAD",
      "OPTIONS",
    ]);
  }

  const artifactId = params?.id;
  if (artifactId === undefined) {
    throw new Error("Failed to parse URL path argument.");
  }

  if (query !== undefined && Object.keys(query).length > 0) {
    return await ErrorResponse.badQueryParam({
      params: query,
      endpoint: `/artifacts/${artifactId}`,
    });
  }

  return await getArtifact({ artifactId, db: env.DB, method });
});

router.all("/artifacts/", async ({ method, query }, env: Env) => {
  if (method !== "GET" && method !== "HEAD") {
    return ErrorResponse.methodNotAllowed(method, ["GET", "HEAD", "OPTIONS"]);
  }

  if (query === undefined) {
    return await listArtifacts({
      encodedCursor: "",
      cursorKey: env.CURSOR_ENCRYPTION_KEY,
      limit: defaultPaginationLimit,
      db: env.DB,
      method,
    });
  }

  const { limit: rawLimit, cursor: rawCursor, ...remaining } = query;

  if (Object.keys(remaining).length > 0) {
    return await ErrorResponse.badQueryParam({
      params: remaining,
      endpoint: "/artifacts",
    });
  }

  const limitValidationResult = await validateLimit(rawLimit);

  if (!limitValidationResult.valid) {
    return limitValidationResult.response;
  }

  const limit = limitValidationResult.value;

  return await listArtifacts({
    encodedCursor: isBlank(rawCursor) ? undefined : rawCursor,
    cursorKey: env.CURSOR_ENCRYPTION_KEY,
    limit,
    db: env.DB,
    method,
  });
});

router.all("*", ({ url }) => ErrorResponse.endpointNotFound(new URL(url)));

const rootRouter = Router();

rootRouter.all(`/v${majorApiVersion}/*`, router.handle);

rootRouter.all("*", ({ url }) => ErrorResponse.endpointNotFound(new URL(url)));

export default {
  fetch: (request: Request, env: Env) =>
    rootRouter.handle(request, env).catch(ErrorResponse.unexpectedError),
};
