// This module contains the response types that are part of the published API.
//
// These type definitions MUST be kept in sync with the OpenAPI spec. Remember
// that there is more involved in maintaining backwards compatibility guarantees
// than just the shape of response objects.
//
// TODO: Add code generation and/or runtime validation based on the OpenAPI
// spec.

export type Problem = Readonly<{
  type?: string;
  title?: string;
  status?: number;
  detail?: string;
  instance?: string;
}>;

export type ArtifactLink = Readonly<{
  name: string;
  url: string;
}>;

export type ArtifactFile = Readonly<{
  name: string;
  filename: string;
  media_type?: string;
  hash: string;
  hash_algorithm: string;
  url: string;
  short_url: string;
  raw_url: string;
  lang?: string;
  hidden: boolean;
}>;

export type Artifact = Readonly<{
  id: string;
  title: string;
  summary: string;
  description?: string;
  url: string;
  short_url: string;
  files: ReadonlyArray<ArtifactFile>;
  links: ReadonlyArray<ArtifactLink>;
  people: ReadonlyArray<string>;
  identities: ReadonlyArray<string>;
  from_year: number;
  to_year?: number;
  decades: ReadonlyArray<number>;
  collections: ReadonlyArray<string>;
  url_aliases: ReadonlyArray<string>;
}>;

export type ArtifactList = Readonly<{
  items: ReadonlyArray<Artifact>;
  next_cursor?: string;
}>;

export type TagKind = "person" | "identity" | "decade" | "collection";

export type Tag = Readonly<{
  name: string;
  kind: TagKind;
  description?: string;
}>;

export type TagList = Readonly<{
  items: ReadonlyArray<Tag>;
}>;
