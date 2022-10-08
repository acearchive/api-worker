import { Router } from "itty-router";

interface Env {
  HASHER_WORKER: ServiceWorkerGlobalScope;
}

const Version = {
  Internal: 1,
  Public: 0,
};

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const router = Router();

    router.post(
      `/internal/v${Version.Internal}/hashes`,
      async (req: Request) => {
        return await env.HASHER_WORKER.fetch(req);
      }
    );

    return await router.handle(request);
  },
};
