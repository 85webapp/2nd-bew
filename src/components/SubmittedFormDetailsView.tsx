/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Complete Submitted Form & Field Inspection View
 * Renders EVERY field, optional field (showing "(Optional)" on label + blank box below when unfilled,
 * or filled value when provided), nested objects/arrays, and ticked vs unticked checkboxes.
 */

import React, { useState } from 'react';
import { Order } from '../types';
import {
  ExtractedFieldItem,
  extractCompleteOrderInspection,
  humanizeFieldName,
  isValueEmpty
} from '../utils/formFieldExtractor';
import {
  CheckSquare,
  Square,
  ClipboardList,
  Code2,
  ChevronDown,
  ChevronUp,
  CheckCircle2
} from 'lucide-react';

interface SubmittedFormDetailsViewProps {
  order: Order;
}

function renderStructuredValue(val: any): React.ReactNode {
  if (isValueEmpty(val)) {
    return null;
  }

  if (typeof val === 'string' || typeof val === 'number') {
    const str = String(val);
    if (str.startsWith('http://') || str.startsWith('https://')) {
      return (
        <a
          href={str}
          target="_blank"
          rel="noreferrer"
          className="text-blue-600 hover:underline break-all font-semibold"
        >
          {str}
        </a>
      );
    }
    return <span className="whitespace-pre-wrap break-words">{str}</span>;
  }

  if (typeof val === 'boolean') {
    return <span>{val ? 'Yes (Checked)' : 'No (Unchecked)'}</span>;
  }

  if (Array.isArray(val)) {
    return (
      <div className="space-y-2 w-full">
        {val.map((item, idx) => {
          if (item === null || item === undefined || item === '') return null;
          if (typeof item === 'object' && !Array.isArray(item)) {
            return (
              <div
                key={idx}
                className="rounded-md border border-slate-200 bg-white p-2.5 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs"
              >
                {Object.entries(item).map(([subK, subV]) => (
                  <div key={subK}>
                    <span className="text-[11px] font-semibold text-slate-500 block">
                      {humanizeFieldName(subK)}
                    </span>
                    <span className="font-semibold text-slate-900 break-words">
                      {isValueEmpty(subV) && typeof subV !== 'boolean'
                        ? '—'
                        : typeof subV === 'boolean'
                        ? (subV ? '☑ Ticked' : '☐ Not Ticked')
                        : typeof subV === 'object'
                        ? JSON.stringify(subV)
                        : String(subV)}
                    </span>
                  </div>
                ))}
              </div>
            );
          }
          return (
            <div
              key={idx}
              className="rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-900"
            >
              {idx + 1}. {String(item)}
            </div>
          );
        })}
      </div>
    );
  }

  if (typeof val === 'object') {
    return (
      <div className="rounded-md border border-slate-200 bg-white p-2.5 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs w-full">
        {Object.entries(val).map(([subK, subV]) => (
          <div key={subK}>
            <span className="text-[11px] font-semibold text-slate-500 block">
              {humanizeFieldName(subK)}
            </span>
            <span className="font-semibold text-slate-900 break-words">
              {isValueEmpty(subV) && typeof subV !== 'boolean'
                ? '—'
                : typeof subV === 'boolean'
                ? (subV ? '☑ Ticked' : '☐ Not Ticked')
                : typeof subV === 'object'
                ? JSON.stringify(subV)
                : String(subV)}
            </span>
          </div>
        ))}
      </div>
    );
  }

  return <span>{String(val)}</span>;
}

const FieldBox: React.FC<{ field: ExtractedFieldItem }> = ({ field }) => {
  const isUnfilledOptional = field.isEmpty && field.isOptional;
  const isUnfilledMandatory = field.isEmpty && !field.isOptional;

  return (
    <div className={field.fullWidth ? 'sm:col-span-2' : ''}>
      {/* Label Row on Top with (Optional) or (Mandatory) in brackets */}
      <div className="flex items-center justify-between gap-2 mb-1.5">
        <label className="text-xs font-bold text-slate-700 leading-snug">
          {field.label}{' '}
          {field.isOptional ? (
            <span className="font-semibold text-slate-500">(Optional)</span>
          ) : (
            <span className="font-semibold text-blue-700">(Mandatory)</span>
          )}
        </label>
        {isUnfilledOptional && (
          <span className="text-[10px] font-medium text-slate-400 shrink-0">
            Not Filled
          </span>
        )}
      </div>

      {/* Bordered Value Box Below Label (clean blank box if optional & not filled) */}
      <div
        className={`w-full min-h-[40px] rounded-lg px-3 py-2 text-xs sm:text-sm flex items-center transition-colors ${
          isUnfilledOptional
            ? 'bg-white border border-dashed border-slate-300 text-slate-400'
            : isUnfilledMandatory
            ? 'bg-amber-50/40 border border-amber-300 text-amber-700'
            : 'bg-slate-50 border border-slate-300 text-slate-900 font-semibold'
        }`}
        title={isUnfilledOptional ? 'Optional field (not provided)' : undefined}
      >
        {!field.isEmpty ? (
          <div className="w-full">{renderStructuredValue(field.value)}</div>
        ) : isUnfilledOptional ? (
          /* Blank Box for unfilled optional fields */
          <span className="select-none" aria-label="Blank optional field">&nbsp;</span>
        ) : (
          <span className="text-[11px] italic text-amber-600 font-medium">Not Provided</span>
        )}
      </div>
    </div>
  );
};

