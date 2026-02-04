export type AppErrorCode =
  | "VALIDATION_ERROR"
  | "NOT_FOUND"
  | "CONFLICT"
  | "SUPABASE_ERROR"
  | "STORAGE_ERROR"
  | "CONFIG_ERROR"
  | "UNAUTHORIZED"
  | "UNKNOWN";

export class AppError extends Error {
  readonly code: AppErrorCode;
  readonly status: number;
  readonly cause?: unknown;

  constructor(message: string, code: AppErrorCode = "UNKNOWN", status = 400, cause?: unknown) {
    super(message);
    this.name = "AppError";
    this.code = code;
    this.status = status;
    this.cause = cause;
  }
}
