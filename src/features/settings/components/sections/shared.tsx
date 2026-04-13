export function SectionHeader({ title, description }: { title: string; description?: string }) {
  return (
    <div className="mb-6">
      <h1 className="font-serif text-xl text-ink font-semibold">{title}</h1>
      {description && <p className="text-xs text-subtle font-sans mt-1">{description}</p>}
    </div>
  );
}

export function SettingGroup({ title, children }: { title?: string; children: React.ReactNode }) {
  return (
    <div className="mb-6">
      {title && <p className="text-2xs font-mono uppercase tracking-widest text-subtle mb-2">{title}</p>}
      <div className="rounded-lg border border-border overflow-hidden divide-y divide-border">
        {children}
      </div>
    </div>
  );
}

export function SettingRow({ label, description, children }: {
  label: string; description?: string; children?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-6 px-4 py-3 bg-raised/30">
      <div className="min-w-0">
        <p className="text-xs font-sans text-ink/90 font-medium">{label}</p>
        {description && <p className="text-2xs font-sans text-subtle mt-0.5 leading-relaxed">{description}</p>}
      </div>
      {children && <div className="shrink-0">{children}</div>}
    </div>
  );
}

export function Toggle({ value, onChange, disabled }: {
  value: boolean; onChange: (v: boolean) => void; disabled?: boolean;
}) {
  return (
    <button
      onClick={() => !disabled && onChange(!value)}
      disabled={disabled}
      className={`relative w-9 h-5 rounded-full transition-colors duration-150 focus:outline-none
        ${disabled ? "opacity-40 cursor-not-allowed" : value ? "bg-amber" : "bg-overlay border border-border"}`}
    >
      <span className={`absolute top-0.5 w-4 h-4 rounded-full transition-all duration-150
        ${value ? "left-[18px] bg-base" : "left-0.5 bg-muted"}`} />
    </button>
  );
}

export function Select({ value, options, onChange }: {
  value: string | number;
  options: { label: string; value: string | number }[];
  onChange: (v: string | number) => void;
}) {
  return (
    <select
      value={value}
      onChange={(e) => { const o = options.find((o) => String(o.value) === e.target.value); if (o) onChange(o.value); }}
      className="text-xs font-mono text-ink bg-overlay border border-border rounded px-2 py-1 outline-none focus:border-amber/50 transition-colors"
    >
      {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );
}
