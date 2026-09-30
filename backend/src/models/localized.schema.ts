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

/**
 * The identity used to filter and de-duplicate a localized value.
 *
 * English when present, otherwise Thai. Thai is the site's default language
 * and a TOR may be published in Thai only, so keying on `.en` alone would drop
 * those TORs out of every filter list.
 */
export function localizedKey(value: { en?: string; th?: string } | null | undefined): string {
  return value?.en?.trim() || value?.th?.trim() || ""
}

/** List counterpart of {@link localizedTextSchema} — e.g. deliverables. */
export const localizedListSchema = new Schema(
  {
    en: { type: [String], default: [] },
    th: { type: [String], default: [] },
  },
  { _id: false }
)