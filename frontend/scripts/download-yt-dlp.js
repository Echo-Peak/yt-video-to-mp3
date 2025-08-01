import fs from "fs";
import https from "https";
import path, { dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const ytDlpVersion = "2025.06.09";
const installDir = path.join(__dirname, "../build/bin");

const forceUpdate = process.argv.includes("--force-update");

const download = (url, dest, maxRedirects = 5) => {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);

    const doRequest = (url, redirectsLeft) => {
      const urlParts = new URL(url);

      const options = {
        port: 443,
        hostname: urlParts.hostname,
        path: urlParts.pathname + urlParts.search,
        headers: {
          "User-Agent": "Mozilla/5.0",
        },
      };

      https
        .get(options, (response) => {
          if (
            typeof response.statusCode === "number" &&
            response.statusCode >= 300 &&
            response.statusCode < 400 &&
            response.headers.location
          ) {
            if (redirectsLeft === 0)
              return reject(new Error("Too many redirects"));
            return doRequest(
              new URL(response.headers.location, url).toString(),
              redirectsLeft - 1
            );
          }

          if (
            typeof response.statusCode !== "number" ||
            response.statusCode !== 200
          ) {
            return reject(
              new Error(`Failed to download ${url}: ${response.statusCode}`)
            );
          }

          response.pipe(file);
          file.on("finish", () => file.close(resolve));
        })
        .on("error", reject);
    };

    doRequest(url, maxRedirects);
  });
};

const downloadYtDlp = async (url) => {
  const filePath = path.join(installDir, "yt-dlp");
  try {
    const exists = await fs.promises.stat(filePath);
    if (exists && !forceUpdate) {
      console.log("yt-dlp already exists, skipping download.");
      return;
    }
  } catch (err) {
    // File does not exist, proceed with download
  }

  try {
    await download(url, filePath);
  } catch (err) {
    console.error("Unable to download yt-dlp", err);
  }
};

(async () => {
  await fs.promises.mkdir(installDir, { recursive: true });
  await downloadYtDlp(
    `https://github.com/yt-dlp/yt-dlp/releases/download/${ytDlpVersion}/yt-dlp`
  );
})();
