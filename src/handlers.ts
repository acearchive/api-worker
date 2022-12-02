import { ErrorResponse } from "./response";
import { ArtifactData, KeyVersion, toApi } from "./model";
import { OKResponse } from "./response";
import {
  ArtifactCursor,
  decodeCursor,
  nextPageFromCursor,
  unexpectedCursorErrorDetail,
} from "./cursor";
import { Env } from ".";

const artifactsListKey = `artifacts:v${KeyVersion.artifacts}:`;

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
  cursor?: string;
  limit: number;
  env: Env;
  method: "GET" | "HEAD";
}): Promise<Response> => {
  let cursor: ArtifactCursor | undefined = undefined;

  if (encodedCursor !== undefined) {
    const cursorDecodeResult = await decodeCursor({
      cursor: encodedCursor,
      rawEncryptionKey: env.CURSOR_ENCRYPTION_KEY,
    });

    if (!cursorDecodeResult.valid) {
      return ErrorResponse.malformedRequest(
        "The 'cursor' parameter is not valid. This must be a cursor returned from a previous call to this endpoint.",
        `/artifacts/?cursor=${encodedCursor}`
      );
    }

    cursor = cursorDecodeResult.cursor;
  }

  const artifactList: ReadonlyArray<ArtifactData> | undefined | null =
    await env.ARTIFACTS_KV.get(artifactsListKey, {
      type: "json",
    });

  if (artifactList === undefined || artifactList === null) {
    // There is no reason why this KV pair should not exist.
    throw new Error(unexpectedCursorErrorDetail);
  }

  const responseObj = await nextPageFromCursor({
    artifacts: artifactList,
    limit,
    cursor,
    env,
  });

  switch (method) {
    case "HEAD":
      return OKResponse.json(200);
    case "GET":
      return OKResponse.json(200, responseObj);
  }
};
