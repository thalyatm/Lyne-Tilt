import React, { useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { API_BASE } from '../config/api';
import {
  Upload, ArrowLeft, ArrowRight, FileText, Check, X,
  AlertCircle, Loader2, CheckCircle, Users, Tag, MapPin
} from 'lucide-react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ParsedCsv {
  headers: string[];
  rows: string[][];
}

type MappableField = 'email' | 'name' | 'firstName' | 'lastName' | 'tags' | 'source' | 'skip';

interface ColumnMapping {
  csvHeader: string;
  mappedField: MappableField;
}

interface ImportResult {
  id: string;
  fileName: string;
  status: string;
  totalRows: number;
  validRows: number;
  importedRows: number;
  skippedDuplicates: number;
  skippedInvalid: number;
  skippedSuppressed: number;
  errors?: { row: number; message: string }[];
}

// ---------------------------------------------------------------------------
// CSV Parser
// ---------------------------------------------------------------------------

function parseCsv(text: string): ParsedCsv {
  const lines = text.split('\n').filter(l => l.trim());
  if (lines.length === 0) return { headers: [], rows: [] };

  const parseRow = (line: string): string[] => {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    for (const char of line) {
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current.trim());
    return result;
  };

  const headers = parseRow(lines[0]);
  const rows = lines
    .slice(1)
    .map(parseRow)
    .filter(r => r.some(c => c));
  return { headers, rows };
}

// ---------------------------------------------------------------------------
// Auto-detect mapping helper
// ---------------------------------------------------------------------------

const FIELD_OPTIONS: { value: MappableField; label: string }[] = [
  { value: 'email', label: 'Email' },
  { value: 'name', label: 'Name' },
  { value: 'firstName', label: 'First Name' },
  { value: 'lastName', label: 'Last Name' },
  { value: 'tags', label: 'Tags' },
  { value: 'source', label: 'Source' },
  { value: 'skip', label: 'Skip' },
];

function autoDetectField(header: string): MappableField {
  const h = header.toLowerCase().replace(/[\s_-]/g, '');
  if (h === 'email' || h === 'emailaddress') return 'email';
  if (h === 'name' || h === 'fullname') return 'name';
  if (h === 'firstname' || h === 'first') return 'firstName';
  if (h === 'lastname' || h === 'last') return 'lastName';
  if (h === 'tags' || h === 'tag') return 'tags';
  if (h === 'source') return 'source';
  return 'skip';
}

// ---------------------------------------------------------------------------
// Step labels
// ---------------------------------------------------------------------------

