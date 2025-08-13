const $ = (id) => document.getElementById(id) as HTMLElement;
const urlInput = $("urlInput");
const form = $("convertForm");
const convertBtn = $("convertBtn");
const progress = $("progress");
const bar = $("bar");
const phaseChip = $("phase");
const statusEl = $("status");
const download = $("download");

function isValidYouTubeUrl(value: string): boolean {
  try {
    const u = new URL(value.trim());
    const host = u.hostname.replace(/^www\./, "");
    if (host === "youtu.be") return u.pathname.length > 1;
    if (host === "youtube.com" || host === "m.youtube.com")
      return !!(u.searchParams.get("v") || u.pathname.startsWith("/shorts/"));
    return false;
  } catch {
    return false;
  }
}

function setStatus(p, msg) {
  phaseChip.textContent = labelForPhase(p);
  statusEl.textContent = msg;
  phaseChip.classList.remove("success", "error");
  if (p === "success") phaseChip.classList.add("success");
  if (p === "error") phaseChip.classList.add("error");
}

function setProgress(pct) {
  progress.setAttribute("aria-hidden", "false");
  progress.classList.remove("indeterminate");
  bar.style.width = `${Math.max(0, Math.min(100, pct))}%`;
}

function setIndeterminate(on) {
  progress.setAttribute("aria-hidden", "false");
  bar.style.width = on ? "38%" : bar.style.width;
  progress.classList.toggle("indeterminate", !!on);
}

function labelForPhase(p) {
  switch (p) {
    case "idle":
      return "Idle";
    case "validating":
      return "Validating";
    case "queued":
      return "Queued";
    case "converting":
      return "Converting";
    case "uploading":
      return "Uploading";
    case "finalizing":
      return "Finalizing";
    case "success":
      return "Done";
    case "error":
      return "Error";
    default:
      return "";
  }
}

urlInput.addEventListener("input", () => {
  const valid = isValidYouTubeUrl((urlInput as HTMLInputElement).value);
  (convertBtn as HTMLButtonElement).disabled = !valid;
  urlInput.setAttribute(
    "aria-invalid",
    String(!valid && (urlInput as HTMLInputElement).value.trim().length > 0)
  );
  if (!valid) {
    setStatus(
      "idle",
      (urlInput as HTMLInputElement).value
        ? "Please enter a valid YouTube URL."
        : "Waiting for URL…"
    );
  } else {
    setStatus("idle", "Ready to convert.");
  }
});

form.addEventListener("submit", async (ev) => {
  ev.preventDefault();
  const url = (urlInput as HTMLInputElement).value.trim();
  if (!isValidYouTubeUrl(url)) return;
  (convertBtn as HTMLButtonElement).disabled = true;
  (urlInput as HTMLInputElement).readOnly = true;
  (download as HTMLAnchorElement).hidden = true;

  console.log("Form submitted with URL:", url);
});

function sleep(ms) {
  return new Promise((res) => setTimeout(res, ms));
}
