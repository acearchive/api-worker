import { Artifact as ApiArtifact } from "../api";
import { decodeMultihash } from "./multihash";

export type ArtifactsRow = Readonly<{
  artifact_id: string;
  slug: string;
  title: string;
  summary: string;
  description: string | null;
  from_year: number;
  to_year: number | null;
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
  decade: number;
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

export const toApi = (artifact: Artifact): ApiArtifact => ({
  id: artifact.artifact_id,
  title: artifact.title,
  summary: artifact.summary,
  description: artifact.description ?? undefined,
  url: `https://acearchive.lgbt/artifacts/${artifact.slug}`,
  files: artifact.files.map((file) => {
    const { hash, hash_algorithm } = decodeMultihash(file.multihash);

    return {
      filename: file.filename,
      name: file.name,
      media_type: file.media_type ?? undefined,
      hash,
      hash_algorithm,
      url: `https://files.acearchive.lgbt/artifacts/${artifact.slug}/${file.filename}`,
      lang: file.lang ?? undefined,
    };
  }),
  links: artifact.links.map((link) => ({
    name: link.name,
    url: link.url,
  })),
  people: artifact.people.map((person) => person.name),
  identities: artifact.identities.map((identity) => identity.name),
  from_year: artifact.from_year,
  to_year: artifact.to_year ?? undefined,
  decades: artifact.decades.map((decade) => decade.decade),
});
