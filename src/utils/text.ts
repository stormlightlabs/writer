export function normalizeText(value: unknown): string {
  return typeof value === "string" ? value : "";
}

export function formatCount(value: number, singular: string, plural: string): string {
  return `${value.toLocaleString()} ${value === 1 ? singular : plural}`;
}
