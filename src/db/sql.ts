//
// In lieu of any sort of db function or view, we're just using dumb string
// interpolation to build queries. It is VERY IMPORTANT that these remain static
// strings to avoid any possibility of injection.
//

// A JOIN clause to get only the latest version of each artifact.
export const LATEST_ARTIFACT_JOIN_SQL = `
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

// A JOIN clause to get a page of artifacts using a cursor.
export const CURSOR_PAGE_JOIN_SQL = `
  (
    SELECT
      artifact_versions.id
    FROM
      artifact_versions
    JOIN
      ${LATEST_ARTIFACT_JOIN_SQL}
    WHERE
      artifact_versions.artifact_id > ?1
    ORDER BY
      artifact_versions.artifact_id
    LIMIT
      ?2
  ) AS artifacts_page
  ON artifacts_page.id = artifact_versions.id
` as const;

// A JOIN clause to get the first page of artifacts.
export const FIRST_PAGE_JOIN_SQL = `
  (
    SELECT
      artifact_versions.id
    FROM
      artifact_versions
    JOIN
      ${LATEST_ARTIFACT_JOIN_SQL}
    ORDER BY
      artifact_versions.artifact_id
    LIMIT
      ?1
  ) AS artifacts_page
  ON artifacts_page.id = artifact_versions.id
` as const;
