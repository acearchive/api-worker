import { ErrorResponse } from "./response";
import { ArtifactData, KeyVersion } from "./model";
import { OKResponse as OkResponse } from "./response";
import {
  ArtifactCursor,
  decodeCursor,
  nextPageFromCursor,
  unexpectedCursorErrorDetail,
} from "./cursor";
import { Env } from ".";
import { GetArtifactQuery } from "./db/single";
import { toApi } from "./db/model";

const artifactsListKey = `artifacts:v${KeyVersion.artifacts}:`;

export const getArtifact = async ({
  artifactId,
  db,
  method,
}: {
  artifactId: string;
  db: D1Database;
  method: "GET" | "HEAD";
}): Promise<Response> => {
  const query = new GetArtifactQuery(db, artifactId);

  const artifactRow = await query.query();

  if (artifactRow === undefined) {
    return ErrorResponse.artifactNotFound(artifactId);
  }

  const artifact = toApi(artifactRow);

  switch (method) {
    case "HEAD":
      return OkResponse.json(200);
    case "GET":
      return OkResponse.json(200, artifact);
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
      return OkResponse.json(200);
    case "GET":
      return OkResponse.json(200, responseObj);
  }
};
