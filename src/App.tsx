import { Editor } from "./components/Editor";
import { useEditor } from "./hooks/useEditor";
import "./App.css";

function App() {
  const { model, dispatch } = useEditor();

  return (
    <main className="container" style={{ height: "100vh", display: "flex", flexDirection: "column" }}>
      <header style={{ padding: "1rem", borderBottom: "1px solid #393939", backgroundColor: "#161616" }}>
        <h1 style={{ margin: 0, color: "#f4f4f4" }}>Writer</h1>
        <div style={{ color: "#a8a8a8", fontSize: "0.875rem", marginTop: "0.5rem" }}>
          {model.saveStatus === "Saving" && "Saving..."}
          {model.saveStatus === "Saved" && "Saved"}
          {model.saveStatus === "Dirty" && "Unsaved changes"}
          {model.saveStatus === "Error" && "Error saving"}
          {model.saveStatus === "Idle" && "Ready"}
        </div>
      </header>
      <div style={{ flex: 1, overflow: "hidden" }}>
        <Editor
          initialText={model.text}
          theme="dark"
          onChange={(text) => dispatch({ type: "EditorChanged", text })}
          onSave={() => dispatch({ type: "SaveRequested" })}
          onCursorMove={(line, column) => dispatch({ type: "CursorMoved", line, column })}
          onSelectionChange={(from, to) => dispatch({ type: "SelectionChanged", from, to })} />
      </div>
    </main>
  );
}

export default App;
