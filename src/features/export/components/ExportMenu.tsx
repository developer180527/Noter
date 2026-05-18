import { useState, useRef, useEffect } from "react";
import { Download, FileText, Code, Printer, ChevronDown, type LucideIcon } from "lucide-react";
import { clsx } from "clsx";
import { exportPdf }      from "../exporters/pdf";
import { exportHtml }     from "../exporters/html";
import { exportMarkdown } from "../exporters/markdown";
import type { Note } from "@/features/notes/types";
import { useNoteStore } from "@/features/notes/note.store";

interface ExportMenuProps {
  note:            Note;
  onBeforeExport?: () => Note | null | void | Promise<Note | null | void>;
}

interface ExportOption {
  label:       string;
  description: string;
  icon:        LucideIcon;
  action:      () => Promise<void>;
  divider?:    boolean;
}

export function ExportMenu({ note, onBeforeExport }: ExportMenuProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const getExportNote = async (): Promise<Note> => {
    const flushed = await onBeforeExport?.();
    if (flushed) return flushed;
    return useNoteStore.getState().notes.find((n) => n.id === note.id) ?? note;
  };

  const options: ExportOption[] = [
    {
      label:       "Print / Export PDF",
      description: "Exports a beautifully formatted PDF to disk",
      icon:        Printer,
      action:      async () => {
        const latestNote = await getExportNote();
        await exportPdf(latestNote, useNoteStore.getState());
        setOpen(false);
      },
    },
    {
      label:       "Export as HTML",
      description: "Self-contained file, opens in any browser",
      icon:        Code,
      action:      async () => {
        await exportHtml(await getExportNote());
        setOpen(false);
      },
      divider:     true,
    },
    {
      label:       "Export as Markdown",
      description: "Plain text with YAML frontmatter",
      icon:        FileText,
      action:      async () => {
        await exportMarkdown(await getExportNote());
        setOpen(false);
      },
    },
  ];

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className={clsx(
          "flex items-center gap-1 p-1.5 rounded transition-colors text-subtle",
          open
            ? "text-amber bg-amber/10"
            : "hover:text-ink hover:bg-raised"
        )}
        title="Export note"
      >
        <Download size={13} />
        <ChevronDown
          size={9}
          className={clsx("transition-transform duration-150", open && "rotate-180")}
        />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 w-64 bg-overlay border border-border
                        rounded-lg shadow-2xl z-50 overflow-hidden animate-fade-in">
          <div className="px-3 py-2 border-b border-border">
            <p className="text-2xs font-mono text-subtle uppercase tracking-widest">Export</p>
          </div>

          <div className="p-1">
            {options.map((opt) => (
              <div key={opt.label}>
                {opt.divider && <div className="h-px bg-border my-1" />}
                <button
                  onClick={() => {
                    opt.action().catch((e) => console.error(`${opt.label} failed:`, e));
                  }}
                  className="w-full flex items-start gap-3 px-3 py-2 rounded-md
                             hover:bg-raised transition-colors text-left group"
                >
                  <opt.icon
                    size={14}
                    className="text-muted group-hover:text-amber transition-colors mt-0.5 shrink-0"
                  />
                  <div>
                    <p className="text-xs font-sans font-medium text-ink/80 group-hover:text-ink transition-colors">
                      {opt.label}
                    </p>
                    <p className="text-2xs font-sans text-subtle mt-0.5">
                      {opt.description}
                    </p>
                  </div>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
