import {
  Artifact,
  ArtifactAliasesRow,
  ArtifactsRow,
  CollectionsRow,
  DecadesRow,
  FileAliasesRow,
  FilesRow,
  IdentitiesRow,
  LinksRow,
  PeopleRow,
} from "./model";

export class GetArtifactQuery {
  private readonly db: D1Database;
  private readonly artifactId: string;

  constructor(db: D1Database, artifactId: string) {
    this.db = db;
    this.artifactId = artifactId;
  }

  private prepareArtifactQuery = (): D1PreparedStatement => {
    return this.db
      .prepare(
        `
        SELECT
          latest_artifacts.artifact_id,
          artifacts.slug,
          artifacts.title,
          artifacts.summary,
          artifacts.description,
          artifacts.from_year,
          artifacts.to_year
        FROM
          artifacts
        JOIN
          latest_artifacts ON latest_artifacts.artifact = artifacts.id
        WHERE
          latest_artifacts.artifact_id = ?1
        LIMIT
          1
        `
      )
      .bind(this.artifactId);
  };

  private prepareArtifactAliasesQuery = (): D1PreparedStatement => {
    return this.db
      .prepare(
        `
        SELECT
          artifact_aliases.slug
        FROM
          artifact_aliases
        JOIN
          latest_artifacts ON latest_artifacts.artifact = artifact_aliases.artifact
        WHERE
          latest_artifacts.artifact_id = ?1
        `
      )
      .bind(this.artifactId);
  };

  private prepareFilesQuery = (): D1PreparedStatement => {
    return this.db
      .prepare(
        `
        SELECT
          files.id,
          files.artifact,
          files.filename,
          files.name,
          files.media_type,
          files.multihash,
          files.lang,
          files.hidden,
          files.pos
        FROM
          files
        JOIN
          latest_artifacts ON latest_artifacts.artifact = files.artifact
        WHERE
          latest_artifacts.artifact_id = ?1
        `
      )
      .bind(this.artifactId);
  };

  private prepareFileAliasesQuery = (): D1PreparedStatement => {
    return this.db
      .prepare(
        `
        SELECT
          file_aliases.file,
          file_aliases.filename
        FROM
          file_aliases
        JOIN
          files ON files.id = file_aliases.file
        JOIN
          latest_artifacts ON latest_artifacts.artifact = files.artifact
        WHERE
          latest_artifacts.artifact_id = ?1
        `
      )
      .bind(this.artifactId);
  };

  private prepareLinksQuery = (): D1PreparedStatement => {
    return this.db
      .prepare(
        `
        SELECT
          links.name,
          links.url,
          links.pos
        FROM
          links
        JOIN
          latest_artifacts ON latest_artifacts.artifact = links.artifact
        WHERE
          latest_artifacts.artifact_id = ?1
        `
      )
      .bind(this.artifactId);
  };

  private preparePeopleQuery = (): D1PreparedStatement => {
    return this.db
      .prepare(
        `
        SELECT
          tags.value
        FROM
          tags
        JOIN
          latest_artifacts ON latest_artifacts.artifact = tags.artifact
        WHERE
          tags.key = 'person'
          AND latest_artifacts.artifact_id = ?1
        `
      )
      .bind(this.artifactId);
  };

  private prepareIdentitiesQuery = (): D1PreparedStatement => {
    return this.db
      .prepare(
        `
        SELECT
          tags.value
        FROM
          tags
        JOIN
          latest_artifacts ON latest_artifacts.artifact = tags.artifact
        WHERE
          tags.key = 'identity'
          AND latest_artifacts.artifact_id = ?1
        `
      )
      .bind(this.artifactId);
  };

  private prepareDecadesQuery = (): D1PreparedStatement => {
    return this.db
      .prepare(
        `
        SELECT
          tags.value
        FROM
          tags
        JOIN
          latest_artifacts ON latest_artifacts.artifact = tags.artifact
        WHERE
          tags.key = 'decade'
          AND latest_artifacts.artifact_id = ?1
        `
      )
      .bind(this.artifactId);
  };

  private prepareCollectionsQuery = (): D1PreparedStatement => {
    return this.db
      .prepare(
        `
        SELECT
          tags.value
        FROM
          tags
        JOIN
          latest_artifacts ON latest_artifacts.artifact = tags.artifact
        WHERE
          tags.key = 'collection'
          AND latest_artifacts.artifact_id = ?1
        `
      )
      .bind(this.artifactId);
  };

  run = async (): Promise<Artifact | undefined> => {
    // The typing for the batch API seems to expect that every row will have the
    // same shape.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rows = await this.db.batch<any>([
      this.prepareArtifactQuery(),
      this.prepareArtifactAliasesQuery(),
      this.prepareFilesQuery(),
      this.prepareFileAliasesQuery(),
      this.prepareLinksQuery(),
      this.preparePeopleQuery(),
      this.prepareIdentitiesQuery(),
      this.prepareDecadesQuery(),
      this.prepareCollectionsQuery(),
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
    const collectionsRows: ReadonlyArray<CollectionsRow> | undefined =
      rows[8].results;

    const artifactsRow =
      artifactsRows === undefined ? undefined : artifactsRows[0];

    if (artifactsRow === undefined) {
      return undefined;
    }

    return {
      files:
        filesRows?.map((file) => ({
          aliases:
            fileAliasesRows?.filter(
              (fileAliasesRow) => fileAliasesRow.file === file.id
            ) ?? [],
          ...file,
        })) ?? [],
      links: linksRows ?? [],
      people: peopleRows ?? [],
      identities: identitiesRows ?? [],
      decades: decadesRows ?? [],
      collections: collectionsRows ?? [],
      aliases: artifactAliasesRows ?? [],
      ...artifactsRow,
    };
  };
}
