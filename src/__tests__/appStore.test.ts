import { beforeEach, describe, expect, it } from "vitest";
import { resetAppStore, useAppStore } from "../state/appStore";

describe("appStore", () => {
  beforeEach(() => {
    resetAppStore();
  });

  it("selects the first location when locations load initially", () => {
    useAppStore.getState().setLocations([{ id: 10, name: "A", root_path: "/a", added_at: "2024-01-01" }, {
      id: 11,
      name: "B",
      root_path: "/b",
      added_at: "2024-01-01",
    }]);

    expect(useAppStore.getState().selectedLocationId).toBe(10);
  });

  it("opens and reuses document tabs", () => {
    const state = useAppStore.getState();

    const firstOpen = state.openDocumentTab({ location_id: 1, rel_path: "notes/a.md" }, "A");
    const secondOpen = useAppStore.getState().openDocumentTab({ location_id: 1, rel_path: "notes/a.md" }, "A");

    expect(firstOpen.didCreateTab).toBeTruthy();
    expect(secondOpen.didCreateTab).toBeFalsy();
    expect(useAppStore.getState().tabs).toHaveLength(1);
    expect(useAppStore.getState().activeTabId).toBe(firstOpen.tabId);
  });

  it("closing the active tab activates an adjacent tab", () => {
    const store = useAppStore.getState();

    const first = store.openDocumentTab({ location_id: 1, rel_path: "a.md" }, "A");
    const second = useAppStore.getState().openDocumentTab({ location_id: 1, rel_path: "b.md" }, "B");

    useAppStore.getState().selectTab(first.tabId);

    const nextDocRef = useAppStore.getState().closeTab(first.tabId);

    expect(nextDocRef).toStrictEqual({ location_id: 1, rel_path: "b.md" });
    expect(useAppStore.getState().activeTabId).toBe(second.tabId);
    expect(useAppStore.getState().tabs).toHaveLength(1);
  });

  it("removing a location clears selected and active state tied to that location", () => {
    const store = useAppStore.getState();

    store.setLocations([{ id: 1, name: "A", root_path: "/a", added_at: "2024-01-01" }, {
      id: 2,
      name: "B",
      root_path: "/b",
      added_at: "2024-01-01",
    }]);

    store.openDocumentTab({ location_id: 1, rel_path: "a.md" }, "A");
    useAppStore.getState().removeLocation(1);

    expect(useAppStore.getState().locations.map((location) => location.id)).toStrictEqual([2]);
    expect(useAppStore.getState().selectedLocationId).toBeUndefined();
    expect(useAppStore.getState().activeTabId).toBeNull();
    expect(useAppStore.getState().tabs).toStrictEqual([]);
  });

  it("marks only the active tab as modified", () => {
    const store = useAppStore.getState();

    const first = store.openDocumentTab({ location_id: 1, rel_path: "a.md" }, "A");
    const second = useAppStore.getState().openDocumentTab({ location_id: 1, rel_path: "b.md" }, "B");

    useAppStore.getState().selectTab(first.tabId);
    useAppStore.getState().markActiveTabModified(true);

    const {tabs} = useAppStore.getState();
    expect(tabs.find((tab) => tab.id === first.tabId)?.isModified).toBeTruthy();
    expect(tabs.find((tab) => tab.id === second.tabId)?.isModified).toBeFalsy();
  });
});
