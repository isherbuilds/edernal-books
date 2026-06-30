import { type DocumentErrorCode } from "@tsu-stack/core/documents";

export class DocumentDbError extends Error {
  code: DocumentErrorCode;

  constructor(code: DocumentErrorCode) {
    super(code);
    this.code = code;
  }
}
