export const Header = {
  ContentType: "Content-Type",
  Allow: "Allow",
  ETag: "ETag",
} as const;

export type ResponseHeaders = {
  [P in keyof typeof Header]?: string;
};

export type Method = "GET" | "HEAD" | "POST" | "PUT" | "DELETE";

export const ContentType = {
  Json: "application/json",
  Problem: "application/problem+json",
} as const;
