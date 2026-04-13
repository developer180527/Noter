import { useKernel, useFeatureStatus } from "@/core";
import { clsx } from "clsx";
import { SectionHeader, SettingGroup, SettingRow } from "./shared";
import { bridge } from "@/bridge";

function FeatureBadge({ id }: { id: string }) {
  const status = useFeatureStatus(id);
  const colors: Record<string, string> = {
    running:  "bg-success/15 text-success",
    stopped:  "bg-muted/15 text-muted",
    error:    "bg-danger/15 text-danger",
    disabled: "bg-subtle/15 text-subtle",
  };
  return (
    <span className={clsx("text-2xs font-mono px-2 py-0.5 rounded-full", colors[status] ?? "bg-muted/15 text-muted")}>
      {status}
    </span>
  );
}

function UpdateBanner() {
  return (
    <div className="rounded-lg border border-border bg-raised/30 px-4 py-3 flex items-center justify-between">
      <div>
        <p className="text-xs font-sans text-ink/90 font-medium">noter is up to date</p>
        <p className="text-2xs text-subtle font-mono mt-0.5">v0.1.0 — last checked just now</p>
      </div>
      <button className="text-xs font-mono text-amber hover:text-amber-glow transition-colors">
        Check again
      </button>
    </div>
  );
}

export function GeneralSection() {
  const kernel  = useKernel();
  const entries = kernel.getAllEntries();

  return (
    <div>
      <SectionHeader title="General" description="App-wide settings and system information." />

      <SettingGroup title="Software Update">
        <UpdateBanner />
      </SettingGroup>

      <SettingGroup title="System">
        <SettingRow label="Platform" description="The runtime environment noter is running on.">
          <span className="text-xs font-mono text-amber">{bridge.platform}</span>
        </SettingRow>
        <SettingRow label="Version">
          <span className="text-xs font-mono text-muted">0.1.0</span>
        </SettingRow>
        <SettingRow label="Data location" description="Where your notes are stored on disk.">
          <span className="text-2xs font-mono text-subtle truncate max-w-[180px]">
            ~/Library/Application Support/noter
          </span>
        </SettingRow>
      </SettingGroup>

      <SettingGroup title="Feature Registry">
        <div className="divide-y divide-border">
          {entries.map((entry) => (
            <div key={entry.definition.id} className="flex items-center justify-between px-4 py-2.5 bg-raised/30">
              <div>
                <p className="text-xs font-sans text-ink/90 font-medium">{entry.definition.name}</p>
                <p className="text-2xs font-mono text-subtle">{entry.definition.id} · v{entry.definition.version}</p>
              </div>
              <div className="flex items-center gap-2">
                <FeatureBadge id={entry.definition.id} />
                {entry.status === "running" && (
                  <button
                    onClick={() => kernel.restart(entry.definition.id)}
                    className="text-2xs font-mono text-subtle hover:text-amber transition-colors"
                  >
                    restart
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </SettingGroup>
    </div>
  );
}
