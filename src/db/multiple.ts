import { Cursor } from "../cursor";
import {
  Artifact,
  ArtifactAliasesRow,
  ArtifactsRow,
  DecadesRow,
  FileAliasesRow,
  FilesRow,
  IdentitiesRow,
  LinksRow,
  PeopleRow,
  rowsToMap,
} from "./model";
import {
  CURSOR_PAGE_JOIN_SQL,
  FIRST_PAGE_JOIN_SQL,
  LATEST_ARTIFACT_JOIN_SQL,
} from "./sql";

export class GetArtifactListQuery {
  private readonly db: D1Database;
  private readonly cursor?: Cursor;
  private readonly limit: number;

  constructor(db: D1Database, cursor: Cursor | undefined, limit: number) {
    if (cursor !== undefined && cursor.key !== "id") {
      throw new Error(
        "Pagination cursor has an unrecognized discriminant. This is a bug."
      );
    }

    this.db = db;
    this.cursor = cursor;
    this.limit = limit;
  }

  private bindVars = (stmt: D1PreparedStatement): D1PreparedStatement =>
    this.cursor === undefined
      ? stmt.bind(this.limit)
      : stmt.bind(this.cursor.id, this.limit);

  private joinClause = (): string =>
    this.cursor === undefined ? FIRST_PAGE_JOIN_SQL : CURSOR_PAGE_JOIN_SQL;

  private prepareLastCursorQuery = (): D1PreparedStatement =>
    this.db.prepare(
      `
      SELECT
        MAX(artifact_versions.artifact_id) AS last_cursor
      FROM
        artifact_versions
      JOIN
          ${LATEST_ARTIFACT_JOIN_SQL}
      `
    );

  private prepareArtifactsQuery = (): D1PreparedStatement =>
    this.bindVars(
      this.db.prepare(
        `
        SELECT
          artifacts.id,
          artifact_versions.artifact_id,
          artifacts.slug,
          artifacts.title,
          artifacts.summary,
          artifacts.description,
          artifacts.from_year,
          artifacts.to_year
        FROM
          artifacts
        JOIN
          artifact_versions ON artifact_versions.artifact = artifacts.id
        JOIN
          ${this.joinClause()}
        `
      )
    );

  private prepareArtifactAliasesQuery = (): D1PreparedStatement =>
    this.bindVars(
      this.db.prepare(
        `
        SELECT
          artifact_aliases.artifact,
          artifact_aliases.slug
        FROM
          artifact_aliases
        JOIN
          artifacts ON artifacts.id = artifact_aliases.artifact
        JOIN
          artifact_versions ON artifact_versions.artifact = artifacts.id
        JOIN
          ${this.joinClause()}
        `
      )
    );

  private prepareFilesQuery = (): D1PreparedStatement =>
    this.bindVars(
      this.db.prepare(
        `
        SELECT
          files.id,
          files.artifact,
          files.filename,
          files.name,
          files.media_type,
          files.multihash,
          files.lang,
          files.hidden
        FROM
          files
        JOIN
          artifacts ON artifacts.id = files.artifact
        JOIN
          artifact_versions ON artifact_versions.artifact = artifacts.id
        JOIN
          ${this.joinClause()}
        `
      )
    );

  private prepareFileAliasesQuery = (): D1PreparedStatement =>
    this.bindVars(
      this.db.prepare(
        `
        SELECT
          file_aliases.file,
          file_aliases.filename
        FROM
          file_aliases
        JOIN
          files ON files.id = file_aliases.file
        JOIN
          artifacts ON artifacts.id = files.artifact
        JOIN
          artifact_versions ON artifact_versions.artifact = artifacts.id
        JOIN
          ${this.joinClause()}
        `
      )
    );

  private prepareLinksQuery = (): D1PreparedStatement =>
    this.bindVars(
      this.db.prepare(
        `
        SELECT
          links.artifact,
          links.name,
          links.url
        FROM
          links
        JOIN
          artifacts ON artifacts.id = links.artifact
        JOIN
          artifact_versions ON artifact_versions.artifact = artifacts.id
        JOIN
          ${this.joinClause()}
        `
      )
    );

