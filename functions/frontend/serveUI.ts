import { readFileSync } from "fs";
import { join } from "path";

let cachedHtml: string | null = null;
export const handler = async (event: any) => {
  if (!cachedHtml) {
    const filePath = join(__dirname, "build", "index.html");
    cachedHtml = readFileSync(filePath, "utf8");
  }

  try {
    return {
      statusCode: 200,
      headers: { "Content-Type": "text/html" },
      body: cachedHtml,
      isBase64Encoded: true,
    };
  } catch {
    return {
      statusCode: 404,
      body: "File not found",
    };
  }
};
