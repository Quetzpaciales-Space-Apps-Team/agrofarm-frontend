import type { HTMLInputTypeAttribute } from 'react';

interface TextFieldProps {
  id: string;
  label: string;
  type?: HTMLInputTypeAttribute;
  autoComplete: string;
  value: string;
  onChange: (value: string) => void;
  hint?: string;
  error?: string;
}

/** A labelled input. The hint and the error are tied to it with `aria-describedby`. */
export function TextField({
  id,
  label,
  type = 'text',
  autoComplete,
  value,
  onChange,
  hint,
  error,
}: TextFieldProps) {
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;
  const describedBy = [hint ? hintId : null, error ? errorId : null].filter(Boolean).join(' ');
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <input
        id={id}
        name={id}
        type={type}
        autoComplete={autoComplete}
        value={value}
        spellCheck={false}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy || undefined}
        onChange={(event) => onChange(event.target.value)}
      />
      {hint ? (
        <p id={hintId} className="field__hint">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={errorId} className="field__error">
          {error}
        </p>
      ) : null}
    </div>
  );
}
