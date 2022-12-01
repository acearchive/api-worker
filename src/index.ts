import { Router } from "itty-router";
import { error, methodNotAllowedError } from "./error";

const majorApiVersion = 0;

const router = Router({ base: `/v${majorApiVersion}` });

router
  .head("/artifacts/", () => new Response("TODO"))
  .get("/artifacts/", () => new Response("TODO"))
  .all("/artifacts/", (req) =>
    methodNotAllowedError(req.method, ["GET", "HEAD"])
  );

router
  .head("/artifacts/:id", () => new Response("TODO"))
  .get("/artifacts/:id", () => new Response("TODO"))
  .all("/artifacts/:id", (req) =>
    methodNotAllowedError(req.method, ["GET", "HEAD"])
  );

const rootRouter = Router();

rootRouter.all(`/v${majorApiVersion}/*`, router.handle);

rootRouter.all("*", (req) => {
  const url = new URL(req.url);
  return error(404, {
    type: "/problems/endpoint-not-found",
    title: "Endpoint Not Found",
    detail: `No such endpoint: '${url.pathname}'`,
    instance: url.pathname,
  });
});

export default {
  async fetch(request: Request): Promise<Response> {
    return router.handle(request).catch((reason) =>
      error(500, {
        type: "/problems/unexpected-error",
        title: "Unexpected Error",
        detail: reason.toString(),
      })
    );
  },
};
