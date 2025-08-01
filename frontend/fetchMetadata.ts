import { spawnSync } from "child_process";
import path from "path";
import crypto from "crypto";

interface StepInput {
  url: string;
  clientID: string;
  connectionId: string;
}

interface StepOutput {
  url: string;
  clientID: string;
  connectionId: string;
  duration: number;
  filesize: number;
  videoID: string;
  title: string;
}

export const handler = async (event: StepInput): Promise<StepOutput> => {
  const { url, clientID, connectionId } = event;

  if (!url) {
    throw new Error('Missing "url" in input');
  }
  const ytDlpPath = path.resolve(__dirname, "bin/yt-dlp");
  const result = spawnSync(ytDlpPath, ["--dump-json", url], {
    encoding: "utf-8",
  });

  if (result.error || result.status !== 0) {
    console.error("yt-dlp error:", result.stderr || result.error);
    throw new Error("Failed to run yt-dlp");
  }

  const metadata = JSON.parse(result.stdout);
  const duration = metadata.duration || 0;
  const filesize = metadata.filesize || metadata.filesize_approx || 0;
  const videoID = metadata.id || crypto.randomUUID();
  const title = metadata.title || "Unknown";

  return {
    url,
    clientID,
    connectionId,
    duration,
    filesize,
    videoID,
    title,
  };
};
