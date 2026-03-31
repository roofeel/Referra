import { useEffect, useId, useMemo, useState, type ChangeEvent } from 'react';
import type { CreateReportTaskPayload } from '../../service/reports';
import {
  ATTRIBUTION_ALIAS_CONFIG,
  ATTRIBUTION_MODE_OPTIONS,
  getReportTypeLabel,
  CANONICAL_FIELD_ALIASES,
  REQUIRED_CANONICAL_FIELDS,
  type AttributionLogicMapping,
  type AttributionMode,
  type CanonicalAttributionField,
} from './attributionConfig';

type UploadDataDrawerProps = {
  isOpen: boolean;
  clients: string[];
  rules: Array<{ id: string; name: string }>;
  onClose: () => void;
  onSubmit: (payload: CreateReportTaskPayload) => Promise<void>;
};

type FieldMappingState = Record<AttributionMode, Partial<AttributionLogicMapping>>;

function normalizeHeaderKey(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, '_')
    .replace(/[^a-z0-9_]/g, '')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '');
}

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

function autoMatchRequiredFields(
  requiredFields: CanonicalAttributionField[],
  headers: string[],
  previous: Partial<AttributionLogicMapping>,
) {
  const normalizedToHeader = new Map<string, string>();
  headers.forEach((header) => {
    const key = normalizeHeaderKey(header);
    if (key && !normalizedToHeader.has(key)) {
      normalizedToHeader.set(key, header);
    }
  });

  const next: Partial<AttributionLogicMapping> = {};
  const usedHeaders = new Set<string>();

  requiredFields.forEach((field) => {
    const previousHeader = previous[field];
    if (previousHeader && headers.includes(previousHeader) && !usedHeaders.has(previousHeader)) {
      next[field] = previousHeader;
      usedHeaders.add(previousHeader);
      return;
    }

    const aliases = [field, ...(CANONICAL_FIELD_ALIASES[field] || [])];
    let matchedHeader = '';
    for (const alias of aliases) {
      const candidate = normalizedToHeader.get(normalizeHeaderKey(alias));
      if (candidate && !usedHeaders.has(candidate)) {
        matchedHeader = candidate;
        break;
      }
    }

    if (!matchedHeader) {
      const normalizedField = normalizeHeaderKey(field);
      const fallback = headers.find((header) => {
        if (usedHeaders.has(header)) return false;
        const normalizedHeader = normalizeHeaderKey(header);
        return normalizedHeader.includes(normalizedField) || normalizedField.includes(normalizedHeader);
      });
      matchedHeader = fallback || '';
    }

    if (matchedHeader) {
      next[field] = matchedHeader;
      usedHeaders.add(matchedHeader);
    }
  });

  return next;
}

