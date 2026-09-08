import { Schema } from "mongoose"

/**
 * Content stored in every supported locale. Mirrors LocalizedText in
 * frontend/src/types/localized.ts.
 *
 * Use for *data* whose value genuinely differs per language (a department's
 * official name, a TOR title). UI labels belong in the i18n dictionary instead.
 */
export const localizedTextSchema = new Schema(
  {
    en: { type: String, default: "" },
    th: { type: String, default: "" },
  },
  { _id: false }
)

/** List counterpart of {@link localizedTextSchema} — e.g. deliverables. */
export const localizedListSchema = new Schema(
  {
    en: { type: [String], default: [] },
    th: { type: [String], default: [] },
  },
  { _id: false }
)