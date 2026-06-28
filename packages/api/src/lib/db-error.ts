type DomainError<Code extends string> = { code: Code };

type ErrorFactories<Code extends string> = Record<
  Code,
  (input: { data: { code: Code } }) => unknown
>;

/**
 * Translates a domain DB error (carrying a `code` from a known union) into the matching typed
 * oRPC error. Anything that is not an instance of `ErrorClass` is rethrown unchanged so the
 * procedure fails loud instead of masking an unexpected failure.
 */
export function throwMappedDbError<Code extends string>(
  errors: ErrorFactories<Code>,
  error: unknown,
  ErrorClass: new (...args: never[]) => DomainError<Code>
): never {
  if (error instanceof ErrorClass) {
    throw errors[error.code]({ data: { code: error.code } });
  }

  throw error;
}
