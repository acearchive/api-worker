export type ArtifactsRow = Readonly<{
  artifact_id: string;
  slug: string;
  title: string;
  summary: string;
  description: string | null;
  from_year: number;
  to_year?: number | null;
}>;

export type ArtifactAliasesRow = Readonly<{
  slug: string;
}>;

export type FilesRow = Readonly<{
  id: number;
  filename: string;
  name: string;
  media_type: string | null;
  multihash: string;
  lang: string | null;
  hidden: boolean;
}>;

export type FileAliasesRow = Readonly<{
  file: number;
  slug: string;
}>;

export type LinksRow = Readonly<{
  name: string;
  url: string;
}>;

export type PeopleRow = Readonly<{
  name: string;
}>;

export type IdentitiesRow = Readonly<{
  name: string;
}>;

export type DecadesRow = Readonly<{
  decade: string;
}>;

export type Artifact =
  | ArtifactsRow
  | {
      files: ReadonlyArray<FilesRow | { aliases: FileAliasesRow }>;
      links: ReadonlyArray<LinksRow>;
      people: ReadonlyArray<PeopleRow>;
      identities: ReadonlyArray<IdentitiesRow>;
      decades: ReadonlyArray<DecadesRow>;
      aliases: ReadonlyArray<ArtifactAliasesRow>;
    };
