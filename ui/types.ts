import { ConversionState } from "./conversionState";

export type UIElements = {
  convertBtn: HTMLElement;
  urlInput: HTMLElement;
  phaseChip: HTMLElement;
  statusEl: HTMLElement;
};

export type ConversionResult = {
  DownloadUrl: string;
  Error: string | null;
  VideoId: string;
  Progress: ConversionState;
};

declare global {
  interface Window {
    lambdaEnv: {
      HOSTED_UI_LOGIN_URL: string;
      HOSTED_UI_LOGOUT_URL: string;
    };
  }
}
