import { Artifact as ApiArtifact } from "../api";
import { decodeMultihash } from "../multihash";

type ArtifactKey = number;
type FileKey = number;

export type ArtifactsRow = Readonly<{
  id: ArtifactKey;
  artifact_id: string;
  slug: string;
  title: string;
  summary: string;
  description: string | null;
  from_year: number;
  to_year: number | null;
}>;

export type ArtifactAliasesRow = Readonly<{
  artifact: ArtifactKey;
  slug: string;
}>;

export type FilesRow = Readonly<{
  id: FileKey;
  artifact: ArtifactKey;
  filename: string;
  name: string;
  media_type: string | null;
  multihash: string;
  lang: string | null;
  // SQLite stores booleans as integers.
  hidden: number;
}>;

export type FileAliasesRow = Readonly<{
  file: FileKey;
  filename: string;
}>;

export type LinksRow = Readonly<{
  artifact: ArtifactKey;
  name: string;
  url: string;
}>;

export type PeopleRow = Readonly<{
  artifact: ArtifactKey;
  value: string;
}>;

export type IdentitiesRow = Readonly<{
  artifact: ArtifactKey;
  value: string;
}>;

export type DecadesRow = Readonly<{
  artifact: ArtifactKey;
  value: string;
}>;

export type Artifact = ArtifactsRow & {
  files: ReadonlyArray<
    FilesRow & Readonly<{ aliases: ReadonlyArray<FileAliasesRow> }>
  >;
  links: ReadonlyArray<LinksRow>;
  people: ReadonlyArray<PeopleRow>;
  identities: ReadonlyArray<IdentitiesRow>;
  decades: ReadonlyArray<DecadesRow>;
  aliases: ReadonlyArray<ArtifactAliasesRow>;
};

// Convert an array of db rows to a map indexed by a foreign key.
export const rowsToMap = <K, V>(
  rows: ReadonlyArray<V> | undefined,
  func: (row: V) => K
): Map<K, ReadonlyArray<V>> =>
  rows === undefined
    ? new Map()
    : rows.reduce((map, row) => {
        const key = func(row);

        const newRows = map.get(key) ?? [];
        newRows.push(row);

        map.set(key, newRows);

        return map;
      }, new Map());

export const toApi = (
  artifact: Artifact,
  { filesDomain, siteDomain }: { filesDomain: string; siteDomain: string }
): ApiArtifact => ({
  id: artifact.artifact_id,
  title: artifact.title,
  summary: artifact.summary,
  description: artifact.description ?? undefined,
  url: `https://${siteDomain}/artifacts/${artifact.slug}`,
  url_aliases: artifact.aliases.map(
    (alias) => `https://${siteDomain}/artifacts/${alias.slug}`
  ),
  files: artifact.files.map((file) => {
    const { hash, hash_algorithm } = decodeMultihash(file.multihash);

    return {
      filename: file.filename,
      name: file.name,
      media_type: file.media_type ?? undefined,
      hash,
      hash_algorithm,
      url: `https://${filesDomain}/artifacts/${artifact.slug}/${file.filename}`,
      lang: file.lang ?? undefined,
      hidden: file.hidden === 0 ? false : true,
    };
  }),
  links: artifact.links.map((link) => ({
    name: link.name,
    url: link.url,
  })),
  people: artifact.people.map((person) => person.value),
  identities: artifact.identities.map((identity) => identity.value),
  from_year: artifact.from_year,
  to_year: artifact.to_year ?? undefined,
  decades: artifact.decades.map((decade) => parseInt(decade.value, 10)),
});
