import { Router } from "itty-router";
import { getArtifact, listArtifacts } from "./handlers";
import {
  EndpointNotFound,
  MethodNotAllowed,
  OkResponse,
  ResponseError,
  UnexpectedError,
  UnrecognizedQueryParams,
} from "./response";
import { defaultPaginationLimit, isBlank, validateLimit } from "./validation";

export interface Env {
  DB: D1Database;
  ARTIFACTS_KV: KVNamespace;
  CURSOR_ENCRYPTION_KEY: string;
}

const majorApiVersion = 0;

const router = Router({ base: `/v${majorApiVersion}` });

router.options("*", () => OkResponse.options());

router.all("/artifacts/:id", async ({ params, method, query }, env: Env) => {
  if (method !== "GET" && method !== "HEAD") {
    throw MethodNotAllowed(method, ["GET", "HEAD", "OPTIONS"]);
  }

  const artifactId = params?.id;
  if (artifactId === undefined) {
    throw new Error("Failed to parse URL path argument.");
  }

  if (query !== undefined && Object.keys(query).length > 0) {
    throw UnrecognizedQueryParams({
      params: query,
      endpoint: `/artifacts/${artifactId}`,
    });
  }

  return await getArtifact({ artifactId, db: env.DB, method });
});

router.all("/artifacts/", async ({ method, query }, env: Env) => {
  if (method !== "GET" && method !== "HEAD") {
    throw MethodNotAllowed(method, ["GET", "HEAD", "OPTIONS"]);
  }

  if (query === undefined) {
    return await listArtifacts({
      cursorKey: env.CURSOR_ENCRYPTION_KEY,
      limit: defaultPaginationLimit,
      db: env.DB,
      method,
    });
  }

  const { limit: rawLimit, cursor: rawCursor, ...remaining } = query;

  if (Object.keys(remaining).length > 0) {
    throw UnrecognizedQueryParams({
      params: remaining,
      endpoint: "/artifacts",
    });
  }

  const limit = await validateLimit(rawLimit);

  return await listArtifacts({
    encodedCursor: isBlank(rawCursor) ? undefined : rawCursor,
    cursorKey: env.CURSOR_ENCRYPTION_KEY,
    limit,
    db: env.DB,
    method,
  });
});

router.all("*", ({ url }) => {
  throw EndpointNotFound(new URL(url));
});

const rootRouter = Router();

rootRouter.all(`/v${majorApiVersion}/*`, router.handle);

rootRouter.all("*", ({ url }) => {
  throw EndpointNotFound(new URL(url));
});

export default {
  fetch: (request: Request, env: Env) =>
    rootRouter.handle(request, env).catch(async (err) => {
      console.log(err.message);

      if (err instanceof ResponseError) {
        return await err.response();
      } else {
        return await UnexpectedError(err.message).response();
      }
    }),
};
