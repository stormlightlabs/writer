import { useDocumentSessionEffects } from "$hooks/app/useDocumentSessionEffects";
import { docExists, runCmd, sessionLastDocGet, sessionLastDocSet } from "$ports";
import type { AppError, DocRef, LocationDescriptor } from "$types";
import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("$ports", () => ({
  runCmd: vi.fn(async () => {}),
  sessionLastDocGet: vi.fn(),
  docExists: vi.fn(),
  sessionLastDocSet: vi.fn(),
}));

type UseDocumentSessionEffectsArgs = Parameters<typeof useDocumentSessionEffects>[0];

const LOCATION: LocationDescriptor = { id: 1, name: "Workspace", root_path: "/workspace", added_at: "2024-01-01" };

let sessionLastDocGetOnOk: ((docRef: DocRef | null) => void) | null = null;
let docExistsOnOk: ((exists: boolean) => void) | null = null;

const createArgs = (overrides: Partial<UseDocumentSessionEffectsArgs> = {}): UseDocumentSessionEffectsArgs => ({
  isSidebarLoading: false,
  locations: [LOCATION],
  selectedLocationId: LOCATION.id,
  tabs: [],
  activeTab: null,
  documentsCount: 0,
  activeDocRef: null,
  openDoc: vi.fn(),
  handleSelectDocument: vi.fn(),
  handleNewDocument: vi.fn(),
  ...overrides,
});

describe("useDocumentSessionEffects", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionLastDocGetOnOk = null;
    docExistsOnOk = null;

    vi.mocked(sessionLastDocGet).mockImplementation((
      onOk: (docRef: DocRef | null) => void,
      _onErr: (error: AppError) => void,
    ) => {
      sessionLastDocGetOnOk = onOk;
      return { type: "None" } as never;
    });

    vi.mocked(docExists).mockImplementation((
      _locationId: number,
      _relPath: string,
      onOk: (exists: boolean) => void,
      _onErr: (error: AppError) => void,
    ) => {
      docExistsOnOk = onOk;
      return { type: "None" } as never;
    });

    vi.mocked(sessionLastDocSet).mockImplementation((
      _docRef: DocRef | null,
      _onOk: (value: boolean) => void,
      _onErr: (error: AppError) => void,
    ) => ({ type: "None" } as never));

    vi.mocked(runCmd).mockResolvedValue();
  });

  it("does not create a new document while restoring a previously opened one", () => {
    const handleSelectDocument = vi.fn();
    const handleNewDocument = vi.fn();

    renderHook(() => useDocumentSessionEffects(createArgs({ handleSelectDocument, handleNewDocument })));

    expect(sessionLastDocGet).toHaveBeenCalledOnce();
    expect(handleNewDocument).not.toHaveBeenCalled();

    act(() => {
      sessionLastDocGetOnOk?.({ location_id: LOCATION.id, rel_path: "notes/last.md" });
    });

    expect(docExists).toHaveBeenCalledWith(LOCATION.id, "notes/last.md", expect.any(Function), expect.any(Function));

    act(() => {
      docExistsOnOk?.(true);
    });

    expect(handleSelectDocument).toHaveBeenCalledWith(LOCATION.id, "notes/last.md");
    expect(handleNewDocument).not.toHaveBeenCalled();
  });

  it("creates a new document when no previous document exists", () => {
    const handleNewDocument = vi.fn();

    renderHook(() => useDocumentSessionEffects(createArgs({ handleNewDocument })));

    act(() => {
      sessionLastDocGetOnOk?.(null);
    });

    expect(handleNewDocument).toHaveBeenCalledOnce();
    expect(handleNewDocument).toHaveBeenCalledWith(LOCATION.id);
  });

  it("creates a new document when the previous document is missing", () => {
    const handleSelectDocument = vi.fn();
    const handleNewDocument = vi.fn();

    renderHook(() => useDocumentSessionEffects(createArgs({ handleSelectDocument, handleNewDocument })));

    act(() => {
      sessionLastDocGetOnOk?.({ location_id: LOCATION.id, rel_path: "notes/missing.md" });
    });

    act(() => {
      docExistsOnOk?.(false);
    });

    expect(handleSelectDocument).not.toHaveBeenCalled();
    expect(handleNewDocument).toHaveBeenCalledOnce();
    expect(handleNewDocument).toHaveBeenCalledWith(LOCATION.id);
  });
});
