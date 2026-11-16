import { useRef, useState, type ChangeEvent, type DragEvent, type KeyboardEvent } from 'react';
import './FileDropzone.css';

interface FileDropzoneProps {
  inputId: string;
  inputLabel: string;
  prompt: string;
  hint: string;
  hintId: string;
  accept: string;
  disabled?: boolean;
  selectedLabel?: string;
  inputRef?: React.RefObject<HTMLInputElement | null>;
  onSelect: (file: File | null) => void;
}

/** Accessible drag-and-drop and keyboard-operable file picker. */
export function FileDropzone({
  inputId,
  inputLabel,
  prompt,
  hint,
  hintId,
  accept,
  disabled = false,
  selectedLabel,
  inputRef,
  onSelect,
}: FileDropzoneProps) {
  const internalRef = useRef<HTMLInputElement | null>(null);
  const resolvedRef = inputRef ?? internalRef;
  const [dragging, setDragging] = useState(false);

  const openPicker = () => {
    if (!disabled) resolvedRef.current?.click();
  };

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      openPicker();
    }
  };

  const onDragOver = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    if (!disabled) setDragging(true);
  };

  const onDragLeave = () => setDragging(false);

  const onDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragging(false);
    if (disabled) return;
    const dropped = event.dataTransfer.files?.[0] ?? null;
    if (dropped) onSelect(dropped);
  };

  const onChange = (event: ChangeEvent<HTMLInputElement>) => {
    onSelect(event.target.files?.[0] ?? null);
  };

  return (
    <div className="dropzone-wrap">
      <div
        role="button"
        tabIndex={disabled ? -1 : 0}
        aria-label={prompt}
        aria-describedby={hintId}
        aria-disabled={disabled || undefined}
        className={`dropzone ${dragging ? 'dropzone--active' : ''}`}
        onClick={openPicker}
        onKeyDown={onKeyDown}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
      >
        <span className="dropzone-prompt">{prompt}</span>
        {selectedLabel ? <span className="dropzone-selected">{selectedLabel}</span> : null}
        <span id={hintId} className="dropzone-hint">
          {hint}
        </span>
      </div>
      <label htmlFor={inputId} className="sr-only">
        {inputLabel}
      </label>
      <input
        ref={resolvedRef}
        id={inputId}
        type="file"
        accept={accept}
        aria-describedby={hintId}
        className="sr-only"
        disabled={disabled}
        onChange={onChange}
      />
    </div>
  );
}
