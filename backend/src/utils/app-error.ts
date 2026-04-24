interface AppErrorOptions {
  code: string;
  message: string;
  statusCode: number;
  details?: string[];
}

export class AppError extends Error {
  public readonly code: string;
  public readonly statusCode: number;
  public readonly details?: string[];

  constructor({ code, message, statusCode, details }: AppErrorOptions) {
    super(message);

    this.name = 'AppError';
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
  }
}
