const isValid = (urlParts: URL) => {
  try {
    const host = urlParts.hostname.replace(/^www\./, "");
    if (host === "youtu.be") return urlParts.pathname.length > 1;
    if (host === "youtube.com" || host === "m.youtube.com")
      return !!(
        urlParts.searchParams.get("v") ||
        urlParts.pathname.startsWith("/shorts/")
      );
    return false;
  } catch {
    return false;
  }
};

export const youtubeUrlParser = (
  url: string
): { valid: boolean; videoId: string } => {
  try {
    const urlParts = new URL(url.trim());
    return {
      valid: isValid(urlParts),
      videoId: urlParts.searchParams.get("v") || "",
    };
  } catch {
    return { valid: false, videoId: "" };
  }
};
