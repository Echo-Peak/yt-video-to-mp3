import { ConversionResult } from "./types";

const convertEndpoint = window.location.href + "/convert";
const statusEndpoint = window.location.href + "/status";

export const sendConversionRequest = async (
  data: Record<string, unknown>
): Promise<void> => {
  const response = await fetch(convertEndpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    throw new Error("Network response was not ok");
  }

  const result = await response.json();
  console.log("Conversion result:", result);
};

export const getConversionStatus = async (
  clientId: string,
  videoId: string
): Promise<ConversionResult> => {
  const response = await fetch(statusEndpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ clientId, videoId }),
  });

  if (!response.ok) {
    throw new Error("Failed to fetch conversion status");
  }

  return response.json();
};
