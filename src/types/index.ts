/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Core Data Models & Type Definitions for CTC System
 * Quadtrix / DOC India Processing Engine
 */

export type OrderCategory = 'legal' | 'registration';

export type RegistrationSubCategory = 
  | 'all_states'
  | 'filing_notices'
  | 'insurance_registration'
  | 'bank_loans'
  | 'website';

export type OrderStatus = 
  | 'encrypted'
  | 'decrypted'
  | 'pending'
  | 'pending_decryption'
  | 'received'
  | 'confirmed'
  | 'cancelled'
  | 'stamp_pending'
  | 'confirmed_stamp_attached'
  | 'processing'
  | 'esign_ready'
  | 'completed';

export interface EStampData {
  uin: string;                     // e.g. IN-DL91823746501928T
  certificateNo: string;
  issueDate: string;
  firstParty: string;
  secondParty: string;
  stampDutyPaidBy: string;
  stampDutyAmount: number;         // in INR (₹)
  article: string;                 // e.g. Article 5(c) Agreement or Memorandum
  state: string;                   // e.g. Delhi, Maharashtra, Karnataka, Uttar Pradesh
  scanUrl?: string;                // e-Stamp digital scan image/PDF preview
  pdfUrl?: string;                 // Generated Legal PDF download URL
  provider?: string;               // Cloudinary or Local Document Store
  eStampPaperUrl?: string;         // Uploaded e-Stamp scanned paper
  verified: boolean;
  verifiedAt?: string;
}

export interface DocumentClause {
  id: string;
  title: string;
  body: string;
  isCustom?: boolean;
}

export interface LegalOrderData {
  documentType: string;
  documentTitle: string;
  stampDutyAmount: number;
  state: string;
  executionDate: string;
  executionPlace: string;

  // Party 1 (e.g. Landlord, Licensor, First Party, Deponent)
  party1: {
    fullName: string;
    relationshipType?: 'S/o' | 'D/o' | 'W/o' | 'Director' | 'Partner';
    relativeName?: string;
    age?: number | string;
    pan?: string;
    aadhaarLast4?: string;
    phone: string;
    email: string;
    address: string;
    pincode?: string;
  };

  // Party 2 (e.g. Tenant, Licensee, Second Party, Buyer, Employer)
  party2?: {
    fullName: string;
    relationshipType?: 'S/o' | 'D/o' | 'W/o' | 'Director' | 'Partner';
    relativeName?: string;
    age?: number | string;
    pan?: string;
    aadhaarLast4?: string;
    phone: string;
    email: string;
    address: string;
    pincode?: string;
  };

  // Property / Subject Details (if applicable)
  propertyDetails?: {
    premisesType?: string;
    fullAddress: string;
    monthlyRentOrConsideration?: number | string;
    securityDeposit?: number | string;
    lockInPeriodMonths?: number | string;
    agreementDurationMonths?: number | string;
    noticePeriodDays?: number | string;
    utilityChargesBorneBy?: 'Tenant' | 'Owner' | 'Shared';
  };

  // Affidavit / Specific Declarations
  affidavitDetails?: {
    deponentName?: string;
    reasonForAffidavit?: string;
    oldName?: string;
    newName?: string;
    gapDuration?: string;
    educationalInstitution?: string;
    declarationStatements?: string[];
  };

  // Custom Clauses & Terms
  clauses?: DocumentClause[];

  // Witnesses
  witnesses?: Array<{
    name: string;
    address: string;
    phone?: string;
  }>;

  // Additional dynamic key-values submitted by Website A
  extraFields?: Record<string, any>;
}

export interface RegistrationDocumentChecklist {
  id: string;
  label: string;
  required: boolean;
  uploaded: boolean;
  verified: boolean;
  fileUrl?: string;
  documentNumber?: string;
}

export interface RegistrationOrderData {
  serviceType: string;             // GST Registration, ITR Filing, Udyam MSME, Vehicle Insurance
  serviceTitle: string;
  applicantName: string;
  panNumber: string;
  aadhaarNumber: string;
  contactNumber: string;
  email: string;
  businessName?: string;
  constitutionType?: 'Proprietorship' | 'Partnership' | 'Private Limited' | 'LLP' | 'Individual';
  businessAddress?: string;
  annualTurnover?: string | number;
  bankDetails?: {
    bankName: string;
    accountNumber: string;
    ifscCode: string;
    branch: string;
  };
  taxYearOrAssessmentYear?: string; // e.g. AY 2026-27
  vehicleDetails?: {
    registrationNumber: string;
    vehicleMakeModel: string;
    manufacturingYear: string;
    chassisNumber: string;
    policyType: 'Comprehensive' | 'Third Party Zero-Dep';
  };
  documentChecklist: RegistrationDocumentChecklist[];
  officerNotes?: string;
  filingAckNumber?: string;
  extraFields?: Record<string, any>;
}

export interface Order {
  id: string;                      // e.g. DOC-2026-8921
  referenceCode: string;           // Web-A Tracking Code
  category: OrderCategory;
  legalGroup?: 'requests' | 'normal_doc';
  subCategory?: RegistrationSubCategory | string;
  stampDutyPaidBy?: 'First Party' | 'Second Party' | '50-50' | string;
  formType: string;
  formName: string;
  clientName: string;
  clientPhone: string;
  clientEmail: string;
  stampDutyValue: number;          // in INR (₹)
  createdAt: string;               // ISO Timestamp
  updatedAt: string;
  status: OrderStatus;
  
  // Encrypted raw payload received from Website A
  encryptedPayload?: string;
  
  // Decrypted & parsed content
  legalData?: LegalOrderData;
  registrationData?: RegistrationOrderData;
  
  // e-Stamp info
  stampData?: EStampData;

  // e-Sign / Automation Tracking
  esignStatus?: {
    provider: 'Aadhaar e-Sign (DigiLocker / NSDL / eMudhra)';
    transactionId?: string;
    initiatedAt?: string;
    party1Signed: boolean;
    party2Signed: boolean;
    certificateHash?: string;
  };

  // Uploaded media & photos from Website A
  photoUrl?: string;
  mediaUrls?: string[];
  rawPayload?: any;

  // Webhook / Ingestion metadata
  source: 'Website A' | 'API Direct' | 'URL Parameter' | 'Manual Ingestion' | string;
  signatureVerified: boolean;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  orderId?: string;
  type: 
    | 'payload_decrypted' 
    | 'stamp_attached' 
    | 'esign_triggered' 
    | 'telegram_sent' 
    | 'field_modified' 
    | 'webhook_received' 
    | 'system_event';
  message: string;
  details?: any;
  status: 'success' | 'pending' | 'failed';
}

export interface TelegramNotification {
  id: string;
  timestamp: string;
  orderId: string;
  clientName: string;
  serviceName: string;
  category: OrderCategory;
  channel: string;
  status: 'Delivered' | 'Simulated' | 'Queued' | 'Error';
  messageText: string;
}

export interface SystemConfig {
  masterKey: string;
  telegramBotToken: string;
  telegramChatId: string;
  telegramEnabled: boolean;
  aadhaarEsignActive: boolean;
  digilockerGatewayActive: boolean;
  webhookSecret: string;
}

export interface LegalFormatTemplate {
  id: string;
  title: string;
  actReference: string;
  category: 'legal' | 'compliance';
  subCategory?: string;
  description: string;
  stampDutyGuideline: string;
  partiesRequired: string;
  mandatoryClauses: string[];
  statutoryPreamble: string;
  standardBody: string;
  isRequestOnly?: boolean;
}

