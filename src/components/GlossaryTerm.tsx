import { useEffect, useId, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { GlossaryTerm as Term } from '../domain/glossary';

/** A word with a plain-language definition. Opens on hover and keyboard focus, closes with Escape. */
export function GlossaryTerm({ term, label }: { term: Term | string; label: string }) {
  const { t } = useTranslation();
  const id = useId();
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const open = (hovered || focused) && !dismissed;

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      // Close only the tooltip, not a dialog around it.
      event.stopPropagation();
      setDismissed(true);
    };
    document.addEventListener('keydown', onKeyDown, true);
    return () => document.removeEventListener('keydown', onKeyDown, true);
  }, [open]);

  return (
    <span
      className="glossary"
      onMouseEnter={() => {
        setDismissed(false);
        setHovered(true);
      }}
      onMouseLeave={() => setHovered(false)}
    >
      <button
        type="button"
        className="glossary-term"
        aria-describedby={open ? id : undefined}
        onFocus={() => {
          setDismissed(false);
          setFocused(true);
        }}
        onBlur={() => setFocused(false)}
      >
        {label}
      </button>
      {open ? (
        <span role="tooltip" id={id} className="glossary-tip">
          {t(`glossary.terms.${term}.definition`)}
        </span>
      ) : null}
    </span>
  );
}
