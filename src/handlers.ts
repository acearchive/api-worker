import { ErrorResponse } from "./response";
import { ArtifactData, KeyVersion, toApi } from "./model";
import { OKResponse } from "./response";
import { Artifact, ArtifactList } from "./api";

const listArtifactsPrefix = `artifacts:v${KeyVersion.artifacts}:`;

const toArtifactKey = (artifactId: string): string =>
  `artifacts:v${KeyVersion.artifacts}:${artifactId}`;

export const getArtifact = async ({
  artifactId,
  kv,
  method,
}: {
  artifactId: string;
  kv: KVNamespace;
  method: "GET" | "HEAD";
}): Promise<Response> => {
  const artifactData: ArtifactData | null | undefined = await kv.get(
    toArtifactKey(artifactId),
    { type: "json" }
  );

  if (artifactData === null || artifactData === undefined) {
    return ErrorResponse.artifactNotFound(artifactId);
  }

  switch (method) {
    case "HEAD":
      return OKResponse.json(200);
    case "GET":
      return OKResponse.json(200, toApi(artifactData));
  }
};

// We want to base64-encode whatever cursor Cloudflare gives us to hint that it
// is opaque to end-users and should not be parsed/interpreted.
//
// While the cursors we get from Cloudflare as of time of writing already seem
// to be fairly opaque, that's not under our control.
const encodeCursor = btoa;
const decodeCursor = atob;

export const listArtifacts = async ({
  cursor,
  limit,
  kv,
  method,
}: {
  cursor?: string;
  limit?: number;
  kv: KVNamespace;
  method: "GET" | "HEAD";
}): Promise<Response> => {
  const listResult = await kv.list({
    prefix: listArtifactsPrefix,
    cursor: cursor === undefined ? undefined : decodeCursor(cursor),
    limit: limit,
  });

  const artifacts: Array<Artifact> = [];

  for (const listKey of listResult.keys) {
    const artifactData: ArtifactData | null | undefined = await kv.get(
      listKey.name,
      { type: "json" }
    );

    if (artifactData === null || artifactData === undefined) continue;

    artifacts.push(toApi(artifactData));
  }

  const responseObj: ArtifactList = {
    items: artifacts,
    next_cursor:
      listResult.list_complete || listResult.cursor === undefined
        ? undefined
        : encodeCursor(listResult.cursor),
  };

  switch (method) {
    case "HEAD":
      return OKResponse.json(200);
    case "GET":
      return OKResponse.json(200, responseObj);
  }
};
