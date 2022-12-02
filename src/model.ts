// The types in this module match the shape of the JSON objects stored in KV.
//
// These types need to be kept in sync with `acearchive/artifact-submit-action`.

import { Artifact } from "./api";

export const KeyVersion = {
  artifacts: 2,
} as const;

export type ArtifactFileData = Readonly<{
  name: string;
  fileName: string;
  mediaType?: string;
  hash: string;
  hashAlgorithm: string;
  multihash: string;
  storageKey: string;
  url: string;
  lang?: string;
  hidden: boolean;
  aliases: ReadonlyArray<string>;
}>;

export type ArtifactLinkData = Readonly<{
  name: string;
  url: string;
}>;

export type ArtifactData = Readonly<{
  id: string;
  slug: string;
  title: string;
  summary: string;
  description?: string;
  files: ReadonlyArray<ArtifactFileData>;
  links: ReadonlyArray<ArtifactLinkData>;
  people: ReadonlyArray<string>;
  identities: ReadonlyArray<string>;
  fromYear: number;
  toYear?: number;
  decades: ReadonlyArray<number>;
  aliases: ReadonlyArray<string>;
}>;

export const toApi = (data: ArtifactData): Artifact => ({
  id: data.id,
  title: data.title,
  summary: data.summary,
  description: data.description,
  url: `https://acearchive.lgbt/artifacts/${data.slug}`,
  files: data.files.map((fileData) => ({
    name: fileData.name,
    filename: fileData.fileName,
    media_type: fileData.mediaType,
    hash: fileData.hash,
    hash_algorithm: fileData.hashAlgorithm,
    url: fileData.url,
    lang: fileData.lang,
  })),
  links: data.links.map((linkData) => ({
    name: linkData.name,
    url: linkData.url,
  })),
  people: data.people,
  identities: data.identities,
  from_year: data.fromYear,
  to_year: data.toYear,
  decades: data.decades,
});