const STEP_LABELS = ['Upload', 'Map Columns', 'Options', 'Results'];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function SubscriberImport() {
  const navigate = useNavigate();
  const { token } = useAuth();
  const toast = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Wizard state
  const [currentStep, setCurrentStep] = useState(0);

  // Step 1 state
  const [fileName, setFileName] = useState('');
  const [parsedCsv, setParsedCsv] = useState<ParsedCsv | null>(null);
  const [dragActive, setDragActive] = useState(false);

  // Step 2 state
  const [columnMappings, setColumnMappings] = useState<ColumnMapping[]>([]);

  // Step 3 state
  const [defaultSource, setDefaultSource] = useState('');
  const [defaultTags, setDefaultTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');

  // Step 4 state
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [errorsExpanded, setErrorsExpanded] = useState(false);

  // ---------------------------------------------------------------------------
  // File handling
  // ---------------------------------------------------------------------------

  const handleFile = useCallback((file: File) => {
    if (!file.name.toLowerCase().endsWith('.csv')) {
      toast.error('Please upload a CSV file.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const parsed = parseCsv(text);

      if (parsed.headers.length === 0) {
        toast.error('The CSV file appears to be empty.');
        return;
      }

      setFileName(file.name);
      setParsedCsv(parsed);

      // Auto-detect mappings
      const mappings: ColumnMapping[] = parsed.headers.map(header => ({
        csvHeader: header,
        mappedField: autoDetectField(header),
      }));
      setColumnMappings(mappings);
    };
    reader.readAsText(file);
  }, [toast]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
  }, []);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  }, [handleFile]);

  // ---------------------------------------------------------------------------
  // Mapping helpers
  // ---------------------------------------------------------------------------

  const updateMapping = (index: number, field: MappableField) => {
    setColumnMappings(prev => {
      const next = [...prev];
      next[index] = { ...next[index], mappedField: field };
      return next;
    });
  };

  const emailMapped = columnMappings.some(m => m.mappedField === 'email');

  // ---------------------------------------------------------------------------
  // Build mapped rows
  // ---------------------------------------------------------------------------

  const buildMappedRows = useCallback(() => {
    if (!parsedCsv) return [];

    return parsedCsv.rows.map(row => {
      const mapped: Record<string, string> = {};
      columnMappings.forEach((mapping, i) => {
        if (mapping.mappedField !== 'skip' && row[i] !== undefined) {
          mapped[mapping.mappedField] = row[i];
        }
      });
      return mapped;
    });
  }, [parsedCsv, columnMappings]);

  // ---------------------------------------------------------------------------
  // Import
  // ---------------------------------------------------------------------------

  const handleImport = async () => {
    if (!parsedCsv) return;

    setImporting(true);
    setCurrentStep(3);

    try {
      const mappedRows = buildMappedRows();

      const body = {
        rows: mappedRows.map(row => ({
          email: row.email || '',
          name: row.name,
          firstName: row.firstName,
          lastName: row.lastName,
          tags: row.tags ? row.tags.split(',').map(t => t.trim()).filter(Boolean) : undefined,
          source: row.source,
        })),
        defaultSource: defaultSource || undefined,
        defaultTags: defaultTags.length > 0 ? defaultTags : undefined,
        fileName,
      };

      const res = await fetch(`${API_BASE}/subscribers/import`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => null);
        throw new Error(errData?.message || `Import failed (${res.status})`);
      }

      const data = await res.json();
      setImportResult(data.importJob);
      toast.success(`Import complete: ${data.importJob.importedRows} subscribers imported.`);
    } catch (err: any) {
      toast.error(err.message || 'Import failed. Please try again.');
      setCurrentStep(2); // go back to options
    } finally {
      setImporting(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Tag management (Step 3)
  // ---------------------------------------------------------------------------

  const addTag = (value: string) => {
    const tags = value
      .split(',')
      .map(t => t.trim())
      .filter(t => t && !defaultTags.includes(t));
    if (tags.length > 0) {
      setDefaultTags(prev => [...prev, ...tags]);
    }
    setTagInput('');
  };

  const removeTag = (tag: string) => {
    setDefaultTags(prev => prev.filter(t => t !== tag));
  };

  const handleTagKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      if (tagInput.trim()) addTag(tagInput);
    }
  };

  // ---------------------------------------------------------------------------
  // Navigation guards
  // ---------------------------------------------------------------------------

  const canContinueStep1 = parsedCsv && parsedCsv.rows.length > 0;
  const canContinueStep2 = emailMapped;

  // ---------------------------------------------------------------------------
  // Step indicator
  // ---------------------------------------------------------------------------

  const StepIndicator = () => (
    <div className="flex items-center justify-center mb-10">
      {STEP_LABELS.map((label, i) => {
        const isCompleted = i < currentStep;
        const isCurrent = i === currentStep;

        return (
          <React.Fragment key={label}>
            {i > 0 && (
              <div
                className={`h-0.5 w-12 sm:w-20 ${
                  isCompleted ? 'bg-green-500' : 'bg-stone-200'
                }`}
              />
            )}
            <div className="flex flex-col items-center gap-1.5">
              <div
                className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold transition-colors ${
                  isCompleted
                    ? 'bg-green-500 text-white'
                    : isCurrent
                    ? 'bg-[#8d3038] text-white'
                    : 'bg-stone-200 text-stone-500'
                }`}
              >
                {isCompleted ? <Check className="w-4 h-4" /> : i + 1}
              </div>
              <span
                className={`text-xs font-medium whitespace-nowrap ${
                  isCurrent
                    ? 'text-[#8d3038]'
                    : isCompleted
                    ? 'text-green-600'
                    : 'text-stone-400'
                }`}
              >
                {label}
              </span>
            </div>
          </React.Fragment>
        );
      })}
    </div>
  );

  // ---------------------------------------------------------------------------
  // Step 1: Upload
  // ---------------------------------------------------------------------------

  const renderUploadStep = () => (
    <div className="bg-white rounded-xl border border-stone-200 shadow-sm p-6">
      <h2 className="text-lg font-semibold text-stone-800 mb-4">Upload CSV File</h2>

      <div
        className={`border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-colors ${
          dragActive
            ? 'border-[#8d3038] bg-red-50/30'
            : 'border-stone-300 hover:border-stone-400 hover:bg-stone-50'
        }`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => fileInputRef.current?.click()}
      >
        <Upload
          className={`w-10 h-10 mx-auto mb-4 ${
            dragActive ? 'text-[#8d3038]' : 'text-stone-400'
          }`}
        />
        <p className="text-stone-600 font-medium mb-1">
          Drop your CSV file here or click to browse
        </p>
        <p className="text-sm text-stone-400">Supports .csv files</p>

        <input
          ref={fileInputRef}
          type="file"
          accept=".csv"
          className="hidden"
          onChange={handleFileInput}
        />
      </div>

      {parsedCsv && (
        <div className="mt-6 flex items-center gap-3 p-4 bg-stone-50 rounded-lg border border-stone-200">
          <FileText className="w-5 h-5 text-[#8d3038] flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-stone-800 truncate">{fileName}</p>
            <p className="text-xs text-stone-500">
              {parsedCsv.headers.length} columns &middot; {parsedCsv.rows.length} rows
            </p>
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setParsedCsv(null);
              setFileName('');
              setColumnMappings([]);
              if (fileInputRef.current) fileInputRef.current.value = '';
            }}
            className="p-1 text-stone-400 hover:text-stone-600 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      <div className="mt-6 flex justify-end">
        <button
          onClick={() => setCurrentStep(1)}
          disabled={!canContinueStep1}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#8d3038] text-white text-sm font-medium rounded-lg hover:bg-[#7a2930] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          Continue
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );

  // ---------------------------------------------------------------------------
  // Step 2: Column Mapping
  // ---------------------------------------------------------------------------

  const renderMappingStep = () => {
    const previewRows = parsedCsv ? parsedCsv.rows.slice(0, 3) : [];

    return (
      <div className="space-y-6">
        {/* Mapping table */}
        <div className="bg-white rounded-xl border border-stone-200 shadow-sm p-6">
          <h2 className="text-lg font-semibold text-stone-800 mb-4">Map Columns</h2>

          {!emailMapped && (
            <div className="flex items-start gap-3 p-4 mb-4 bg-red-50 border border-red-200 rounded-lg">
              <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-700">
                An <strong>Email</strong> column mapping is required to continue.
              </p>
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-stone-200">
                  <th className="text-left py-3 px-4 text-stone-500 font-medium">CSV Column Header</th>
                  <th className="text-left py-3 px-4 text-stone-500 font-medium">Mapped Field</th>
                </tr>
              </thead>
              <tbody>
                {columnMappings.map((mapping, i) => (
                  <tr key={i} className="border-b border-stone-100 last:border-0">
                    <td className="py-3 px-4 text-stone-700 font-mono text-xs bg-stone-50">
                      {mapping.csvHeader}
                    </td>
                    <td className="py-3 px-4">
                      <select
                        value={mapping.mappedField}
                        onChange={e => updateMapping(i, e.target.value as MappableField)}
                        className="w-full px-3 py-1.5 border border-stone-200 rounded-lg text-sm text-stone-700 focus:outline-none focus:ring-2 focus:ring-[#8d3038]/20 focus:border-[#8d3038]"
                      >
                        {FIELD_OPTIONS.map(opt => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Preview */}
        {previewRows.length > 0 && (
          <div className="bg-white rounded-xl border border-stone-200 shadow-sm p-6">
            <h3 className="text-sm font-semibold text-stone-700 mb-3">
              Preview (first 3 rows)
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-stone-200">
                    {columnMappings
                      .filter(m => m.mappedField !== 'skip')
                      .map((m, i) => (
                        <th key={i} className="text-left py-2 px-3 text-stone-500 font-medium text-xs uppercase tracking-wide">
                          {FIELD_OPTIONS.find(o => o.value === m.mappedField)?.label}
                        </th>
                      ))}
                  </tr>
                </thead>
                <tbody>
                  {previewRows.map((row, ri) => (
                    <tr key={ri} className="border-b border-stone-100 last:border-0">
                      {columnMappings
                        .map((m, ci) => ({ field: m.mappedField, value: row[ci] || '' }))
                        .filter(item => item.field !== 'skip')
                        .map((item, ci) => (
                          <td key={ci} className="py-2 px-3 text-stone-600 text-xs truncate max-w-[200px]">
                            {item.value}
                          </td>
                        ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Navigation */}
        <div className="flex justify-between">
          <button
            onClick={() => setCurrentStep(0)}
            className="inline-flex items-center gap-2 px-5 py-2.5 border border-stone-200 text-stone-600 text-sm font-medium rounded-lg hover:bg-stone-50 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>
          <button
            onClick={() => setCurrentStep(2)}
            disabled={!canContinueStep2}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#8d3038] text-white text-sm font-medium rounded-lg hover:bg-[#7a2930] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            Continue
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  };

  // ---------------------------------------------------------------------------
  // Step 3: Options & Preview
  // ---------------------------------------------------------------------------

  const renderOptionsStep = () => {
    const mappedRows = buildMappedRows();
    const previewRows = mappedRows.slice(0, 5);
    const activeMappings = columnMappings.filter(m => m.mappedField !== 'skip');

    return (
      <div className="space-y-6">
        {/* Default options */}
        <div className="bg-white rounded-xl border border-stone-200 shadow-sm p-6">
          <h2 className="text-lg font-semibold text-stone-800 mb-4">Import Options</h2>

          <div className="grid gap-5 sm:grid-cols-2">
            {/* Default source */}
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1.5">
                <MapPin className="w-3.5 h-3.5 inline-block mr-1 -mt-0.5" />
                Default Source
              </label>
              <input
                type="text"
                value={defaultSource}
                onChange={e => setDefaultSource(e.target.value)}
                placeholder="website"
                className="w-full px-3 py-2 border border-stone-200 rounded-lg text-sm text-stone-700 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-[#8d3038]/20 focus:border-[#8d3038]"
              />
              <p className="text-xs text-stone-400 mt-1">Applied when row has no source value</p>
            </div>

            {/* Default tags */}
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1.5">
                <Tag className="w-3.5 h-3.5 inline-block mr-1 -mt-0.5" />
                Default Tags
              </label>
              <div className="flex flex-wrap items-center gap-1.5 min-h-[38px] px-3 py-1.5 border border-stone-200 rounded-lg focus-within:ring-2 focus-within:ring-[#8d3038]/20 focus-within:border-[#8d3038]">
                {defaultTags.map(tag => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-1 px-2 py-0.5 bg-stone-100 text-stone-700 text-xs rounded-full"
                  >
                    {tag}
                    <button
                      onClick={() => removeTag(tag)}
                      className="text-stone-400 hover:text-stone-600"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
                <input
                  type="text"
                  value={tagInput}
                  onChange={e => setTagInput(e.target.value)}
                  onKeyDown={handleTagKeyDown}
                  onBlur={() => { if (tagInput.trim()) addTag(tagInput); }}
                  placeholder={defaultTags.length === 0 ? 'Type and press Enter' : ''}
                  className="flex-1 min-w-[80px] py-0.5 text-sm text-stone-700 placeholder:text-stone-400 focus:outline-none bg-transparent"
                />
              </div>
              <p className="text-xs text-stone-400 mt-1">Comma-separated or press Enter to add</p>
            </div>
          </div>
        </div>

        {/* Summary */}
        <div className="bg-white rounded-xl border border-stone-200 shadow-sm p-6">
          <div className="flex items-center gap-3 mb-4">
            <Users className="w-5 h-5 text-[#8d3038]" />
            <h2 className="text-lg font-semibold text-stone-800">
              {mappedRows.length} rows will be processed
            </h2>
          </div>

          {/* Preview table */}
          {previewRows.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-stone-200">
                    <th className="text-left py-2 px-3 text-stone-500 font-medium text-xs uppercase tracking-wide w-8">#</th>
                    {activeMappings.map((m, i) => (
                      <th key={i} className="text-left py-2 px-3 text-stone-500 font-medium text-xs uppercase tracking-wide">
                        {FIELD_OPTIONS.find(o => o.value === m.mappedField)?.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {previewRows.map((row, ri) => (
                    <tr key={ri} className="border-b border-stone-100 last:border-0">
                      <td className="py-2 px-3 text-stone-400 text-xs">{ri + 1}</td>
                      {activeMappings.map((m, ci) => (
                        <td key={ci} className="py-2 px-3 text-stone-600 text-xs truncate max-w-[200px]">
                          {row[m.mappedField] || <span className="text-stone-300 italic">empty</span>}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {mappedRows.length > 5 && (
            <p className="text-xs text-stone-400 mt-3 text-center">
              ...and {mappedRows.length - 5} more rows
            </p>
          )}
        </div>

        {/* Navigation */}
        <div className="flex justify-between">
          <button
            onClick={() => setCurrentStep(1)}
            className="inline-flex items-center gap-2 px-5 py-2.5 border border-stone-200 text-stone-600 text-sm font-medium rounded-lg hover:bg-stone-50 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>
          <button
            onClick={handleImport}
            className="inline-flex items-center gap-2 px-6 py-2.5 bg-[#8d3038] text-white text-sm font-medium rounded-lg hover:bg-[#7a2930] transition-colors"
          >
            <Upload className="w-4 h-4" />
            Import
          </button>
        </div>
      </div>
    );
  };

  // ---------------------------------------------------------------------------
  // Step 4: Results
  // ---------------------------------------------------------------------------

  const renderResultsStep = () => {
    if (importing) {
      return (
        <div className="bg-white rounded-xl border border-stone-200 shadow-sm p-12 text-center">
          <Loader2 className="w-10 h-10 text-[#8d3038] animate-spin mx-auto mb-4" />
          <p className="text-stone-600 font-medium">Processing your import...</p>
          <p className="text-sm text-stone-400 mt-1">This may take a moment.</p>
        </div>
      );
    }

    if (!importResult) return null;

    const summaryCards = [
      {
        label: 'Total Rows',
        value: importResult.totalRows,
        icon: FileText,
        color: 'text-stone-600',
        bg: 'bg-stone-50',
      },
      {
        label: 'Imported',
        value: importResult.importedRows,
        icon: CheckCircle,
        color: 'text-green-600',
        bg: 'bg-green-50',
      },
      {
        label: 'Duplicates Skipped',
        value: importResult.skippedDuplicates,
        icon: Users,
        color: 'text-amber-600',
        bg: 'bg-amber-50',
      },
      {
        label: 'Invalid Skipped',
        value: importResult.skippedInvalid,
        icon: AlertCircle,
        color: 'text-red-600',
        bg: 'bg-red-50',
      },
      {
        label: 'Suppressed Skipped',
        value: importResult.skippedSuppressed,
        icon: X,
        color: 'text-stone-500',
        bg: 'bg-stone-50',
      },
    ];

    const errors = importResult.errors || [];

    return (
      <div className="space-y-6">
        {/* Summary cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          {summaryCards.map(card => {
            const Icon = card.icon;
            return (
              <div
                key={card.label}
                className="bg-white rounded-xl border border-stone-200 shadow-sm p-4 text-center"
              >
                <div className={`inline-flex items-center justify-center w-10 h-10 rounded-full ${card.bg} mb-2`}>
                  <Icon className={`w-5 h-5 ${card.color}`} />
                </div>
                <p className="text-2xl font-bold text-stone-800">{card.value}</p>
                <p className="text-xs text-stone-500 mt-0.5">{card.label}</p>
              </div>
            );
          })}
        </div>

        {/* Errors */}
        {errors.length > 0 && (
          <div className="bg-white rounded-xl border border-stone-200 shadow-sm p-6">
            <button
              onClick={() => setErrorsExpanded(!errorsExpanded)}
              className="flex items-center justify-between w-full text-left"
            >
              <div className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-red-500" />
                <span className="text-sm font-semibold text-stone-800">
                  {errors.length} Error{errors.length !== 1 ? 's' : ''}
                </span>
              </div>
              <ArrowRight
                className={`w-4 h-4 text-stone-400 transition-transform ${
                  errorsExpanded ? 'rotate-90' : ''
                }`}
              />
            </button>

            {errorsExpanded && (
              <div className="mt-4 max-h-64 overflow-y-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-stone-200">
                      <th className="text-left py-2 px-3 text-stone-500 font-medium text-xs w-20">Row</th>
                      <th className="text-left py-2 px-3 text-stone-500 font-medium text-xs">Error</th>
                    </tr>
                  </thead>
                  <tbody>
                    {errors.map((err, i) => (
                      <tr key={i} className="border-b border-stone-100 last:border-0">
                        <td className="py-2 px-3 text-stone-600 text-xs font-mono">{err.row}</td>
                        <td className="py-2 px-3 text-red-600 text-xs">{err.message}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Navigation */}
        <div className="flex justify-end">
          <button
            onClick={() => navigate('/admin/subscribers')}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#8d3038] text-white text-sm font-medium rounded-lg hover:bg-[#7a2930] transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Subscribers
          </button>
        </div>
      </div>
    );
  };

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  const stepRenderers = [renderUploadStep, renderMappingStep, renderOptionsStep, renderResultsStep];

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-stone-800 mb-2" style={{ fontFamily: 'Georgia, serif' }}>
        Import Subscribers
      </h1>
      <p className="text-sm text-stone-500 mb-8">
        Upload a CSV file to bulk-import subscribers into your list.
      </p>

      <StepIndicator />

      {stepRenderers[currentStep]()}
    </div>
  );
}