  private preparePeopleQuery = (): D1PreparedStatement =>
    this.bindVars(
      this.db.prepare(
        `
        SELECT
          people.artifact,
          people.name
        FROM
          people
        JOIN
          artifacts ON artifacts.id = people.artifact
        JOIN
          artifact_versions ON artifact_versions.artifact = artifacts.id
        JOIN
          ${this.joinClause()}
        `
      )
    );

  private prepareIdentitiesQuery = (): D1PreparedStatement =>
    this.bindVars(
      this.db.prepare(
        `
        SELECT
          identities.artifact,
          identities.name
        FROM
          identities
        JOIN
          artifacts ON artifacts.id = identities.artifact
        JOIN
          artifact_versions ON artifact_versions.artifact = artifacts.id
        JOIN
          ${this.joinClause()}
        `
      )
    );

  private prepareDecadesQuery = (): D1PreparedStatement =>
    this.bindVars(
      this.db.prepare(
        `
        SELECT
          decades.artifact,
          decades.decade
        FROM
          decades
        JOIN
          artifacts ON artifacts.id = decades.artifact
        JOIN
          artifact_versions ON artifact_versions.artifact = artifacts.id
        JOIN
          ${this.joinClause()}
        `
      )
    );

  run = async (): Promise<{
    artifacts: ReadonlyArray<Artifact>;
    lastCursor: string;
  }> => {
    // The typing for the batch API seems to expect that every row will have the
    // same shape.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rows = await this.db.batch<any>([
      this.prepareArtifactsQuery(),
      this.prepareArtifactAliasesQuery(),
      this.prepareFilesQuery(),
      this.prepareFileAliasesQuery(),
      this.prepareLinksQuery(),
      this.preparePeopleQuery(),
      this.prepareIdentitiesQuery(),
      this.prepareDecadesQuery(),
      this.prepareLastCursorQuery(),
    ]);

    const artifactsRows: ReadonlyArray<ArtifactsRow> | undefined =
      rows[0].results;
    const artifactAliasesRows: ReadonlyArray<ArtifactAliasesRow> | undefined =
      rows[1].results;
    const filesRows: ReadonlyArray<FilesRow> | undefined = rows[2].results;
    const fileAliasesRows: ReadonlyArray<FileAliasesRow> | undefined =
      rows[3].results;
    const linksRows: ReadonlyArray<LinksRow> | undefined = rows[4].results;
    const peopleRows: ReadonlyArray<PeopleRow> | undefined = rows[5].results;
    const identitiesRows: ReadonlyArray<IdentitiesRow> | undefined =
      rows[6].results;
    const decadesRows: ReadonlyArray<DecadesRow> | undefined = rows[7].results;

    const lastCursorRows: ReadonlyArray<{ last_cursor: string }> | undefined =
      rows[8].results;

    const lastCursorRow =
      lastCursorRows === undefined ? undefined : lastCursorRows[0];

    if (artifactsRows === undefined || lastCursorRow === undefined) {
      return { artifacts: [], lastCursor: "" };
    }

    const artifactAliasesMap = rowsToMap(
      artifactAliasesRows,
      (row) => row.artifact
    );
    const filesMap = rowsToMap(filesRows, (row) => row.artifact);
    const fileAliasesMap = rowsToMap(fileAliasesRows, (row) => row.file);
    const linksMap = rowsToMap(linksRows, (row) => row.artifact);
    const peopleMap = rowsToMap(peopleRows, (row) => row.artifact);
    const identitiesMap = rowsToMap(identitiesRows, (row) => row.artifact);
    const decadesMap = rowsToMap(decadesRows, (row) => row.artifact);

    return {
      artifacts: artifactsRows.map((artifactsRow) => ({
        files:
          filesMap.get(artifactsRow.id)?.map((filesRow) => ({
            aliases: fileAliasesMap.get(filesRow.id) ?? [],
            ...filesRow,
          })) ?? [],
        links: linksMap.get(artifactsRow.id) ?? [],
        people: peopleMap.get(artifactsRow.id) ?? [],
        identities: identitiesMap.get(artifactsRow.id) ?? [],
        decades: decadesMap.get(artifactsRow.id) ?? [],
        aliases: artifactAliasesMap.get(artifactsRow.id) ?? [],
        ...artifactsRow,
      })),
      lastCursor: lastCursorRow.last_cursor,
    };
  };
}
