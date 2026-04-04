import { clsx } from "clsx";
import { useKernel, useFeatureStatus } from "@/core";
import { bridge } from "@/bridge";
import type { TabComponentProps } from "@/features/tabs/types";

// ── Section ───────────────────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="text-2xs font-mono uppercase tracking-widest text-subtle border-b border-border pb-2">
        {title}
      </h2>
      {children}
    </section>
  );
}

// ── Row ───────────────────────────────────────────────────────────────────────

function Row({
  label,
  description,
  children,
}: {
  label: string;
  description?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-1">
      <div>
        <p className="text-xs font-sans text-ink/80">{label}</p>
        {description && <p className="text-2xs font-sans text-subtle mt-0.5">{description}</p>}
      </div>
      {children}
    </div>
  );
}

// ── Feature Status Badge ──────────────────────────────────────────────────────

function FeatureBadge({ id }: { id: string }) {
  const status = useFeatureStatus(id);
  const colors: Record<string, string> = {
    running:  "bg-success/15 text-success",
    stopped:  "bg-muted/15 text-muted",
    error:    "bg-danger/15 text-danger",
    disabled: "bg-subtle/15 text-subtle",
  };
  return (
    <span
      className={clsx(
        "text-2xs font-mono px-2 py-0.5 rounded-full",
        colors[status] ?? "bg-muted/15 text-muted"
      )}
    >
      {status}
    </span>
  );
}

// ── Kernel Panel ──────────────────────────────────────────────────────────────

function KernelPanel() {
  const kernel = useKernel();
  const entries = kernel.getAllEntries();

  return (
    <div className="space-y-1.5">
      {entries.map((entry) => (
        <div
          key={entry.definition.id}
          className="flex items-center justify-between bg-raised rounded px-3 py-2"
        >
          <div>
            <p className="text-xs font-sans text-ink/80 font-medium">
              {entry.definition.name}
            </p>
            <p className="text-2xs font-mono text-subtle">
              {entry.definition.id} · v{entry.definition.version}
            </p>
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
  );
}

// ── Settings Page ─────────────────────────────────────────────────────────────

export function SettingsPage(_props: TabComponentProps) {
  return (
    <div className="max-w-2xl mx-auto px-6 py-10 space-y-10 animate-fade-in">
      <div>
        <h1 className="font-serif text-2xl text-ink font-light">Settings</h1>
        <p className="text-xs text-subtle font-sans mt-1">
          Platform: <span className="font-mono text-amber">{bridge.platform}</span>
        </p>
      </div>

      <Section title="Appearance">
        <Row label="Theme" description="Dark mode only for now. Light mode coming soon." />
        <Row label="Editor font" description="Crimson Pro · 16px">
          <span className="text-xs font-mono text-muted">System</span>
        </Row>
      </Section>

      <Section title="Editor">
        <Row
          label="Auto-save delay"
          description="How long after you stop typing before changes are saved."
        >
          <span className="text-xs font-mono text-muted">800ms</span>
        </Row>
      </Section>

      <Section title="Kernel — Feature Registry">
        <p className="text-2xs text-subtle font-sans">
          All registered features and their current lifecycle status.
        </p>
        <KernelPanel />
      </Section>

      <Section title="Data">
        <Row label="Storage" description="Notes are persisted in localStorage (PWA) or the app data directory (Tauri)." />
        <Row label="Export">
          <button className="text-xs font-sans text-amber hover:text-amber-glow transition-colors">
            Export all notes →
          </button>
        </Row>
      </Section>

      <Section title="About">
        <Row label="noter" description="A beautiful, fast, offline-first note-taking app." />
        <Row label="Version">
          <span className="text-xs font-mono text-muted">0.1.0</span>
        </Row>
      </Section>
    </div>
  );
}
