import { createBLAKE2b } from "hash-wasm";
import * as contentType from "content-type";

type Endpoint = { kind: "hash" };

type ParseUrlResult =
  | {
      isValid: true;
      endpoint: Endpoint;
    }
  | { isValid: false };

const internalVersion = 1;

const Header = {
  ContentType: "Content-Type",
};

const Status = {
  NotFound(request: Request): Response {
    return new Response(`File ${request.url} not found.`, {
      status: 404,
    });
  },

  InternalServerError(reason: string): Response {
    return new Response(reason, { status: 500 });
  },
};

type HashPayload = ReadonlyArray<string>;

interface HashResponse {
  url: string;
  hash: string;
  mediaType?: string;
}

const Resolver = {
  async hash(request: Request): Promise<Response> {
    const urlList = (await request.json()) as HashPayload;

    const hasher = await createBLAKE2b(512);

    const responses: HashResponse[] = [];

    for (const url of urlList) {
      const response = await fetch(url, { method: "GET" });

      if (!response.ok) {
        return Status.InternalServerError(
          `Download failed with: ${response.status} ${response.statusText}\nURL: ${url}`
        );
      }

      if (response.body === null) {
        continue;
      }

      const bodyReader = response.body.getReader();
      const responseContentType = response.headers.get(Header.ContentType);

      hasher.init();

      while (true) {
        const { done, value } = await bodyReader.read();

        if (done) break;

        hasher.update(value);
      }

      responses.push({
        url,
        hash: hasher.digest("hex"),
        mediaType:
          responseContentType === null
            ? undefined
            : contentType.parse(responseContentType).type,
      });
    }

    return new Response(JSON.stringify(responses), {
      status: 200,
      headers: { [Header.ContentType]: "application/json" },
    });
  },
};

export const parseUrl = (request: Request): ParseUrlResult => {
  const url = new URL(request.url);

  // Remove the leading forward slash.
  const urlPath = url.pathname.replace("/", "");

  // Remove any trailing forward slash.
  const pathComponents = url.pathname.endsWith("/")
    ? urlPath.slice(0, -1).split("/")
    : urlPath.split("/");

  if (pathComponents[0] !== "internal") {
    return { isValid: false };
  }

  if (pathComponents[1] !== `v${internalVersion}`) {
    return { isValid: false };
  }

  switch (pathComponents[2]) {
    case "hash":
      return {
        isValid: true,
        endpoint: { kind: "hash" },
      };
    default:
      return { isValid: false };
  }
};

export default {
  async fetch(request: Request): Promise<Response> {
    const urlParseResult = parseUrl(request);
    if (!urlParseResult.isValid) {
      return Status.NotFound(request);
    }

    const endpoint = urlParseResult.endpoint;

    switch (endpoint.kind) {
      case "hash":
        return Resolver.hash(request);
    }
  },
};
