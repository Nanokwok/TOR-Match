/**
 * Reads boolean CLI flags for the scripts under src/scraper and src/seed.
 *
 * Not just `argv.includes()`, because on Windows PowerShell it would silently
 * report false. PowerShell strips the `--` separator when invoking a native
 * command, so
 *
 *   npm run ingest -- --dry-run     (PowerShell)
 *
 * reaches npm as `npm run ingest --dry-run`. npm then recognises --dry-run as
 * one of *its own* options, keeps it, and passes it to the script as the
 * environment variable npm_config_dry_run instead of in argv. The same applies
 * to --force and --all. The flag therefore vanishes, and a run meant to change
 * nothing quietly becomes a live one — which is how an intended dry run of the
 * publish backfill published nine TORs for real.
 *
 * Reading both sources means --dry-run, --force and --all behave the same from
 * PowerShell, from a POSIX shell, from cmd.exe and from CI. A flag npm does
 * not recognise cannot be recovered this way — npm drops it with an "Unknown
 * cli config" warning and sets nothing — so from PowerShell, quote the
 * separator to keep it:
 *
 *   npm run ingest "--" --dry-run
 */
export function hasFlag(argv: string[], name: string): boolean {
  if (argv.includes(`--${name}`)) return true

  // npm lowercases its config keys and replaces dashes with underscores.
  const fromNpmConfig = process.env[`npm_config_${name.replace(/-/g, "_")}`]
  // An npm boolean config arrives as the string "true"; "" covers a bare
  // `--flag=` and "false" must not count as set.
  return fromNpmConfig === "true" || fromNpmConfig === ""
}