export const SubmittedFormDetailsView: React.FC<SubmittedFormDetailsViewProps> = ({ order }) => {
  const [showRawJson, setShowRawJson] = useState(false);
  const inspection = extractCompleteOrderInspection(order);

  return (
    <div className="no-print space-y-5">
      {/* Header Banner & Completion Metrics */}
      <div className="bg-white rounded-2xl border border-gray-200 p-4 sm:p-5 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-50 text-blue-600 border border-blue-100">
              <ClipboardList className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-black text-slate-900 tracking-tight">
                Complete Submitted Form Details (Website A Payload)
              </h2>
              <p className="text-xs text-slate-500">
                All mandatory &amp; optional fields, boxes, and checkbox selections received for{' '}
                <strong className="text-slate-700">{order.formName}</strong>
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-[11px] font-bold">
            <span className="px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200">
              Filled: {inspection.filledFieldsCount}
            </span>
            <span className="px-2.5 py-1 rounded-md bg-slate-100 text-slate-600 border border-slate-200">
              Optional (Blank): {inspection.optionalEmptyCount}
            </span>
            {inspection.checkboxes.length > 0 && (
              <>
                <span className="px-2.5 py-1 rounded-md bg-blue-50 text-blue-700 border border-blue-200">
                  Ticked: {inspection.tickedCount}
                </span>
                <span className="px-2.5 py-1 rounded-md bg-slate-50 text-slate-600 border border-slate-200">
                  Not Ticked: {inspection.untickedCount}
                </span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Structured Sections (Every Field Label + Bracket + Value/Blank Box Below) */}
      {inspection.sections.map((section) => (
        <div
          key={section.id}
          className="bg-white rounded-2xl border border-gray-200 p-4 sm:p-5 shadow-xs space-y-4"
        >
          <div className="border-b border-gray-100 pb-2.5">
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-wide">
              {section.title}
            </h3>
            {section.subtitle && (
              <p className="text-xs text-slate-500 mt-0.5">{section.subtitle}</p>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {section.fields.map((field) => (
              <FieldBox key={field.key} field={field} />
            ))}
          </div>
        </div>
      ))}

      {/* Checkboxes Section (Explicitly shows Ticked vs Not Ticked) */}
      <div className="bg-white rounded-2xl border border-gray-200 p-4 sm:p-5 shadow-xs space-y-4">
        <div className="border-b border-gray-100 pb-2.5 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-wide">
              Checkboxes, Declarations &amp; Option Selections
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Exact record of every checkbox ticked vs not ticked by the customer
            </p>
          </div>
          {inspection.checkboxes.length > 0 && (
            <div className="flex items-center gap-2 text-xs font-bold">
              <span className="inline-flex items-center gap-1 text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded">
                <CheckCircle2 className="w-3.5 h-3.5" />
                {inspection.tickedCount} Ticked
              </span>
              <span className="inline-flex items-center gap-1 text-slate-600 bg-slate-100 border border-slate-200 px-2.5 py-0.5 rounded">
                <Square className="w-3.5 h-3.5" />
                {inspection.untickedCount} Not Ticked
              </span>
            </div>
          )}
        </div>

        {inspection.checkboxes.length === 0 ? (
          <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50/60 px-4 py-3 text-xs text-slate-500">
            No boolean/checkbox flags were included in this order&apos;s payload. When Website A sends checkbox fields (true/false or checkboxes list), both ticked and unticked checkboxes appear here.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {inspection.checkboxes.map((cb) => (
              <div
                key={cb.key}
                className={`flex items-center justify-between gap-3 rounded-xl border px-3.5 py-2.5 ${
                  cb.checked
                    ? 'bg-emerald-50/70 border-emerald-300 text-slate-900'
                    : 'bg-slate-50 border-slate-200 text-slate-600'
                }`}
              >
                <div className="flex items-start gap-2.5 min-w-0">
                  {cb.checked ? (
                    <CheckSquare className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  ) : (
                    <Square className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                  )}
                  <div className="min-w-0">
                    <div className="text-xs font-bold leading-snug break-words">
                      {cb.label}{' '}
                      {cb.isOptional && (
                        <span className="font-semibold text-slate-500">(Optional)</span>
                      )}
                    </div>
                    {cb.group && (
                      <span className="text-[10px] text-slate-400 font-medium block">
                        {cb.group}
                      </span>
                    )}
                  </div>
                </div>

                <span
                  className={`text-[11px] font-bold px-2 py-0.5 rounded shrink-0 ${
                    cb.checked
                      ? 'bg-emerald-600 text-white'
                      : 'bg-slate-200 text-slate-600'
                  }`}
                >
                  {cb.checked ? 'Ticked' : 'Not Ticked'}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Collapsible Full Raw Received Payload Inspector */}
      {order.rawPayload && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden">
          <button
            type="button"
            onClick={() => setShowRawJson((prev) => !prev)}
            className="w-full px-4 sm:px-5 py-3 flex items-center justify-between text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
          >
            <span className="flex items-center gap-2">
              <Code2 className="w-4 h-4 text-slate-500" />
              <span>Full Raw Decrypted Payload Data (JSON)</span>
            </span>
            {showRawJson ? (
              <ChevronUp className="w-4 h-4 text-slate-400" />
            ) : (
              <ChevronDown className="w-4 h-4 text-slate-400" />
            )}
          </button>
          {showRawJson && (
            <div className="border-t border-gray-100 bg-slate-950 text-emerald-300 p-4 overflow-x-auto max-h-96 text-[11px] font-mono leading-relaxed">
              <pre>{JSON.stringify(order.rawPayload, null, 2)}</pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
