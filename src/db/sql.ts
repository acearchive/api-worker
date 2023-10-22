//
// In lieu of any sort of db function or view, we're just using dumb string
// interpolation to build queries. It is VERY IMPORTANT that user input is not
// injected into these strings.
//

import { SortDirection } from "./multiple";

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

const PAGE_ORDER_SQL = `
  CASE ?1
    WHEN 'id' THEN artifact_versions.artifact_id
    WHEN 'year' THEN artifacts.from_year
  END
` as const;

// Get a page of artifacts using a cursor.
export const cursorPageSql = (direction: SortDirection): string => `
  JOIN
    ${LATEST_ARTIFACT_JOIN_SQL}
  WHERE
    artifact_versions.artifact_id > ?3
  ORDER BY
    ${PAGE_ORDER_SQL} ${direction === "asc" ? "ASC" : "DESC"}
  LIMIT
    ?2
`;

// Get the first page of artifacts.
export const firstPageSql = (direction: SortDirection): string => `
  JOIN
    ${LATEST_ARTIFACT_JOIN_SQL}
  ORDER BY
    ${PAGE_ORDER_SQL} ${direction === "asc" ? "ASC" : "DESC"}
  LIMIT
    ?2
`;
