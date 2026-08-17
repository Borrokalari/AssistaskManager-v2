import { invoke } from "@tauri-apps/api/core";
import { APP_VERSION } from "../version";

export default function AboutView() {
  const openSite = () => invoke("open_url", { url: "https://latticeworks.studio" });

  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-4 p-6 text-center">
      <div>
        <div className="text-vscode-accent text-base tracking-widest uppercase mb-1">Assistask</div>
        <div className="text-xs text-vscode-muted">v{APP_VERSION}</div>
      </div>
      <p className="text-xs text-vscode-muted leading-relaxed max-w-xs">
        A lightweight floating task manager built with Tauri + React. Parses natural language for
        priorities and due dates so you can capture tasks without breaking your flow.
      </p>
      <div className="text-xs text-vscode-muted flex flex-col items-center gap-1">
        <div>LatticeWorks</div>
        <button
          onClick={openSite}
          className="text-vscode-accent hover:underline transition-colors"
        >
          latticeworks.studio
        </button>
      </div>
    </div>
  );
}
