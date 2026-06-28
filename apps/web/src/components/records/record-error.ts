import { isDefinedError } from "@orpc/client";

type RecordErrorHandlers = {
  onDuplicateName: () => void;
  onAccountMismatch?: () => void;
  onFallback: () => void;
};

export function handleRecordMutationError(error: unknown, handlers: RecordErrorHandlers): void {
  if (isDefinedError(error)) {
    const code = getRecordErrorCode(error);

    if (code === "ITEM_DUPLICATE_NAME" || code === "PARTY_DUPLICATE_NAME") {
      handlers.onDuplicateName();
      return;
    }

    if (code === "ITEM_ACCOUNT_ORGANIZATION_MISMATCH") {
      (handlers.onAccountMismatch ?? handlers.onFallback)();
      return;
    }
  }

  handlers.onFallback();
}

function getRecordErrorCode(error: unknown): string | null {
  if (
    typeof error !== "object" ||
    error === null ||
    !("code" in error) ||
    typeof error.code !== "string"
  ) {
    return null;
  }

  return error.code;
}
