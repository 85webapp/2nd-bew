/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Edit Tab Component — Complete A-to-Z Order & Form Editor
 * Allows viewing and editing 100% of submitted Website A form fields,
 * optional fields, parties, occupants, POA/ownership proof, property & lease terms,
 * clauses, witnesses, checkboxes, registration fields, and custom extra fields.
 */

import React, { useState } from 'react';
import { Order, LegalOrderData, DocumentClause } from '../types';
import { formatDateStandard } from '../utils/dateTime';
import { REQUEST_GROUP_IDS } from '../utils/templates';
import { extractCompleteOrderInspection, humanizeFieldName } from '../utils/formFieldExtractor';
import {
  Search,
  ChevronDown,
  Pencil,
  Save,
  ArrowLeft,
  Check,
  RotateCcw,
  User,
  Phone,
  FileText,
  Plus,
  Trash2,
  CheckSquare,
  Square,
  ShieldCheck,
  Building2,
  Users,
  Layers
} from 'lucide-react';

interface EditViewProps {
  orders: Order[];
  currentOrder: Order | null;
  onSelectOrder: (order: Order) => void;
  onSaveOrder: (updatedOrder: Order) => void;
  onSendNotification?: (message: string) => void;
}

interface EditableOccupant {
  name: string;
  relationship: string;
  age: string;
  idNumber: string;
}

interface EditableCheckbox {
  key: string;
  label: string;
  checked: boolean;
  group?: string;
}

interface EditableExtraField {
  key: string;
  label: string;
  value: string;
  isJson: boolean;
}

interface FullEditDraft {
  // General & Doc Config
  formName: string;
  documentTitle: string;
  documentCategory: string;
  state: string;
  purposeOfTenancy: string;
  stampPaperMode: string;
  stampDutyAmount: string;
  stampDutyPaidBy: string;
  executionDate: string;
  executionPlace: string;

  // Party 1
  p1EntityType: string;
  p1FullName: string;
  p1RelationshipType: string;
  p1RelativeName: string;
  p1Age: string;
  p1Phone: string;
  p1Email: string;
  p1Aadhaar: string;
  p1Pan: string;
  p1Address: string;
  p1Pincode: string;
  p1SignedByPoa: boolean;
  p1PoaHolderName: string;
  p1OwnershipProofType: string;

  // Party 2
  hasParty2: boolean;
  p2EntityType: string;
  p2FullName: string;
  p2RelationshipType: string;
  p2RelativeName: string;
  p2Age: string;
  p2Phone: string;
  p2Email: string;
  p2Aadhaar: string;
  p2Pan: string;
  p2Address: string;
  p2Pincode: string;
  occupantsText: string;
  occupantsList: EditableOccupant[];

  // Property & Lease Terms
  hasProperty: boolean;
  premisesType: string;
  propertyAddress: string;
  leaseTenure: string;
  leaseCommencementDate: string;
  leaseEndDate: string;
  monthlyRent: string;
  securityDeposit: string;
  maintenanceCharges: string;
  lockInPeriodMonths: string;
  noticePeriodDays: string;
  utilityChargesBorneBy: string;

  // Affidavit
  hasAffidavit: boolean;
  deponentName: string;
  reasonForAffidavit: string;
  oldName: string;
  newName: string;
  gapDuration: string;
  educationalInstitution: string;
  declarationStatements: string[];

  // Clauses & Witnesses
  clauses: DocumentClause[];
  witnesses: Array<{ name: string; address: string; phone: string }>;

  // Registration Data
  hasRegistration: boolean;
  regForm: any;

  // Checkboxes
  checkboxes: EditableCheckbox[];

  // All remaining custom/extra fields from rawPayload
  extraFields: EditableExtraField[];
}

function firstNonEmpty(...vals: any[]): string {
  for (const v of vals) {
    if (v !== undefined && v !== null && String(v).trim() !== '' && String(v).trim() !== 'Not Provided') {
      return String(v);
    }
  }
  return '';
}

