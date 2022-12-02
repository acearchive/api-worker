import { ErrorResponse } from "./response";
import { ArtifactData, KeyVersion, toApi } from "./model";
import { OKResponse } from "./response";
import { Artifact, ArtifactList } from "./api";
import { decodeCursor, encodeCursor } from "./cursor";
import { Env } from ".";

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

export const listArtifacts = async ({
  cursor: encodedCursor,
  limit,
  env,
  method,
}: {
  limit: number;
  cursor?: string;
  env: Env;
  method: "GET" | "HEAD";
}): Promise<Response> => {
  let decodedCursor: string | undefined = undefined;

  if (encodedCursor !== undefined) {
    const cursorDecodeResult = await decodeCursor({
      cursorFromUser: encodedCursor,
      rawEncryptionKey: env.CURSOR_ENCRYPTION_KEY,
    });

    if (!cursorDecodeResult.valid) {
      return ErrorResponse.malformedRequest(
        "The 'cursor' parameter is not valid. This must be a cursor returned from a previous call to this endpoint.",
        `/artifacts/?cursor=${encodedCursor}`
      );
    }

    decodedCursor = cursorDecodeResult.decoded;
  }

  const listResult = await env.ARTIFACTS_KV.list({
    prefix: listArtifactsPrefix,
    cursor: decodedCursor,
    limit: limit,
  });

  const artifacts: Array<Artifact> = [];

  for (const listKey of listResult.keys) {
    const artifactData: ArtifactData | null | undefined =
      await env.ARTIFACTS_KV.get(listKey.name, { type: "json" });

    if (artifactData === null || artifactData === undefined) continue;

    artifacts.push(toApi(artifactData));
  }

  const responseObj: ArtifactList = {
    items: artifacts,
    next_cursor:
      listResult.list_complete || listResult.cursor === undefined
        ? undefined
        : await encodeCursor({
            cursorFromUpstream: listResult.cursor,
            rawEncryptionKey: env.CURSOR_ENCRYPTION_KEY,
          }),
  };

  switch (method) {
    case "HEAD":
      return OKResponse.json(200);
    case "GET":
      return OKResponse.json(200, responseObj);
  }
};
