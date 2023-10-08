import { ErrorResponse } from "./response";
import { OKResponse as OkResponse } from "./response";
import { GetArtifactQuery } from "./db/single";
import { toApi } from "./db/model";
import { Cursor } from "./cursor";

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
  cursor,
  limit,
  db,
  method,
}: {
  cursor?: Cursor;
  limit: number;
  db: D1Database;
  method: "GET" | "HEAD";
}): Promise<Response> => {
  // TODO: Implement
  throw new Error("not implemented");
};
