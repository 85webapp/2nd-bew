/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Comprehensive Form & Payload Field Extractor
 * Extracts EVERY submitted field, optional field (keeping blank box visibility),
 * nested party/property/registration objects, and checkbox boolean states (ticked vs unticked)
 * so zero data sent from Website A is ever dropped or hidden in the Admin View screen.
 */

import { Order } from '../types';

export interface ExtractedFieldItem {
  key: string;
  label: string;
  value: any;
  isOptional: boolean;
  isEmpty: boolean;
  fullWidth?: boolean;
  sourcePath?: string;
}

export interface ExtractedCheckboxItem {
  key: string;
  label: string;
  checked: boolean;
  isOptional: boolean;
  group?: string;
}

export interface ExtractedFormSection {
  id: string;
  title: string;
  subtitle?: string;
  fields: ExtractedFieldItem[];
}

export interface ExtractedOrderInspection {
  isRentAgreement: boolean;
  sections: ExtractedFormSection[];
  checkboxes: ExtractedCheckboxItem[];
  totalFieldsCount: number;
  filledFieldsCount: number;
  optionalEmptyCount: number;
  tickedCount: number;
  untickedCount: number;
}

function normalizeKey(key: string): string {
  return key.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
}

export function humanizeFieldName(key: string): string {
  return key
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export function isValueEmpty(val: any): boolean {
  if (val === undefined || val === null) return true;
  if (typeof val === 'string') {
    const trimmed = val.trim();
    return trimmed === '' || trimmed === 'Not Provided' || trimmed === 'N/A';
  }
  if (Array.isArray(val)) return val.length === 0;
  if (typeof val === 'object') {
    const vals = Object.values(val);
    if (vals.length === 0) return true;
    return vals.every((v) => isValueEmpty(v));
  }
  return false;
}

function safeObj(val: any): Record<string, any> {
  if (!val) return {};
  if (typeof val === 'string') {
    const t = val.trim();
    if (t.startsWith('{')) {
      try {
        const parsed = JSON.parse(t);
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) return parsed;
      } catch {}
    }
    return {};
  }
  if (typeof val === 'object' && !Array.isArray(val)) return val;
  return {};
}

function safeLabelStr(val: any, fallback = ''): string {
  if (val === undefined || val === null) return fallback;
  if (typeof val === 'string' || typeof val === 'number' || typeof val === 'boolean') return String(val);
  if (typeof val === 'object') {
    if (typeof val.label === 'string') return val.label;
    if (typeof val.title === 'string') return val.title;
    if (typeof val.name === 'string') return val.name;
    if (typeof val.value === 'string' || typeof val.value === 'number') return String(val.value);
    try { return JSON.stringify(val); } catch { return fallback; }
  }
  return fallback;
}

/**
 * Unwraps nested objects from rawPayload (formData, fields, answers, data) into a flat list of lookup objects.
 */
function buildLookupScopes(order: Order): Record<string, any>[] {
  if (!order) return [];
  const raw = safeObj(order.rawPayload);
  const scopes: Record<string, any>[] = [];

  const pushIfObj = (obj: any) => {
    const parsed = safeObj(obj);
    if (Object.keys(parsed).length > 0) {
      scopes.push(parsed);
    }
  };

  pushIfObj(raw);
  pushIfObj(raw.formData);
  pushIfObj(raw.fields);
  pushIfObj(raw.answers);
  pushIfObj(raw.data);
  pushIfObj(raw.form);
  pushIfObj(order.legalData);
  pushIfObj(safeObj(order.legalData).extraFields);
  pushIfObj(order.registrationData);
  pushIfObj(safeObj(order.registrationData).extraFields);
  pushIfObj(order.stampData);
  pushIfObj(order as any);

  return scopes;
}

/**
 * Detects explicit optional / required hints sent by Website A (e.g. optionalFields: [], requiredFields: []).
 */
function buildFieldRequirementHints(order: Order, scopes: Record<string, any>[]): {
  optionalKeys: Set<string>;
  requiredKeys: Set<string>;
} {
  const optionalKeys = new Set<string>();
  const requiredKeys = new Set<string>();

  for (const scope of scopes) {
    const optList = scope.optionalFields || scope.optional_fields || scope.optionalKeys;
    if (Array.isArray(optList)) {
      optList.forEach((k: any) => {
        if (typeof k === 'string') optionalKeys.add(normalizeKey(k));
      });
    }
    const reqList = scope.requiredFields || scope.required_fields || scope.mandatoryFields || scope.requiredKeys;
    if (Array.isArray(reqList)) {
      reqList.forEach((k: any) => {
        if (typeof k === 'string') requiredKeys.add(normalizeKey(k));
      });
    }
    const schema = scope.fieldSchema || scope.fieldsMetadata || scope.schema;
    if (Array.isArray(schema)) {
      schema.forEach((item: any) => {
        if (item && typeof item === 'object' && item.name) {
          const nk = normalizeKey(String(item.name));
          if (item.optional === true || item.required === false) optionalKeys.add(nk);
          if (item.required === true || item.optional === false) requiredKeys.add(nk);
        }
      });
    }
  }

  return { optionalKeys, requiredKeys };
}

