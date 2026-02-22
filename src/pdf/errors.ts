// oxlint-disable max-classes-per-file

import type { PdfFontResolution, PdfFontSourceDescriptor } from "./types";

export class PdfFontSourceFetchError extends Error {
  readonly code = "PDF_FONT_SOURCE_FETCH_FAILED";
  readonly details: { source: PdfFontSourceDescriptor; status?: number; statusText?: string; contentType?: string };

  constructor(
    source: PdfFontSourceDescriptor,
    message: string,
    extras?: { status?: number; statusText?: string; contentType?: string; cause?: unknown },
  ) {
    super(message, { cause: extras?.cause instanceof Error ? extras.cause : undefined });
    this.name = "PdfFontSourceFetchError";
    this.details = { source, status: extras?.status, statusText: extras?.statusText, contentType: extras?.contentType };
  }
}

export class PdfFontRegistrationError extends Error {
  readonly code = "PDF_FONT_REGISTRATION_FAILED";
  readonly details: PdfFontResolution;

  constructor(details: PdfFontResolution, cause: unknown) {
    const message = cause instanceof Error ? cause.message : String(cause);
    super(`Failed to register PDF font "${details.fontName}" (${details.family}): ${message}`, {
      cause: cause instanceof Error ? cause : undefined,
    });
    this.name = "PdfFontRegistrationError";
    this.details = details;
  }
}

export type SerializedError = {
  name: string;
  message: string;
  stack?: string;
  code?: string;
  details?: unknown;
  cause?: SerializedError;
};

export const serializeError = (error: unknown, depth = 0): SerializedError => {
  if (depth > 4) {
    return { name: "TruncatedError", message: "Error cause chain exceeded depth limit" };
  }

  if (error instanceof Error) {
    const withFields = error as Error & { code?: string; details?: unknown; cause?: unknown };
    const serialized: SerializedError = { name: error.name, message: error.message, stack: error.stack };

    if (withFields.code) {
      serialized.code = withFields.code;
    }
    if (withFields.details) {
      serialized.details = withFields.details;
    }
    if (withFields.cause) {
      serialized.cause = serializeError(withFields.cause, depth + 1);
    }
    return serialized;
  }

  return { name: "UnknownError", message: String(error) };
};
