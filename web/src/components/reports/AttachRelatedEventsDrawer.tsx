import { useEffect, useId, useMemo, useState, type ChangeEvent } from 'react';
import type { AttachRelatedEventsPayload } from '../../service/reports';

type AttachRelatedEventsDrawerProps = {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (payload: AttachRelatedEventsPayload) => Promise<void>;
  uidDownloadHref?: string;
};

function parseCsvHeaders(csvText: string): string[] {
  const lines = csvText.replace(/^\uFEFF/, '').split(/\r?\n/);
  const firstLine = lines.find((line) => line.trim().length > 0) || '';
  if (!firstLine) return [];

  const headers: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let index = 0; index < firstLine.length; index += 1) {
    const char = firstLine[index];
    const nextChar = firstLine[index + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        current += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === ',' && !inQuotes) {
      headers.push(current.trim());
      current = '';
      continue;
    }

    current += char;
  }

  headers.push(current.trim());
  return headers.filter(Boolean);
}

export function AttachRelatedEventsDrawer({ isOpen, onClose, onSubmit, uidDownloadHref }: AttachRelatedEventsDrawerProps) {
  const fileInputId = useId();
  const idFieldId = useId();
  const timeFieldId = useId();
  const eventFieldId = useId();
  const eventUrlFieldId = useId();

  const [selectedFileName, setSelectedFileName] = useState('');
  const [selectedFileContent, setSelectedFileContent] = useState('');
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [idField, setIdField] = useState('');
  const [timeField, setTimeField] = useState('');
  const [eventField, setEventField] = useState('');
  const [eventUrlField, setEventUrlField] = useState('');
  const [fileParseError, setFileParseError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    function handleEsc(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        onClose();
      }
    }

    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isOpen, onClose]);

  useEffect(() => {
    setIdField((prev) => (prev && csvHeaders.includes(prev) ? prev : csvHeaders[0] || ''));
    setTimeField((prev) => (prev && csvHeaders.includes(prev) ? prev : csvHeaders[1] || csvHeaders[0] || ''));
    setEventField((prev) => (prev && csvHeaders.includes(prev) ? prev : csvHeaders[2] || csvHeaders[0] || ''));
    setEventUrlField((prev) => (prev && csvHeaders.includes(prev) ? prev : csvHeaders[3] || csvHeaders[2] || csvHeaders[0] || ''));
  }, [csvHeaders]);

  const isFormComplete = useMemo(
    () => Boolean(selectedFileContent) && Boolean(idField) && Boolean(timeField) && Boolean(eventUrlField),
    [eventUrlField, idField, selectedFileContent, timeField],
  );

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    setFileParseError(null);
    setSubmitError(null);
    setSelectedFileName(file.name);

    try {
      const raw = await file.text();
      setSelectedFileContent(raw);
      const headers = parseCsvHeaders(raw);
      if (headers.length === 0) {
        setCsvHeaders([]);
        setFileParseError('无法读取 CSV 表头，请检查文件格式。');
        return;
      }

      setCsvHeaders(headers);
    } catch {
      setSelectedFileContent('');
      setCsvHeaders([]);
      setFileParseError('CSV 读取失败，请重新上传。');
    }
  }

  async function handleSubmit() {
    if (!isFormComplete || isSubmitting) return;

    try {
      setSubmitError(null);
      setIsSubmitting(true);
      await onSubmit({
        fileContent: selectedFileContent,
        idField,
        timeField,
        eventField,
        eventUrlField,
      });
      setSelectedFileName('');
      setSelectedFileContent('');
      setCsvHeaders([]);
      setIdField('');
      setTimeField('');
      setEventField('');
      setEventUrlField('');
      onClose();
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'Attach related events failed');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <>
      <div
        className={`fixed inset-0 z-40 bg-slate-900/30 backdrop-blur-[1px] transition-opacity duration-200 ${
          isOpen ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0'
        }`}
        onClick={onClose}
        aria-hidden={!isOpen}
      />

      <aside
        role="dialog"
        aria-modal="true"
        aria-labelledby="attach-related-events-title"
        aria-hidden={!isOpen}
        className={`fixed inset-y-0 right-0 z-50 w-full max-w-[740px] border-l border-slate-200 bg-slate-50 shadow-2xl transition-transform duration-300 ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="flex h-full flex-col overflow-hidden">
          <div className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-5">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Report Detail</p>
              <h2 id="attach-related-events-title" className="text-xl font-extrabold tracking-tight text-slate-900">
                Attach Related Events
              </h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-full transition-colors hover:bg-slate-100"
              aria-label="Close attach related events drawer"
            >
              <span className="material-symbols-outlined text-slate-500">close</span>
            </button>
          </div>

          <div className="flex-1 overflow-y-auto">
            <section className="border border-slate-200/70 bg-white p-6">
              <h3 className="text-sm font-bold text-slate-900">Upload Related Events CSV</h3>
              <p className="mt-1 text-xs text-slate-500">
                Find other events with the same UID as attributed events, then upload them as CSV.
              </p>
              {uidDownloadHref ? (
                <p className="mt-2 text-xs text-slate-600">
                  <a
                    href={uidDownloadHref}
                    className="font-semibold text-blue-700 underline decoration-blue-300 underline-offset-2 hover:text-blue-800"
                  >
                    Download attributed UIDs (CSV)
                  </a>
                </p>
              ) : null}

              <label
                htmlFor={fileInputId}
                className="mt-4 flex min-h-36 cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-center transition-colors hover:border-blue-300 hover:bg-blue-50/50"
              >
                <span className="material-symbols-outlined mb-2 text-3xl text-slate-400">upload_file</span>
                <p className="text-sm font-semibold text-slate-900">Choose CSV file</p>
                {selectedFileName ? <p className="mt-2 text-xs font-semibold text-blue-700">{selectedFileName}</p> : null}
              </label>
              <input
                id={fileInputId}
                type="file"
                accept=".csv,text/csv"
                onChange={handleFileChange}
                aria-label="Upload related events CSV"
                className="hidden"
              />
              {csvHeaders.length > 0 ? <p className="mt-2 text-xs text-slate-500">Detected {csvHeaders.length} CSV headers</p> : null}
              {fileParseError ? <p className="mt-2 text-xs font-semibold text-red-600">{fileParseError}</p> : null}
            </section>

            <section className="border border-slate-200/70 bg-white p-6">
              <h3 className="text-sm font-bold text-slate-900">Field Mapping</h3>
              <div className="mt-4 grid grid-cols-1 gap-4">
                <label htmlFor={idFieldId} className="text-xs font-semibold text-slate-600">
                  ID Field
                  <select
                    id={idFieldId}
                    value={idField}
                    onChange={(event) => setIdField(event.target.value)}
                    className="mt-1 h-10 w-full rounded-lg border-none bg-slate-100 px-3 text-sm text-slate-800 outline-none focus:ring-2 focus:ring-blue-100"
                    disabled={csvHeaders.length === 0}
                  >
                    <option value="">Select header</option>
                    {csvHeaders.map((header) => (
                      <option key={`id-${header}`} value={header}>
                        {header}
                      </option>
                    ))}
                  </select>
                </label>

                <label htmlFor={timeFieldId} className="text-xs font-semibold text-slate-600">
                  Event Time Field
                  <select
                    id={timeFieldId}
                    value={timeField}
                    onChange={(event) => setTimeField(event.target.value)}
                    className="mt-1 h-10 w-full rounded-lg border-none bg-slate-100 px-3 text-sm text-slate-800 outline-none focus:ring-2 focus:ring-blue-100"
                    disabled={csvHeaders.length === 0}
                  >
                    <option value="">Select header</option>
                    {csvHeaders.map((header) => (
                      <option key={`time-${header}`} value={header}>
                        {header}
                      </option>
                    ))}
                  </select>
                </label>

                <label htmlFor={eventFieldId} className="text-xs font-semibold text-slate-600">
                  Event Field (Optional)
                  <select
                    id={eventFieldId}
                    value={eventField}
                    onChange={(event) => setEventField(event.target.value)}
                    className="mt-1 h-10 w-full rounded-lg border-none bg-slate-100 px-3 text-sm text-slate-800 outline-none focus:ring-2 focus:ring-blue-100"
                    disabled={csvHeaders.length === 0}
                  >
                    <option value="">Select header</option>
                    {csvHeaders.map((header) => (
                      <option key={`event-${header}`} value={header}>
                        {header}
                      </option>
                    ))}
                  </select>
                </label>

                <label htmlFor={eventUrlFieldId} className="text-xs font-semibold text-slate-600">
                  event_url Field
                  <select
                    id={eventUrlFieldId}
                    value={eventUrlField}
                    onChange={(event) => setEventUrlField(event.target.value)}
                    className="mt-1 h-10 w-full rounded-lg border-none bg-slate-100 px-3 text-sm text-slate-800 outline-none focus:ring-2 focus:ring-blue-100"
                    disabled={csvHeaders.length === 0}
                  >
                    <option value="">Select header</option>
                    {csvHeaders.map((header) => (
                      <option key={`event-url-${header}`} value={header}>
                        {header}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            </section>

            <section className="border border-slate-200/70 bg-white p-5">
              <button
                type="button"
                disabled={!isFormComplete || isSubmitting}
                onClick={handleSubmit}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-br from-blue-700 to-blue-600 py-3 text-sm font-bold text-white shadow-lg transition-all hover:scale-[1.01] active:scale-100 disabled:cursor-not-allowed disabled:from-slate-300 disabled:to-slate-300 disabled:text-slate-500 disabled:shadow-none disabled:hover:scale-100"
              >
                <span className="material-symbols-outlined text-base">link</span>
                {isSubmitting ? 'Attaching...' : 'Attach Related Events'}
              </button>
              {submitError ? <p className="mt-3 text-xs font-semibold text-red-600">{submitError}</p> : null}
            </section>
          </div>
        </div>
      </aside>
    </>
  );
}