function lookupInScopes(
  scopes: Record<string, any>[],
  candidateKeys: string[],
  consumed: Set<string>,
  prefixGroup?: string
): { found: boolean; value: any; matchedKey?: string } {
  const normalizedCandidates = candidateKeys.map(normalizeKey);

  // First pass: look for a non-empty value across scopes
  for (const scope of scopes) {
    for (const [k, v] of Object.entries(scope)) {
      const nk = normalizeKey(k);
      if (normalizedCandidates.includes(nk)) {
        consumed.add(prefixGroup ? `${prefixGroup}.${nk}` : nk);
        consumed.add(nk);
        // Handle descriptor objects like { value: "...", optional: true }
        const actualVal = (v && typeof v === 'object' && !Array.isArray(v) && 'value' in v && Object.keys(v).length <= 4)
          ? v.value
          : v;
        if (!isValueEmpty(actualVal) || typeof actualVal === 'boolean') {
          return { found: true, value: actualVal, matchedKey: k };
        }
      }
    }
  }

  // Second pass: see if the key exists even with an empty string / null
  for (const scope of scopes) {
    for (const [k, v] of Object.entries(scope)) {
      const nk = normalizeKey(k);
      if (normalizedCandidates.includes(nk)) {
        const actualVal = (v && typeof v === 'object' && !Array.isArray(v) && 'value' in v) ? v.value : v;
        return { found: true, value: actualVal, matchedKey: k };
      }
    }
  }

  return { found: false, value: null };
}

function resolveOptionalFlag(
  candidateKeys: string[],
  defaultOptional: boolean,
  hints: { optionalKeys: Set<string>; requiredKeys: Set<string> },
  rawScopedObj?: any
): boolean {
  for (const ck of candidateKeys) {
    const nk = normalizeKey(ck);
    if (hints.requiredKeys.has(nk)) return false;
    if (hints.optionalKeys.has(nk)) return true;
  }
  if (rawScopedObj && typeof rawScopedObj === 'object') {
    for (const ck of candidateKeys) {
      const val = rawScopedObj[ck];
      if (val && typeof val === 'object' && !Array.isArray(val)) {
        if (val.optional === true || val.required === false) return true;
        if (val.required === true || val.optional === false) return false;
      }
    }
  }
  return defaultOptional;
}

const SKIP_SYSTEM_KEYS = new Set([
  'id', 'orderid', 'order_id', 'docketid', 'docket_id', 'referencecode', 'reference_code',
  'hmacverified', 'isdecrypted', 'receivedat', 'createdat', 'updatedat', 'signature',
  'hmac', 'hmacsignature', 'signatureverified', 'encryptedpayload', 'payload', 'rawpayload',
  'order_data', 'optionalfields', 'optional_fields', 'optionalkeys', 'requiredfields',
  'required_fields', 'mandatoryfields', 'requiredkeys', 'fieldschema', 'fieldsmetadata',
  'photourl', 'mediaurls', 'uploadedfiles', 'photo', 'applicantphoto', 'photos',
  'attachments', 'files', 'documents', 'signatureimage', 'source', 'status', 'category',
  'legalgroup', 'subcategory', 'formtype', 'documenttype', 'formname', 'documenttitle',
  'legaldata', 'registrationdata', 'stampdata', 'extrafields', 'formdata', 'fields', 'answers',
  'checkboxes', 'declarations', 'consents', 'amenities', 'selectedcheckboxes', 'formcheckboxes',
  'party1', 'party2', 'propertydetails', 'affidavitdetails', 'witnesses', 'clauses',
  'bankdetails', 'vehicledetails', 'documentchecklist', 'firstparty', 'secondparty',
  'clientname', 'clientphone', 'clientemail'
].map(normalizeKey));

