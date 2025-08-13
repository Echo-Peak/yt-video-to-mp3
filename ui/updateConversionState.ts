import { ConversionState } from "./conversionState";
import { UIElements } from "./types";

function labelForPhase(p: ConversionState) {
  switch (p) {
    case ConversionState.Idle:
      return "Idle";
    case ConversionState.InProgress:
      return "In Progress";
    case ConversionState.Completed:
      return "Completed";
    case ConversionState.Error:
      return "Error";
    default:
      return "";
  }
}

export const updateConversionStatus = (
  elements: UIElements,
  state: ConversionState,
  statusMessage: string = ""
): void => {
  elements.phaseChip.textContent = labelForPhase(state);
  elements.statusEl.textContent = statusMessage;
  elements.phaseChip.classList.remove("success", "error");
  if (state === ConversionState.Completed)
    elements.phaseChip.classList.add("success");
  if (state === ConversionState.Error)
    elements.phaseChip.classList.add("error");

  switch (state) {
    case ConversionState.InProgress:
      (elements.convertBtn as HTMLButtonElement).disabled = true;
      (elements.urlInput as HTMLInputElement).readOnly = true;
      break;
    case ConversionState.Completed:
      Object.values(elements).forEach((el) =>
        el.classList.remove("in-progress")
      );
      Object.values(elements).forEach((el) => el.classList.add("completed"));
      break;
    case ConversionState.Error:
      Object.values(elements).forEach((el) =>
        el.classList.remove("in-progress")
      );
      Object.values(elements).forEach((el) => el.classList.add("error"));
      break;
    case ConversionState.Idle:
      Object.values(elements).forEach((el) =>
        el.classList.remove("in-progress", "completed", "error")
      );
      console.log("Conversion is idle.");
      (elements.convertBtn as HTMLButtonElement).disabled = false;
      (elements.urlInput as HTMLInputElement).readOnly = false;
      break;
  }
};