function buildInitialDraft(order: Order): FullEditDraft {
  const raw = (order.rawPayload && typeof order.rawPayload === 'object') ? order.rawPayload : {};
  const formData = raw.formData || raw.fields || raw.answers || raw.data || {};
  const ld = order.legalData;
  const p1 = ld?.party1 || raw.party1 || formData.party1 || ({} as any);
  const p2 = ld?.party2 || raw.party2 || formData.party2 || null;
  const prop = ld?.propertyDetails || raw.propertyDetails || formData.propertyDetails || null;
  const aff = ld?.affidavitDetails || raw.affidavitDetails || null;

  const inspection = extractCompleteOrderInspection(order);

  const findExtracted = (sectionId: string, fieldKey: string): string => {
    const sec = inspection.sections.find((s) => s.id === sectionId);
    const fld = sec?.fields.find((f) => f.key === fieldKey);
    if (!fld || fld.isEmpty || fld.value === null || fld.value === undefined) return '';
    return String(fld.value).replace(/^₹\s*/, '').trim();
  };

  // Parse occupants
  const rawOccupants =
    p2?.occupantDetails ??
    raw.occupantDetails ??
    raw.familyMemberDetails ??
    raw.occupants ??
    formData.occupantDetails ??
    '';

  let occupantsList: EditableOccupant[] = [];
  let occupantsText = '';
  if (Array.isArray(rawOccupants)) {
    occupantsList = rawOccupants.map((occ: any) =>
      typeof occ === 'object' && occ !== null
        ? {
            name: occ.name || occ.fullName || '',
            relationship: occ.relationship || occ.relation || '',
            age: occ.age !== undefined ? String(occ.age) : '',
            idNumber: occ.idNumber || occ.aadhaar || occ.id || ''
          }
        : { name: String(occ), relationship: '', age: '', idNumber: '' }
    );
  } else if (rawOccupants && typeof rawOccupants === 'object') {
    occupantsText = JSON.stringify(rawOccupants, null, 2);
  } else if (rawOccupants) {
    occupantsText = String(rawOccupants);
  }

  // Collect remaining unmapped fields from additional_submitted_fields section
  const additionalSec = inspection.sections.find((s) => s.id === 'additional_submitted_fields');
  const knownCoveredExtraKeys = new Set([
    'documentCategory', 'rentCategory', 'leaseCategory', 'agreementCategory',
    'purposeOfTenancy', 'specificPurpose', 'stampPaperMode', 'stampProcurementMode',
    'stampDutyPaidBy', 'signedByPoa', 'poaHolderName', 'propertyOwnershipProofType',
    'occupantDetails', 'familyMemberDetails', 'leaseCommencementDate', 'leaseEndDate',
    'maintenanceCharges', 'state', 'clientEmail', 'uploadedFiles', 'docketId', 'formName'
  ]);

  const extraFields: EditableExtraField[] = [];
  if (additionalSec) {
    additionalSec.fields.forEach((f) => {
      if (knownCoveredExtraKeys.has(f.key)) return;
      const isObj = typeof f.value === 'object' && f.value !== null;
      extraFields.push({
        key: f.key,
        label: f.label,
        value: f.isEmpty ? '' : isObj ? JSON.stringify(f.value, null, 2) : String(f.value),
        isJson: isObj
      });
    });
  }

  // Also include any explicit legalData.extraFields not already listed
  const explicitExtra = ld?.extraFields || order.registrationData?.extraFields || {};
  Object.entries(explicitExtra).forEach(([k, v]) => {
    if (knownCoveredExtraKeys.has(k)) return;
    if (extraFields.some((ef) => ef.key === k)) return;
    const isObj = typeof v === 'object' && v !== null;
    extraFields.push({
      key: k,
      label: humanizeFieldName(k),
      value: v === undefined || v === null ? '' : isObj ? JSON.stringify(v, null, 2) : String(v),
      isJson: isObj
    });
  });

  const checkboxes: EditableCheckbox[] = inspection.checkboxes.map((cb) => ({
    key: cb.key,
    label: cb.label,
    checked: Boolean(cb.checked),
    group: cb.group
  }));

  const isRent = inspection.isRentAgreement;

  return {
    formName: order.formName || ld?.documentTitle || '',
    documentTitle: ld?.documentTitle || order.formName || '',
    documentCategory: firstNonEmpty(
      raw.documentCategory,
      formData.documentCategory,
      prop?.premisesType,
      findExtracted('doc_config', 'documentCategory')
    ),
    state: firstNonEmpty(order.state, ld?.state, raw.state, 'Delhi'),
    purposeOfTenancy: firstNonEmpty(
      raw.purposeOfTenancy,
      formData.purposeOfTenancy,
      raw.specificPurpose,
      findExtracted('doc_config', 'purposeOfTenancy')
    ),
    stampPaperMode: firstNonEmpty(
      raw.stampPaperMode,
      raw.stampProcurementMode,
      formData.stampPaperMode,
      findExtracted('doc_config', 'stampPaperMode')
    ),
    stampDutyAmount: String(ld?.stampDutyAmount ?? order.stampDutyValue ?? 0),
    stampDutyPaidBy: firstNonEmpty(
      order.stampDutyPaidBy,
      raw.stampDutyPaidBy,
      order.stampData?.stampDutyPaidBy,
      formData.stampDutyPaidBy
    ),
    executionDate: firstNonEmpty(ld?.executionDate, raw.executionDate, new Date().toISOString().split('T')[0]),
    executionPlace: firstNonEmpty(ld?.executionPlace, raw.executionPlace, order.state, 'Delhi'),

    p1EntityType: firstNonEmpty(p1.entityType, raw.landlordEntityType, raw.firstPartyEntityType),
    p1FullName: firstNonEmpty(p1.fullName, order.clientName),
    p1RelationshipType: firstNonEmpty(p1.relationshipType, raw.party1RelationshipType, 'S/o'),
    p1RelativeName: firstNonEmpty(p1.relativeName, raw.fatherHusbandName, raw.landlordFatherName),
    p1Age: p1.age !== undefined && p1.age !== null ? String(p1.age) : firstNonEmpty(raw.landlordAge),
    p1Phone: firstNonEmpty(p1.phone, order.clientPhone),
    p1Email: firstNonEmpty(p1.email, order.clientEmail),
    p1Aadhaar: firstNonEmpty(p1.aadhaar, p1.aadhaarNumber, p1.aadhaarLast4, raw.landlordAadhaar),
    p1Pan: firstNonEmpty(p1.pan, p1.panNumber, raw.landlordPan),
    p1Address: firstNonEmpty(p1.address, raw.landlordAddress),
    p1Pincode: firstNonEmpty(p1.pincode, raw.landlordPincode),
    p1SignedByPoa: Boolean(p1.signedByPoa ?? raw.signedByPoa ?? formData.signedByPoa),
    p1PoaHolderName: firstNonEmpty(p1.poaHolderName, raw.poaHolderName, formData.poaHolderName),
    p1OwnershipProofType: firstNonEmpty(
      p1.propertyOwnershipProofType,
      raw.propertyOwnershipProofType,
      raw.proofOfPropertyOwnerType,
      formData.propertyOwnershipProofType
    ),

    hasParty2: Boolean(p2 || isRent),
    p2EntityType: firstNonEmpty(p2?.entityType, raw.lesseeEntityType, raw.secondPartyEntityType),
    p2FullName: firstNonEmpty(p2?.fullName, raw.tenantName),
    p2RelationshipType: firstNonEmpty(p2?.relationshipType, raw.party2RelationshipType, 'S/o'),
    p2RelativeName: firstNonEmpty(p2?.relativeName, raw.tenantFatherName),
    p2Age: p2?.age !== undefined && p2?.age !== null ? String(p2.age) : firstNonEmpty(raw.tenantAge),
    p2Phone: firstNonEmpty(p2?.phone, raw.tenantPhone),
    p2Email: firstNonEmpty(p2?.email, raw.tenantEmail),
    p2Aadhaar: firstNonEmpty(p2?.aadhaar, p2?.aadhaarNumber, p2?.aadhaarLast4, raw.tenantAadhaar),
    p2Pan: firstNonEmpty(p2?.pan, p2?.panNumber, raw.tenantPan),
    p2Address: firstNonEmpty(p2?.address, raw.tenantAddress),
    p2Pincode: firstNonEmpty(p2?.pincode, raw.tenantPincode),
    occupantsText,
    occupantsList,

    hasProperty: Boolean(prop || isRent),
    premisesType: firstNonEmpty(prop?.premisesType, raw.premisesType),
    propertyAddress: firstNonEmpty(prop?.fullAddress, raw.rentedPropertyAddress, raw.propertyAddress),
    leaseTenure: firstNonEmpty(
      prop?.leaseTenure,
      prop?.agreementDurationMonths !== undefined ? String(prop.agreementDurationMonths) : '',
      raw.leaseTenure
    ),
    leaseCommencementDate: firstNonEmpty(prop?.leaseCommencementDate, raw.leaseCommencementDate, raw.commencementDate),
    leaseEndDate: firstNonEmpty(prop?.leaseEndDate, raw.leaseEndDate),
    monthlyRent: prop?.monthlyRentOrConsideration !== undefined && prop?.monthlyRentOrConsideration !== null
      ? String(prop.monthlyRentOrConsideration)
      : firstNonEmpty(raw.monthlyRent),
    securityDeposit: prop?.securityDeposit !== undefined && prop?.securityDeposit !== null
      ? String(prop.securityDeposit)
      : firstNonEmpty(raw.securityDeposit),
    maintenanceCharges: firstNonEmpty(prop?.maintenanceCharges, raw.maintenanceCharges),
    lockInPeriodMonths: prop?.lockInPeriodMonths !== undefined && prop?.lockInPeriodMonths !== null
      ? String(prop.lockInPeriodMonths)
      : firstNonEmpty(raw.lockInPeriodMonths),
    noticePeriodDays: prop?.noticePeriodDays !== undefined && prop?.noticePeriodDays !== null
      ? String(prop.noticePeriodDays)
      : firstNonEmpty(raw.noticePeriodDays),
    utilityChargesBorneBy: firstNonEmpty(prop?.utilityChargesBorneBy, raw.utilityChargesBorneBy, 'Tenant'),

    hasAffidavit: Boolean(aff),
    deponentName: firstNonEmpty(aff?.deponentName),
    reasonForAffidavit: firstNonEmpty(aff?.reasonForAffidavit),
    oldName: firstNonEmpty(aff?.oldName),
    newName: firstNonEmpty(aff?.newName),
    gapDuration: firstNonEmpty(aff?.gapDuration),
    educationalInstitution: firstNonEmpty(aff?.educationalInstitution),
    declarationStatements: Array.isArray(aff?.declarationStatements) ? [...aff.declarationStatements] : [],

    clauses: Array.isArray(ld?.clauses)
      ? ld.clauses.map((c) => ({ ...c }))
      : Array.isArray(raw.clauses)
      ? raw.clauses.map((c: any, idx: number) => ({
          id: c.id || `clause_${idx + 1}`,
          title: c.title || `Clause ${idx + 1}`,
          body: c.body || String(c)
        }))
      : [],

    witnesses: Array.isArray(ld?.witnesses)
      ? ld.witnesses.map((w) => ({ name: w.name || '', address: w.address || '', phone: w.phone || '' }))
      : Array.isArray(raw.witnesses)
      ? raw.witnesses.map((w: any) => ({ name: w.name || '', address: w.address || '', phone: w.phone || '' }))
      : [],

    hasRegistration: Boolean(order.category === 'registration' || order.registrationData),
    regForm: order.registrationData
      ? JSON.parse(JSON.stringify(order.registrationData))
      : {
          serviceType: order.formType || 'registration',
          serviceTitle: order.formName || '',
          applicantName: order.clientName || '',
          contactNumber: order.clientPhone || '',
          email: order.clientEmail || '',
          panNumber: '',
          aadhaarNumber: '',
          constitutionType: 'Proprietorship',
          businessName: '',
          businessAddress: '',
          annualTurnover: '',
          taxYearOrAssessmentYear: '',
          filingAckNumber: '',
          officerNotes: '',
          documentChecklist: []
        },

    checkboxes,
    extraFields
  };
}

