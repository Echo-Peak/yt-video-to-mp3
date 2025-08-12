export type PostConvertEvent = {
  clientId: string;
  videoId: string;
  s3VideoUrl: string;
};
export type ConvertEvent = {
  size: "small" | "medium" | "large";
  videoSourceUrl: string;
  videoId: string;
};

export type ConvertResult = {
  ok: boolean;
  details?: unknown;
};
