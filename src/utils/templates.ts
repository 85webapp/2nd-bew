/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * 28 Exact Indian Legal Document Formats & Categorization
 * Grouped into "Requests" (5 docs) and "Normal DOC" (23 docs)
 * Plus Registration & Compliance subcategories (Registrations, Insurance, Filing, Notices)
 */

export interface LegalTemplateMeta {
  id: string;
  name: string;
  group: 'requests' | 'normal_doc';
  defaultStampDuty: number;
  article: string;
  description: string;
}

// 5 Specific Documents in "Requests" Group
export const REQUEST_GROUP_IDS = [
  'rental_11_months',
  'sublease_agreement',
  'partnership_deed',
  'job_work_manufacturing',
  'equipment_machinery_lease'
];

export const EXACT_28_LEGAL_DOCUMENTS: LegalTemplateMeta[] = [
  // --- Group: Requests (5 Documents) ---
  {
    id: 'rental_11_months',
    name: '11th Month Rental Agreement',
    group: 'requests',
    defaultStampDuty: 500,
    article: 'Article 35 - Tenancy Agreement',
    description: 'Standard 11-month residential tenancy contract with lock-in, rent and deposit terms.'
  },
  {
    id: 'sublease_agreement',
    name: 'Sublease Agreement',
    group: 'requests',
    defaultStampDuty: 500,
    article: 'Article 35 - Sub-tenancy Lease',
    description: 'Permissive sub-tenancy lease agreement with primary landlord consent.'
  },
  {
    id: 'partnership_deed',
    name: 'Partnership Deed',
    group: 'requests',
    defaultStampDuty: 1000,
    article: 'Article 46 - Partnership Act 1932',
    description: 'Deed defining capital ratio, profit-sharing, and operational authority.'
  },
  {
    id: 'job_work_manufacturing',
    name: 'Job Work and Manufacturing Agreement',
    group: 'requests',
    defaultStampDuty: 500,
    article: 'Article 5 - Commercial Service Contract',
    description: 'Industrial contract manufacturing and job-work processing terms.'
  },
  {
    id: 'equipment_machinery_lease',
    name: 'Equipment and Machinery Lease Agreement',
    group: 'requests',
    defaultStampDuty: 500,
    article: 'Article 35 - Chattel Lease Agreement',
    description: 'Commercial equipment and industrial machinery lease and maintenance covenant.'
  },

  // --- Group: Normal DOC (Remaining 23 Documents) ---
  {
    id: 'landlord_noc_business',
    name: 'Landlord NOC for Business',
    group: 'normal_doc',
    defaultStampDuty: 100,
    article: 'Article 4 - Declaration / Affidavit',
    description: 'Landlord NOC for business establishment and commercial operations.'
  },
  {
    id: 'landlord_noc_gst',
    name: 'Landlord NOC for GST',
    group: 'normal_doc',
    defaultStampDuty: 100,
    article: 'Article 4 - Declaration',
    description: 'Owner NOC specifically formatted for GST portal registration and verification.'
  },
  {
    id: 'brand_sponsor_promotion',
    name: 'Brand Sponsor Appointment Promotion Agreement',
    group: 'normal_doc',
    defaultStampDuty: 500,
    article: 'Article 5 - Commercial Promotion Agreement',
    description: 'Brand sponsorship, marketing rights, deliverables, and promotion terms.'
  },
  {
    id: 'influencer_collaboration',
    name: 'Influencer Collaboration Agreement',
    group: 'normal_doc',
    defaultStampDuty: 500,
    article: 'Article 5 - Service Contract',
    description: 'Social media influencer collaboration, deliverables, and copyright license.'
  },
  {
    id: 'contractor_copyright_transfer',
    name: 'Contractor Right and Copyright Transfer Agreement',
    group: 'normal_doc',
    defaultStampDuty: 500,
    article: 'Article 5 - Assignment of Intellectual Property',
    description: 'Complete transfer of intellectual property and contractor work-made-for-hire rights.'
  },
  {
    id: 'freelancer_client_service',
    name: 'Freelancer and Client Service Contract',
    group: 'normal_doc',
    defaultStampDuty: 500,
    article: 'Article 5 - Freelance Contract',
    description: 'Independent contractor deliverables, fee schedules, and milestone terms.'
  },
  {
    id: 'nda_agreement',
    name: 'Non-Disclosure Agreement NDA',
    group: 'normal_doc',
    defaultStampDuty: 500,
    article: 'Article 5 - Non-Disclosure Agreement',
    description: 'Mutual non-disclosure and trade secret confidentiality covenants.'
  },
  {
    id: 'video_audio_release',
    name: 'Video / Audio Release Form',
    group: 'normal_doc',
    defaultStampDuty: 100,
    article: 'Article 4 - Media Consent Form',
    description: 'Talent consent and media exploitation release for video, podcast, and audio.'
  },
  {
    id: 'proprietorship_declaration',
    name: 'Proprietorship Declaration Deed',
    group: 'normal_doc',
    defaultStampDuty: 100,
    article: 'Article 4 - Sole Proprietorship Declaration',
    description: 'Sole proprietor affirmation of commercial trade name and bank accounts.'
  },
  {
    id: 'founder_cofounder_agreement',
    name: 'Founder and Co-founder Agreement',
    group: 'normal_doc',
    defaultStampDuty: 1000,
    article: 'Article 5 - Corporate Agreement',
    description: 'Startup equity vesting, roles, IP assignment, and exit terms between co-founders.'
  },
  {
    id: 'vendor_supplier_agreement',
    name: 'Vendor and Supplier Agreement',
    group: 'normal_doc',
    defaultStampDuty: 500,
    article: 'Article 5 - Supply Agreement',
    description: 'Supply chain pricing, delivery schedules, quality warranty, and payment terms.'
  },
  {
    id: 'software_it_service',
    name: 'Software and IT Service Agreement',
    group: 'normal_doc',
    defaultStampDuty: 500,
    article: 'Article 5 - Technology Service Contract',
    description: 'Software development, SLA, code deployment, and bug fix warranty.'
  },
  {
    id: 'website_terms_privacy',
    name: 'Website and App Terms of Service & Privacy Policy',
    group: 'normal_doc',
    defaultStampDuty: 500,
    article: 'Article 5 - Digital Terms of Use',
    description: 'User terms of service, acceptable use, limitation of liability, and privacy policy.'
  },
  {
    id: 'name_change_affidavit',
    name: 'Name Change Affidavit',
    group: 'normal_doc',
    defaultStampDuty: 100,
    article: 'Article 4 - Affidavit',
    description: 'Sworn affidavit for formal name modification and Gazette publication.'
  },
  {
    id: 'address_proof_affidavit',
    name: 'Address Proof Correction Affidavit',
    group: 'normal_doc',
    defaultStampDuty: 100,
    article: 'Article 4 - Affidavit',
    description: 'Solemn affirmation of actual residence in absence of local utility bills.'
  },
  {
    id: 'dob_correction_affidavit',
    name: 'Date of Birth and Age Correction Affidavit',
    group: 'normal_doc',
    defaultStampDuty: 100,
    article: 'Article 4 - Affidavit',
    description: 'Affidavit explaining clerical discrepancies in date of birth records.'
  },
  {
    id: 'loss_of_document_affidavit',
    name: 'Loss of Document Affidavit',
    group: 'normal_doc',
    defaultStampDuty: 100,
    article: 'Article 4 - Affidavit',
    description: 'Declaration for issuance of duplicate educational or registry title papers.'
  },
  {
    id: 'antiragging_gap_year_affidavit',
    name: 'Anti Ragging and Gap Year Affidavit',
    group: 'normal_doc',
    defaultStampDuty: 100,
    article: 'Article 4 - Affidavit',
    description: 'Academic gap justification and UGC-compliant anti-ragging undertaking.'
  },
  {
    id: 'income_unemployment_affidavit',
    name: 'Income and Unemployment Affidavit',
    group: 'normal_doc',
    defaultStampDuty: 100,
    article: 'Article 4 - Affidavit',
    description: 'Declaration of family income and unemployment status for scholarship/welfare.'
  },
  {
    id: 'first_child_single_child_affidavit',
    name: 'First Child and Single Child Affidavit',
    group: 'normal_doc',
    defaultStampDuty: 100,
    article: 'Article 4 - Affidavit',
    description: 'Affidavit for school admission under single child or first born child quota.'
  },
  {
    id: 'employment_contract_offer',
    name: 'Employment Contract and Offer Letter',
    group: 'normal_doc',
    defaultStampDuty: 500,
    article: 'Article 5 - Employment Contract',
    description: 'Full-time employment agreement with probation, compensation, and non-solicitation.'
  },
  {
    id: 'general_consent_declaration',
    name: 'General Consent and Declaration Letter',
    group: 'normal_doc',
    defaultStampDuty: 100,
    article: 'Article 4 - Sworn Declaration',
    description: 'Universal sworn consent and verification declaration before authority.'
  },
  {
    id: 'vehicle_sale_purchase_agreement',
    name: 'Vehicle Sales and Purchase Agreement',
    group: 'normal_doc',
    defaultStampDuty: 100,
    article: 'Article 5 - Movable Sale Agreement',
    description: 'Motor vehicle transfer agreement with RTO undertakings and indemnities.'
  }
];