export const EditView: React.FC<EditViewProps> = ({
  orders,
  onSelectOrder,
  onSaveOrder
}) => {
  const editableOrders = orders;

  const [categoryFilter, setCategoryFilter] = useState<
    'all' | 'requests' | 'normal_doc' | 'all_states' | 'filing_notices' | 'insurance_registration' | 'bank_loans' | 'website'
  >('all');
  const [searchQuery, setSearchQuery] = useState('');

  const [activeEditingOrder, setActiveEditingOrder] = useState<Order | null>(null);
  const [draft, setDraft] = useState<FullEditDraft | null>(null);
  const [isSaved, setIsSaved] = useState(false);

  // Add custom field / checkbox inline inputs
  const [newExtraKey, setNewExtraKey] = useState('');
  const [newExtraVal, setNewExtraVal] = useState('');
  const [newCheckboxLabel, setNewCheckboxLabel] = useState('');

  const filteredOrders = editableOrders
    .filter((order) => {
      if (categoryFilter === 'requests') {
        const isReq = order.legalGroup === 'requests' || REQUEST_GROUP_IDS.includes(order.formType);
        if (!isReq) return false;
      } else if (categoryFilter === 'normal_doc') {
        const isReq = order.legalGroup === 'requests' || REQUEST_GROUP_IDS.includes(order.formType);
        if (order.category !== 'legal' || isReq) return false;
      } else if (categoryFilter === 'all_states') {
        if (order.subCategory !== 'all_states') return false;
      } else if (categoryFilter === 'filing_notices') {
        if (order.subCategory !== 'filing_notices') return false;
      } else if (categoryFilter === 'insurance_registration') {
        if (order.subCategory !== 'insurance_registration') return false;
      } else if (categoryFilter === 'bank_loans') {
        if (order.subCategory !== 'bank_loans') return false;
      } else if (categoryFilter === 'website') {
        if (order.subCategory !== 'website') return false;
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const p1 = order.legalData?.party1?.fullName?.toLowerCase() || order.clientName.toLowerCase();
        const fn = order.formName.toLowerCase();
        const id = order.id.toLowerCase();
        if (!p1.includes(q) && !fn.includes(q) && !id.includes(q)) return false;
      }

      return true;
    })
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const handleOpenEdit = (order: Order) => {
    setActiveEditingOrder(order);
    onSelectOrder(order);
    setDraft(buildInitialDraft(order));
    setIsSaved(false);
    setNewExtraKey('');
    setNewExtraVal('');
    setNewCheckboxLabel('');
  };

  const handleCloseEdit = () => {
    setActiveEditingOrder(null);
    setDraft(null);
  };

  const handleSaveFullOrder = () => {
    if (!activeEditingOrder || !draft) return;

    const prevRaw =
      activeEditingOrder.rawPayload && typeof activeEditingOrder.rawPayload === 'object'
        ? activeEditingOrder.rawPayload
        : {};

    const parsedExtraObj: Record<string, any> = {};
    draft.extraFields.forEach((ef) => {
      if (!ef.key.trim()) return;
      if (ef.isJson) {
        try {
          parsedExtraObj[ef.key] = JSON.parse(ef.value);
        } catch {
          parsedExtraObj[ef.key] = ef.value;
        }
      } else {
        parsedExtraObj[ef.key] = ef.value;
      }
    });

    const resolvedOccupants =
      draft.occupantsList.length > 0
        ? draft.occupantsList
        : draft.occupantsText.trim()
        ? draft.occupantsText.trim()
        : '';

    const dutyNum = Number(draft.stampDutyAmount) || 0;

    const updatedParty1: any = {
      ...(activeEditingOrder.legalData?.party1 || {}),
      entityType: draft.p1EntityType || undefined,
      fullName: draft.p1FullName,
      relationshipType: (draft.p1RelationshipType as any) || 'S/o',
      relativeName: draft.p1RelativeName,
      age: draft.p1Age,
      phone: draft.p1Phone,
      email: draft.p1Email,
      aadhaarLast4: draft.p1Aadhaar,
      aadhaar: draft.p1Aadhaar,
      pan: draft.p1Pan,
      address: draft.p1Address,
      pincode: draft.p1Pincode,
      signedByPoa: draft.p1SignedByPoa,
      poaHolderName: draft.p1PoaHolderName,
      propertyOwnershipProofType: draft.p1OwnershipProofType
    };

    const updatedParty2: any = draft.hasParty2
      ? {
          ...(activeEditingOrder.legalData?.party2 || {}),
          entityType: draft.p2EntityType || undefined,
          fullName: draft.p2FullName,
          relationshipType: (draft.p2RelationshipType as any) || 'S/o',
          relativeName: draft.p2RelativeName,
          age: draft.p2Age,
          phone: draft.p2Phone,
          email: draft.p2Email,
          aadhaarLast4: draft.p2Aadhaar,
          aadhaar: draft.p2Aadhaar,
          pan: draft.p2Pan,
          address: draft.p2Address,
          pincode: draft.p2Pincode,
          occupantDetails: resolvedOccupants
        }
      : undefined;

    const updatedProperty: any = draft.hasProperty
      ? {
          ...(activeEditingOrder.legalData?.propertyDetails || {}),
          premisesType: draft.premisesType || draft.documentCategory,
          fullAddress: draft.propertyAddress,
          leaseTenure: draft.leaseTenure,
          agreementDurationMonths: /^\d+$/.test(draft.leaseTenure.trim()) ? Number(draft.leaseTenure.trim()) : draft.leaseTenure,
          leaseCommencementDate: draft.leaseCommencementDate,
          leaseEndDate: draft.leaseEndDate,
          monthlyRentOrConsideration: draft.monthlyRent,
          securityDeposit: draft.securityDeposit,
          maintenanceCharges: draft.maintenanceCharges,
          lockInPeriodMonths: draft.lockInPeriodMonths,
          noticePeriodDays: draft.noticePeriodDays,
          utilityChargesBorneBy: draft.utilityChargesBorneBy as any
        }
      : undefined;

    const updatedAffidavit = draft.hasAffidavit
      ? {
          deponentName: draft.deponentName,
          reasonForAffidavit: draft.reasonForAffidavit,
          oldName: draft.oldName,
          newName: draft.newName,
          gapDuration: draft.gapDuration,
          educationalInstitution: draft.educationalInstitution,
          declarationStatements: draft.declarationStatements
        }
      : undefined;

    const updatedCheckboxesObj: Record<string, { label: string; checked: boolean; group?: string }> = {};
    draft.checkboxes.forEach((cb) => {
      updatedCheckboxesObj[cb.key] = {
        label: cb.label,
        checked: cb.checked,
        group: cb.group
      };
    });

    const isLegalOrder = activeEditingOrder.category === 'legal' || Boolean(activeEditingOrder.legalData) || !draft.hasRegistration;

    const updatedLegalData: LegalOrderData | undefined = isLegalOrder
      ? {
          ...(activeEditingOrder.legalData || ({} as any)),
          documentType: activeEditingOrder.legalData?.documentType || activeEditingOrder.formType || 'custom_document',
          documentTitle: draft.documentTitle || draft.formName,
          stampDutyAmount: dutyNum,
          state: draft.state,
          executionDate: draft.executionDate,
          executionPlace: draft.executionPlace,
          party1: updatedParty1,
          ...(updatedParty2 ? { party2: updatedParty2 } : {}),
          ...(updatedProperty ? { propertyDetails: updatedProperty } : {}),
          ...(updatedAffidavit ? { affidavitDetails: updatedAffidavit } : {}),
          clauses: draft.clauses,
          witnesses: draft.witnesses.filter((w) => w.name.trim() || w.address.trim() || w.phone.trim()),
          extraFields: {
            ...(activeEditingOrder.legalData?.extraFields || {}),
            documentCategory: draft.documentCategory,
            purposeOfTenancy: draft.purposeOfTenancy,
            stampPaperMode: draft.stampPaperMode,
            stampDutyPaidBy: draft.stampDutyPaidBy,
            ...parsedExtraObj
          }
        }
      : activeEditingOrder.legalData;

    const updatedRegData = draft.hasRegistration
      ? {
          ...draft.regForm,
          extraFields: {
            ...(draft.regForm?.extraFields || {}),
            ...parsedExtraObj
          }
        }
      : activeEditingOrder.registrationData;

    // Build synchronized rawPayload so View tab & PDF renderer reflect 100% of edited values
    const updatedRawPayload: Record<string, any> = {
      ...prevRaw,
      formName: draft.formName || draft.documentTitle,
      documentTitle: draft.documentTitle || draft.formName,
      documentCategory: draft.documentCategory,
      state: draft.state,
      purposeOfTenancy: draft.purposeOfTenancy,
      stampPaperMode: draft.stampPaperMode,
      stampDutyAmount: dutyNum,
      stampDutyValue: dutyNum,
      stampDutyPaidBy: draft.stampDutyPaidBy,
      executionDate: draft.executionDate,
      executionPlace: draft.executionPlace,
      party1: updatedParty1,
      ...(updatedParty2 ? { party2: updatedParty2 } : {}),
      ...(updatedProperty ? { propertyDetails: updatedProperty } : {}),
      ...(updatedAffidavit ? { affidavitDetails: updatedAffidavit } : {}),
      clauses: draft.clauses,
      witnesses: draft.witnesses,
      checkboxes: updatedCheckboxesObj,
      signedByPoa: draft.p1SignedByPoa,
      poaHolderName: draft.p1PoaHolderName,
      propertyOwnershipProofType: draft.p1OwnershipProofType,
      occupantDetails: resolvedOccupants,
      ...parsedExtraObj
    };

    // Keep nested formData / fields / answers in sync if Website A sent them
    if (prevRaw.formData && typeof prevRaw.formData === 'object') {
      updatedRawPayload.formData = {
        ...prevRaw.formData,
        documentCategory: draft.documentCategory,
        purposeOfTenancy: draft.purposeOfTenancy,
        stampPaperMode: draft.stampPaperMode,
        stampDutyPaidBy: draft.stampDutyPaidBy,
        signedByPoa: draft.p1SignedByPoa,
        poaHolderName: draft.p1PoaHolderName,
        propertyOwnershipProofType: draft.p1OwnershipProofType,
        occupantDetails: resolvedOccupants,
        checkboxes: updatedCheckboxesObj,
        ...parsedExtraObj
      };
    }

    const updatedOrder: Order = {
      ...activeEditingOrder,
      formName: draft.formName || draft.documentTitle || activeEditingOrder.formName,
      state: draft.state,
      stampDutyPaidBy: draft.stampDutyPaidBy,
      stampDutyValue: dutyNum,
      clientName: draft.hasRegistration && !isLegalOrder ? draft.regForm.applicantName || draft.p1FullName : draft.p1FullName,
      clientPhone: draft.hasRegistration && !isLegalOrder ? draft.regForm.contactNumber || draft.p1Phone : draft.p1Phone,
      clientEmail: draft.hasRegistration && !isLegalOrder ? draft.regForm.email || draft.p1Email : draft.p1Email,
      legalData: updatedLegalData,
      registrationData: updatedRegData,
      rawPayload: updatedRawPayload,
      updatedAt: new Date().toISOString()
    };

    onSaveOrder(updatedOrder);
    setActiveEditingOrder(updatedOrder);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2500);
  };

  // ===================== IF EDIT IS OPENED: FULL A-TO-Z FORM EDITOR ===================== //
  if (activeEditingOrder && draft) {
    return (
      <div className="space-y-5 pb-24 max-w-5xl mx-auto">
        {/* Top Sticky Save Header */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-xs flex flex-wrap items-center justify-between gap-3 sticky top-14 z-20">
          <div className="flex items-center gap-3">
            <button
              onClick={handleCloseEdit}
              className="flex items-center gap-1.5 text-xs font-bold text-slate-700 hover:text-blue-600 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Orders</span>
            </button>
            <div>
              <h2 className="text-sm sm:text-base font-black text-slate-900 uppercase">
                {draft.formName || activeEditingOrder.formName}
              </h2>
              <p className="text-[11px] text-slate-500 font-mono">
                Order ID: {activeEditingOrder.id} • Full A-to-Z Editor
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setDraft(buildInitialDraft(activeEditingOrder))}
              className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg border border-gray-200 transition-colors"
              title="Reset to Last Saved Values"
            >
              <RotateCcw className="w-4 h-4" />
            </button>

            <button
              onClick={handleSaveFullOrder}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold transition-all shadow-sm active:scale-95 ${
                isSaved ? 'bg-emerald-600 text-white' : 'bg-blue-600 hover:bg-blue-700 text-white'
              }`}
            >
              {isSaved ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
              <span>{isSaved ? 'Saved Successfully!' : 'Save All Changes'}</span>
            </button>
          </div>
        </div>

        {/* SECTION 1: DOCUMENT CATEGORY, STATE & STAMP CONFIGURATION */}
        <div className="bg-white rounded-2xl border border-gray-200 p-5 sm:p-6 shadow-xs space-y-4">
          <div className="flex items-center gap-2 border-b border-gray-100 pb-2">
            <FileText className="w-4 h-4 text-blue-600" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">
              1. Document Category, State & Stamp Paper Configuration
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
            <div>
              <label className="block text-slate-700 font-bold mb-1">
                Form Name <span className="text-[10px] font-semibold text-red-600">(Mandatory)</span>
              </label>
              <input
                type="text"
                value={draft.formName}
                onChange={(e) => setDraft({ ...draft, formName: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 font-bold bg-white"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-bold mb-1">
                Document Category <span className="text-[10px] font-semibold text-slate-400">(Optional)</span>
              </label>
              <input
                type="text"
                value={draft.documentCategory}
                onChange={(e) => setDraft({ ...draft, documentCategory: e.target.value })}
                placeholder="e.g. Residential / Commercial Lease Agreement"
                className="w-full px-3 py-2 rounded-lg border border-gray-300 bg-white"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-bold mb-1">
                State / Union Territory <span className="text-[10px] font-semibold text-red-600">(Mandatory)</span>
              </label>
              <input
                type="text"
                value={draft.state}
                onChange={(e) => setDraft({ ...draft, state: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 bg-white font-semibold"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-bold mb-1">
                Purpose of Tenancy <span className="text-[10px] font-semibold text-slate-400">(Optional)</span>
              </label>
              <input
                type="text"
                value={draft.purposeOfTenancy}
                onChange={(e) => setDraft({ ...draft, purposeOfTenancy: e.target.value })}
                placeholder="e.g. Strictly Residential Accommodation"
                className="w-full px-3 py-2 rounded-lg border border-gray-300 bg-white"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-bold mb-1">
                Stamp Paper Mode <span className="text-[10px] font-semibold text-slate-400">(Optional)</span>
              </label>
              <input
                type="text"
                value={draft.stampPaperMode}
                onChange={(e) => setDraft({ ...draft, stampPaperMode: e.target.value })}
                placeholder="e.g. Digital e-Stamp / Physical"
                className="w-full px-3 py-2 rounded-lg border border-gray-300 bg-white"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-bold mb-1">
                Stamp Duty Amount (₹) <span className="text-[10px] font-semibold text-red-600">(Mandatory)</span>
              </label>
              <input
                type="number"
                value={draft.stampDutyAmount}
                onChange={(e) => setDraft({ ...draft, stampDutyAmount: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 font-mono font-bold bg-white text-blue-600"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-bold mb-1">
                Stamp Duty Paid By <span className="text-[10px] font-semibold text-slate-400">(Optional)</span>
              </label>
              <input
                type="text"
                value={draft.stampDutyPaidBy}
                onChange={(e) => setDraft({ ...draft, stampDutyPaidBy: e.target.value })}
                placeholder="First Party / Second Party / 50-50"
                className="w-full px-3 py-2 rounded-lg border border-gray-300 bg-white"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-bold mb-1">
                Execution Date <span className="text-[10px] font-semibold text-slate-400">(Optional)</span>
              </label>
              <input
                type="text"
                value={draft.executionDate}
                onChange={(e) => setDraft({ ...draft, executionDate: e.target.value })}
                placeholder="YYYY-MM-DD"
                className="w-full px-3 py-2 rounded-lg border border-gray-300 font-mono bg-white"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-bold mb-1">
                Execution Place / City <span className="text-[10px] font-semibold text-slate-400">(Optional)</span>
              </label>
              <input
                type="text"
                value={draft.executionPlace}
                onChange={(e) => setDraft({ ...draft, executionPlace: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 bg-white"
              />
            </div>
          </div>
        </div>

        {/* SECTION 2: FIRST PARTY (LESSOR / LANDLORD) */}
        <div className="bg-white rounded-2xl border border-gray-200 p-5 sm:p-6 shadow-xs space-y-4">
          <div className="flex items-center gap-2 border-b border-gray-100 pb-2">
            <User className="w-4 h-4 text-blue-600" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">
              2. First Party — Lessor / Landlord / Applicant Details
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
            <div>
              <label className="block text-slate-700 font-bold mb-1">
                Entity Type <span className="text-[10px] font-semibold text-slate-400">(Optional)</span>
              </label>
              <input
                type="text"
                value={draft.p1EntityType}
                onChange={(e) => setDraft({ ...draft, p1EntityType: e.target.value })}
                placeholder="Individual / Company / HUF"
                className="w-full px-3 py-2 rounded-lg border border-gray-300 bg-white"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-bold mb-1">
                Full Legal Name <span className="text-[10px] font-semibold text-red-600">(Mandatory)</span>
              </label>
              <input
                type="text"
                value={draft.p1FullName}
                onChange={(e) => setDraft({ ...draft, p1FullName: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 font-bold bg-white"
              />
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="block text-slate-700 font-bold mb-1">Relation</label>
                <select
                  value={draft.p1RelationshipType}
                  onChange={(e) => setDraft({ ...draft, p1RelationshipType: e.target.value })}
                  className="w-full px-2 py-2 rounded-lg border border-gray-300 bg-white"
                >
                  <option value="S/o">S/o</option>
                  <option value="D/o">D/o</option>
                  <option value="W/o">W/o</option>
                  <option value="Director">Director</option>
                  <option value="Partner">Partner</option>
                </select>
              </div>
              <div className="col-span-2">
                <label className="block text-slate-700 font-bold mb-1">Father's / Husband's Name</label>
                <input
                  type="text"
                  value={draft.p1RelativeName}
                  onChange={(e) => setDraft({ ...draft, p1RelativeName: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 bg-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-slate-700 font-bold mb-1">Age (Years)</label>
              <input
                type="text"
                value={draft.p1Age}
                onChange={(e) => setDraft({ ...draft, p1Age: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 bg-white"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-bold mb-1">
                Mobile Number <span className="text-[10px] font-semibold text-red-600">(Mandatory)</span>
              </label>
              <input
                type="text"
                value={draft.p1Phone}
                onChange={(e) => setDraft({ ...draft, p1Phone: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 font-mono bg-white"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-bold mb-1">
                Email Address <span className="text-[10px] font-semibold text-slate-400">(Optional)</span>
              </label>
              <input
                type="email"
                value={draft.p1Email}
                onChange={(e) => setDraft({ ...draft, p1Email: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 bg-white"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-bold mb-1">Aadhaar Number / Last 4</label>
              <input
                type="text"
                value={draft.p1Aadhaar}
                onChange={(e) => setDraft({ ...draft, p1Aadhaar: e.target.value })}
                placeholder="XXXX-XXXX-1234"
                className="w-full px-3 py-2 rounded-lg border border-gray-300 font-mono bg-white"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-bold mb-1">
                PAN Card Number <span className="text-[10px] font-semibold text-slate-400">(Optional)</span>
              </label>
              <input
                type="text"
                value={draft.p1Pan}
                onChange={(e) => setDraft({ ...draft, p1Pan: e.target.value.toUpperCase() })}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 font-mono bg-white"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-bold mb-1">
                PIN Code <span className="text-[10px] font-semibold text-slate-400">(Optional)</span>
              </label>
              <input
                type="text"
                value={draft.p1Pincode}
                onChange={(e) => setDraft({ ...draft, p1Pincode: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 font-mono bg-white"
              />
            </div>

            <div className="sm:col-span-2 lg:col-span-3">
              <label className="block text-slate-700 font-bold mb-1">Full Residential / Registered Address</label>
              <textarea
                rows={2}
                value={draft.p1Address}
                onChange={(e) => setDraft({ ...draft, p1Address: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 bg-white"
              />
            </div>

            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => setDraft({ ...draft, p1SignedByPoa: !draft.p1SignedByPoa })}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-bold transition-colors w-full ${
                  draft.p1SignedByPoa
                    ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                    : 'bg-slate-50 border-gray-300 text-slate-600'
                }`}
              >
                {draft.p1SignedByPoa ? <CheckSquare className="w-4 h-4 text-emerald-600" /> : <Square className="w-4 h-4 text-slate-400" />}
                <span>Signed by POA Holder (Optional)</span>
              </button>
            </div>

            <div>
              <label className="block text-slate-700 font-bold mb-1">
                POA Holder Name <span className="text-[10px] font-semibold text-slate-400">(Optional)</span>
              </label>
              <input
                type="text"
                value={draft.p1PoaHolderName}
                onChange={(e) => setDraft({ ...draft, p1PoaHolderName: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 bg-white"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-bold mb-1">
                Property Ownership Proof Type <span className="text-[10px] font-semibold text-slate-400">(Optional)</span>
              </label>
              <input
                type="text"
                value={draft.p1OwnershipProofType}
                onChange={(e) => setDraft({ ...draft, p1OwnershipProofType: e.target.value })}
                placeholder="e.g. Sale Deed / Conveyance Deed / Electricity Bill"
                className="w-full px-3 py-2 rounded-lg border border-gray-300 bg-white"
              />
            </div>
          </div>
        </div>

        {/* SECTION 3: SECOND PARTY (LESSEE / TENANT) */}
        <div className="bg-white rounded-2xl border border-gray-200 p-5 sm:p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-gray-100 pb-2">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-blue-600" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                3. Second Party — Lessee / Tenant Details
              </h3>
            </div>
            {!draft.hasParty2 && (
              <button
                type="button"
                onClick={() => setDraft({ ...draft, hasParty2: true })}
                className="flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-700 bg-blue-50 px-3 py-1 rounded-lg border border-blue-200"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Second Party</span>
              </button>
            )}
          </div>

          {draft.hasParty2 && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">
                    Entity Type <span className="text-[10px] font-semibold text-slate-400">(Optional)</span>
                  </label>
                  <input
                    type="text"
                    value={draft.p2EntityType}
                    onChange={(e) => setDraft({ ...draft, p2EntityType: e.target.value })}
                    placeholder="Individual / Company"
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 bg-white"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">Full Legal Name</label>
                  <input
                    type="text"
                    value={draft.p2FullName}
                    onChange={(e) => setDraft({ ...draft, p2FullName: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 font-bold bg-white"
                  />
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block text-slate-700 font-bold mb-1">Relation</label>
                    <select
                      value={draft.p2RelationshipType}
                      onChange={(e) => setDraft({ ...draft, p2RelationshipType: e.target.value })}
                      className="w-full px-2 py-2 rounded-lg border border-gray-300 bg-white"
                    >
                      <option value="S/o">S/o</option>
                      <option value="D/o">D/o</option>
                      <option value="W/o">W/o</option>
                      <option value="Director">Director</option>
                      <option value="Partner">Partner</option>
                    </select>
                  </div>
                  <div className="col-span-2">
                    <label className="block text-slate-700 font-bold mb-1">Father's / Husband's Name</label>
                    <input
                      type="text"
                      value={draft.p2RelativeName}
                      onChange={(e) => setDraft({ ...draft, p2RelativeName: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg border border-gray-300 bg-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">Age (Years)</label>
                  <input
                    type="text"
                    value={draft.p2Age}
                    onChange={(e) => setDraft({ ...draft, p2Age: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 bg-white"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">Mobile Number</label>
                  <input
                    type="text"
                    value={draft.p2Phone}
                    onChange={(e) => setDraft({ ...draft, p2Phone: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 font-mono bg-white"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">
                    Email Address <span className="text-[10px] font-semibold text-slate-400">(Optional)</span>
                  </label>
                  <input
                    type="email"
                    value={draft.p2Email}
                    onChange={(e) => setDraft({ ...draft, p2Email: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 bg-white"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">Aadhaar Number / Last 4</label>
                  <input
                    type="text"
                    value={draft.p2Aadhaar}
                    onChange={(e) => setDraft({ ...draft, p2Aadhaar: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 font-mono bg-white"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">
                    PAN Card Number <span className="text-[10px] font-semibold text-slate-400">(Optional)</span>
                  </label>
                  <input
                    type="text"
                    value={draft.p2Pan}
                    onChange={(e) => setDraft({ ...draft, p2Pan: e.target.value.toUpperCase() })}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 font-mono bg-white"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">
                    PIN Code <span className="text-[10px] font-semibold text-slate-400">(Optional)</span>
                  </label>
                  <input
                    type="text"
                    value={draft.p2Pincode}
                    onChange={(e) => setDraft({ ...draft, p2Pincode: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 font-mono bg-white"
                  />
                </div>

                <div className="sm:col-span-2 lg:col-span-3">
                  <label className="block text-slate-700 font-bold mb-1">Permanent / Current Address</label>
                  <textarea
                    rows={2}
                    value={draft.p2Address}
                    onChange={(e) => setDraft({ ...draft, p2Address: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 bg-white"
                  />
                </div>
              </div>

              {/* Occupant / Family Member Details */}
              <div className="pt-3 border-t border-gray-100 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700">
                    Occupant / Family Member Details <span className="text-[10px] font-semibold text-slate-400">(Optional)</span>
                  </label>
                  <button
                    type="button"
                    onClick={() =>
                      setDraft({
                        ...draft,
                        occupantsList: [...draft.occupantsList, { name: '', relationship: '', age: '', idNumber: '' }]
                      })
                    }
                    className="flex items-center gap-1 text-[11px] font-bold text-blue-600 hover:text-blue-700 bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-200"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Add Occupant</span>
                  </button>
                </div>

                {draft.occupantsList.map((occ, idx) => (
                  <div key={idx} className="grid grid-cols-1 sm:grid-cols-5 gap-2 items-center bg-slate-50 p-2.5 rounded-lg border border-slate-200 text-xs">
                    <input
                      type="text"
                      value={occ.name}
                      onChange={(e) => {
                        const copy = [...draft.occupantsList];
                        copy[idx].name = e.target.value;
                        setDraft({ ...draft, occupantsList: copy });
                      }}
                      placeholder="Occupant Name"
                      className="sm:col-span-2 px-2.5 py-1.5 rounded border border-gray-300 bg-white"
                    />
                    <input
                      type="text"
                      value={occ.relationship}
                      onChange={(e) => {
                        const copy = [...draft.occupantsList];
                        copy[idx].relationship = e.target.value;
                        setDraft({ ...draft, occupantsList: copy });
                      }}
                      placeholder="Relationship"
                      className="px-2.5 py-1.5 rounded border border-gray-300 bg-white"
                    />
                    <input
                      type="text"
                      value={occ.age}
                      onChange={(e) => {
                        const copy = [...draft.occupantsList];
                        copy[idx].age = e.target.value;
                        setDraft({ ...draft, occupantsList: copy });
                      }}
                      placeholder="Age"
                      className="px-2.5 py-1.5 rounded border border-gray-300 bg-white"
                    />
                    <div className="flex items-center gap-1">
                      <input
                        type="text"
                        value={occ.idNumber}
                        onChange={(e) => {
                          const copy = [...draft.occupantsList];
                          copy[idx].idNumber = e.target.value;
                          setDraft({ ...draft, occupantsList: copy });
                        }}
                        placeholder="ID / Aadhaar"
                        className="w-full px-2.5 py-1.5 rounded border border-gray-300 bg-white"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setDraft({
                            ...draft,
                            occupantsList: draft.occupantsList.filter((_, i) => i !== idx)
                          })
                        }
                        className="p-1.5 text-red-500 hover:bg-red-50 rounded"
                        title="Remove occupant"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}

                {draft.occupantsList.length === 0 && (
                  <textarea
                    rows={2}
                    value={draft.occupantsText}
                    onChange={(e) => setDraft({ ...draft, occupantsText: e.target.value })}
                    placeholder="Enter occupant / family member names or click Add Occupant above..."
                    className="w-full px-3 py-2 text-xs rounded-lg border border-gray-300 bg-white"
                  />
                )}
              </div>
            </div>
          )}
        </div>

        {/* SECTION 4: RENTED PROPERTY & LEASE TENURE DETAILS */}
        <div className="bg-white rounded-2xl border border-gray-200 p-5 sm:p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-gray-100 pb-2">
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-blue-600" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                4. Rented Property & Lease Tenure Details
              </h3>
            </div>
            {!draft.hasProperty && (
              <button
                type="button"
                onClick={() => setDraft({ ...draft, hasProperty: true })}
                className="flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-700 bg-blue-50 px-3 py-1 rounded-lg border border-blue-200"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Property Terms</span>
              </button>
            )}
          </div>

          {draft.hasProperty && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
              <div className="sm:col-span-2 lg:col-span-3">
                <label className="block text-slate-700 font-bold mb-1">Rented Premises Full Address</label>
                <textarea
                  rows={2}
                  value={draft.propertyAddress}
                  onChange={(e) => setDraft({ ...draft, propertyAddress: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 bg-white"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">
                  Premises Type <span className="text-[10px] font-semibold text-slate-400">(Optional)</span>
                </label>
                <input
                  type="text"
                  value={draft.premisesType}
                  onChange={(e) => setDraft({ ...draft, premisesType: e.target.value })}
                  placeholder="e.g. 2 BHK Residential Flat / Shop"
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 bg-white"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Lease Tenure / Duration (Months)</label>
                <input
                  type="text"
                  value={draft.leaseTenure}
                  onChange={(e) => setDraft({ ...draft, leaseTenure: e.target.value })}
                  placeholder="e.g. 11"
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 bg-white"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Lease Commencement Date</label>
                <input
                  type="text"
                  value={draft.leaseCommencementDate}
                  onChange={(e) => setDraft({ ...draft, leaseCommencementDate: e.target.value })}
                  placeholder="YYYY-MM-DD"
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 font-mono bg-white"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">
                  Lease End / Expiry Date <span className="text-[10px] font-semibold text-slate-400">(Optional)</span>
                </label>
                <input
                  type="text"
                  value={draft.leaseEndDate}
                  onChange={(e) => setDraft({ ...draft, leaseEndDate: e.target.value })}
                  placeholder="YYYY-MM-DD"
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 font-mono bg-white"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Monthly Rent / Consideration (₹)</label>
                <input
                  type="text"
                  value={draft.monthlyRent}
                  onChange={(e) => setDraft({ ...draft, monthlyRent: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 font-bold bg-white"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Refundable Security Deposit (₹)</label>
                <input
                  type="text"
                  value={draft.securityDeposit}
                  onChange={(e) => setDraft({ ...draft, securityDeposit: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 font-bold bg-white"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">
                  Monthly Maintenance Charges <span className="text-[10px] font-semibold text-slate-400">(Optional)</span>
                </label>
                <input
                  type="text"
                  value={draft.maintenanceCharges}
                  onChange={(e) => setDraft({ ...draft, maintenanceCharges: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 bg-white"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">
                  Lock-In Period (Months) <span className="text-[10px] font-semibold text-slate-400">(Optional)</span>
                </label>
                <input
                  type="text"
                  value={draft.lockInPeriodMonths}
                  onChange={(e) => setDraft({ ...draft, lockInPeriodMonths: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 bg-white"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">
                  Notice Period (Days) <span className="text-[10px] font-semibold text-slate-400">(Optional)</span>
                </label>
                <input
                  type="text"
                  value={draft.noticePeriodDays}
                  onChange={(e) => setDraft({ ...draft, noticePeriodDays: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 bg-white"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">
                  Utilities Borne By <span className="text-[10px] font-semibold text-slate-400">(Optional)</span>
                </label>
                <select
                  value={draft.utilityChargesBorneBy}
                  onChange={(e) => setDraft({ ...draft, utilityChargesBorneBy: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 bg-white"
                >
                  <option value="Tenant">Tenant</option>
                  <option value="Owner">Owner</option>
                  <option value="Shared">Shared</option>
                </select>
              </div>
            </div>
          )}
        </div>

        {/* SECTION 5: REGISTRATION FIELDS (IF APPLICABLE) */}
        {draft.hasRegistration && draft.regForm && (
          <div className="bg-white rounded-2xl border border-gray-200 p-5 sm:p-6 shadow-xs space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 border-b border-gray-100 pb-2">
              5. Registration & Compliance Service Parameters
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
              <div>
                <label className="block text-slate-700 font-bold mb-1">Applicant Full Name</label>
                <input
                  type="text"
                  value={draft.regForm.applicantName || ''}
                  onChange={(e) => setDraft({ ...draft, regForm: { ...draft.regForm, applicantName: e.target.value } })}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 bg-white font-bold"
                />
              </div>
              <div>
                <label className="block text-slate-700 font-bold mb-1">Contact Number</label>
                <input
                  type="text"
                  value={draft.regForm.contactNumber || ''}
                  onChange={(e) => setDraft({ ...draft, regForm: { ...draft.regForm, contactNumber: e.target.value } })}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 bg-white font-mono"
                />
              </div>
              <div>
                <label className="block text-slate-700 font-bold mb-1">Email</label>
                <input
                  type="email"
                  value={draft.regForm.email || ''}
                  onChange={(e) => setDraft({ ...draft, regForm: { ...draft.regForm, email: e.target.value } })}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 bg-white"
                />
              </div>
              <div>
                <label className="block text-slate-700 font-bold mb-1">PAN Number</label>
                <input
                  type="text"
                  value={draft.regForm.panNumber || ''}
                  onChange={(e) => setDraft({ ...draft, regForm: { ...draft.regForm, panNumber: e.target.value.toUpperCase() } })}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 font-mono bg-white"
                />
              </div>
              <div>
                <label className="block text-slate-700 font-bold mb-1">Aadhaar Number</label>
                <input
                  type="text"
                  value={draft.regForm.aadhaarNumber || ''}
                  onChange={(e) => setDraft({ ...draft, regForm: { ...draft.regForm, aadhaarNumber: e.target.value } })}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 font-mono bg-white"
                />
              </div>
              <div>
                <label className="block text-slate-700 font-bold mb-1">Constitution / Entity Type</label>
                <input
                  type="text"
                  value={draft.regForm.constitutionType || ''}
                  onChange={(e) => setDraft({ ...draft, regForm: { ...draft.regForm, constitutionType: e.target.value } })}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 bg-white"
                />
              </div>
              <div>
                <label className="block text-slate-700 font-bold mb-1">Business Name</label>
                <input
                  type="text"
                  value={draft.regForm.businessName || ''}
                  onChange={(e) => setDraft({ ...draft, regForm: { ...draft.regForm, businessName: e.target.value } })}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 bg-white"
                />
              </div>
              <div>
                <label className="block text-slate-700 font-bold mb-1">Annual Turnover</label>
                <input
                  type="text"
                  value={draft.regForm.annualTurnover || ''}
                  onChange={(e) => setDraft({ ...draft, regForm: { ...draft.regForm, annualTurnover: e.target.value } })}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 bg-white"
                />
              </div>
              <div>
                <label className="block text-slate-700 font-bold mb-1">Assessment Year</label>
                <input
                  type="text"
                  value={draft.regForm.taxYearOrAssessmentYear || ''}
                  onChange={(e) => setDraft({ ...draft, regForm: { ...draft.regForm, taxYearOrAssessmentYear: e.target.value } })}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 bg-white"
                />
              </div>
              <div className="sm:col-span-2 lg:col-span-3">
                <label className="block text-slate-700 font-bold mb-1">Business Address</label>
                <textarea
                  rows={2}
                  value={draft.regForm.businessAddress || ''}
                  onChange={(e) => setDraft({ ...draft, regForm: { ...draft.regForm, businessAddress: e.target.value } })}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 bg-white"
                />
              </div>
              <div className="sm:col-span-2 lg:col-span-3">
                <label className="block text-slate-700 font-bold mb-1">Officer Notes / Filing ACK</label>
                <input
                  type="text"
                  value={draft.regForm.officerNotes || ''}
                  onChange={(e) => setDraft({ ...draft, regForm: { ...draft.regForm, officerNotes: e.target.value } })}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 bg-white"
                />
              </div>
            </div>
          </div>
        )}

        {/* SECTION 6: CLAUSES & COVENANTS */}
        <div className="bg-white rounded-2xl border border-gray-200 p-5 sm:p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-gray-100 pb-2">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-blue-600" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                Clauses & Covenants ({draft.clauses.length})
              </h3>
            </div>
            <button
              type="button"
              onClick={() =>
                setDraft({
                  ...draft,
                  clauses: [
                    ...draft.clauses,
                    { id: `custom_${Date.now()}`, title: `Clause ${draft.clauses.length + 1}`, body: '', isCustom: true }
                  ]
                })
              }
              className="flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-700 bg-blue-50 px-3 py-1 rounded-lg border border-blue-200"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Clause</span>
            </button>
          </div>

          {draft.clauses.length === 0 ? (
            <p className="text-xs text-slate-500">
              No custom clauses attached — standard statutory format clauses are used unless you add custom ones here.
            </p>
          ) : (
            <div className="space-y-3">
              {draft.clauses.map((cl, idx) => (
                <div key={cl.id || idx} className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2 text-xs">
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={cl.title}
                      onChange={(e) => {
                        const copy = [...draft.clauses];
                        copy[idx] = { ...copy[idx], title: e.target.value };
                        setDraft({ ...draft, clauses: copy });
                      }}
                      placeholder="Clause Title"
                      className="flex-1 px-2.5 py-1.5 rounded-lg border border-gray-300 bg-white font-bold"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setDraft({
                          ...draft,
                          clauses: draft.clauses.filter((_, i) => i !== idx)
                        })
                      }
                      className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg"
                      title="Delete clause"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  <textarea
                    rows={2}
                    value={cl.body}
                    onChange={(e) => {
                      const copy = [...draft.clauses];
                      copy[idx] = { ...copy[idx], body: e.target.value };
                      setDraft({ ...draft, clauses: copy });
                    }}
                    placeholder="Clause body text..."
                    className="w-full px-2.5 py-1.5 rounded-lg border border-gray-300 bg-white"
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* SECTION 7: CHECKBOXES & SELECTIONS (TICKED / NOT TICKED) */}
        <div className="bg-white rounded-2xl border border-gray-200 p-5 sm:p-6 shadow-xs space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 pb-2">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-blue-600" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                Checkboxes & Selections ({draft.checkboxes.length})
              </h3>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={newCheckboxLabel}
                onChange={(e) => setNewCheckboxLabel(e.target.value)}
                placeholder="New checkbox label..."
                className="px-2.5 py-1 text-xs rounded-lg border border-gray-300 bg-white"
              />
              <button
                type="button"
                onClick={() => {
                  if (!newCheckboxLabel.trim()) return;
                  const cleanKey = newCheckboxLabel.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_');
                  setDraft({
                    ...draft,
                    checkboxes: [
                      ...draft.checkboxes,
                      { key: cleanKey, label: newCheckboxLabel.trim(), checked: true, group: 'Custom' }
                    ]
                  });
                  setNewCheckboxLabel('');
                }}
                className="flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-700 bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-200"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add</span>
              </button>
            </div>
          </div>

          {draft.checkboxes.length === 0 ? (
            <p className="text-xs text-slate-500">No checkboxes submitted yet. Add one above if needed.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {draft.checkboxes.map((cb, idx) => (
                <button
                  key={`${cb.key}-${idx}`}
                  type="button"
                  onClick={() => {
                    const copy = [...draft.checkboxes];
                    copy[idx] = { ...copy[idx], checked: !copy[idx].checked };
                    setDraft({ ...draft, checkboxes: copy });
                  }}
                  className={`flex items-center justify-between gap-2 px-3 py-2.5 rounded-lg border text-left text-xs transition-colors ${
                    cb.checked
                      ? 'bg-emerald-50/80 border-emerald-300 text-emerald-950'
                      : 'bg-slate-50 border-gray-300 text-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {cb.checked ? (
                      <CheckSquare className="w-4 h-4 text-emerald-600 shrink-0" />
                    ) : (
                      <Square className="w-4 h-4 text-slate-400 shrink-0" />
                    )}
                    <span className="font-semibold">{cb.label}</span>
                  </div>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase shrink-0 ${
                      cb.checked ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-600'
                    }`}
                  >
                    {cb.checked ? 'Ticked' : 'Not Ticked'}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* SECTION 8: ADDITIONAL / CUSTOM SUBMITTED FIELDS + ADD FIELD */}
        <div className="bg-white rounded-2xl border border-gray-200 p-5 sm:p-6 shadow-xs space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 pb-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">
              All Additional & Custom Submitted Fields ({draft.extraFields.length})
            </h3>
          </div>

          {draft.extraFields.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              {draft.extraFields.map((ef, idx) => (
                <div key={`${ef.key}-${idx}`} className={ef.isJson ? 'sm:col-span-2' : ''}>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-slate-700 font-bold">
                      {ef.label} <span className="text-[10px] font-mono text-slate-400">({ef.key})</span>
                    </label>
                    <button
                      type="button"
                      onClick={() =>
                        setDraft({
                          ...draft,
                          extraFields: draft.extraFields.filter((_, i) => i !== idx)
                        })
                      }
                      className="text-red-500 hover:text-red-700 text-[10px] font-bold"
                    >
                      Remove
                    </button>
                  </div>
                  {ef.isJson || ef.value.length > 80 ? (
                    <textarea
                      rows={ef.isJson ? 3 : 2}
                      value={ef.value}
                      onChange={(e) => {
                        const copy = [...draft.extraFields];
                        copy[idx] = { ...copy[idx], value: e.target.value };
                        setDraft({ ...draft, extraFields: copy });
                      }}
                      className="w-full px-3 py-2 rounded-lg border border-gray-300 bg-white font-mono text-[11px]"
                    />
                  ) : (
                    <input
                      type="text"
                      value={ef.value}
                      onChange={(e) => {
                        const copy = [...draft.extraFields];
                        copy[idx] = { ...copy[idx], value: e.target.value };
                        setDraft({ ...draft, extraFields: copy });
                      }}
                      placeholder="(Blank — Optional)"
                      className="w-full px-3 py-2 rounded-lg border border-gray-300 bg-white"
                    />
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Add Custom Field Bar */}
          <div className="pt-3 border-t border-gray-100 flex flex-wrap items-center gap-2 text-xs">
            <input
              type="text"
              value={newExtraKey}
              onChange={(e) => setNewExtraKey(e.target.value)}
              placeholder="Field Key (e.g. parkingSlot)"
              className="flex-1 min-w-[160px] px-3 py-2 rounded-lg border border-gray-300 bg-white"
            />
            <input
              type="text"
              value={newExtraVal}
              onChange={(e) => setNewExtraVal(e.target.value)}
              placeholder="Field Value"
              className="flex-1 min-w-[200px] px-3 py-2 rounded-lg border border-gray-300 bg-white"
            />
            <button
              type="button"
              onClick={() => {
                if (!newExtraKey.trim()) return;
                setDraft({
                  ...draft,
                  extraFields: [
                    ...draft.extraFields,
                    {
                      key: newExtraKey.trim(),
                      label: humanizeFieldName(newExtraKey.trim()),
                      value: newExtraVal,
                      isJson: false
                    }
                  ]
                });
                setNewExtraKey('');
                setNewExtraVal('');
              }}
              className="flex items-center gap-1 px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-900 text-white font-bold"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Custom Field</span>
            </button>
          </div>
        </div>

        {/* Bottom Save Button */}
        <div className="flex justify-end">
          <button
            onClick={handleSaveFullOrder}
            className={`flex items-center gap-2 px-6 py-3 rounded-xl text-xs font-bold shadow-sm transition-all active:scale-95 ${
              isSaved ? 'bg-emerald-600 text-white' : 'bg-blue-600 hover:bg-blue-700 text-white'
            }`}
          >
            {isSaved ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
            <span>{isSaved ? 'All Changes Saved & Synced!' : 'Save & Confirm All A-to-Z Changes'}</span>
          </button>
        </div>
      </div>
    );
  }

  // ===================== DEFAULT VIEW: ORDERS LIST WITH DROPDOWN FILTER & EDIT BUTTON ===================== //
  return (
    <div className="space-y-5 pb-20">
      {/* 1. Top Dropdown Menu Filter & Search Bar */}
      <div className="bg-white rounded-xl border border-gray-200 p-3.5 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex-1 min-w-[220px] relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by 1st Party Name or Form Name..."
            className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white placeholder-slate-400"
          />
        </div>

        <div className="relative">
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value as any)}
            className="appearance-none text-xs font-bold px-4 py-2 pr-8 rounded-lg border border-gray-300 bg-white text-slate-800 shadow-2xs hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer min-w-[170px]"
          >
            <option value="all">All (All Forms)</option>
            <option value="requests">Requests (5 Formats)</option>
            <option value="normal_doc">Normal DOC (23 Formats)</option>
            <option value="all_states">All States</option>
            <option value="filing_notices">Filing Notices</option>
            <option value="insurance_registration">Insurance Registration</option>
            <option value="bank_loans">Bank and Loans</option>
            <option value="website">Website</option>
          </select>
          <ChevronDown className="w-4 h-4 text-slate-500 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>
      </div>

      {/* Orders List */}
      <div className="space-y-3.5">
        {filteredOrders.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
            <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-base font-bold text-slate-800">No Editable Forms Found</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              Submitted forms from Website A will appear here for full A-to-Z editing.
            </p>
          </div>
        ) : (
          filteredOrders.map((order) => {
            const dateStd = formatDateStandard(order.createdAt);
            const party1Name = order.legalData?.party1?.fullName || order.registrationData?.applicantName || order.clientName;
            const contactPhone = order.legalData?.party1?.phone || order.clientPhone;

            return (
              <div
                key={order.id}
                className="bg-white rounded-xl border border-gray-200 hover:border-blue-400 p-4 sm:p-5 shadow-xs transition-all hover:shadow-md"
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                  <div className="space-y-1 flex-1">
                    <h2 className="text-base sm:text-lg font-black text-slate-900 tracking-tight uppercase leading-snug">
                      {order.formName}
                    </h2>

                    <div className="font-mono text-xs font-bold text-blue-600 tracking-wide">
                      {order.id}
                    </div>

                    <div className="flex items-center gap-1.5 text-xs text-slate-800 pt-0.5">
                      <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="text-slate-500">First Party:</span>
                      <strong className="text-slate-900">{party1Name}</strong>
                    </div>

                    <div className="flex items-center gap-1.5 text-xs text-slate-800">
                      <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="text-slate-500">Contact:</span>
                      <span className="font-mono font-medium text-slate-900">{contactPhone}</span>
                    </div>

                    <div className="pt-1 flex flex-wrap items-center gap-2">
                      {order.stampData?.verified ? (
                        <div className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full">
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                          <span>e-Stamp Attached</span>
                        </div>
                      ) : (
                        <div className="inline-flex items-center gap-1 text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-0.5 rounded-full">
                          <span>e-Stamp Pending</span>
                        </div>
                      )}
                      {order.photoUrl && (
                        <div className="inline-flex items-center gap-1 text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-full">
                          <span>Photo Attached</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex sm:flex-col items-end justify-between sm:justify-start gap-3 border-t sm:border-t-0 pt-3 sm:pt-0 border-gray-100">
                    <div className="text-right">
                      <span className="text-[10px] uppercase tracking-wider text-slate-500 font-bold block">
                        Stamp Paper Price
                      </span>
                      <div className="text-lg sm:text-xl font-black text-slate-950 font-mono text-blue-600 leading-tight">
                        ₹ {order.stampDutyValue}
                      </div>
                      <span className="text-[11px] text-slate-500 font-medium block mt-0.5">
                        Date: {dateStd}
                      </span>
                    </div>

                    <button
                      onClick={() => handleOpenEdit(order)}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-sm transition-all active:scale-95"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                      <span>Edit</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