export function UploadDataDrawer({ isOpen, clients, rules, onClose, onSubmit }: UploadDataDrawerProps) {
  const taskNameId = useId();
  const clientId = useId();
  const versionId = useId();
  const fileInputId = useId();
  const [taskName, setTaskName] = useState('');
  const [selectedClient, setSelectedClient] = useState('');
  const [selectedRuleId, setSelectedRuleId] = useState('');
  const [attributionLogic, setAttributionLogic] = useState<AttributionMode>('registration');
  const [selectedFileName, setSelectedFileName] = useState('');
  const [selectedFileContent, setSelectedFileContent] = useState('');
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [fileParseError, setFileParseError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fieldMappings, setFieldMappings] = useState<FieldMappingState>({
    registration: {},
    pageload: {},
  });

  const clientOptions = useMemo(() => clients, [clients]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    setSelectedClient((prev) => {
      if (prev && clientOptions.includes(prev)) {
        return prev;
      }
      return clientOptions[0] || '';
    });
  }, [clientOptions, isOpen]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    setSelectedRuleId((prev) => {
      if (prev && rules.some((rule) => rule.id === prev)) {
        return prev;
      }
      return rules[0]?.id || '';
    });
  }, [isOpen, rules]);

  useEffect(() => {
    setFieldMappings((prev) => ({
      registration: autoMatchRequiredFields(REQUIRED_CANONICAL_FIELDS, csvHeaders, prev.registration),
      pageload: autoMatchRequiredFields(REQUIRED_CANONICAL_FIELDS, csvHeaders, prev.pageload),
    }));
  }, [csvHeaders]);

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

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    setSelectedFileName(file.name);
    setFileParseError(null);

    try {
      const raw = await file.text();
      setSelectedFileContent(raw);
      const parsedHeaders = parseCsvHeaders(raw);
      if (parsedHeaders.length === 0) {
        setCsvHeaders([]);
        setFileParseError('无法读取 CSV 表头，请检查文件格式。');
        return;
      }

      setCsvHeaders(parsedHeaders);
    } catch {
      setSelectedFileContent('');
      setCsvHeaders([]);
      setFileParseError('CSV 读取失败，请重新上传。');
    }
  }

  function handleMappingChange(field: CanonicalAttributionField, header: string) {
    setFieldMappings((prev) => ({
      ...prev,
      [attributionLogic]: {
        ...prev[attributionLogic],
        [field]: header || undefined,
      },
    }));
  }

  async function handleStartAnalysis() {
    if (!isFormComplete || isSubmitting) return;

    try {
      setSubmitError(null);
      setIsSubmitting(true);

      const payload: CreateReportTaskPayload = {
        taskName: taskName.trim(),
        client: selectedClient,
        reportType: attributionLogic,
        attributionLogic: {
          event_url: currentMappings.event_url || '',
          event_time: currentMappings.event_time || '',
          source_url: currentMappings.source_url || '',
          source_time: currentMappings.source_time || '',
        },
        fieldMappings: requiredFields.reduce<Record<string, string>>((acc, field) => {
          const mappedHeader = currentMappings[field];
          if (mappedHeader) {
            acc[field] = mappedHeader;
          }
          return acc;
        }, {}),
        fileName: selectedFileName,
        fileContent: selectedFileContent,
        ruleId: selectedRuleId,
      };

      await onSubmit(payload);
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : '创建分析任务失败，请稍后重试。');
    } finally {
      setIsSubmitting(false);
    }
  }

  const mappingRows = ATTRIBUTION_ALIAS_CONFIG[attributionLogic];
  const requiredFields = mappingRows.map((item) => item.canonical);
  const currentMappings = fieldMappings[attributionLogic];
  const mappingValues = Object.values(currentMappings).filter((value): value is string => Boolean(value));
  const mappedCount = mappingRows.filter((field) => Boolean(currentMappings[field.canonical])).length;
  const isFormComplete =
    Boolean(selectedClient) &&
    Boolean(taskName.trim()) &&
    Boolean(selectedRuleId) &&
    Boolean(selectedFileName) &&
    Boolean(selectedFileContent) &&
    mappingRows.every((field) => Boolean(currentMappings[field.canonical]));

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
        aria-labelledby="upload-data-title"
        aria-hidden={!isOpen}
        className={`fixed inset-y-0 right-0 z-50 w-full max-w-[1120px] border-l border-slate-200 bg-slate-50 shadow-2xl transition-transform duration-300 ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="flex h-full flex-col overflow-hidden">
          <div className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-5">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Reports</p>
              <h2 id="upload-data-title" className="text-xl font-extrabold tracking-tight text-slate-900">
                Upload Data
              </h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-full transition-colors hover:bg-slate-100"
              aria-label="Close upload data drawer"
            >
              <span className="material-symbols-outlined text-slate-500">close</span>
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-6 md:p-8">
            <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
              <div className="space-y-6 xl:col-span-8">
                <section className="rounded-xl border border-slate-200/70 bg-white p-6">
                  <div className="mb-5 flex items-center gap-3">
                    <span className="flex h-7 w-7 items-center justify-center rounded bg-slate-900 text-xs font-bold text-white">
                      01
                    </span>
                    <h3 className="text-base font-extrabold tracking-tight text-slate-900">Task Information</h3>
                  </div>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <label htmlFor={clientId} className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                      Client
                      <select
                        id={clientId}
                        value={selectedClient}
                        onChange={(event) => setSelectedClient(event.target.value)}
                        disabled={clientOptions.length === 0}
                        className="mt-1 h-10 w-full rounded-lg border-none bg-slate-100 px-3 text-sm text-slate-800 outline-none focus:ring-2 focus:ring-blue-100"
                      >
                        {clientOptions.length === 0 ? (
                          <option value="">No clients available</option>
                        ) : (
                          clientOptions.map((client) => (
                            <option key={client} value={client}>
                              {client}
                            </option>
                          ))
                        )}
                      </select>
                    </label>

                    <label htmlFor={taskNameId} className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                      Analysis Task Name
                      <input
                        id={taskNameId}
                        type="text"
                        value={taskName}
                        onChange={(event) => setTaskName(event.target.value)}
                        placeholder="e.g. Q4 Conversion Audit"
                        className="mt-1 h-10 w-full rounded-lg border-none bg-slate-100 px-3 text-sm text-slate-800 outline-none focus:ring-2 focus:ring-blue-100"
                      />
                    </label>

                    <label
                      htmlFor={versionId}
                      className="text-[10px] font-bold uppercase tracking-wider text-slate-500 sm:col-span-2"
                    >
                      Rule Name
                      <select
                        id={versionId}
                        value={selectedRuleId}
                        onChange={(event) => setSelectedRuleId(event.target.value)}
                        disabled={rules.length === 0}
                        className="mt-1 h-10 w-full rounded-lg border-none bg-slate-100 px-3 text-sm text-slate-800 outline-none focus:ring-2 focus:ring-blue-100"
                      >
                        {rules.length === 0 ? (
                          <option value="">No rules available</option>
                        ) : (
                          rules.map((rule) => (
                            <option key={rule.id} value={rule.id}>
                              {rule.name}
                            </option>
                          ))
                        )}
                      </select>
                    </label>

                    <div className="space-y-2 sm:col-span-2">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Attribution Logic</p>
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        {ATTRIBUTION_MODE_OPTIONS.map((option) => (
                          <label
                            key={option.mode}
                            className="flex cursor-pointer items-start gap-3 rounded-lg bg-slate-100 p-3 transition-colors hover:bg-blue-50"
                          >
                            <input
                              type="radio"
                              name="attribution_logic"
                              checked={attributionLogic === option.mode}
                              onChange={() => setAttributionLogic(option.mode)}
                              className="mt-1"
                            />
                            <span>
                              <span className="block text-sm font-bold text-slate-900">{option.label}</span>
                              <span className="text-[11px] text-slate-500">{option.description}</span>
                            </span>
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>
                </section>

                <section className="rounded-xl border border-slate-200/70 bg-white p-6">
                  <div className="mb-5 flex items-center gap-3">
                    <span className="flex h-7 w-7 items-center justify-center rounded bg-slate-900 text-xs font-bold text-white">
                      02
                    </span>
                    <h3 className="text-base font-extrabold tracking-tight text-slate-900">Data Source</h3>
                  </div>

                  <label
                    htmlFor={fileInputId}
                    className="flex min-h-48 cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center transition-colors hover:border-blue-300 hover:bg-blue-50/50"
                  >
                    <span className="material-symbols-outlined mb-3 text-4xl text-slate-400">upload_file</span>
                    <p className="text-sm font-bold text-slate-900">Drag and drop file ledger</p>
                    <p className="mt-1 text-[11px] uppercase tracking-wide text-slate-500">CSV, JSON, OR Parquet (Max 500MB)</p>
                    {selectedFileName ? <p className="mt-3 text-xs font-semibold text-blue-700">{selectedFileName}</p> : null}
                  </label>
                  <input
                    id={fileInputId}
                    type="file"
                    accept=".csv,text/csv"
                    onChange={handleFileChange}
                    aria-label="Upload CSV file"
                    className="hidden"
                  />
                  {csvHeaders.length > 0 ? (
                    <p className="mt-3 text-xs text-slate-500">Detected {csvHeaders.length} CSV headers</p>
                  ) : null}
                  {fileParseError ? <p className="mt-3 text-xs font-semibold text-red-600">{fileParseError}</p> : null}
                </section>
              </div>

              <div className="space-y-6 xl:col-span-4">
                <section className="overflow-hidden rounded-xl bg-slate-900 p-5 text-white shadow-xl">
                  <h3 className="mb-4 flex items-center gap-2 text-[11px] font-black uppercase tracking-widest text-blue-300">
                    <span className="material-symbols-outlined text-base">link</span>
                    Field Mapping Preview
                  </h3>
                  <p className="mb-3 text-xs text-slate-300">
                    Required fields for{' '}
                    <span className="font-semibold text-white">{getReportTypeLabel(attributionLogic)}</span>
                  </p>
                  <div className="mb-3 flex items-center justify-between rounded border border-white/10 bg-white/5 px-3 py-2">
                    <span className="text-xs text-slate-300">Mapped</span>
                    <span className="text-xs font-bold text-blue-100">{mappedCount}/{mappingRows.length}</span>
                  </div>
                  <div className="space-y-3">
                    {mappingRows.map(({ alias, canonical }) => {
                      const selectedHeader = currentMappings[canonical] || '';

                      return (
                        <div
                          key={alias}
                          className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 rounded border border-white/10 bg-white/5 px-3 py-2"
                        >
                          <div>
                            <p className="text-[10px] uppercase text-slate-400">CSV Header</p>
                            <select
                              value={selectedHeader}
                              onChange={(event) => handleMappingChange(canonical, event.target.value)}
                              aria-label={`Map ${alias}`}
                              className="mt-1 w-full rounded border border-white/15 bg-slate-950/30 px-2 py-1 font-mono text-xs text-white outline-none focus:ring-2 focus:ring-blue-300"
                              disabled={csvHeaders.length === 0}
                            >
                              <option value="">Select header</option>
                              {csvHeaders.map((header) => {
                                const headerUsedByOtherField = mappingValues.includes(header) && selectedHeader !== header;
                                return (
                                  <option key={`${canonical}-${header}`} value={header} disabled={headerUsedByOtherField}>
                                    {header}
                                  </option>
                                );
                              })}
                            </select>
                          </div>
                          <span className="material-symbols-outlined text-blue-300">arrow_forward</span>
                          <div className="text-right">
                            <p className="text-[10px] uppercase text-slate-400">Alias</p>
                            <p className="text-sm font-bold text-blue-100">{alias}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  {csvHeaders.length === 0 ? (
                    <p className="mt-3 text-xs text-amber-200">Upload CSV first to extract headers and auto-match fields.</p>
                  ) : null}
                </section>

                <section className="rounded-xl border border-slate-200/70 bg-white p-5">
                  <button
                    type="button"
                    disabled={!isFormComplete || isSubmitting}
                    onClick={handleStartAnalysis}
                    className="flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-br from-blue-700 to-blue-600 py-3 text-sm font-bold text-white shadow-lg transition-all hover:scale-[1.01] active:scale-100 disabled:cursor-not-allowed disabled:from-slate-300 disabled:to-slate-300 disabled:text-slate-500 disabled:shadow-none disabled:hover:scale-100"
                  >
                    <span className="material-symbols-outlined text-base">rocket_launch</span>
                    {isSubmitting ? 'Starting...' : 'Start Analysis'}
                  </button>
                  {submitError ? <p className="mt-3 text-xs font-semibold text-red-600">{submitError}</p> : null}
                </section>
              </div>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
