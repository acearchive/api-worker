export const Header = {
  ContentType: "Content-Type",
  Allow: "Allow",
} as const;

export type ResponseHeaders = {
  [P in keyof typeof Header]?: string;
};

export type Method = "GET" | "HEAD" | "POST" | "PUT" | "DELETE";
