import * as logger from "@tauri-apps/plugin-log";

/**
 * Transforms the version string to a more readable format.
 *
 * Example (from git describe --tags --long --always --dirty):
 * - "v0.1.0-25-g51e2f0b" -> "v0.1.0dev25+51e2f0b"
 * - "v0.1.0-25-g51e2f0b-dirty" -> "v0.1.0dev25+51e2f0b.dirty"
 *
 * @param version The version string to transform.
 * @returns The transformed version string.
 */
function transformVersion(version: string) {
  const match = version.match(/^v(\d+\.\d+\.\d+)-(\d+)-g([0-9a-f]+)(-dirty)?$/);
  if (!match) {
    return version;
  }
  const [, base, count, hash, dirty] = match;
  if (dirty) {
    logger.warn(`Running on a dirty tree (${hash}).`);
  }
  return `v${base}dev${count}+${hash}${dirty ? ".dirty" : ""}`;
}

export function Version({ value }: { value: string }) {
  if (!value.trim()) {
    return null;
  }

  return <span className="text-[0.6875rem] leading-none text-text-placeholder">{transformVersion(value)}</span>;
}