function extractAllCheckboxes(order: Order, scopes: Record<string, any>[]): ExtractedCheckboxItem[] {
  const map = new Map<string, ExtractedCheckboxItem>();

  const addCheckbox = (rawKey: any, rawLabel: any, checked: boolean, isOptional = false, group?: string) => {
    const keyStr = safeLabelStr(rawKey, 'option');
    const labelStr = safeLabelStr(rawLabel, keyStr);
    const dedupeKey = normalizeKey(labelStr.replace(/^[^:]+:\s*/, ''));
    const nk = dedupeKey || normalizeKey(keyStr);
    if (!nk) return;
    if (!map.has(nk)) {
      map.set(nk, {
        key: keyStr || nk,
        label: labelStr,
        checked: Boolean(checked),
        isOptional,
        group
      });
    }
  };

  const checkboxContainerKeys = [
    'checkboxes', 'declarations', 'consents', 'amenities', 'fixtures',
    'selectedCheckboxes', 'formCheckboxes', 'checkedItems', 'tickedBoxes',
    'termsAndConditions', 'agreements', 'options'
  ];

  // 1. Explicit checkbox containers across all scopes
  for (const scope of scopes) {
    for (const containerKey of checkboxContainerKeys) {
      const container = scope[containerKey];
      if (!container) continue;

      if (Array.isArray(container)) {
        container.forEach((item, idx) => {
          if (typeof item === 'string') {
            addCheckbox(`${containerKey}_${idx}_${item}`, humanizeFieldName(item), true, false, humanizeFieldName(containerKey));
          } else if (item && typeof item === 'object') {
            const label = item.label || item.title || item.name || item.key || `Checkbox #${idx + 1}`;
            const checked = Boolean(item.checked ?? item.value ?? item.selected ?? item.ticked ?? item.isChecked);
            const optional = Boolean(item.optional ?? (item.required === false));
            addCheckbox(item.key || item.name || label, String(label), checked, optional, humanizeFieldName(containerKey));
          }
        });
      } else if (typeof container === 'object') {
        Object.entries(container).forEach(([k, v]) => {
          if (typeof v === 'boolean') {
            addCheckbox(k, humanizeFieldName(k), v, false, humanizeFieldName(containerKey));
          } else if (v && typeof v === 'object' && ('checked' in v || 'value' in v || 'selected' in v)) {
            const obj = v as any;
            const checked = Boolean(obj.checked ?? obj.value ?? obj.selected ?? obj.ticked);
            const label = obj.label || obj.title || humanizeFieldName(k);
            addCheckbox(k, String(label), checked, Boolean(obj.optional ?? (obj.required === false)), humanizeFieldName(containerKey));
          } else if (typeof v === 'string' && ['true', 'false', 'yes', 'no', 'checked', 'unchecked', 'on', 'off'].includes(v.toLowerCase())) {
            const checked = ['true', 'yes', 'checked', 'on'].includes(v.toLowerCase());
            addCheckbox(k, humanizeFieldName(k), checked, false, humanizeFieldName(containerKey));
          }
        });
      }
    }
  }

  // 2. Scan ALL boolean fields inside scopes, party1, party2, propertyDetails, etc.
  const ignoredBooleanKeys = new Set([
    'hmacverified', 'isdecrypted', 'signatureverified', 'verified', 'party1signed', 'party2signed'
  ]);

  const walkForBooleans = (obj: any, groupName?: string, depth = 0) => {
    if (!obj || typeof obj !== 'object' || depth > 4) return;
    if (Array.isArray(obj)) {
      obj.forEach((item, idx) => {
        if (item && typeof item === 'object' && ('checked' in item || 'isChecked' in item || 'ticked' in item)) {
          const label = item.label || item.title || item.name || `Option #${idx + 1}`;
          const checked = Boolean(item.checked ?? item.isChecked ?? item.ticked ?? item.value);
          addCheckbox(item.key || item.name || label, String(label), checked, Boolean(item.optional), groupName);
        }
      });
      return;
    }

    for (const [k, v] of Object.entries(obj)) {
      const nk = normalizeKey(k);
      if (ignoredBooleanKeys.has(nk)) continue;
      if (checkboxContainerKeys.map(normalizeKey).includes(nk)) continue;

      if (typeof v === 'boolean') {
        const cleanLabel = groupName ? `${groupName}: ${humanizeFieldName(k)}` : humanizeFieldName(k);
        addCheckbox(`${groupName || 'root'}_${k}`, cleanLabel, v, false, groupName);
      } else if (v && typeof v === 'object' && !Array.isArray(v)) {
        const subObj = v as Record<string, any>;
        if ('checked' in subObj || 'isChecked' in subObj || 'ticked' in subObj) {
          const label = subObj.label || subObj.title || humanizeFieldName(k);
          const checked = Boolean(subObj.checked ?? subObj.isChecked ?? subObj.ticked ?? subObj.value);
          addCheckbox(k, String(label), checked, Boolean(subObj.optional), groupName);
        } else if (!['stampdata', 'esignstatus', 'uploadedfiles'].includes(nk)) {
          const nextGroup = ['party1', 'party2', 'propertydetails', 'affidavitdetails', 'extrafields', 'legaldata', 'registrationdata', 'formdata', 'fields', 'answers'].includes(nk)
            ? humanizeFieldName(k)
            : groupName;
          walkForBooleans(subObj, nextGroup, depth + 1);
        }
      }
    }
  };

  if (order.rawPayload && typeof order.rawPayload === 'object') {
    walkForBooleans(order.rawPayload);
  }
  if (order.legalData) {
    walkForBooleans(order.legalData);
  }
  if (order.registrationData) {
    walkForBooleans(order.registrationData);
  }

  // 3. Check documentChecklist items for registration leads
  const regObj = safeObj(order.registrationData);
  if (Array.isArray(regObj.documentChecklist) && regObj.documentChecklist.length > 0) {
    regObj.documentChecklist.forEach((doc: any, idx: number) => {
      if (!doc || typeof doc !== 'object') return;
      addCheckbox(
        `doc_${safeLabelStr(doc.id, String(idx))}`,
        `${safeLabelStr(doc.label, 'Document')} (Uploaded / Submitted)`,
        Boolean(doc.uploaded || doc.verified),
        !doc.required,
        'Checklist Verification'
      );
    });
  }

  return Array.from(map.values());
}

/**
 * Collects any remaining non-checkbox fields in an object that were NOT explicitly consumed by structured sections.
 */
function isRawBase64Blob(val: any): boolean {
  if (typeof val !== 'string') return false;
  const s = val.trim();
  if (s.startsWith('data:') && s.includes(';base64,')) return true;
  if (s.length > 240 && /^[A-Za-z0-9+/=_\s]+$/.test(s.slice(0, 120)) && /^(JVBERi0|\/9j\/|iVBORw0KGgo|UklGR|R0lGOD)/.test(s)) {
    return true;
  }
  return false;
}

function collectRemainingFields(
  sourceObj: any,
  consumed: Set<string>,
  hints: { optionalKeys: Set<string>; requiredKeys: Set<string> },
  prefixGroup?: string
): ExtractedFieldItem[] {
  if (!sourceObj || typeof sourceObj !== 'object' || Array.isArray(sourceObj)) return [];
  const items: ExtractedFieldItem[] = [];

  for (const [k, v] of Object.entries(sourceObj)) {
    const nk = normalizeKey(k);
    const fullNk = prefixGroup ? `${prefixGroup}.${nk}` : nk;

    if (SKIP_SYSTEM_KEYS.has(nk) || consumed.has(fullNk) || consumed.has(nk)) continue;
    // Booleans are already shown in the dedicated Checkboxes section (unless wrapped in descriptor)
    if (typeof v === 'boolean') continue;
    if (v && typeof v === 'object' && !Array.isArray(v) && ('checked' in v || 'isChecked' in v || 'ticked' in v)) continue;
    if (isRawBase64Blob(v)) continue;

    consumed.add(fullNk);
    consumed.add(nk);

    let actualVal = v;
    let isOpt = hints.optionalKeys.has(nk);
    if (v && typeof v === 'object' && !Array.isArray(v) && 'value' in v && Object.keys(v).length <= 4) {
      actualVal = (v as any).value;
      if ((v as any).optional === true || (v as any).required === false) isOpt = true;
      if ((v as any).required === true || (v as any).optional === false) isOpt = false;
    }

    if (isRawBase64Blob(actualVal)) continue;

    const empty = isValueEmpty(actualVal);
    if (empty && !hints.requiredKeys.has(nk)) {
      isOpt = true;
    }

    items.push({
      key: k,
      label: humanizeFieldName(k),
      value: actualVal,
      isOptional: isOpt,
      isEmpty: empty,
      fullWidth: typeof actualVal === 'object' || (typeof actualVal === 'string' && actualVal.length > 65)
    });
  }

  return items;
}