export const REGISTRATION_SUBCATEGORIES = [
  { id: 'all_states', name: 'All States' },
  { id: 'filing_notices', name: 'Filing Notices' },
  { id: 'insurance_registration', name: 'Insurance Registration' },
  { id: 'bank_loans', name: 'Bank and Loans' },
  { id: 'website', name: 'Website' }
];

export const LEGAL_TEMPLATES: Record<string, LegalTemplateMeta> = EXACT_28_LEGAL_DOCUMENTS.reduce(
  (acc, doc) => {
    acc[doc.id] = doc;
    return acc;
  },
  {} as Record<string, LegalTemplateMeta>
);

import { LegalFormatTemplate } from '../types';

export const STATUTORY_FORMAT_TEMPLATES: LegalFormatTemplate[] = [
  // 1. Rental Agreement (11 Months)
  {
    id: 'rental_11_months',
    title: '11th Month Residential Rental Agreement',
    actReference: 'Indian Stamp Act 1899 (Article 35) & UP Stamp Act (Schedule 1-B, Art 35)',
    category: 'legal',
    description: 'Statutory 11-month lease deed exempt from compulsory registration under Section 17(1)(d) Registration Act 1908.',
    stampDutyGuideline: '₹ 500/- Non-Judicial e-Stamp (Delhi / UP: 2% of annual rent or ₹ 500 stamp paper whichever applicable for short leases)',
    partiesRequired: 'Lessor (Landlord/First Party) and Lessee (Tenant/Second Party)',
    mandatoryClauses: [
      'Demised Premises Description & Permitted Residential Purpose',
      'Monthly Rent Calculation, Due Date & Mode of Electronic Transfer',
      'Interest-Free Refundable Security Deposit & Forfeiture Covenants',
      '11-Month Term, Lock-in Period & 30-Day Mutual Notice of Termination',
      'Electricity, Water & Building Maintenance Surcharge Apportionment',
      'Governing Law & Exclusive Civil Court Jurisdiction'
    ],
    statutoryPreamble: 'THIS LEASE AND TENANCY AGREEMENT is made and entered into at the place and on the date mentioned hereunder, in accordance with the provisions of the Transfer of Property Act 1882 and the Indian Contract Act 1872.',
    standardBody: 'WHEREIN the Lessor represents being the absolute lawful owner and in actual physical possession of the Demised Property, free from encumbrances, and the Lessee has requested the leasehold rights solely for residential occupation.'
  },

  // 2. Sublease Agreement
  {
    id: 'sublease_agreement',
    title: 'Sublease Agreement',
    actReference: 'Indian Stamp Act 1899 (Article 35) & UP Stamp Rules',
    category: 'legal',
    description: 'Tripartite or subordinate lease executed by primary tenant with explicit authorization and consent of the head owner.',
    stampDutyGuideline: '₹ 500/- Non-Judicial e-Stamp (Article 35 - Agreement or Lease)',
    partiesRequired: 'Sub-Lessor (Primary Tenant) and Sub-Lessee (Incoming Occupant)',
    mandatoryClauses: [
      'Reference to Principal Lease Deed & Landlord Express Written Consent',
      'Scope & Demarcation of Subleased Area',
      'Apportioned Rent, Maintenance & Deposit Obligations',
      'Indemnity against breach of Head Lease terms',
      'Termination Co-terminus with Principal Lease'
    ],
    statutoryPreamble: 'THIS SUBLEASE AGREEMENT is executed subject to the covenants, representations, and reservations contained in the Master Lease Deed dated and registered with the Sub-Registrar.',
    standardBody: 'The Sub-Lessor, having received unconditional written assent from the Title Owner, grants permission to the Sub-Lessee to occupy the identified commercial/residential portion.'
  },

  // 3. Partnership Deed
  {
    id: 'partnership_deed',
    title: 'Partnership Deed',
    actReference: 'Indian Stamp Act 1899 (Article 46) & Indian Partnership Act 1932',
    category: 'legal',
    description: 'Statutory deed regulating partnership business, capital contribution ratios, profit/loss distribution and partner rights.',
    stampDutyGuideline: '₹ 1,000/- Non-Judicial e-Stamp (Schedule 1-B Article 46 UP & Delhi)',
    partiesRequired: 'All Managing Partners and General Partners (Minimum 2)',
    mandatoryClauses: [
      'Firm Name, Principal Place of Business & Authorized Business Objects',
      'Capital Contribution, Interest on Capital & Bank Account Signing Mandate',
      'Net Profit & Loss Apportionment Ratio (Equal or Fixed Percentage)',
      'Partner Remuneration under Section 40(b) Income Tax Act 1961',
      'Retirement, Expulsion, Insolvency & Dissolution Procedure'
    ],
    statutoryPreamble: 'THIS DEED OF PARTNERSHIP is executed pursuant to Section 4 of the Indian Partnership Act 1932 to constitute a partnership firm under the designated trade style.',
    standardBody: 'The Partners mutually agree to carry on the business in common with a view to sharing net profits and bearing liabilities in specified proportions.'
  },

  // 4. Job Work and Manufacturing Agreement
  {
    id: 'job_work_manufacturing',
    title: 'Job Work and Manufacturing Agreement',
    actReference: 'Indian Stamp Act 1899 (Article 5) & CGST Act 2017 Section 143',
    category: 'legal',
    description: 'Contract manufacturing covenant for processing of raw materials on job work basis compliant with GST Annexure ITC-04 rules.',
    stampDutyGuideline: '₹ 500/- Non-Judicial Stamp Paper (Article 5 - Commercial Agreement)',
    partiesRequired: 'Principal Manufacturer (First Party) and Job Worker (Second Party)',
    mandatoryClauses: [
      'Delivery of Inputs/Capital Goods under Section 143 GST Rules',
      'Processing Specifications, Yield Ratios & Tolerable Scrap Percentage',
      'Job Work Processing Charges & GST Reverse Charge Applicability',
      'Quality Inspection & Return of Finished Goods within 1/3 Year Limits',
      'Intellectual Property & Design Secrecy Undertaking'
    ],
    statutoryPreamble: 'THIS JOB WORK AND MANUFACTURING AGREEMENT regulates the supply of raw materials and inputs for industrial processing under standard GST and contract law mandates.',
    standardBody: 'The Principal engages the Job Worker for semi-finished goods processing without transferring legal title, ownership or lien over the provided inventory.'
  },

  // 5. Equipment and Machinery Lease Agreement
  {
    id: 'equipment_machinery_lease',
    title: 'Equipment and Machinery Lease Agreement',
    actReference: 'Indian Stamp Act 1899 (Article 35 - Chattel Lease) & UP Stamp Act',
    category: 'legal',
    description: 'Industrial chattel and heavy equipment dry/wet leasing agreement with maintenance covenants and downtime indemnities.',
    stampDutyGuideline: '₹ 500/- Non-Judicial Stamp Paper',
    partiesRequired: 'Equipment Owner (Lessor) and Lessee / Industrial User',
    mandatoryClauses: [
      'Machinery Description, Serial Numbers & Certified Working Condition',
      'Monthly Rental Billing, Meter Reading & Log-Sheet Verification',
      'Routine Lubrication, Wear-and-Tear & Major Breakdown Liability',
      'Insurance Coverage for Fire, Theft & Transit Damage',
      'Repossession Rights upon Default in Hire Payments'
    ],
    statutoryPreamble: 'THIS EQUIPMENT LEASE AGREEMENT is made for hiring industrial plant and machinery on bailment terms under Section 148 Indian Contract Act 1872.',
    standardBody: 'The Lessor retains absolute title over the machinery, granting only permissive operational license to the Lessee during the subsistence of the hire tenure.'
  },

  // 6. Landlord NOC for GST & Business
  {
    id: 'landlord_noc_gst',
    title: 'Landlord NOC for GST Portal & Business Registration',
    actReference: 'Indian Stamp Act 1899 (Article 4 - Declaration) & UP Stamp Act',
    category: 'legal',
    description: 'Non-Objection Certificate executed by property owner for declaring registered principal place of business on GST REG-01.',
    stampDutyGuideline: '₹ 100/- Non-Judicial Stamp Paper or Notarized Affidavit',
    partiesRequired: 'Title Owner (Deponent) in favor of GST Registration Applicant',
    mandatoryClauses: [
      'Unconditional Consent to use premises as Principal Place of Business',
      'Affirmation of Municipal Property Tax Payment & Ownership Deed',
      'Electricity Bill / Title Deed Reference Attachment',
      'Authorizing GST Field Inspection & Document Verification'
    ],
    statutoryPreamble: 'TO WHOMSOEVER IT MAY CONCERN — NO OBJECTION CERTIFICATE executed under solemn affirmation before a Competent Notary Public.',
    standardBody: 'I, the undersigned property owner, state that I have leased out the premises to the applicant and have no objection to their obtaining a GSTIN and conducting commercial operations therein.'
  },

  // 7. General Power of Attorney (GPA)
  {
    id: 'general_power_of_attorney',
    title: 'General Power of Attorney (GPA)',
    actReference: 'Powers of Attorney Act 1882 & Indian Stamp Act 1899 (Article 48) & UP Stamp Act Art 48',
    category: 'legal',
    description: 'Authoritative delegation of representation before civil, municipal, tax, and revenue authorities.',
    stampDutyGuideline: '₹ 500/- for non-family attorney or ₹ 100/- for blood relation (UP / Delhi Stamp Schedule)',
    partiesRequired: 'Principal (Grantor) and Attorney-in-Fact (Grantee/Agent)',
    mandatoryClauses: [
      'Specific Scope of Representation (Courts, Municipal, Electricity, Water)',
      'Prohibition of Alienation/Sale of Immovable Property (without registration)',
      'Ratification of All Lawful Acts Committed by Attorney',
      'Revocation Terms & Survivorship Clauses'
    ],
    statutoryPreamble: 'KNOW ALL MEN BY THESE PRESENTS that I, the Principal, do hereby appoint, nominate and constitute my true and lawful Attorney.',
    standardBody: 'To appear, plead, sign petitions, file compliance returns, and represent the Principal in all proceedings before government and revenue departments.'
  },

  // 8. Non-Disclosure Agreement (Mutual NDA)
  {
    id: 'mutual_nda_agreement',
    title: 'Non-Disclosure & Confidentiality Agreement (NDA)',
    actReference: 'Indian Contract Act 1872 & Indian Stamp Act 1899 (Article 5)',
    category: 'legal',
    description: 'Bilateral trade secret protection covenant prohibiting unauthorized disclosure of business metrics, algorithms, and client lists.',
    stampDutyGuideline: '₹ 100/- to ₹ 500/- Non-Judicial Stamp Paper',
    partiesRequired: 'Disclosing Party and Receiving Party (Mutual)',
    mandatoryClauses: [
      'Definition of Confidential Information & Permitted Business Purpose',
      'Strict Non-Disclosure Duty & Standard of Care (Reasonable Security)',
      'Exclusions: Prior Public Domain Knowledge, Compelled Court Disclosures',
      '3-Year Confidentiality Term Post-Discussions Termination',
      'Injunctive Relief & Specific Performance Rights'
    ],
    statutoryPreamble: 'THIS CONFIDENTIALITY AND NON-DISCLOSURE AGREEMENT regulates the disclosure and handling of proprietary business and technical data.',
    standardBody: 'The parties desire to explore a commercial transaction and agree that all shared technical, financial, and client records shall be held in strictest confidence.'
  },

  // 9. Brand Sponsor Promotion Agreement
  {
    id: 'brand_sponsor_promotion',
    title: 'Brand Sponsorship and Marketing Agreement',
    actReference: 'Indian Stamp Act 1899 (Article 5 - Commercial Contract) & Consumer Protection Act 2019',
    category: 'legal',
    description: 'Commercial contract defining marketing deliverable schedules, brand placement rights, and performance compensation.',
    stampDutyGuideline: '₹ 500/- Non-Judicial e-Stamp Paper',
    partiesRequired: 'Brand Sponsor (First Party) and Event/Entity Organizer (Second Party)',
    mandatoryClauses: [
      'Sponsorship Consideration Milestones & Digital Footprint Rights',
      'Category Exclusivity (Non-Compete with Direct Market Rivals)',
      'ASCI Guidelines & Endorsement Transparency Compliance',
      'Force Majeure & Event Cancellation Pro-rata Refund Rules'
    ],
    statutoryPreamble: 'THIS BRAND SPONSORSHIP AGREEMENT governs promotional deliverables, media broadcast rights, and brand display standards.',
    standardBody: 'The Sponsor engages the Organizer to broadcast brand marks across digital media and event properties in consideration of agreed sponsorship dues.'
  },

  // 10. Influencer Collaboration Agreement
  {
    id: 'influencer_collaboration',
    title: 'Influencer Marketing and Content Creator Agreement',
    actReference: 'Indian Contract Act 1872 & ASCI Endorsement Rules 2021',
    category: 'legal',
    description: 'Content generation contract specifying social media post timelines, usage rights, paid partnership labels, and indemnities.',
    stampDutyGuideline: '₹ 100/- or ₹ 500/- Non-Judicial e-Stamp',
    partiesRequired: 'Brand / Agency (First Party) and Creator / Influencer (Second Party)',
    mandatoryClauses: [
      'Deliverables: Reels, Shorts, Feed Posts, Story Cadence & Approvals',
      'Mandatory #Ad #Sponsored Disclosure Tags under ASCI Norms',
      'Ownership of Content Copyright vs Brand Usage License (12 Months)',
      'Morality Clause & Brand Reputation Protection',
      'TDS Deduction under Section 194R Income Tax Act 1961'
    ],
    statutoryPreamble: 'THIS CREATOR COLLABORATION AGREEMENT defines the terms of creative advertising services and digital content distribution.',
    standardBody: 'The Creator agrees to create and publish original social media content promoting the brand in compliance with statutory advertising and transparency norms.'
  },

  // 11. Motor Vehicle Sale Agreement
  {
    id: 'vehicle_sale_purchase_agreement',
    title: 'Vehicle Sales and Purchase Agreement',
    actReference: 'Indian Stamp Act 1899 (Article 5) & Motor Vehicles Act 1988 (Sec 50)',
    category: 'legal',
    description: 'Transfer deed for car or commercial vehicle with RTO Form 29 & 30 submission undertakings and delivery receipt.',
    stampDutyGuideline: '₹ 100/- Non-Judicial Stamp Paper (Notarized)',
    partiesRequired: 'Seller (Registered Owner) and Buyer (Transferee)',
    mandatoryClauses: [
      'Vehicle Chassis, Engine, Make, Model & Odometer Reading',
      'Full Consideration Paid & Clearance of Existing Bank Hypothecation',
      'Time of Delivery Handover & Transfer of Road Challan Liability',
      'Undertaking to Submit RTO Transfer Documents within 14 Days'
    ],
    statutoryPreamble: 'THIS VEHICLE SALE AGREEMENT confirms the transfer of title, custody, and all road liabilities over the identified motor vehicle.',
    standardBody: 'The Seller transfers physical possession to the Buyer, who accepts all future risks, challans, and road liabilities from the exact hour of handover.'
  },

  // 12. Full-Time Employment Agreement
  {
    id: 'employment_contract_offer',
    title: 'Executive Employment Contract',
    actReference: 'Indian Contract Act 1872 (Section 27) & Indian Stamp Act 1899',
    category: 'legal',
    description: 'Comprehensive employment agreement with probation, CTC salary breakup, IP assignment, confidentiality, and notice period.',
    stampDutyGuideline: '₹ 500/- Non-Judicial e-Stamp Paper',
    partiesRequired: 'Employer (Company/Firm) and Employee',
    mandatoryClauses: [
      'Designation, Reporting Line & 6-Month Probation Benchmarks',
      'Compensation CTC Breakup, PF, ESIC & TDS Deductions',
      'Work for Hire & Complete Assignment of Inventions / IP',
      'Non-Solicitation of Clients and Employees for 12 Months',
      'Termination with 30-Day Notice or Pay in Lieu Thereof'
    ],
    statutoryPreamble: 'THIS EMPLOYMENT AGREEMENT regulates the terms of full-time professional service between the Company and the Appointee.',
    standardBody: 'The Company appoints the Employee to devote full business time and skills exclusively to the growth and business affairs of the Organization.'
  },

  // 13. Name Change Affidavit
  {
    id: 'name_change_affidavit',
    title: 'Name Change Sworn Affidavit',
    actReference: 'Indian Stamp Act 1899 (Article 4 - Affidavit) & Notaries Act 1952',
    category: 'legal',
    description: 'Sworn affidavit for Gazette notification, passport re-issue, and voter identity correction.',
    stampDutyGuideline: '₹ 10/- to ₹ 100/- Non-Judicial Stamp Paper (Affidavit UP/Delhi)',
    partiesRequired: 'Deponent (Individual)',
    mandatoryClauses: [
      'Declaration of Former Full Name & Newly Adopted Name',
      'Parentage, Date of Birth, Aadhaar & Residence Details',
      'Affirmation of No Fraudulent Intent or Outstanding Criminal Trial',
      'Solemn Oath before Oath Commissioner or Notary Public'
    ],
    statutoryPreamble: 'BEFORE THE HON\'BLE OATH COMMISSIONER / NOTARY PUBLIC — SWORN AFFIDAVIT UNDER ORDER XIX CPC 1908.',
    standardBody: 'I, the deponent, do hereby solemnly declare and affirm that I have completely renounced my old name and shall henceforth be known by my newly adopted name.'
  },

  // 14. Anti Ragging and Gap Year Affidavit
  {
    id: 'antiragging_gap_year_affidavit',
    title: 'Anti Ragging & Academic Gap Year Affidavit',
    actReference: 'UGC Regulations 2009 & Indian Stamp Act 1899 (Article 4)',
    category: 'legal',
    description: 'Mandatory university admission affidavit explaining study gap and pledging compliance with Anti-Ragging regulations.',
    stampDutyGuideline: '₹ 100/- Non-Judicial Stamp Paper',
    partiesRequired: 'Student Deponent & Parent / Guardian',
    mandatoryClauses: [
      'Academic Gap Duration & Legitimate Reason (Preparation/Employment)',
      'Affirmation of Non-Involvement in Criminal Offences during Gap',
      'UGC Anti-Ragging Undertaking & Strict Penalty Acceptance',
      'Verification and Notarization Block'
    ],
    statutoryPreamble: 'SWORN UNDERTAKING AND AFFIDAVIT SUBMITTED TO UNIVERSITY / INSTITUTE ADMISSION CELL.',
    standardBody: 'The Deponent solemnly affirms that during the gap year tenure they did not enroll in conflicting full-time courses nor engage in unlawful activities.'
  },

  // 15. Loss of Document Affidavit
  {
    id: 'loss_of_document_affidavit',
    title: 'Affidavit for Loss of Original Documents',
    actReference: 'Indian Stamp Act 1899 (Article 4 - Affidavit)',
    category: 'legal',
    description: 'Statutory affidavit for obtaining duplicate mark-sheets, share certificates, or property registry papers.',
    stampDutyGuideline: '₹ 100/- Non-Judicial Stamp Paper',
    partiesRequired: 'Deponent (Owner of Lost Record)',
    mandatoryClauses: [
      'Document Specifics (Certificate No, Roll No, Reg Date, Authority)',
      'Circumstances of Misplacement & Police NCR/FIR Tracking No',
      'Pledge to Return Original if Traced Subsequently',
      'Indemnity to Issuing Authority against Third-Party Claims'
    ],
    statutoryPreamble: 'SWORN AFFIDAVIT FOR ISSUANCE OF DUPLICATE OFFICIAL CERTIFICATE / TITLE RECORD.',
    standardBody: 'I verify that the original document has been genuinely lost beyond retrieval, and I undertake to hold the issuing department harmless against all liabilities.'
  },

  // 16. Income and Unemployment Affidavit
  {
    id: 'income_unemployment_affidavit',
    title: 'Income & Unemployment Affidavit',
    actReference: 'Indian Stamp Act 1899 (Article 4 - Sworn Declaration)',
    category: 'legal',
    description: 'Affidavit submitted for government welfare schemes, scholarships, fee concessions, and EWS quota claims.',
    stampDutyGuideline: '₹ 100/- Non-Judicial Stamp Paper',
    partiesRequired: 'Deponent / Head of Family',
    mandatoryClauses: [
      'Household Members, Earning Sources & Total Annual Income (INR)',
      'Unemployment or Informal Work Status Declaration',
      'Affirmation of No Agricultural or Commercial Holdings exceeding limits',
      'Awareness of Perjury Consequences under Section 193 IPC'
    ],
    statutoryPreamble: 'BEFORE THE COMPETENT REVENUE / WELFARE AUTHORITY — SWORN INCOME VERIFICATION DECLARATION.',
    standardBody: 'The Deponent declares on oath that the total family income from all combined sources does not exceed the stipulated threshold limit.'
  },

  // 17. First Child & Single Child Affidavit
  {
    id: 'first_child_single_child_affidavit',
    title: 'Single Girl Child / First Child Affidavit',
    actReference: 'Indian Stamp Act 1899 (Article 4 - Affidavit)',
    category: 'legal',
    description: 'Affidavit submitted for CBSE / Kendriya Vidyalaya / Delhi Nursery school admission single child priority.',
    stampDutyGuideline: '₹ 100/- Non-Judicial Stamp Paper',
    partiesRequired: 'Parents (Father & Mother Deponents)',
    mandatoryClauses: [
      'Child Name, Date of Birth & Municipal Birth Certificate Reference',
      'Affirmation that Child is the Only Surviving Child (Single Girl Child)',
      'No other biological or adopted children living',
      'Solemn Verification before First Class Magistrate or Notary'
    ],
    statutoryPreamble: 'SWORN JOINT AFFIDAVIT OF PARENTS FOR SCHOOL ADMISSION RESERVATION SCHEME.',
    standardBody: 'We, the parents, swear that our daughter is our only single child and that we have no other male or female offspring.'
  },

  // 18. General Consent & Declaration Letter
  {
    id: 'general_consent_declaration',
    title: 'General Consent and Sworn Declaration',
    actReference: 'Indian Stamp Act 1899 (Article 4) & Indian Evidence Act 1872',
    category: 'legal',
    description: 'Universal consent declaration for visa sponsor, passport minor consent, and property partition assent.',
    stampDutyGuideline: '₹ 100/- Non-Judicial Stamp Paper',
    partiesRequired: 'Declarant (First Party)',
    mandatoryClauses: [
      'Identity & Parentage of Declarant',
      'Specific Matter of Unconditional Consent Granted',
      'Renunciation of Claims or Caveats against Applicant',
      'Notarial Attestation Block'
    ],
    statutoryPreamble: 'SWORN STATEMENT OF FREE WILL CONSENT WITHOUT DURESS OR UNDUE INFLUENCE.',
    standardBody: 'I confirm granting unreserved consent to the authority for processing the relevant application in favor of the applicant.'
  },

  // 19. Indemnity Bond
  {
    id: 'indemnity_bond_general',
    title: 'General Indemnity Bond',
    actReference: 'Indian Contract Act 1872 (Sec 124) & Indian Stamp Act 1899 (Article 34)',
    category: 'legal',
    description: 'Legally binding indemnity undertaking to compensate an authority or company against any loss or damage.',
    stampDutyGuideline: '₹ 100/- or ₹ 200/- Stamp Paper (Schedule 1-B UP Stamp Act)',
    partiesRequired: 'Indemnifier (First Party) and Indemnified (Second Party/Authority)',
    mandatoryClauses: [
      'Underlying Cause or Concession Granted',
      'Covenant to Save Harmless from All Costs, Damages, and Litigations',
      'Immediate Re-imbursement within 15 Days of Written Demand',
      'Joint and Several Liability of Legal Heirs and Successors'
    ],
    statutoryPreamble: 'THIS INDEMNITY BOND is executed in favor of the obligee to protect against third-party disputes and financial claims.',
    standardBody: 'The Indemnifier undertakes to keep the Indemnified fully indemnified, defended, and harmless against any losses arising from the requested action.'
  },

  // 20. Commercial Office Lease Agreement
  {
    id: 'commercial_office_lease',
    title: 'Commercial Office Space Lease Agreement',
    actReference: 'Indian Stamp Act 1899 (Article 35) & UP Stamp Act (Schedule 1-B)',
    category: 'legal',
    description: 'Comprehensive commercial tenancy deed for tech parks, shops, and corporate branch offices.',
    stampDutyGuideline: 'Calculated as % of Annual Rent + Security Deposit (UP Stamp Act Schedule 1-B)',
    partiesRequired: 'Commercial Landlord (Lessor) and Corporate Entity (Lessee)',
    mandatoryClauses: [
      'Super Built-up Area, Carpet Area & Dedicated Car Parking Bays',
      'Escalation Clause: 5% to 15% Rent Escalation every 3 Years',
      'Power Backup, HVAC Maintenance & Common Area Maintenance (CAM)',
      'Subletting Restrictions & Fit-out Period Rent Free Moratorium',
      'Registration Mandate under Indian Registration Act 1908 Section 17'
    ],
    statutoryPreamble: 'THIS COMMERCIAL LEASE DEED is entered into for leasing non-residential corporate premises.',
    standardBody: 'The Lessor leases the specified commercial floor space to the Lessee for housing lawful business operations, software development, and client administration.'
  },

  // 21. Service Level Agreement (SLA)
  {
    id: 'service_level_agreement_sla',
    title: 'IT & Business Service Level Agreement (SLA)',
    actReference: 'Indian Contract Act 1872 & Information Technology Act 2000',
    category: 'legal',
    description: 'Commercial service covenant specifying 99.9% uptime uptime metrics, ticket escalation matrices, and SLA credit penalties.',
    stampDutyGuideline: '₹ 500/- Non-Judicial Stamp Paper',
    partiesRequired: 'Service Provider and Enterprise Client',
    mandatoryClauses: [
      'System Availability & 99.9% Monthly Uptime Commitments',
      'Severity Level Classifications (P1 Critical to P4 Minor)',
      'Root Cause Analysis (RCA) Timelines & Penalty Service Credits',
      'Data Protection, GDPR/DPDP Act 2023 Compliance & Security Audits'
    ],
    statutoryPreamble: 'THIS SERVICE LEVEL AGREEMENT establishes the technical and quality benchmarks governing delivered managed services.',
    standardBody: 'The Service Provider guarantees performance availability, automated failovers, and response times as itemized in the Technical Schedules.'
  },

  // 22. Freelancer Consultancy Agreement
  {
    id: 'freelancer_consultancy_agreement',
    title: 'Independent Consultant / Freelancer Agreement',
    actReference: 'Indian Contract Act 1872 (Independent Contractor Covenant)',
    category: 'legal',
    description: 'Contract for independent professionals ensuring no employer-employee master-servant relationship exists.',
    stampDutyGuideline: '₹ 100/- to ₹ 500/- Stamp Paper',
    partiesRequired: 'Client / Company (First Party) and Independent Contractor (Second Party)',
    mandatoryClauses: [
      'Clear Declaration of Independent Contractor Status (No PF/Gratuity)',
      'Milestone Deliverables, Invoicing & TDS under Section 194J',
      'Work Made for Hire: Complete IP Assignment to Client',
      'Non-Exclusivity: Right to Provide Services to Non-Competing Third Parties'
    ],
    statutoryPreamble: 'THIS INDEPENDENT CONSULTANCY AGREEMENT defines the scope of engagement on a principal-to-principal basis.',
    standardBody: 'The Consultant operates as an independent business and is solely responsible for own income tax, professional tax, and regulatory compliance.'
  },

  // 23. Special Power of Attorney (Court & Property)
  {
    id: 'special_power_of_attorney_property',
    title: 'Special Power of Attorney (SPA) for Specific Act',
    actReference: 'Powers of Attorney Act 1882 & Indian Stamp Act 1899 (Article 48)',
    category: 'legal',
    description: 'Narrow-scope power of attorney restricted to a single property registration or court lawsuit appearance.',
    stampDutyGuideline: '₹ 100/- Non-Judicial Stamp Paper',
    partiesRequired: 'Principal and Special Attorney',
    mandatoryClauses: [
      'Strictly Limited Single Purpose (e.g. Presenting Sale Deed before Sub-Registrar)',
      'Automatic Expiry upon Completion of Specified Transaction',
      'Explicit Prohibition from Exercising General Discretionary Powers'
    ],
    statutoryPreamble: 'SPECIAL POWER OF ATTORNEY GRANTED FOR A LIMITED & DEFINED ACT.',
    standardBody: 'I authorize my Special Attorney exclusively to present the sale deed for registration and not to exercise any other power on my behalf.'
  },

  // 24. Request-Only Document (Handled directly via web intake)
  {
    id: 'custom_corporate_charter',
    title: 'Corporate Charter & Shareholder Bylaw Request',
    actReference: 'Companies Act 2013 & Indian Stamp Act 1899',
    category: 'legal',
    description: 'Custom corporate governance request requiring specialist company secretary drafting.',
    stampDutyGuideline: 'Ad-valorem per authorized share capital',
    partiesRequired: 'Promoters & Incoming Shareholders',
    mandatoryClauses: ['Tag-along Rights', 'Drag-along Rights', 'Board Seat Quorum'],
    statutoryPreamble: 'CORPORATE REORGANIZATION REQUEST DRAFT.',
    standardBody: 'Intake request received for specialized CS legal drafting.',
    isRequestOnly: true
  },

  // 25. Request-Only Document 2
  {
    id: 'cross_border_ip_transfer',
    title: 'Cross-Border Intellectual Property License Request',
    actReference: 'FEMA Guidelines 1999 & Patents Act 1970',
    category: 'legal',
    description: 'International IP licensing request requiring FEMA clearance and RBI reporting.',
    stampDutyGuideline: 'Per state treaty guidelines',
    partiesRequired: 'Foreign Licensor and Domestic Tech Entity',
    mandatoryClauses: ['Royalty Caps', 'Withholding Tax Treaties'],
    statutoryPreamble: 'INTERNATIONAL CROSS-BORDER INTAKE REQUEST.',
    standardBody: 'Intake request queued for cross-border regulatory review.',
    isRequestOnly: true
  },

  // 26. Request-Only Document 3
  {
    id: 'arbitration_reference_submission',
    title: 'Arbitration Reference and Submission Agreement',
    actReference: 'Arbitration and Conciliation Act 1996 (Section 7)',
    category: 'legal',
    description: 'Voluntary submission of pending disputes to Sole Arbitrator in lieu of civil court litigation.',
    stampDutyGuideline: '₹ 500/- Non-Judicial Stamp Paper',
    partiesRequired: 'Claimant and Respondent',
    mandatoryClauses: ['Sole Arbitrator Appointment', 'Seat & Venue of Arbitration'],
    statutoryPreamble: 'ARBITRATION AGREEMENT UNDER SECTION 7 ARBITRATION ACT 1996.',
    standardBody: 'Dispute referred to fast-track institutional arbitration.',
    isRequestOnly: true
  },

  // --- COMPLIANCE LEAD & REGISTRATION STATUTORY FORMATS ---

  // 27. GST Registration Format (All States)
  {
    id: 'gst_registration_compliance',
    title: 'GST Portal Registration Format (REG-01)',
    actReference: 'Central Goods and Services Tax Act 2017 & State GST Acts',
    category: 'compliance',
    subCategory: 'all_states',
    description: 'Statutory filing format for GSTIN allocation across all Indian States & Union Territories.',
    stampDutyGuideline: 'Zero Stamp Duty on Application; ₹100 Stamp Paper required for Landlord Consent / Rental Agreement attachment.',
    partiesRequired: 'Proprietor / Managing Director / Designated Partner',
    mandatoryClauses: [
      'PAN Validation against CBDT Database',
      'Principal Place of Business Geolocation & Municipal Proof',
      'Authorized Signatory Aadhaar OTP e-KYC Verification',
      'Harmonized System of Nomenclature (HSN) & SAC Classification'
    ],
    statutoryPreamble: 'FORM GST REG-01 — APPLICATION FOR REGISTRATION UNDER SECTION 22/24 OF THE CGST ACT 2017.',
    standardBody: 'Application for allotment of 15-digit Goods and Services Taxpayer Identification Number (GSTIN) with validated banking and business credentials.'
  },

  // 28. Udyam MSME Registration Format (All States)
  {
    id: 'udyam_msme_compliance',
    title: 'Udyam MSME Certificate Issuance Format',
    actReference: 'Micro, Small and Medium Enterprises Development Act 2006',
    category: 'compliance',
    subCategory: 'all_states',
    description: 'Central Ministry of MSME statutory registration format for priority sector lending benefits and tender collateral waivers.',
    stampDutyGuideline: 'Government Portal Fee Exempt (Zero Stamp Duty)',
    partiesRequired: 'Enterprise Enterprise Head (Aadhaar Seeded)',
    mandatoryClauses: [
      'Classification: Micro (Investment < 1 Cr), Small (< 10 Cr), Medium (< 50 Cr)',
      'Direct Income Tax ITR-3/5/6 Turnover Data Auto-fetch',
      'NIC 5-Digit Industry Classification Codes',
      'Zero Physical Documentation (100% Self-Declaration Flow)'
    ],
    statutoryPreamble: 'MINISTRY OF MICRO, SMALL & MEDIUM ENTERPRISES — UDYAM REGISTRATION PORTAL CERTIFICATE FORMAT.',
    standardBody: 'Self-declaration under Section 7 of the MSMED Act 2006 certifying enterprise asset investment and plant machinery values.'
  },

  // 29. Income Tax Notice Reply & Filing Notice
  {
    id: 'itr_filing_notice_compliance',
    title: 'Income Tax Statutory Notice Reply (Sec 142(1) / 148)',
    actReference: 'Income Tax Act 1961 & Digital Faceless Assessment Scheme',
    category: 'compliance',
    subCategory: 'filing_notices',
    description: 'Statutory format for answering Income Tax Department query notices, high-value transaction explainers, and ITR rectification.',
    stampDutyGuideline: 'Statutory Filing — Exempt from Stamp Duty',
    partiesRequired: 'Assessee (Individual / HUF / Company) and Jurisdictional AO',
    mandatoryClauses: [
      'Document Identification Number (DIN) Verification',
      'Assessment Year & Relevant Financial Ledger Reconciliations',
      'AIS / TIS Statement Reconciliation with Filed ITR Schedules',
      'Digital Signature Certificate (DSC) / EVC Verification'
    ],
    statutoryPreamble: 'STATUTORY RESPONSE FILED ON THE INCOME TAX E-FILING PORTAL UNDER SECTION 142/148.',
    standardBody: 'The Assessee submits detailed ledger explanations, AIS reconciliation, and bank statements in response to the notice under inquiry.'
  },

  // 30. Vehicle Insurance Statutory Policy Format
  {
    id: 'vehicle_insurance_compliance',
    title: 'Motor Vehicle Comprehensive & Third-Party Insurance Schedule',
    actReference: 'Motor Vehicles Act 1988 (Section 146) & IRDAI Guidelines',
    category: 'compliance',
    subCategory: 'insurance_registration',
    description: 'IRDAI-compliant certificate of insurance ensuring mandatory statutory road compliance against third-party bodily injury liabilities.',
    stampDutyGuideline: 'Stamp Duty included in IRDAI Premium Stamp Schedule',
    partiesRequired: 'General Insurance Underwriter and Insured Vehicle Owner',
    mandatoryClauses: [
      'Insured Declared Value (IDV) Calculation & Depreciation Slab',
      'Statutory Compulsory Personal Accident (CPA) Cover of ₹ 15 Lakhs',
      'Unlimited Third-Party Bodily Injury & Property Damage Protection',
      'Zero-Depreciation & Engine-Gearbox Protection Add-on Endorsements'
    ],
    statutoryPreamble: 'CERTIFICATE OF INSURANCE AND POLICY SCHEDULE CUM TAX INVOICE UNDER MOTOR VEHICLES ACT 1988.',
    standardBody: 'The Insurer agrees to indemnify the Insured in respect of accidental loss, damage, and third-party liabilities subject to policy deductibles.'
  },

  // 31. Bank and Loans Agreement Format
  {
    id: 'bank_loans_agreement_compliance',
    title: 'Commercial / Personal Bank Loan and Hypothecation Deed',
    actReference: 'Indian Stamp Act 1899 (Article 6 - Loan Agreement) & Banking Regulation Act 1949',
    category: 'compliance',
    subCategory: 'bank_loans',
    description: 'Formal bank loan documentation format with hypothecation of movable assets, personal guarantees, and interest reset clauses.',
    stampDutyGuideline: 'State Specific Ad-Valorem (e.g. ₹ 500 or 0.1% to 0.2% of loan sanction amount in UP / Delhi / MH)',
    partiesRequired: 'Lending Bank / NBFC (First Party) and Borrower & Guarantor (Second Party)',
    mandatoryClauses: [
      'Loan Sanction Limit, Disbursement Tranches & Floating/Fixed Interest Rate',
      'Equated Monthly Installment (EMI) Schedule & NACH Auto-Debit Mandate',
      'Hypothecation Charge Creation & CERSAI Filing Undertaking',
      'Events of Default, Accelerating Clause & SARFAESI Enforcement Consent'
    ],
    statutoryPreamble: 'THIS LOAN AND HYPOTHECATION AGREEMENT is executed between the Lending Financial Institution and the Borrower.',
    standardBody: 'The Lender agrees to grant the term credit facility, and the Borrower pledges the underlying assets and agrees to strict EMI repayment schedules.'
  },

  // 32. Website Terms of Service & Privacy Policy Compliance Format
  {
    id: 'website_terms_privacy_compliance',
    title: 'Website Terms of Service & DPDP Act 2023 Privacy Format',
    actReference: 'Information Technology Act 2000 (Section 43A) & Digital Personal Data Protection Act 2023',
    category: 'compliance',
    subCategory: 'website',
    description: 'Mandatory statutory website governance documents, user consent terms, cookies disclosure, and grievance officer appointment.',
    stampDutyGuideline: 'Electronic Clickwrap / Browsewrap Agreement (Zero Stamp Duty)',
    partiesRequired: 'Platform Operator (Website Owner) and End Users / Consumers',
    mandatoryClauses: [
      'Data Fiduciary Notice & Explicit Purpose-Limited User Consent',
      'User Rights: Right to Access, Correction, and Erasure of Personal Data',
      'Appointment of Designated Data Grievance Redressal Officer in India',
      'Payment Gateway Liability Disclaimer & Intellectual Property Protection'
    ],
    statutoryPreamble: 'DIGITAL TERMS OF SERVICE & STATUTORY PRIVACY NOTICE MANDATED BY IT ACT 2000 & DPDP ACT 2023.',
    standardBody: 'These terms govern all user access to the digital platform, establishing binding arbitration, acceptable use policies, and privacy protocols.'
  }
];


