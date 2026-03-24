const IMAGE_EXTENSIONS = new Set(["png", "jpg", "jpeg", "gif", "webp", "svg"]);

function extensionFromPath(relPath: string): string {
  const filename = relPath.split("/").pop() ?? relPath;
  const dotIndex = filename.lastIndexOf(".");
  if (dotIndex === -1 || dotIndex === filename.length - 1) {
    return "";
  }

  return filename.slice(dotIndex + 1).toLowerCase();
}

export function isImagePath(relPath: string): boolean {
  return IMAGE_EXTENSIONS.has(extensionFromPath(relPath));
}

export function isImageContentType(contentType: string | null | undefined): boolean {
  return typeof contentType === "string" && contentType.toLowerCase().startsWith("image/");
}
