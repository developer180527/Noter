import { Github, ExternalLink, Heart } from "lucide-react";
import { SectionHeader, SettingGroup, SettingRow } from "./shared";

const TECH_STACK = [
  { name: "Tauri v2",         description: "Rust-powered desktop shell"         },
  { name: "React 19",         description: "UI framework"                        },
  { name: "TipTap v3",        description: "Rich text editor"                    },
  { name: "Zustand",          description: "State management"                    },
  { name: "Tailwind CSS",     description: "Utility-first styling"               },
  { name: "TypeScript",       description: "Type safety"                         },
];

export function AboutSection() {
  return (
    <div>
      <SectionHeader title="About noter" />

      {/* App identity card */}
      <div className="rounded-lg border border-border bg-raised/30 px-5 py-4 mb-6 flex items-start gap-4">
        <div className="w-12 h-12 rounded-xl bg-amber/10 border border-amber/20 flex items-center justify-center shrink-0">
          <span className="font-serif text-amber text-lg font-bold italic">n</span>
        </div>
        <div>
          <p className="text-sm font-sans font-semibold text-ink">noter</p>
          <p className="text-2xs font-mono text-subtle mt-0.5">Version 0.1.0</p>
          <p className="text-xs font-sans text-muted mt-2 leading-relaxed max-w-sm">
            A fast, beautiful, offline-first note-taking app built on an extensible
            plugin architecture. Your notes live on your device — always.
          </p>
        </div>
      </div>

      <SettingGroup title="Version">
        <SettingRow label="App version">
          <span className="text-xs font-mono text-muted">0.1.0</span>
        </SettingRow>
        <SettingRow label="Build">
          <span className="text-xs font-mono text-muted">tauri v2 · react 19</span>
        </SettingRow>
        <SettingRow label="License">
          <span className="text-xs font-mono text-muted">MIT</span>
        </SettingRow>
      </SettingGroup>

      <SettingGroup title="Links">
        <SettingRow label="GitHub" description="Source code, issues, and contributions.">
          <a
            href="https://github.com/developer180527/Noter"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1 text-xs font-mono text-amber hover:text-amber-glow transition-colors"
          >
            <Github size={12} />
            View source
          </a>
        </SettingRow>
        <SettingRow label="Website" description="Downloads, changelog, and documentation.">
          <a
            href="https://noter.app"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1 text-xs font-mono text-amber hover:text-amber-glow transition-colors"
          >
            <ExternalLink size={12} />
            noter.app
          </a>
        </SettingRow>
      </SettingGroup>

      <SettingGroup title="Built with">
        <div className="divide-y divide-border">
          {TECH_STACK.map(({ name, description }) => (
            <SettingRow key={name} label={name} description={description} />
          ))}
        </div>
      </SettingGroup>

      <div className="flex items-center justify-center gap-1.5 pt-2 pb-4">
        <Heart size={10} className="text-subtle" />
        <p className="text-2xs font-mono text-subtle">Built with care. No telemetry by default.</p>
      </div>
    </div>
  );
}
