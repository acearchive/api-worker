import { Tag, TagsRow } from "./model";

export class GetTagsQuery {
  private readonly db: D1Database;

  constructor(db: D1Database) {
    this.db = db;
  }

  private prepareTagsQuery = (): D1PreparedStatement =>
    this.db.prepare(
      `
      SELECT DISTINCT
        name,
        kind,
        description
      FROM
        tags
      JOIN
        artifact_tags ON tags.id = artifact_tags.tag
      JOIN
        latest_artifacts ON artifact_tags.artifact = latest_artifacts.artifact
      ORDER BY
        kind,
        name
      `
    );

  run = async (): Promise<ReadonlyArray<Tag>> => {
    const rows = await this.prepareTagsQuery().run<TagsRow>();

    if (rows.results === undefined) {
      return [];
    }

    return rows.results.map((row) => ({
      name: row.name,
      kind: row.kind,
      description: row.description ?? undefined,
    }));
  };
}
