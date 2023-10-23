//
// In lieu of any sort of db function or view, we're just using dumb string
// interpolation to build queries. It is VERY IMPORTANT that user input is not
// injected into these strings.
//

import { SortDirection } from "./multiple";

// A JOIN clause to get only the latest version of each artifact.
export const LATEST_ARTIFACT_SQL = `
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

// And ORDER BY clause to sort artifacts.
export const PAGE_ORDER_SQL = `
  CASE ?1
    WHEN 'id' THEN artifact_versions.artifact_id
    WHEN 'year' THEN artifacts.from_year
  END
` as const;

// A JOIN clause to get a page of artifacts using a cursor.
export const cursorPageSql = (direction: SortDirection): string => `
  (
    SELECT
      artifact_versions.id
    FROM
      artifact_versions
    JOIN
      artifacts ON artifacts.id = artifact_versions.artifact
    JOIN
      ${LATEST_ARTIFACT_SQL}
    WHERE
      artifact_versions.artifact_id > ?3
    ORDER BY
      ${PAGE_ORDER_SQL} ${direction === "asc" ? "ASC" : "DESC"}
    LIMIT
      ?2
  ) AS page
  ON page.id = artifact_versions.id
`;

// A JOIN clause to get the first page of artifacts.
export const firstPageSql = (direction: SortDirection): string => `
  (
    SELECT
      artifact_versions.id
    FROM
      artifact_versions
    JOIN
      artifacts ON artifacts.id = artifact_versions.artifact
    JOIN
      ${LATEST_ARTIFACT_SQL}
    ORDER BY
      ${PAGE_ORDER_SQL} ${direction === "asc" ? "ASC" : "DESC"}
    LIMIT
      ?2
  ) AS page
  ON page.id = artifact_versions.id
`;
