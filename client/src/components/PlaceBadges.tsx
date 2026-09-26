const ICONS: Record<string, { label: string; svg: string }> = {
  early: {
    label: "Early",
    svg: `<svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="16" cy="16" r="15" fill="#1d1a14"/><path d="M16 6.5l2.2 6.4h6.8l-5.5 4 2.1 6.6L16 19.6l-5.6 3.9 2.1-6.6-5.5-4h6.8L16 6.5z" fill="#f3c96b"/></svg>`,
  },
  founding: {
    label: "Founding",
    svg: `<svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="16" cy="16" r="15" fill="#141820"/><path d="M10 8h12l-2.2 5.2L22 18.5H10V8z" fill="#7eb6ff"/><path d="M10 8v16" stroke="#d7e6ff" stroke-width="1.6" stroke-linecap="round"/></svg>`,
  },
  builder: {
    label: "Builder",
    svg: `<svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="16" cy="16" r="15" fill="#161410"/><rect x="8" y="18" width="16" height="6" rx="1.2" fill="#d8a56a"/><rect x="10" y="12" width="12" height="6" rx="1.2" fill="#efc48a"/><rect x="12" y="8" width="8" height="4" rx="1" fill="#f6d7a8"/></svg>`,
  },
};

export function PlaceBadges({ ids }: { ids: string[] }) {
  const items = ids.map((id) => ({ id, ...ICONS[id] })).filter((b) => b.svg);
  if (!items.length) return null;
  return (
    <div className="place-badges">
      {items.map((b) => (
        <span key={b.id} className="place-badge" title={b.label} dangerouslySetInnerHTML={{ __html: b.svg }} />
      ))}
    </div>
  );
}
