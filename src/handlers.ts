import { ArtifactNotFound, OkResponse as OkResponse } from "./response";
import { GetArtifactQuery } from "./db/single";
import { artifactToApi, tagToApi } from "./db/model";
import { decodeCursor, encodeCursor } from "./cursor";
import { GetArtifactListQuery } from "./db/multiple";
import { ArtifactList, TagList } from "./api";
import { GetTagsQuery } from "./db/tags";

export const getArtifact = async ({
  artifactId,
  db,
  method,
  siteDomain,
  filesDomain,
}: {
  artifactId: string;
  db: D1Database;
  method: "GET" | "HEAD";
  siteDomain: string;
  filesDomain: string;
}): Promise<Response> => {
  const query = new GetArtifactQuery(db, artifactId);

  const artifactRow = await query.run();

  if (artifactRow === undefined) {
    throw ArtifactNotFound(artifactId);
  }

  const artifact = artifactToApi(artifactRow, { siteDomain, filesDomain });

  switch (method) {
    case "HEAD":
      return OkResponse.json(200);
    case "GET":
      return OkResponse.json(200, artifact);
  }
};

export const listArtifacts = async ({
  encodedCursor,
  cursorKey,
  limit,
  db,
  method,
  siteDomain,
  filesDomain,
}: {
  encodedCursor?: string;
  cursorKey: string;
  limit: number;
  db: D1Database;
  method: "GET" | "HEAD";
  siteDomain: string;
  filesDomain: string;
}): Promise<Response> => {
  const cursor =
    encodedCursor === undefined
      ? undefined
      : await decodeCursor({
        cursor: encodedCursor,
        rawEncryptionKey: cursorKey,
      });

  const query = new GetArtifactListQuery(db, cursor, limit);
  const { artifacts: artifactRows, lastCursor } = await query.run();

  const artifacts = artifactRows.map((item) =>
    artifactToApi(item, { siteDomain, filesDomain })
  );
  let resp_obj: ArtifactList;

  if (artifacts.length === 0) {
    resp_obj = {
      items: [],
    };
  } else if (artifacts[artifacts.length - 1].id === lastCursor) {
    // This is the final page.
    resp_obj = {
      items: artifacts,
    };
  } else {
    resp_obj = {
      items: artifacts,
      next_cursor: await encodeCursor({
        cursor: {
          key: "id",
          id: artifacts[artifacts.length - 1].id,
        },
        rawEncryptionKey: cursorKey,
      }),
    };
  }

  switch (method) {
    case "HEAD":
      return OkResponse.json(200);
    case "GET":
      return OkResponse.json(200, resp_obj);
  }
};

// TODO: Add pagination
export const listTags = async ({
  db,
  method,
}: {
  db: D1Database;
  method: "GET" | "HEAD";
}): Promise<Response> => {
  const query = new GetTagsQuery(db);

  const tagRows = await query.run();

  const tagList: TagList = { items: tagRows.map(tagToApi) };

  switch (method) {
    case "HEAD":
      return OkResponse.json(200);
    case "GET":
      return OkResponse.json(200, tagList);
  }
};
