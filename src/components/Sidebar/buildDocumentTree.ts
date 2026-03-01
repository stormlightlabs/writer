import type { DocMeta } from "$types";

export type DirectoryTreeNode = { type: "directory"; name: string; path: string; children: TreeNode[] };
export type FileTreeNode = { type: "file"; name: string; path: string; doc: DocMeta };
export type TreeNode = DirectoryTreeNode | FileTreeNode;

function splitPathSegments(relPath: string): string[] {
  return relPath.split(/[\\/]+/).filter(Boolean);
}

function ensureDirectoryNode(parent: DirectoryTreeNode, name: string, path: string): DirectoryTreeNode {
  const existing = parent.children.find((node) => node.type === "directory" && node.path === path);
  if (existing && existing.type === "directory") {
    return existing;
  }

  const directoryNode: DirectoryTreeNode = { type: "directory", name, path, children: [] };
  parent.children.push(directoryNode);
  return directoryNode;
}

function sortTreeNodes(children: TreeNode[]): TreeNode[] {
  return children.toSorted((left, right) => {
    if (left.type !== right.type) {
      return left.type === "directory" ? -1 : 1;
    }

    return left.name.localeCompare(right.name, void 0, { sensitivity: "base" });
  });
}

function normalizeTree(node: DirectoryTreeNode): DirectoryTreeNode {
  const normalizedChildren = sortTreeNodes(node.children).map((child) =>
    child.type === "directory" ? normalizeTree(child) : child
  );
  return { ...node, children: normalizedChildren };
}

export function buildDocumentTree(documents: DocMeta[], directories: string[]): DirectoryTreeNode {
  const root: DirectoryTreeNode = { type: "directory", name: "", path: "", children: [] };

  for (const directoryPath of directories) {
    const segments = splitPathSegments(directoryPath);
    if (segments.length === 0) {
      continue;
    }

    let currentParent = root;
    let currentPath = "";
    for (const segment of segments) {
      currentPath = currentPath ? `${currentPath}/${segment}` : segment;
      currentParent = ensureDirectoryNode(currentParent, segment, currentPath);
    }
  }

  for (const doc of documents) {
    const segments = splitPathSegments(doc.rel_path);
    if (segments.length === 0) {
      continue;
    }

    const fileName = segments.at(-1) ?? doc.rel_path;
    const parentSegments = segments.slice(0, -1);

    let currentParent = root;
    let currentPath = "";

    for (const segment of parentSegments) {
      currentPath = currentPath ? `${currentPath}/${segment}` : segment;
      currentParent = ensureDirectoryNode(currentParent, segment, currentPath);
    }

    currentParent.children.push({ type: "file", name: fileName, path: doc.rel_path, doc });
  }

  return normalizeTree(root);
}

export function parentDirectoryPaths(relPath: string): string[] {
  const parts = splitPathSegments(relPath);
  const directories = parts.slice(0, -1);
  const paths: string[] = [];
  let currentPath = "";

  for (const directory of directories) {
    currentPath = currentPath ? `${currentPath}/${directory}` : directory;
    paths.push(currentPath);
  }

  return paths;
}
