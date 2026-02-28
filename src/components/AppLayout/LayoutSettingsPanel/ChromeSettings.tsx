import { useCreateReadmeState, useLayoutSettingsChromeState, useShowFilenamesState } from "$state/selectors";
import { ToggleRow } from "./ToggleRow";

export function ChromeSettingsSection() {
  const {
    sidebarCollapsed,
    topBarsCollapsed,
    statusBarCollapsed,
    toggleSidebarCollapsed,
    toggleTabBarCollapsed,
    toggleStatusBarCollapsed,
  } = useLayoutSettingsChromeState();
  const { filenameVisibility: filenameVisibility, toggleFilenameVisibility: toggleFilenameVisibility } =
    useShowFilenamesState();
  const { createReadmeInNewLocations, setCreateReadmeInNewLocations } = useCreateReadmeState();

  return (
    <>
      <ToggleRow
        label="Sidebar"
        description="Show or hide the left navigation panel."
        isVisible={!sidebarCollapsed}
        onToggle={toggleSidebarCollapsed} />
      <ToggleRow
        label="Tab Bar"
        description="Show or hide the document tabs."
        isVisible={!topBarsCollapsed}
        onToggle={toggleTabBarCollapsed} />
      <ToggleRow
        label="Status Bar"
        description="Show or hide the editor status row."
        isVisible={!statusBarCollapsed}
        onToggle={toggleStatusBarCollapsed} />
      <ToggleRow
        label="Show Filenames"
        description="Display filenames instead of document titles in the sidebar."
        isVisible={filenameVisibility}
        onToggle={toggleFilenameVisibility} />
      <ToggleRow
        label="Add README to New Folders"
        description="Create a Markdown guide when adding a new folder."
        isVisible={createReadmeInNewLocations}
        onToggle={setCreateReadmeInNewLocations} />
    </>
  );
}
