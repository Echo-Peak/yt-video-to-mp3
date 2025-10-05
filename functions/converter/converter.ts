import { exec } from "child_process";
import { ConvertEvent, ConvertResult } from "./types";
import path from "path";
import fs from "fs";

const selectYtDlpPath = async (): Promise<string> => {
  try {
    const builtPath = path.resolve(__dirname, "yt-dlp");
    await fs.promises.access(builtPath);
    return builtPath;
  } catch (err) {
    console.error("Error resolving yt-dlp path:", err);
  }
  return "yt-dlp";
};

const selectFfmpegPath = async (): Promise<string> => {
  try {
    const builtPath = path.resolve(__dirname, "ffmpeg");
    await fs.promises.access(builtPath);
    return builtPath;
  } catch (err) {
    console.error("Error resolving ffmpeg path:", err);
  }
  return "ffmpeg";
};

const downloadVideo = async (
  videoSourceUrl: string,
  workingDir: string
): Promise<string> => {
  const ytDlpPath = await selectYtDlpPath();
  return new Promise((resolve, reject) => {
    const command = `${ytDlpPath} --format bestaudio --extract-audio --audio-format mp3 --output "%(id)s.%(ext)s" ${videoSourceUrl}`;
    exec(command, { cwd: workingDir }, (error, stdout, stderr) => {
      if (error) {
        console.error(`Error downloading video: ${stderr}`);
        reject(error);
      } else {
        const fileName = stdout.trim();
        resolve(fileName);
      }
    });
  });
};

const convertToMp3 = async (
  videoFilePath: string,
  workingDir: string
): Promise<string> => {
  return new Promise((resolve, reject) => {
    const ffmpegPath = selectFfmpegPath();
    const command = `${ffmpegPath} -i ${videoFilePath} -vn -ar 44100 -ac 2 -b:a 192k "${videoFilePath.replace(
      /\.[^/.]+$/,
      ".mp3"
    )}"`;
    exec(command, { cwd: workingDir }, (error, stdout, stderr) => {
      if (error) {
        console.error(`Error converting to MP3: ${stderr}`);
        reject(error);
      } else {
        resolve(`${videoFilePath.replace(/\.[^/.]+$/, ".mp3")}`);
      }
    });
  });
};

export const handler = async (event: ConvertEvent) => {
  try {
    const tmpDir = "/tmp";
    const videoFilePath = await downloadVideo(event.videoSourceUrl, tmpDir);
    const mp3FilePath = await convertToMp3(videoFilePath, tmpDir);
    return {
      ok: true,
      details: {
        mp3FilePath,
      },
    } as ConvertResult;
  } catch (error) {
    console.error(`Error processing video: ${error}`);
    return {
      ok: false,
      details: error,
    } as ConvertResult;
  }
};
