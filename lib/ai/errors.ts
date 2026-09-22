import { APICallError, RetryError } from "ai";

const isApiUnreachable = (error: unknown): boolean => {
  if (!APICallError.isInstance(error)) {
    return false;
  }
  if (error.statusCode !== undefined) {
    return false;
  }

  const { cause } = error;
  if (
    cause &&
    typeof cause === "object" &&
    "code" in cause &&
    (cause as { code: unknown }).code === "ECONNREFUSED"
  ) {
    return true;
  }
  return false;
};

/** True when a model call failed because the AI provider could not be reached. */
export const isUnreachableError = (error: unknown): boolean => {
  if (RetryError.isInstance(error)) {
    return error.errors.some(isApiUnreachable);
  }
  return isApiUnreachable(error);
};
