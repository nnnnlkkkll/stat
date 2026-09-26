import { useState } from "react";

export function AuthPassword({
  label,
  value,
  onChange,
  autoComplete,
  hint,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  autoComplete: string;
  hint?: string;
}) {
  const [show, setShow] = useState(false);
  return (
    <label className="field">
      <span>{label}</span>
      <div className="pw-wrap">
        <input
          type={show ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          autoComplete={autoComplete}
        />
        <button className="btn text pw-toggle" type="button" onClick={() => setShow((v) => !v)}>
          {show ? "hide" : "show"}
        </button>
      </div>
      {hint && <div className="note">{hint}</div>}
    </label>
  );
}

export function passwordHint(value: string) {
  if (!value) return "at least 8 characters.";
  if (value.length < 8) return `${8 - value.length} more characters.`;
  const bits = [/[A-Z]/.test(value), /[0-9]/.test(value), /[^A-Za-z0-9]/.test(value)].filter(Boolean).length;
  if (bits === 0) return "ok. a number or symbol would make it stronger.";
  if (bits === 1) return "solid.";
  return "strong.";
}
