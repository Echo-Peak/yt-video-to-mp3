import { exec } from "child_process";
import { ConvertEvent, ConvertResult } from "./types";

const downloadVideo = async (videoSourceUrl: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    const command = `yt-dlp --format bestaudio --extract-audio --audio-format mp3 --output "%(id)s.%(ext)s" ${videoSourceUrl}`;
    exec(command, (error, stdout, stderr) => {
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

const convertToMp3 = async (videoFilePath: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    const command = `ffmpeg -i ${videoFilePath} -vn -ar 44100 -ac 2 -b:a 192k "${videoFilePath.replace(
      /\.[^/.]+$/,
      ".mp3"
    )}"`;
    exec(command, (error, stdout, stderr) => {
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
    const videoFilePath = await downloadVideo(event.videoSourceUrl);
    const mp3FilePath = await convertToMp3(videoFilePath);
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
