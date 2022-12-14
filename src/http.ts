export const Header = {
  ContentType: "Content-Type",
  ContentLength: "Content-Length",
  CacheControl: "Cache-Control",
  Allow: "Allow",
  ETag: "ETag",
  AccessControlAllowOrigin: "Access-Control-Allow-Origin",
  AccessControlAllowMethods: "Access-Control-Allow-Methods",
  AccessControlAllowHeaders: "Access-Control-Allow-Headers",
} as const;

export type ResponseHeaders = {
  [P in keyof typeof Header]?: string;
};

export type Method = "GET" | "HEAD" | "POST" | "PUT" | "DELETE" | "OPTIONS";

export const ContentType = {
  Json: "application/json; charset=utf-8",
  Problem: "application/problem+json; charset=utf-8",
} as const;
