import { useCallback, useEffect, useRef, useState } from 'react';
import { createUpload } from '../../../services/api';
import { useApi } from '../../../services/ApiContext';
import type { UploadResult } from '../../../services/types';
import { ACCEPTED_EXTENSIONS, MAX_FILE_BYTES } from '../domain/schema';
import { validateCsvText, validateGeoJsonText, type ValidationReport } from '../domain/validate';
import { uploadErrorView, type UploadErrorView } from './uploadErrors';

export type Stage = 'template' | 'choose' | 'review' | 'sending' | 'result';
export type FileProblem =
  { kind: 'type' | 'empty' | 'encoding' | 'read' } | { kind: 'size'; bytes: number };

const hasAcceptedExtension = (name: string) =>
  ACCEPTED_EXTENSIONS.some((extension) => name.toLowerCase().endsWith(extension));

const newKey = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `upload-${Date.now()}`;

/**
 * State machine of the upload wizard. Client checks only help the user; the server answer
 * (`result`) is what the summary reports.
 */
export function useUploadWizard(farmId: string) {
  const { client } = useApi();
  const [stage, setStage] = useState<Stage>('template');
  const [file, setFile] = useState<File | null>(null);
  const [report, setReport] = useState<ValidationReport | null>(null);
  const [problem, setProblem] = useState<FileProblem | null>(null);
  const [reading, setReading] = useState(false);
  const [result, setResult] = useState<UploadResult | null>(null);
  const [sendError, setSendError] = useState<UploadErrorView | null>(null);
  const idempotencyKey = useRef(newKey());
  const run = useRef(0);
  const controller = useRef<AbortController | null>(null);

  useEffect(() => () => controller.current?.abort(), []);

  const goToChoose = useCallback(() => setStage('choose'), []);
  const goToTemplate = useCallback(() => setStage('template'), []);

  const chooseFile = useCallback(async (next: File) => {
    run.current += 1;
    const current = run.current;
    setFile(null);
    setReport(null);
    setProblem(null);
    setSendError(null);
    if (!hasAcceptedExtension(next.name)) return setProblem({ kind: 'type' });
    if (next.size === 0) return setProblem({ kind: 'empty' });
    if (next.size > MAX_FILE_BYTES) return setProblem({ kind: 'size', bytes: next.size });

    setReading(true);
    try {
      const bytes = await next.arrayBuffer();
      if (current !== run.current) return;
      let text: string;
      try {
        text = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
      } catch {
        return setProblem({ kind: 'encoding' });
      }
      const isCsv = next.name.toLowerCase().endsWith('.csv');
      const parsed = isCsv ? validateCsvText(text) : validateGeoJsonText(text);
      idempotencyKey.current = newKey();
      setFile(next);
      setReport(parsed);
      if (!parsed.fatal) setStage('review');
    } catch {
      if (current === run.current) setProblem({ kind: 'read' });
    } finally {
      if (current === run.current) setReading(false);
    }
  }, []);

  const send = useCallback(async () => {
    if (!file) return;
    controller.current?.abort();
    const abort = new AbortController();
    controller.current = abort;
    setSendError(null);
    setStage('sending');
    try {
      const upload = await createUpload(client, farmId, file, {
        idempotencyKey: idempotencyKey.current,
        signal: abort.signal,
      });
      if (abort.signal.aborted) return;
      setResult(upload);
      setStage('result');
    } catch (error) {
      if (abort.signal.aborted) return;
      setSendError(uploadErrorView(error));
      setStage('review');
    }
  }, [client, farmId, file]);

  const reset = useCallback(() => {
    run.current += 1;
    setFile(null);
    setReport(null);
    setProblem(null);
    setResult(null);
    setSendError(null);
    setReading(false);
    setStage('choose');
  }, []);

  return {
    stage,
    file,
    report,
    problem,
    reading,
    result,
    sendError,
    goToChoose,
    goToTemplate,
    chooseFile,
    send,
    reset,
  };
}
