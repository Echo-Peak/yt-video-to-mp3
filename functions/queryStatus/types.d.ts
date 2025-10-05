export enum ConversionState {
  InProgress = "in_progress",
  Completed = "completed",
  Failed = "failed",
}
export type UserConversionStatus = {
  videoId: string;
  status: ConversionState;
  downloadUrl?: string;
  errorMessage?: string;
};
