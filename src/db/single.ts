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
} from "./model";

// In lieu of any sort of db function or view, we're just using dumb string
// interpolation to build queries. It is VERY IMPORTANT that these remain static
// strings to avoid any possibility of injection.
const LATEST_ARTIFACT_JOIN_SQL = `
  (
    SELECT
      artifact_id,
      MAX(version) as version
    FROM
      artifact_versions
    GROUP BY
      artifact_id
  ) AS latest_artifacts
  ON latest_artifacts.artifact_id = artifact_versions.artifact_id
  AND latest_artifacts.version = artifact_versions.version
` as const;

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
        ${LATEST_ARTIFACT_JOIN_SQL}
      WHERE
        artifact_versions.artifact_id = ?1
      LIMIT 1
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
        artifacts ON artifacts.id = artifact_aliases.artifact
      JOIN
        artifact_versions ON artifact_versions.artifact = artifacts.id
      JOIN
        ${LATEST_ARTIFACT_JOIN_SQL}
      WHERE
        artifacts.id = ?1
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
        files.hidden
      FROM
        files
      JOIN
        artifacts ON artifacts.id = files.artifact
      JOIN
        artifact_versions ON artifact_versions.artifact = artifacts.id
      JOIN
        ${LATEST_ARTIFACT_JOIN_SQL}
      WHERE
        artifacts.id = ?1
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
        artifacts ON artifacts.id = files.artifact
      JOIN
        artifact_versions ON artifact_versions.artifact = artifacts.id
      JOIN
        ${LATEST_ARTIFACT_JOIN_SQL}
      WHERE
        artifacts.id = ?1
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
        links.url
      FROM
        links
      JOIN
        artifacts ON artifacts.id = links.artifact
      JOIN
        artifact_versions ON artifact_versions.artifact = artifacts.id
      JOIN
        ${LATEST_ARTIFACT_JOIN_SQL}
      WHERE
        artifacts.id = ?1
  `
      )
      .bind(this.artifactId);
  };

  private preparePeopleQuery = (): D1PreparedStatement => {
    return this.db
      .prepare(
        `
      SELECT
        people.name
      FROM
        people
      JOIN
        artifacts ON artifacts.id = people.artifact
      JOIN
        artifact_versions ON artifact_versions.artifact = artifacts.id
      JOIN
        ${LATEST_ARTIFACT_JOIN_SQL}
      WHERE
        artifacts.id = ?1
  `
      )
      .bind(this.artifactId);
  };

  private prepareIdentitiesQuery = (): D1PreparedStatement => {
    return this.db
      .prepare(
        `
      SELECT
        identities.name
      FROM
        identities
      JOIN
        artifacts ON artifacts.id = identities.artifact
      JOIN
        artifact_versions ON artifact_versions.artifact = artifacts.id
      JOIN
        ${LATEST_ARTIFACT_JOIN_SQL}
      WHERE
        artifacts.id = ?1
  `
      )
      .bind(this.artifactId);
  };

  private prepareDecadesQuery = (): D1PreparedStatement => {
    return this.db
      .prepare(
        `
      SELECT
        decades.decade
      FROM
        decades
      JOIN
        artifacts ON artifacts.id = decades.artifact
      JOIN
        artifact_versions ON artifact_versions.artifact = artifacts.id
      JOIN
        ${LATEST_ARTIFACT_JOIN_SQL}
      WHERE
        artifacts.id = ?1
  `
      )
      .bind(this.artifactId);
  };

  query = async (): Promise<Artifact | undefined> => {
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

    const artifactsRow =
      artifactsRows === undefined ? undefined : artifactsRows[0];

    if (artifactsRow === undefined) {
      return undefined;
    }

    return {
      files:
        filesRows?.map((filesRow) => ({
          aliases:
            fileAliasesRows?.filter(
              (fileAliasesRow) => fileAliasesRow.file === filesRow.id
            ) ?? [],
          ...filesRow,
        })) ?? [],
      links: linksRows ?? [],
      people: peopleRows ?? [],
      identities: identitiesRows ?? [],
      decades: decadesRows ?? [],
      aliases: artifactAliasesRows ?? [],
      ...artifactsRow,
    };
  };
}
