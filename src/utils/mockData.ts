/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Initial Seed Data for CTC System
 * IDs formatted strictly as: CTC-2026-2001, CTC-2026-2002, etc.
 * Features:
 * - Dynamic timestamps spanning <24h (active in Orders feed) and >24h (archived, revealed by search)
 * - StampDutyPaidBy details
 * - Registration subcategories: all_states, filing_notices, insurance_registration, bank_loans, website
 * - Full status range: confirmed, cancelled, pending, stamp_pending, confirmed_stamp_attached
 */

import { Order, AuditLog, TelegramNotification } from '../types';

const now = Date.now();
const h = 3600 * 1000;

export const INITIAL_ORDERS: Order[] = [
  // 1. Order within 2 hours: Confirmed e-Stamp Attached
  {
    id: 'CTC-2026-2001',
    referenceCode: 'WA-DL-2001',
    category: 'legal',
    legalGroup: 'requests',
    formType: 'rental_11_months',
    formName: '11th Month Rental Agreement',
    clientName: 'Vikramaditya Sharma',
    clientPhone: '+91 98112 45890',
    clientEmail: 'vikram.sharma@quadtrix.in',
    stampDutyValue: 500,
    stampDutyPaidBy: 'First Party',
    createdAt: new Date(now - 2 * h).toISOString(),
    updatedAt: new Date(now - 1.5 * h).toISOString(),
    status: 'confirmed_stamp_attached',
    source: 'Website A',
    signatureVerified: true,
    stampData: {
      uin: 'IN-DL89210384729103T',
      certificateNo: 'CERT-SHCIL-DL-2026-09281',
      issueDate: new Date(now - 2 * h).toISOString().split('T')[0],
      firstParty: 'Rajeshwar Nath Khurana',
      secondParty: 'Vikramaditya Sharma',
      stampDutyPaidBy: 'First Party',
      stampDutyAmount: 500,
      article: 'Article 35 - Tenancy Agreement',
      state: 'NCT of Delhi',
      verified: true,
      verifiedAt: new Date(now - 1.5 * h).toISOString()
    },
    legalData: {
      documentType: 'rental_11_months',
      documentTitle: '11TH MONTH RESIDENTIAL RENTAL AGREEMENT',
      stampDutyAmount: 500,
      state: 'NCT of Delhi',
      executionDate: new Date().toISOString().split('T')[0],
      executionPlace: 'New Delhi',
      party1: {
        fullName: 'Rajeshwar Nath Khurana',
        relationshipType: 'S/o',
        relativeName: 'Late Brijmohan Khurana',
        age: 58,
        pan: 'ABCDE1234F',
        aadhaarLast4: '7821',
        phone: '+91 98101 23456',
        email: 'rn.khurana@outlook.com',
        address: 'B-4/112, Safdarjung Enclave, New Delhi - 110029',
        pincode: '110029'
      },
      party2: {
        fullName: 'Vikramaditya Sharma',
        relationshipType: 'S/o',
        relativeName: 'Devendra Sharma',
        age: 32,
        pan: 'BWQPS9821K',
        aadhaarLast4: '4190',
        phone: '+91 98112 45890',
        email: 'vikram.sharma@quadtrix.in',
        address: 'Flat 402, Tower 9, Green Glen Layout, Bellandur, Bengaluru - 560103',
        pincode: '560103'
      },
      propertyDetails: {
        premisesType: '3 BHK Furnished Apartment with Dedicated Parking',
        fullAddress: 'Flat No. 302, Third Floor, Pocket C-9, Vasant Kunj, New Delhi - 110070',
        monthlyRentOrConsideration: 45000,
        securityDeposit: 90000,
        lockInPeriodMonths: 6,
        agreementDurationMonths: 11,
        noticePeriodDays: 30,
        utilityChargesBorneBy: 'Tenant'
      },
      clauses: [
        {
          id: 'c1',
          title: 'Duration & Possession',
          body: 'The tenancy is granted for a fixed period of 11 (Eleven) months commencing on 1st November 2026 and expiring on 30th September 2027.'
        },
        {
          id: 'c2',
          title: 'Monthly Rent & Utility Billing',
          body: 'The monthly rent of INR 45,000/- (Rupees Forty-Five Thousand only) shall be payable in advance on or before the 5th day of each calendar month. Electricity and water consumption charges shall be paid directly by the Tenant as per monthly meter bills.'
        },
        {
          id: 'c3',
          title: 'Interest-Free Security Deposit',
          body: 'The Tenant has deposited an interest-free refundable security deposit of INR 90,000/- via NEFT transaction, which shall be refunded simultaneously upon physical vacating of the premises.'
        }
      ],
      witnesses: [
        { name: 'Anand Vardhan Roy', address: 'C-12, Green Park Main, New Delhi - 110016', phone: '+91 98711 00234' },
        { name: 'Meenakshi Sundaram', address: 'E-55, Hauz Khas Enclave, New Delhi - 110016', phone: '+91 99100 88291' }
      ]
    }
  },

  // 2. Order within 4 hours: Pending Stamp
  {
    id: 'CTC-2026-2002',
    referenceCode: 'WA-KA-2002',
    category: 'legal',
    legalGroup: 'requests',
    formType: 'partnership_deed',
    formName: 'Partnership Deed',
    clientName: 'Sanjay S. Kulkarni',
    clientPhone: '+91 98800 12345',
    clientEmail: 'sanjay@kulkarni-tech.in',
    stampDutyValue: 1000,
    stampDutyPaidBy: '50-50',
    createdAt: new Date(now - 4 * h).toISOString(),
    updatedAt: new Date(now - 3.8 * h).toISOString(),
    status: 'stamp_pending',
    source: 'Website A',
    signatureVerified: true,
    legalData: {
      documentType: 'partnership_deed',
      documentTitle: 'DEED OF PARTNERSHIP',
      stampDutyAmount: 1000,
      state: 'Karnataka',
      executionDate: new Date().toISOString().split('T')[0],
      executionPlace: 'Bengaluru',
      party1: {
        fullName: 'Sanjay S. Kulkarni',
        relationshipType: 'S/o',
        relativeName: 'Shripad Kulkarni',
        age: 41,
        pan: 'AAEPK7821B',
        aadhaarLast4: '9921',
        phone: '+91 98800 12345',
        email: 'sanjay@kulkarni-tech.in',
        address: '#142, 4th Cross, RMV Extension, Sadashivanagar, Bengaluru - 560080'
      },
      party2: {
        fullName: 'Naveen Chandrashekar',
        relationshipType: 'S/o',
        relativeName: 'Chandrashekar Rao',
        age: 39,
        pan: 'BCNPC4512M',
        aadhaarLast4: '3410',
        phone: '+91 97411 98765',
        email: 'naveen@kulkarni-tech.in',
        address: '#89, 12th Main, Indiranagar, Bengaluru - 560038'
      }
    }
  },

  // 3. Order within 6 hours: Sublease Agreement (Requests group)
  {
    id: 'CTC-2026-2003',
    referenceCode: 'WA-MH-2003',
    category: 'legal',
    legalGroup: 'requests',
    formType: 'sublease_agreement',
    formName: 'Sublease Agreement',
    clientName: 'Pooja Anand Verma',
    clientPhone: '+91 98200 44556',
    clientEmail: 'pooja.verma@apexventures.in',
    stampDutyValue: 500,
    stampDutyPaidBy: 'Second Party',
    createdAt: new Date(now - 6 * h).toISOString(),
    updatedAt: new Date(now - 5.5 * h).toISOString(),
    status: 'decrypted',
    source: 'Website A',
    signatureVerified: true,
    legalData: {
      documentType: 'sublease_agreement',
      documentTitle: 'COMMERCIAL SUBLEASE AGREEMENT',
      stampDutyAmount: 500,
      state: 'Maharashtra',
      executionDate: new Date().toISOString().split('T')[0],
      executionPlace: 'Mumbai',
      party1: {
        fullName: 'Rohit K. Singhal',
        relationshipType: 'S/o',
        relativeName: 'Kishan Chand Singhal',
        phone: '+91 98201 88771',
        email: 'rohit@singhal-group.in',
        address: 'B-701, Sea Breeze Apartments, Bandra West, Mumbai - 400050'
      },
      party2: {
        fullName: 'Pooja Anand Verma',
        relationshipType: 'D/o',
        relativeName: 'Anand Verma',
        phone: '+91 98200 44556',
        email: 'pooja.verma@apexventures.in',
        address: 'Flat 12A, Cuffe Castle, Cuffe Parade, Colaba, Mumbai - 400005'
      }
    }
  },

  // 4. Order within 9 hours: Landlord NOC for GST (Normal DOC)
  {
    id: 'CTC-2026-2004',
    referenceCode: 'WA-UP-2004',
    category: 'legal',
    legalGroup: 'normal_doc',
    formType: 'landlord_noc_gst',
    formName: 'Landlord NOC for GST Portal',
    clientName: 'Deepak Tyagi',
    clientPhone: '+91 98730 66120',
    clientEmail: 'deepak.tyagi@noida-enterprises.com',
    stampDutyValue: 100,
    stampDutyPaidBy: 'First Party',
    createdAt: new Date(now - 9 * h).toISOString(),
    updatedAt: new Date(now - 8.5 * h).toISOString(),
    status: 'confirmed_stamp_attached',
    source: 'Website A',
    signatureVerified: true,
    stampData: {
      uin: 'IN-UP20268819230198T',
      certificateNo: 'CERT-SHCIL-UP-2026-44102',
      issueDate: new Date(now - 9 * h).toISOString().split('T')[0],
      firstParty: 'Rameshwar Dayal Tyagi',
      secondParty: 'Deepak Tyagi',
      stampDutyPaidBy: 'First Party',
      stampDutyAmount: 100,
      article: 'Article 4 - Declaration',
      state: 'Uttar Pradesh',
      verified: true
    },
    legalData: {
      documentType: 'landlord_noc_gst',
      documentTitle: 'LANDLORD NO OBJECTION CERTIFICATE FOR GST PORTAL',
      stampDutyAmount: 100,
      state: 'Uttar Pradesh',
      executionDate: new Date().toISOString().split('T')[0],
      executionPlace: 'Noida',
      party1: {
        fullName: 'Rameshwar Dayal Tyagi',
        phone: '+91 98110 33221',
        email: 'rdtyagi@gmail.com',
        address: 'House No. 18, Block B, Sector 62, Noida, Gautam Buddha Nagar, UP - 201309'
      },
      party2: {
        fullName: 'Deepak Tyagi',
        phone: '+91 98730 66120',
        email: 'deepak.tyagi@noida-enterprises.com',
        address: 'Shop 4, Commercial Complex, Sector 63, Noida, UP - 201307'
      }
    }
  },

  // 5. Order within 13 hours: Bank and Loans Agreement (New Category)
  {
    id: 'CTC-2026-2005',
    referenceCode: 'WA-LOAN-2005',
    category: 'registration',
    subCategory: 'bank_loans',
    formType: 'bank_loans_agreement_compliance',
    formName: 'Commercial Business Loan and Hypothecation Deed',
    clientName: 'Sameer J. Mathur',
    clientPhone: '+91 98210 77334',
    clientEmail: 'sameer@mathur-instruments.in',
    stampDutyValue: 500,
    stampDutyPaidBy: 'Second Party',
    createdAt: new Date(now - 13 * h).toISOString(),
    updatedAt: new Date(now - 12.8 * h).toISOString(),
    status: 'stamp_pending',
    source: 'Website A',
    signatureVerified: true,
    registrationData: {
      serviceType: 'bank_loans_agreement_compliance',
      serviceTitle: 'SME Commercial Credit Facility & Asset Hypothecation',
      applicantName: 'Sameer J. Mathur',
      panNumber: 'AAXPM9910D',
      aadhaarNumber: 'XXXX-XXXX-4491',
      contactNumber: '+91 98210 77334',
      email: 'sameer@mathur-instruments.in',
      businessName: 'Mathur Precision Instruments LLP',
      constitutionType: 'LLP',
      businessAddress: 'Plot 88, Okhla Industrial Area Phase 3, New Delhi - 110020',
      annualTurnover: '₹ 3,40,00,000',
      documentChecklist: [
        { id: 'pan', label: 'PAN Card of Borrower & Guarantors', required: true, uploaded: true, verified: true },
        { id: 'financials', label: 'Audited Financials 3 Years', required: true, uploaded: true, verified: true },
        { id: 'hypothecation', label: 'Hypothecation Schedule', required: true, uploaded: true, verified: false }
      ]
    }
  },

  // 6. Order within 17 hours: Website Terms & DPDP Act Privacy (New Category)
  {
    id: 'CTC-2026-2006',
    referenceCode: 'WA-WEB-2006',
    category: 'registration',
    subCategory: 'website',
    formType: 'website_terms_privacy_compliance',
    formName: 'Website Terms of Service & DPDP Act 2023 Privacy Notice',
    clientName: 'Ananya S. Iyer',
    clientPhone: '+91 99400 11287',
    clientEmail: 'ananya@finzen-pay.in',
    stampDutyValue: 0,
    stampDutyPaidBy: 'First Party',
    createdAt: new Date(now - 17 * h).toISOString(),
    updatedAt: new Date(now - 16.5 * h).toISOString(),
    status: 'decrypted',
    source: 'Website A',
    signatureVerified: true,
    registrationData: {
      serviceType: 'website_terms_privacy_compliance',
      serviceTitle: 'Fintech Platform User Agreement & DPDP Compliance',
      applicantName: 'Ananya S. Iyer',
      panNumber: 'AABCI1109Q',
      aadhaarNumber: 'XXXX-XXXX-5520',
      contactNumber: '+91 99400 11287',
      email: 'ananya@finzen-pay.in',
      businessName: 'FinZen Pay Technologies Pvt Ltd',
      constitutionType: 'Private Limited',
      businessAddress: '10th Floor, Olympia Tech Park, Guindy, Chennai - 600032',
      documentChecklist: [
        { id: 'coi', label: 'Certificate of Incorporation', required: true, uploaded: true, verified: true },
        { id: 'dpdp_charter', label: 'Data Grievance Officer Charter', required: true, uploaded: true, verified: true }
      ]
    }
  },

  // 7. Order within 21 hours: GST All States Registration
  {
    id: 'CTC-2026-2007',
    referenceCode: 'WA-REG-GST-2007',
    category: 'registration',
    subCategory: 'all_states',
    formType: 'gst_registration',
    formName: 'GST Portal Registration Format (REG-01)',
    clientName: 'Arjun Deshmukh',
    clientPhone: '+91 99220 11984',
    clientEmail: 'arjun@deshmukh-logistics.in',
    stampDutyValue: 0,
    stampDutyPaidBy: 'First Party',
    createdAt: new Date(now - 21 * h).toISOString(),
    updatedAt: new Date(now - 20.5 * h).toISOString(),
    status: 'processing',
    source: 'Website A',
    signatureVerified: true,
    registrationData: {
      serviceType: 'gst_registration',
      serviceTitle: 'Goods & Services Tax (GST) New Registration',
      applicantName: 'Arjun Deshmukh',
      panNumber: 'AZOPD9123M',
      aadhaarNumber: 'XXXX-XXXX-8912',
      contactNumber: '+91 99220 11984',
      email: 'arjun@deshmukh-logistics.in',
      businessName: 'Deshmukh Supply Chain Logistics',
      constitutionType: 'Proprietorship',
      businessAddress: 'Plot No. 45, MIDC Bhosari Industrial Area, Pune, Maharashtra - 411026',
      annualTurnover: '₹ 45,00,000 projected',
      taxYearOrAssessmentYear: 'FY 2026-27',
      documentChecklist: [
        { id: 'pan', label: 'PAN Card of Proprietor', required: true, uploaded: true, verified: true },
        { id: 'aadhaar', label: 'Aadhaar Card with linked OTP', required: true, uploaded: true, verified: true },
        { id: 'address_proof', label: 'MIDC Industrial Electricity Bill (Latest)', required: true, uploaded: true, verified: true }
      ]
    }
  },

  // 8. Order 32 hours ago (>24h): Archived, searchable via manual search!
  {
    id: 'CTC-2026-2008',
    referenceCode: 'WA-INS-2008',
    category: 'registration',
    subCategory: 'insurance_registration',
    formType: 'vehicle_insurance',
    formName: 'Motor Vehicle Comprehensive & Third-Party Insurance Schedule',
    clientName: 'Harpreet Singh Walia',
    clientPhone: '+91 98150 67219',
    clientEmail: 'harpreet@walia-precision.in',
    stampDutyValue: 0,
    stampDutyPaidBy: 'First Party',
    createdAt: new Date(now - 32 * h).toISOString(),
    updatedAt: new Date(now - 31 * h).toISOString(),
    status: 'stamp_pending',
    source: 'Website A',
    signatureVerified: true,
    registrationData: {
      serviceType: 'vehicle_insurance',
      serviceTitle: 'Commercial Goods Vehicle Comprehensive Policy',
      applicantName: 'Harpreet Singh Walia',
      panNumber: 'CHRPW7781N',
      aadhaarNumber: 'XXXX-XXXX-9910',
      contactNumber: '+91 98150 67219',
      email: 'harpreet@walia-precision.in',
      businessName: 'Walia Precision Tools & Dies',
      vehicleDetails: {
        registrationNumber: 'PB-10-CZ-4412',
        vehicleMakeModel: 'Tata 407 LPT Heavy Commercial',
        manufacturingYear: '2023',
        chassisNumber: 'MAT412098KLA8812',
        policyType: 'Comprehensive'
      },
      documentChecklist: [
        { id: 'rc_copy', label: 'Vehicle Registration Certificate (RC)', required: true, uploaded: true, verified: true }
      ]
    }
  },

  // 9. Order 45 hours ago (>24h): Filing Notices
  {
    id: 'CTC-2026-2009',
    referenceCode: 'WA-REG-ITR-2009',
    category: 'registration',
    subCategory: 'filing_notices',
    formType: 'itr_filing_notice_compliance',
    formName: 'Income Tax Statutory Notice Reply (Sec 142(1) / 148)',
    clientName: 'Sunita Radhakrishnan',
    clientPhone: '+91 94440 99812',
    clientEmail: 'sunita.rk@gmail.com',
    stampDutyValue: 0,
    stampDutyPaidBy: 'First Party',
    createdAt: new Date(now - 45 * h).toISOString(),
    updatedAt: new Date(now - 44 * h).toISOString(),
    status: 'decrypted',
    source: 'Website A',
    signatureVerified: true,
    registrationData: {
      serviceType: 'itr_filing_notice_compliance',
      serviceTitle: 'Income Tax Notice Reply & AIS Reconciliation',
      applicantName: 'Sunita Radhakrishnan',
      panNumber: 'BGKPR1902E',
      aadhaarNumber: 'XXXX-XXXX-3341',
      contactNumber: '+91 94440 99812',
      email: 'sunita.rk@gmail.com',
      documentChecklist: [
        { id: 'pan', label: 'PAN Card', required: true, uploaded: true, verified: true },
        { id: 'notice_ack', label: 'Income Tax Notice PDF', required: true, uploaded: true, verified: true }
      ]
    }
  },

  // 10. Order 60 hours ago (>24h): Cancelled status (shows in Profile Cancelled section)
  {
    id: 'CTC-2026-2010',
    referenceCode: 'WA-CANCEL-2010',
    category: 'legal',
    legalGroup: 'normal_doc',
    formType: 'mutual_nda_agreement',
    formName: 'Non-Disclosure & Confidentiality Agreement (NDA)',
    clientName: 'Alok Nath Trivedi',
    clientPhone: '+91 98110 99221',
    clientEmail: 'alok.trivedi@technova.in',
    stampDutyValue: 500,
    stampDutyPaidBy: 'First Party',
    createdAt: new Date(now - 60 * h).toISOString(),
    updatedAt: new Date(now - 58 * h).toISOString(),
    status: 'cancelled',
    source: 'Website A',
    signatureVerified: true,
    legalData: {
      documentType: 'mutual_nda_agreement',
      documentTitle: 'MUTUAL NON-DISCLOSURE AGREEMENT',
      stampDutyAmount: 500,
      state: 'NCT of Delhi',
      executionDate: new Date(now - 60 * h).toISOString().split('T')[0],
      executionPlace: 'New Delhi',
      party1: {
        fullName: 'Alok Nath Trivedi',
        phone: '+91 98110 99221',
        email: 'alok.trivedi@technova.in',
        address: 'B-14, Connaught Place, New Delhi - 110001'
      },
      party2: {
        fullName: 'SkyHigh Analytics Corp',
        phone: '+91 98100 00192',
        email: 'legal@skyhigh-analytics.com',
        address: 'Sector 44, Gurugram, Haryana - 122003'
      }
    }
  }
];

export const INITIAL_AUDIT_LOGS: AuditLog[] = [
  {
    id: 'log-001',
    timestamp: new Date(now - 1.5 * h).toISOString(),
    orderId: 'CTC-2026-2001',
    type: 'stamp_attached',
    message: 'e-Stamp UIN IN-DL89210384729103T successfully verified and bound to 11th Month Rental Agreement.',
    status: 'success'
  },
  {
    id: 'log-002',
    timestamp: new Date(now - 6 * h).toISOString(),
    orderId: 'CTC-2026-2003',
    type: 'payload_decrypted',
    message: 'AES-256 payload automatically decrypted using Master Key from Website A for Sublease Agreement.',
    status: 'success'
  }
];

export const INITIAL_NOTIFICATIONS: TelegramNotification[] = [
  {
    id: 'tg-01',
    timestamp: new Date(now - 1.5 * h).toISOString(),
    orderId: 'CTC-2026-2001',
    clientName: 'Vikramaditya Sharma',
    serviceName: '11th Month Rental Agreement',
    category: 'legal',
    channel: '@Quadtrix_Ops_Alerts',
    status: 'Delivered',
    messageText: 'HAVE A NEW ORDER • 11th Month Rental Agreement • ₹500 Stamp Paper'
  }
];
