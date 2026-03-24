import { useEffect, useId, useMemo, useState, type ChangeEvent } from 'react';

type UploadDataDrawerProps = {
  isOpen: boolean;
  clients: string[];
  onClose: () => void;
};

type AttributionLogic = 'registration' | 'pageload';
type RequiredField =
  | 'impression_url'
  | 'registration_url'
  | 'impression_time'
  | 'registration_time'
  | 'page_load_url'
  | 'page_load_time';

const URL_PARSING_VERSIONS = ['Current (v2.4.1)', 'Legacy (v1.9.8)', 'Experimental (v3.0.0-beta)'];
const REQUIRED_FIELDS_BY_LOGIC: Record<AttributionLogic, RequiredField[]> = {
  registration: ['impression_url', 'registration_url', 'impression_time', 'registration_time'],
  pageload: ['impression_url', 'page_load_url', 'impression_time', 'page_load_time'],
};

const FIELD_ALIASES: Record<RequiredField, string[]> = {
  impression_url: ['impression_url', 'impressionurl', 'imp_url'],
  registration_url: ['registration_url', 'registrationurl', 'register_url', 'reg_url'],
  impression_time: ['impression_time', 'impressiontime', 'imp_time', 'impression_timestamp', 'impression_ts'],
  registration_time: ['registration_time', 'registrationtime', 'reg_time', 'registration_timestamp', 'registration_ts'],
  page_load_url: ['page_load_url', 'pageload_url', 'page_loadurl', 'pageloadurl'],
  page_load_time: ['page_load_time', 'pageload_time', 'page_loadtime', 'pageloadtime', 'page_load_timestamp', 'page_load_ts'],
};