export function extractCompleteOrderInspection(order: Order): ExtractedOrderInspection {
  const scopes = buildLookupScopes(order);
  const hints = buildFieldRequirementHints(order, scopes);
  const consumed = new Set<string>();

  const combinedTitle = `${order.formType || ''} ${order.formName || ''} ${order.legalData?.documentTitle || ''} ${order.legalData?.documentType || ''}`.toLowerCase();
  const isRentAgreement =
    combinedTitle.includes('rent') ||
    combinedTitle.includes('lease') ||
    combinedTitle.includes('tenancy') ||
    combinedTitle.includes('leave and license') ||
    combinedTitle.includes('leave_and_license') ||
    Boolean(order.legalData?.propertyDetails) ||
    Boolean((order.rawPayload as any)?.purposeOfTenancy) ||
    Boolean((order.rawPayload as any)?.leaseCommencementDate);

  const sections: ExtractedFormSection[] = [];

  const makeField = (
    id: string,
    label: string,
    candidateKeys: string[],
    opts: {
      defaultOptional?: boolean;
      customScopes?: Record<string, any>[];
      prefixGroup?: string;
      formatValue?: (val: any) => any;
      fullWidth?: boolean;
      fallbackValue?: any;
    } = {}
  ): ExtractedFieldItem => {
    const activeScopes = opts.customScopes || scopes;
    const res = lookupInScopes(activeScopes, candidateKeys, consumed, opts.prefixGroup);
    let val = res.found ? res.value : (opts.fallbackValue !== undefined ? opts.fallbackValue : null);
    if (opts.formatValue && !isValueEmpty(val)) {
      val = opts.formatValue(val);
    }
    const isOpt = resolveOptionalFlag(candidateKeys, Boolean(opts.defaultOptional), hints, activeScopes[0]);
    const empty = isValueEmpty(val);

    return {
      key: id,
      label,
      value: val,
      isOptional: isOpt,
      isEmpty: empty,
      fullWidth: opts.fullWidth || (typeof val === 'string' && val.length > 75) || (typeof val === 'object' && val !== null)
    };
  };

  if (order.category === 'registration' && order.registrationData) {
    const reg = order.registrationData;
    const regScopes = [reg, reg.extraFields || {}, ...scopes];

    sections.push({
      id: 'reg_overview',
      title: '1. Registration & Compliance Service Overview',
      subtitle: 'Selected service, jurisdiction & applicant identity',
      fields: [
        makeField('serviceTitle', 'Service / Form Selected', ['serviceTitle', 'formName', 'serviceType'], {
          fallbackValue: reg.serviceTitle || order.formName,
          customScopes: regScopes
        }),
        makeField('state', 'State / Union Territory', ['state', 'stateUt', 'jurisdictionState'], {
          fallbackValue: order.state || 'Delhi',
          customScopes: regScopes
        }),
        makeField('applicantName', 'Applicant Full Legal Name', ['applicantName', 'clientName', 'fullName'], {
          fallbackValue: reg.applicantName || order.clientName,
          customScopes: regScopes
        }),
        makeField('contactNumber', 'Mobile / Contact Number', ['contactNumber', 'clientPhone', 'phone', 'mobile'], {
          fallbackValue: reg.contactNumber || order.clientPhone,
          customScopes: regScopes
        }),
        makeField('email', 'Email Address', ['email', 'clientEmail'], {
          defaultOptional: true,
          fallbackValue: reg.email || order.clientEmail,
          customScopes: regScopes
        }),
        makeField('panNumber', 'PAN Number', ['panNumber', 'pan'], {
          defaultOptional: false,
          fallbackValue: reg.panNumber,
          customScopes: regScopes
        }),
        makeField('aadhaarNumber', 'Aadhaar Number', ['aadhaarNumber', 'aadhaar'], {
          defaultOptional: false,
          fallbackValue: reg.aadhaarNumber,
          customScopes: regScopes
        }),
        makeField('constitutionType', 'Business Constitution / Entity Type', ['constitutionType', 'entityType'], {
          defaultOptional: true,
          fallbackValue: reg.constitutionType,
          customScopes: regScopes
        }),
        makeField('businessName', 'Business / Trade Name', ['businessName', 'companyName', 'firmName'], {
          defaultOptional: true,
          fallbackValue: reg.businessName,
          customScopes: regScopes
        }),
        makeField('businessAddress', 'Business / Registered Address', ['businessAddress', 'address'], {
          defaultOptional: true,
          fullWidth: true,
          fallbackValue: reg.businessAddress,
          customScopes: regScopes
        }),
        makeField('annualTurnover', 'Annual Turnover / Income', ['annualTurnover', 'turnover'], {
          defaultOptional: true,
          fallbackValue: reg.annualTurnover,
          customScopes: regScopes
        }),
        makeField('taxYearOrAssessmentYear', 'Tax / Assessment Year', ['taxYearOrAssessmentYear', 'assessmentYear', 'financialYear'], {
          defaultOptional: true,
          fallbackValue: reg.taxYearOrAssessmentYear,
          customScopes: regScopes
        }),
        makeField('filingAckNumber', 'Filing Acknowledgement / ARN Number', ['filingAckNumber', 'ackNumber'], {
          defaultOptional: true,
          fallbackValue: reg.filingAckNumber,
          customScopes: regScopes
        }),
        makeField('officerNotes', 'Officer / Submission Notes', ['officerNotes', 'notes', 'remarks'], {
          defaultOptional: true,
          fullWidth: true,
          fallbackValue: reg.officerNotes,
          customScopes: regScopes
        })
      ]
    });

    if (reg.bankDetails) {
      sections.push({
        id: 'reg_bank',
        title: '2. Bank Account Details',
        fields: [
          makeField('bankName', 'Bank Name', ['bankName'], { customScopes: [reg.bankDetails], defaultOptional: true }),
          makeField('accountNumber', 'Account Number', ['accountNumber'], { customScopes: [reg.bankDetails], defaultOptional: true }),
          makeField('ifscCode', 'IFSC Code', ['ifscCode'], { customScopes: [reg.bankDetails], defaultOptional: true }),
          makeField('branch', 'Branch Name', ['branch'], { customScopes: [reg.bankDetails], defaultOptional: true })
        ]
      });
    }

    if (reg.vehicleDetails) {
      sections.push({
        id: 'reg_vehicle',
        title: '3. Vehicle / Insurance Details',
        fields: [
          makeField('registrationNumber', 'Vehicle Registration Number', ['registrationNumber'], { customScopes: [reg.vehicleDetails] }),
          makeField('vehicleMakeModel', 'Make & Model', ['vehicleMakeModel'], { customScopes: [reg.vehicleDetails] }),
          makeField('manufacturingYear', 'Manufacturing Year', ['manufacturingYear'], { customScopes: [reg.vehicleDetails], defaultOptional: true }),
          makeField('chassisNumber', 'Chassis Number', ['chassisNumber'], { customScopes: [reg.vehicleDetails], defaultOptional: true }),
          makeField('policyType', 'Policy Type', ['policyType'], { customScopes: [reg.vehicleDetails], defaultOptional: true })
        ]
      });
    }
  } else {
    // LEGAL DOCUMENT FORMS (Full 11-Month Rent Agreement + All Legal Formats)
    const parsedLegal = safeObj(order.legalData);
    const parsedRaw = safeObj(order.rawPayload);
    const p1Obj = safeObj(parsedLegal.party1 || parsedRaw.party1);
    const p2Obj = safeObj(parsedLegal.party2 || parsedRaw.party2);
    const propObj = safeObj(parsedLegal.propertyDetails || parsedRaw.propertyDetails);

    const p1Scopes = [p1Obj, ...scopes];
    const p2Scopes = [p2Obj, ...scopes];
    const propScopes = [propObj, ...scopes];

    // Section 1: Document Category, State & Stamp Paper Details
    const docFields: ExtractedFieldItem[] = [
      makeField(
        'documentCategory',
        'Document Category',
        ['documentCategory', 'rentCategory', 'leaseCategory', 'agreementCategory', 'tenancyCategory', 'premisesCategory', 'categoryType', 'subCategory', 'premisesType'],
        {
          defaultOptional: !isRentAgreement,
          fallbackValue: isRentAgreement
            ? (propObj.premisesType || ((order.formName || '').toLowerCase().includes('commercial') ? 'Commercial Lease Agreement' : 'Residential Rent Agreement'))
            : (order.formName || 'Legal Document')
        }
      ),
      makeField(
        'stateUt',
        'State / Union Territory',
        ['state', 'stateUt', 'stateOrUt', 'unionTerritory', 'jurisdictionState'],
        {
          fallbackValue: order.state || order.legalData?.state || 'Delhi'
        }
      ),
      ...(isRentAgreement
        ? [
            makeField(
              'purposeOfTenancy',
              'Purpose of Tenancy (Specific)',
              ['purposeOfTenancy', 'specificPurpose', 'tenancyPurpose', 'purpose', 'usagePurpose', 'rentPurpose', 'leasePurpose'],
              { defaultOptional: false }
            )
          ]
        : []),
      makeField(
        'stampPaperMode',
        'Stamp Paper Procurement Mode',
        ['stampPaperMode', 'stampProcurementMode', 'procurementMode', 'stampMode', 'eStampMode', 'stampPaperOption'],
        { defaultOptional: !isRentAgreement }
      ),
      makeField(
        'stampPaperValue',
        'Stamp Paper Value',
        ['stampDutyValue', 'stampDutyAmount', 'stampPaperValue', 'stampValue'],
        {
          fallbackValue: order.stampDutyValue ?? order.legalData?.stampDutyAmount,
          formatValue: (v) => `₹ ${v}`
        }
      ),
      makeField(
        'stampDutyPaidBy',
        'Stamp Duty Cost Paid By',
        ['stampDutyPaidBy', 'stampPaidBy', 'costPaidBy', 'stampCostPaidBy', 'dutyPaidBy'],
        {
          defaultOptional: !isRentAgreement,
          fallbackValue: order.stampDutyPaidBy || order.stampData?.stampDutyPaidBy
        }
      ),
      makeField(
        'executionDate',
        'Execution Date',
        ['executionDate', 'agreementDate', 'dateOfExecution'],
        { defaultOptional: true, fallbackValue: order.legalData?.executionDate }
      ),
      makeField(
        'executionPlace',
        'Execution Place / City',
        ['executionPlace', 'placeOfExecution', 'city'],
        { defaultOptional: true, fallbackValue: order.legalData?.executionPlace }
      )
    ];

    sections.push({
      id: 'doc_config',
      title: '1. Document Category, State & Stamp Paper Configuration',
      subtitle: 'Selected category, jurisdiction, purpose & stamp procurement details',
      fields: docFields
    });

    // Helper for relationship prefix in Father's/Husband's Name
    const p1RelType = p1Obj.relationshipType || (order.rawPayload as any)?.party1RelationshipType || '';
    const p2RelType = p2Obj.relationshipType || (order.rawPayload as any)?.party2RelationshipType || '';

    // Section 2: First Party (Lessor / Landlord)
    const p1Fields: ExtractedFieldItem[] = [
      ...(isRentAgreement
        ? [
            makeField(
              'landlordEntityType',
              'Lessor / Landlord Entity Type',
              ['entityType', 'landlordEntityType', 'lessorEntityType', 'firstPartyEntityType', 'party1EntityType'],
              { customScopes: p1Scopes, prefixGroup: 'party1', defaultOptional: false }
            )
          ]
        : [
            makeField(
              'party1EntityType',
              'First Party Entity Type',
              ['entityType', 'firstPartyEntityType', 'party1EntityType'],
              { customScopes: p1Scopes, prefixGroup: 'party1', defaultOptional: true }
            )
          ]),
      makeField(
        'party1FullName',
        'Full Legal Name',
        ['fullName', 'name', 'landlordName', 'lessorName', 'firstPartyName', 'firstParty', 'clientName'],
        {
          customScopes: p1Scopes,
          prefixGroup: 'party1',
          fallbackValue: p1Obj.fullName || order.clientName
        }
      ),
      makeField(
        'party1RelativeName',
        "Father's / Husband's Name",
        ['fatherHusbandName', 'fatherOrHusbandName', 'relativeName', 'fatherName', 'husbandName', 'landlordFatherName', 'lessorFatherName', 'party1FatherName'],
        {
          customScopes: p1Scopes,
          prefixGroup: 'party1',
          defaultOptional: false,
          fallbackValue: p1Obj.relativeName,
          formatValue: (v) => (p1RelType && !String(v).startsWith(p1RelType) ? `${p1RelType} ${v}` : v)
        }
      ),
      makeField(
        'party1Age',
        'Age (Years)',
        ['age', 'landlordAge', 'lessorAge', 'party1Age'],
        { customScopes: p1Scopes, prefixGroup: 'party1', defaultOptional: false, fallbackValue: p1Obj.age }
      ),
      makeField(
        'party1Address',
        'Full Residential / Registered Address',
        ['address', 'fullAddress', 'permanentAddress', 'currentAddress', 'landlordAddress', 'lessorAddress', 'party1Address'],
        {
          customScopes: p1Scopes,
          prefixGroup: 'party1',
          fullWidth: true,
          fallbackValue: p1Obj.address,
          formatValue: (v) => (p1Obj.pincode && !String(v).includes(String(p1Obj.pincode)) ? `${v} — PIN: ${p1Obj.pincode}` : v)
        }
      ),
      makeField(
        'party1Phone',
        'Current Mobile Number',
        ['phone', 'mobile', 'mobileNumber', 'contactNumber', 'landlordPhone', 'landlordMobile', 'clientPhone'],
        { customScopes: p1Scopes, prefixGroup: 'party1', fallbackValue: p1Obj.phone || order.clientPhone }
      ),
      makeField(
        'party1Email',
        'Email Address',
        ['email', 'emailAddress', 'landlordEmail', 'lessorEmail', 'clientEmail'],
        { customScopes: p1Scopes, prefixGroup: 'party1', defaultOptional: true, fallbackValue: p1Obj.email || order.clientEmail }
      ),
      makeField(
        'party1Aadhaar',
        'Aadhaar Card Number',
        ['aadhaar', 'aadhaarNumber', 'aadhaarCard', 'aadhar', 'aadharNumber', 'aadhaarLast4', 'landlordAadhaar', 'lessorAadhaar'],
        {
          customScopes: p1Scopes,
          prefixGroup: 'party1',
          defaultOptional: false,
          fallbackValue: p1Obj.aadhaarLast4 ? `XXXX-XXXX-${p1Obj.aadhaarLast4}` : undefined
        }
      ),
      makeField(
        'party1Pan',
        'PAN Card Number',
        ['pan', 'panNumber', 'panCard', 'landlordPan', 'lessorPan'],
        { customScopes: p1Scopes, prefixGroup: 'party1', defaultOptional: true, fallbackValue: p1Obj.pan }
      ),
      makeField(
        'party1Poa',
        'Signed by a Power of Attorney (POA) Holder',
        ['signedByPoa', 'signedByPoaHolder', 'isPoaHolder', 'poaSigned', 'landlordPoa'],
        {
          customScopes: p1Scopes,
          prefixGroup: 'party1',
          defaultOptional: true,
          formatValue: (v) => {
            if (typeof v === 'boolean') return v ? 'Yes — Signed by POA Holder' : 'No (Self-Signed)';
            return v;
          }
        }
      ),
      makeField(
        'party1PoaHolderName',
        'POA Holder Name / Details',
        ['poaHolderName', 'poaDetails', 'poaHolder'],
        {
          customScopes: p1Scopes,
          prefixGroup: 'party1',
          defaultOptional: true
        }
      ),
      makeField(
        'propertyOwnershipProofType',
        'Proof of Property Ownership Type',
        ['propertyOwnershipProofType', 'proofOfPropertyOwnerType', 'proofOfPropertyOwnership', 'ownershipProofType', 'propertyProofType', 'landlordProofType', 'ownershipDocumentType'],
        { customScopes: p1Scopes, prefixGroup: 'party1', defaultOptional: true }
      )
    ];

    const extraP1Fields = collectRemainingFields(p1Obj, consumed, hints, 'party1');
    p1Fields.push(...extraP1Fields);

    sections.push({
      id: 'party1',
      title: isRentAgreement ? '2. First Party — Lessor / Landlord Details' : '2. First Party Details',
      subtitle: 'Entity type, identity, contact, IDs, POA & ownership proof details',
      fields: p1Fields
    });

    // Section 3: Second Party (Lessee / Tenant)
    const hasParty2 = Boolean(order.legalData?.party2 || (order.rawPayload as any)?.party2 || isRentAgreement || (order.rawPayload as any)?.tenantName || (order.rawPayload as any)?.secondParty);
    if (hasParty2) {
      const p2Fields: ExtractedFieldItem[] = [
        ...(isRentAgreement
          ? [
              makeField(
                'lesseeEntityType',
                'Lessee / Tenant Entity Type',
                ['entityType', 'lesseeEntityType', 'tenantEntityType', 'secondPartyEntityType', 'party2EntityType'],
                { customScopes: p2Scopes, prefixGroup: 'party2', defaultOptional: true }
              )
            ]
          : []),
        makeField(
          'party2FullName',
          'Full Legal Name',
          ['fullName', 'name', 'tenantName', 'lesseeName', 'secondPartyName', 'secondParty'],
          { customScopes: p2Scopes, prefixGroup: 'party2', fallbackValue: p2Obj.fullName }
        ),
        makeField(
          'party2RelativeName',
          "Father's / Husband's Name",
          ['fatherHusbandName', 'fatherOrHusbandName', 'relativeName', 'fatherName', 'husbandName', 'tenantFatherName', 'lesseeFatherName', 'party2FatherName'],
          {
            customScopes: p2Scopes,
            prefixGroup: 'party2',
            defaultOptional: false,
            fallbackValue: p2Obj.relativeName,
            formatValue: (v) => (p2RelType && !String(v).startsWith(p2RelType) ? `${p2RelType} ${v}` : v)
          }
        ),
        makeField(
          'party2Age',
          'Age (Years)',
          ['age', 'tenantAge', 'lesseeAge', 'party2Age'],
          { customScopes: p2Scopes, prefixGroup: 'party2', defaultOptional: false, fallbackValue: p2Obj.age }
        ),
        makeField(
          'party2Address',
          'Permanent / Current Address',
          ['address', 'fullAddress', 'permanentAddress', 'currentAddress', 'tenantAddress', 'lesseeAddress', 'party2Address'],
          {
            customScopes: p2Scopes,
            prefixGroup: 'party2',
            fullWidth: true,
            fallbackValue: p2Obj.address,
            formatValue: (v) => (p2Obj.pincode && !String(v).includes(String(p2Obj.pincode)) ? `${v} — PIN: ${p2Obj.pincode}` : v)
          }
        ),
        makeField(
          'party2Phone',
          'Mobile Number',
          ['phone', 'mobile', 'mobileNumber', 'contactNumber', 'tenantPhone', 'tenantMobile', 'lesseePhone'],
          { customScopes: p2Scopes, prefixGroup: 'party2', fallbackValue: p2Obj.phone }
        ),
        makeField(
          'party2Email',
          'Email Address',
          ['email', 'emailAddress', 'tenantEmail', 'lesseeEmail'],
          { customScopes: p2Scopes, prefixGroup: 'party2', defaultOptional: true, fallbackValue: p2Obj.email }
        ),
        makeField(
          'party2Aadhaar',
          'Aadhaar Card Number',
          ['aadhaar', 'aadhaarNumber', 'aadhaarCard', 'aadhar', 'aadharNumber', 'aadhaarLast4', 'tenantAadhaar', 'lesseeAadhaar'],
          {
            customScopes: p2Scopes,
            prefixGroup: 'party2',
            defaultOptional: false,
            fallbackValue: p2Obj.aadhaarLast4 ? `XXXX-XXXX-${p2Obj.aadhaarLast4}` : undefined
          }
        ),
        makeField(
          'party2Pan',
          'PAN Card Number',
          ['pan', 'panNumber', 'panCard', 'tenantPan', 'lesseePan'],
          { customScopes: p2Scopes, prefixGroup: 'party2', defaultOptional: true, fallbackValue: p2Obj.pan }
        ),
        ...(isRentAgreement
          ? [
              makeField(
                'occupantDetails',
                'Occupant / Family Member Details',
                ['occupantDetails', 'familyMemberDetails', 'occupants', 'familyMembers', 'coTenants', 'occupantFamilyDetails', 'additionalOccupants'],
                { customScopes: p2Scopes, prefixGroup: 'party2', defaultOptional: true, fullWidth: true }
              )
            ]
          : [])
      ];

      const extraP2Fields = collectRemainingFields(p2Obj, consumed, hints, 'party2');
      p2Fields.push(...extraP2Fields);

      sections.push({
        id: 'party2',
        title: isRentAgreement ? '3. Second Party — Lessee / Tenant Details' : '3. Second Party Details',
        subtitle: 'Tenant identity, contact, Aadhaar/PAN & occupant / family member details',
        fields: p2Fields
      });
    }

    // Section 4: Property & Lease Terms (for Rent Agreements or if propertyDetails present)
    if (isRentAgreement || Object.keys(propObj).length > 0) {
      const propFields: ExtractedFieldItem[] = [
        makeField(
          'rentedPropertyAddress',
          'Rented Premises / Property Full Address',
          ['fullAddress', 'propertyAddress', 'rentedPropertyAddress', 'premisesAddress'],
          { customScopes: propScopes, prefixGroup: 'propertyDetails', fullWidth: true, fallbackValue: propObj.fullAddress }
        ),
        makeField(
          'premisesType',
          'Premises / Property Type',
          ['premisesType', 'propertyType', 'accommodationType', 'configuration'],
          { customScopes: propScopes, prefixGroup: 'propertyDetails', defaultOptional: true, fallbackValue: propObj.premisesType }
        ),
        makeField(
          'leaseTenure',
          'Lease Tenure / Duration',
          ['leaseTenure', 'leaseDuration', 'leaseTenureDuration', 'agreementDurationMonths', 'tenureDuration', 'durationMonths', 'tenure'],
          {
            customScopes: propScopes,
            prefixGroup: 'propertyDetails',
            defaultOptional: false,
            fallbackValue: propObj.agreementDurationMonths ? `${propObj.agreementDurationMonths} Months` : undefined
          }
        ),
        makeField(
          'leaseCommencementDate',
          'Lease Commencement Date',
          ['leaseCommencementDate', 'commencementDate', 'leaseStartDate', 'startDate', 'tenancyStartDate', 'effectiveDate'],
          { customScopes: propScopes, prefixGroup: 'propertyDetails', defaultOptional: false }
        ),
        makeField(
          'leaseEndDate',
          'Lease End / Expiry Date',
          ['leaseEndDate', 'leaseExpiryDate', 'expiryDate', 'endDate'],
          { customScopes: propScopes, prefixGroup: 'propertyDetails', defaultOptional: true }
        ),
        makeField(
          'monthlyRent',
          'Monthly Rent Amount',
          ['monthlyRentOrConsideration', 'monthlyRent', 'rentAmount', 'rent'],
          {
            customScopes: propScopes,
            prefixGroup: 'propertyDetails',
            fallbackValue: propObj.monthlyRentOrConsideration,
            formatValue: (v) => (String(v).includes('₹') ? v : `₹ ${v}`)
          }
        ),
        makeField(
          'securityDeposit',
          'Refundable Security Deposit',
          ['securityDeposit', 'depositAmount', 'deposit'],
          {
            customScopes: propScopes,
            prefixGroup: 'propertyDetails',
            fallbackValue: propObj.securityDeposit,
            formatValue: (v) => (String(v).includes('₹') ? v : `₹ ${v}`)
          }
        ),
        makeField(
          'maintenanceCharges',
          'Monthly Maintenance Charges',
          ['maintenanceCharges', 'monthlyMaintenance', 'societyMaintenance'],
          { customScopes: propScopes, prefixGroup: 'propertyDetails', defaultOptional: true }
        ),
        makeField(
          'lockInPeriodMonths',
          'Lock-In Period',
          ['lockInPeriodMonths', 'lockInPeriod', 'lockin'],
          { customScopes: propScopes, prefixGroup: 'propertyDetails', defaultOptional: true, fallbackValue: propObj.lockInPeriodMonths }
        ),
        makeField(
          'noticePeriodDays',
          'Notice Period',
          ['noticePeriodDays', 'noticePeriod', 'noticePeriodMonths'],
          { customScopes: propScopes, prefixGroup: 'propertyDetails', defaultOptional: true, fallbackValue: propObj.noticePeriodDays }
        ),
        makeField(
          'utilityChargesBorneBy',
          'Utility Charges Borne By (Electricity / Water)',
          ['utilityChargesBorneBy', 'electricityWaterCharges', 'utilitiesPaidBy'],
          { customScopes: propScopes, prefixGroup: 'propertyDetails', defaultOptional: true, fallbackValue: propObj.utilityChargesBorneBy }
        )
      ];

      const extraPropFields = collectRemainingFields(propObj, consumed, hints, 'propertyDetails');
      propFields.push(...extraPropFields);

      sections.push({
        id: 'property_terms',
        title: '4. Rented Property & Lease Tenure Details',
        subtitle: 'Lease duration, commencement date, rent, deposit & terms',
        fields: propFields
      });
    }

    // Affidavit Details if applicable
    if (order.legalData?.affidavitDetails) {
      const aff = order.legalData.affidavitDetails;
      sections.push({
        id: 'affidavit_details',
        title: 'Affidavit & Sworn Declaration Details',
        fields: [
          makeField('deponentName', 'Deponent Name', ['deponentName'], { customScopes: [aff], defaultOptional: true }),
          makeField('reasonForAffidavit', 'Reason for Affidavit', ['reasonForAffidavit'], { customScopes: [aff], defaultOptional: true, fullWidth: true }),
          makeField('oldName', 'Old / Previous Name', ['oldName'], { customScopes: [aff], defaultOptional: true }),
          makeField('newName', 'New / Corrected Name', ['newName'], { customScopes: [aff], defaultOptional: true }),
          makeField('gapDuration', 'Gap Duration', ['gapDuration'], { customScopes: [aff], defaultOptional: true }),
          makeField('educationalInstitution', 'Educational Institution', ['educationalInstitution'], { customScopes: [aff], defaultOptional: true }),
          makeField('declarationStatements', 'Declaration Statements', ['declarationStatements'], { customScopes: [aff], defaultOptional: true, fullWidth: true })
        ]
      });
    }
  }

  // Extract Checkboxes (Ticked & Unticked)
  const checkboxes = extractAllCheckboxes(order, scopes);

  // Collect ALL remaining fields from rawPayload, formData, fields, answers, extraFields so NOTHING is ever dropped
  const remainingFieldsMap = new Map<string, ExtractedFieldItem>();
  for (const scope of scopes) {
    const remaining = collectRemainingFields(scope, consumed, hints);
    for (const item of remaining) {
      const nk = normalizeKey(item.key);
      if (!remainingFieldsMap.has(nk)) {
        remainingFieldsMap.set(nk, item);
      }
    }
  }

  if (remainingFieldsMap.size > 0) {
    sections.push({
      id: 'additional_submitted_fields',
      title: 'Additional & Custom Submitted Form Fields',
      subtitle: 'All extra fields, selections & optional inputs sent from Website A',
      fields: Array.from(remainingFieldsMap.values())
    });
  }

  const allFields = sections.flatMap((s) => s.fields);
  const filledFieldsCount = allFields.filter((f) => !f.isEmpty).length;
  const optionalEmptyCount = allFields.filter((f) => f.isEmpty && f.isOptional).length;
  const tickedCount = checkboxes.filter((c) => c.checked).length;
  const untickedCount = checkboxes.filter((c) => !c.checked).length;

  return {
    isRentAgreement,
    sections,
    checkboxes,
    totalFieldsCount: allFields.length,
    filledFieldsCount,
    optionalEmptyCount,
    tickedCount,
    untickedCount
  };
}
