class ApiError extends Error {
  constructor(
    statusCode,
    message = "Somethng went wrong",
    error = [],
    statck = ""
  ) {
    super(message);
    this.statusCode = statusCode;
    this.data = null;
    this.success = false;
    this.errors = errors;

    if (statck) {
      this.stack = statck;
    } else {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}

export {};
ApiError;
