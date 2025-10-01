import { getConversionStatus, sendConversionRequest } from "./api";
import { clientId } from "./clientId";
import { ConversionState } from "./conversionState";
import { ConversionResult, UIElements } from "./types";
import { updateConversionStatus } from "./updateConversionState";
import { youtubeUrlParser } from "./youtubeUrlParser";

const $ = (id) => document.getElementById(id) as HTMLElement;
const urlInput = $("urlInput");
const form = $("convertForm");
const convertBtn = $("convertBtn");
const phaseChip = $("phase");
const statusEl = $("status");
const loginButton = $("login-button");

const elements: UIElements = {
  convertBtn,
  urlInput,
  phaseChip,
  statusEl,
};

const onInputChange = (ev: Event) => {
  const { valid } = youtubeUrlParser((ev.target as HTMLInputElement).value);

  if (!valid) {
    updateConversionStatus(
      elements,
      ConversionState.Idle,
      "Please enter a valid YouTube URL."
    );
  } else {
    updateConversionStatus(elements, ConversionState.Idle, "Ready to convert.");
  }
};

let statusAwaiter: ReturnType<typeof setTimeout> | null = null;

const startStatusAwaiter = async (videoId: string) => {
  clearInterval(statusAwaiter!);
  statusAwaiter = setInterval(async () => {
    const status = (await getConversionStatus(
      clientId.getId(),
      videoId
    )) as ConversionResult;
    if (status.Progress === ConversionState.Error) {
      console.log("Conversion error:", status);
      clearInterval(statusAwaiter!);
      updateConversionStatus(
        elements,
        ConversionState.Error,
        "An error occurred during conversion. Please try again."
      );
      return;
    }
    if (status.Progress === ConversionState.Completed) {
      clearInterval(statusAwaiter!);
      updateConversionStatus(
        elements,
        ConversionState.Completed,
        "Conversion completed successfully."
      );
      window.open(status.DownloadUrl, "_blank");
    }
  }, 5000);
};

const onSubmit = async (ev: SubmitEvent) => {
  ev.preventDefault();
  const url = (urlInput as HTMLInputElement).value.trim();
  const { valid, videoId } = youtubeUrlParser(url);

  if (!valid) return;

  try {
    await sendConversionRequest({
      url,
      clientId: clientId.getId(),
    });
    updateConversionStatus(
      elements,
      ConversionState.InProgress,
      "Converting..."
    );
    await startStatusAwaiter(videoId);
  } catch (error) {
    console.error("Error during conversion request:", error);
    updateConversionStatus(
      elements,
      ConversionState.Error,
      "Failed to start conversion. Please try again."
    );
  }
};

const handleLogin = () => {
  window.open(window.lambdaEnv.HOSTED_UI_LOGIN_URL, "_self");
};

urlInput.addEventListener("input", onInputChange);
form.addEventListener("submit", onSubmit);
loginButton.addEventListener("click", handleLogin);