type FieldMappingState = Record<AttributionLogic, Partial<Record<RequiredField, string>>>;

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
  requiredFields: RequiredField[],
  headers: string[],
  previous: Partial<Record<RequiredField, string>>,
) {
  const normalizedToHeader = new Map<string, string>();
  headers.forEach((header) => {
    const key = normalizeHeaderKey(header);
    if (key && !normalizedToHeader.has(key)) {
      normalizedToHeader.set(key, header);
    }
  });

  const next: Partial<Record<RequiredField, string>> = {};
  const usedHeaders = new Set<string>();

  requiredFields.forEach((field) => {
    const previousHeader = previous[field];
    if (previousHeader && headers.includes(previousHeader) && !usedHeaders.has(previousHeader)) {
      next[field] = previousHeader;
      usedHeaders.add(previousHeader);
      return;
    }

    const aliases = [field, ...FIELD_ALIASES[field]];
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

export function UploadDataDrawer({ isOpen, clients, onClose }: UploadDataDrawerProps) {
  const taskNameId = useId();
  const clientId = useId();
  const versionId = useId();
  const fileInputId = useId();
  const [taskName, setTaskName] = useState('');
  const [selectedClient, setSelectedClient] = useState('');
  const [urlParsingVersion, setUrlParsingVersion] = useState(URL_PARSING_VERSIONS[0]);
  const [attributionLogic, setAttributionLogic] = useState<AttributionLogic>('registration');
  const [selectedFileName, setSelectedFileName] = useState('');
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [fileParseError, setFileParseError] = useState<string | null>(null);
  const [fieldMappings, setFieldMappings] = useState<FieldMappingState>({
    registration: {},
    pageload: {},
  });

  const clientOptions = useMemo(() => {
    if (clients.length > 0) {
      return clients;
    }

    return ['Global Logistics Corp', 'Aetheria Financial', 'Veridian Energy'];
  }, [clients]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    setSelectedClient((prev) => prev || clientOptions[0] || '');
  }, [clientOptions, isOpen]);

  useEffect(() => {
    setFieldMappings((prev) => ({
      registration: autoMatchRequiredFields(REQUIRED_FIELDS_BY_LOGIC.registration, csvHeaders, prev.registration),
      pageload: autoMatchRequiredFields(REQUIRED_FIELDS_BY_LOGIC.pageload, csvHeaders, prev.pageload),
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
      const parsedHeaders = parseCsvHeaders(raw);
      if (parsedHeaders.length === 0) {
        setCsvHeaders([]);
        setFileParseError('无法读取 CSV 表头，请检查文件格式。');
        return;
      }

      setCsvHeaders(parsedHeaders);
    } catch {
      setCsvHeaders([]);
      setFileParseError('CSV 读取失败，请重新上传。');
    }
  }

  function handleMappingChange(field: RequiredField, header: string) {
    setFieldMappings((prev) => ({
      ...prev,
      [attributionLogic]: {
        ...prev[attributionLogic],
        [field]: header || undefined,
      },
    }));
  }

  const requiredFields = REQUIRED_FIELDS_BY_LOGIC[attributionLogic];
  const currentMappings = fieldMappings[attributionLogic];
  const mappingValues = Object.values(currentMappings).filter((value): value is string => Boolean(value));
  const mappedCount = requiredFields.filter((field) => Boolean(currentMappings[field])).length;
  const isFormComplete =
    Boolean(selectedClient) &&
    Boolean(taskName.trim()) &&
    Boolean(selectedFileName) &&
    requiredFields.every((field) => Boolean(currentMappings[field]));

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
                      Client Selection
                      <select
                        id={clientId}
                        value={selectedClient}
                        onChange={(event) => setSelectedClient(event.target.value)}
                        className="mt-1 h-10 w-full rounded-lg border-none bg-slate-100 px-3 text-sm text-slate-800 outline-none focus:ring-2 focus:ring-blue-100"
                      >
                        {clientOptions.map((client) => (
                          <option key={client} value={client}>
                            {client}
                          </option>
                        ))}
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
                      URL Parsing Version
                      <select
                        id={versionId}
                        value={urlParsingVersion}
                        onChange={(event) => setUrlParsingVersion(event.target.value)}
                        className="mt-1 h-10 w-full rounded-lg border-none bg-slate-100 px-3 text-sm text-slate-800 outline-none focus:ring-2 focus:ring-blue-100"
                      >
                        {URL_PARSING_VERSIONS.map((version) => (
                          <option key={version} value={version}>
                            {version}
                          </option>
                        ))}
                      </select>
                    </label>

                    <div className="space-y-2 sm:col-span-2">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Attribution Logic</p>
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <label className="flex cursor-pointer items-start gap-3 rounded-lg bg-slate-100 p-3 transition-colors hover:bg-blue-50">
                          <input
                            type="radio"
                            name="attribution_logic"
                            checked={attributionLogic === 'registration'}
                            onChange={() => setAttributionLogic('registration')}
                            className="mt-1"
                          />
                          <span>
                            <span className="block text-sm font-bold text-slate-900">Impression → Registration</span>
                            <span className="text-[11px] text-slate-500">Maps first touch to user creation event</span>
                          </span>
                        </label>
                        <label className="flex cursor-pointer items-start gap-3 rounded-lg bg-slate-100 p-3 transition-colors hover:bg-blue-50">
                          <input
                            type="radio"
                            name="attribution_logic"
                            checked={attributionLogic === 'pageload'}
                            onChange={() => setAttributionLogic('pageload')}
                            className="mt-1"
                          />
                          <span>
                            <span className="block text-sm font-bold text-slate-900">Impression → Earliest Pageload</span>
                            <span className="text-[11px] text-slate-500">Links view to first verified URL hit</span>
                          </span>
                        </label>
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
                    <span className="font-semibold text-white">
                      {attributionLogic === 'registration'
                        ? 'Impression → Registration'
                        : 'Impression → Earliest Pageload'}
                    </span>
                  </p>
                  <div className="mb-3 flex items-center justify-between rounded border border-white/10 bg-white/5 px-3 py-2">
                    <span className="text-xs text-slate-300">Mapped</span>
                    <span className="text-xs font-bold text-blue-100">
                      {mappedCount}/{requiredFields.length}
                    </span>
                  </div>
                  <div className="space-y-3">
                    {requiredFields.map((field) => {
                      const selectedHeader = currentMappings[field] || '';

                      return (
                        <div
                          key={field}
                          className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 rounded border border-white/10 bg-white/5 px-3 py-2"
                        >
                          <div>
                            <p className="text-[10px] uppercase text-slate-400">CSV Header</p>
                            <select
                              value={selectedHeader}
                              onChange={(event) => handleMappingChange(field, event.target.value)}
                              aria-label={`Map ${field}`}
                              className="mt-1 w-full rounded border border-white/15 bg-slate-950/30 px-2 py-1 font-mono text-xs text-white outline-none focus:ring-2 focus:ring-blue-300"
                              disabled={csvHeaders.length === 0}
                            >
                              <option value="">Select header</option>
                              {csvHeaders.map((header) => {
                                const headerUsedByOtherField = mappingValues.includes(header) && selectedHeader !== header;
                                return (
                                  <option key={`${field}-${header}`} value={header} disabled={headerUsedByOtherField}>
                                    {header}
                                  </option>
                                );
                              })}
                            </select>
                          </div>
                          <span className="material-symbols-outlined text-blue-300">arrow_forward</span>
                          <div className="text-right">
                            <p className="text-[10px] uppercase text-slate-400">System Field</p>
                            <p className="text-sm font-bold text-blue-100">{field}</p>
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
                    disabled={!isFormComplete}
                    className="flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-br from-blue-700 to-blue-600 py-3 text-sm font-bold text-white shadow-lg transition-all hover:scale-[1.01] active:scale-100 disabled:cursor-not-allowed disabled:from-slate-300 disabled:to-slate-300 disabled:text-slate-500 disabled:shadow-none disabled:hover:scale-100"
                  >
                    <span className="material-symbols-outlined text-base">rocket_launch</span>
                    Start Analysis
                  </button>
                </section>
              </div>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
