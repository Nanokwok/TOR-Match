/**
 * Content-based file type checks (ASVS V5.2.2).
 *
 * A downloaded file is judged by its first bytes, never by its URL, its
 * extension or the server's Content-Type: a missing document often answers 200
 * with an HTML error page, and a parser handed that would bill a full request
 * to read an error message.
 */

export type FileType = "pdf" | "zip"

/**
 * The accepted signatures for each type, as byte sequences.
 *
 * A ZIP is the whole four-byte signature — a local-file header (PK\x03\x04), or
 * the end record of an empty archive (PK\x05\x06) — not just "PK", which any
 * text starting with those letters would satisfy.
 */
const SIGNATURES: Record<FileType, readonly (readonly number[])[]> = {
  pdf: [[0x25, 0x50, 0x44, 0x46, 0x2d]], // %PDF-
  zip: [
    [0x50, 0x4b, 0x03, 0x04],
    [0x50, 0x4b, 0x05, 0x06],
  ],
}

/** How many leading bytes {@link validateMagicBytes} needs to see. */
export const MAGIC_BYTES_LENGTH = 5

/** Whether `buffer` begins with the signature of `type`. A buffer too short to hold one is not valid. */
export function validateMagicBytes(buffer: Uint8Array, type: FileType): boolean {
  return SIGNATURES[type].some(
    (signature) => buffer.length >= signature.length && signature.every((byte, index) => buffer[index] === byte)
  )
}

/** Which accepted type `buffer` is, or null when it is neither. */
export function detectFileType(buffer: Uint8Array): FileType | null {
  if (validateMagicBytes(buffer, "pdf")) return "pdf"
  if (validateMagicBytes(buffer, "zip")) return "zip"
  return null
}
