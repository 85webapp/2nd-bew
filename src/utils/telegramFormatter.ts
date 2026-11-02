/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Telegram Notification Message Formatter
 * Strict Spec:
 * - Header: HAVE A NEW ORDER [Time] [Date]
 * - Form Name
 * - First Party (Full Name, Full Address, Aadhaar, PAN, Mobile)
 * - Second Party (Full Name, Full Address, Aadhaar, PAN)
 * - Stamp Paper Value & Paid By (First Party / Second Party / 50-50)
 */

import { Order } from '../types';
import { formatTime12Hour, formatDateStandard } from './dateTime';

export function formatTelegramOrderMessage(order: Order): string {
  const timeStr = formatTime12Hour(order.createdAt);
  const dateStr = formatDateStandard(order.createdAt);

  const isLegal = order.category === 'legal';
  const p1 = order.legalData?.party1 || {
    fullName: order.registrationData?.applicantName || order.clientName,
    address: order.registrationData?.businessAddress || 'Address on file',
    phone: order.clientPhone,
    aadhaarLast4: order.registrationData?.aadhaarNumber ? order.registrationData.aadhaarNumber.slice(-4) : 'N/A',
    pan: order.registrationData?.panNumber || 'N/A'
  };

  const p2 = order.legalData?.party2 || {
    fullName: 'Second Party / Authority',
    address: 'N/A',
    aadhaarLast4: 'N/A',
    pan: 'N/A'
  };

  const stampValue = order.stampDutyValue || 0;
  const paidBy = order.stampDutyPaidBy || order.stampData?.stampDutyPaidBy || 'First Party';

  return `HAVE A NEW ORDER ${timeStr} ${dateStr}

FORM NAME:
${order.formName} (ID: ${order.id})

FIRST PARTY DETAILS:
• Full Name: ${p1.fullName}
• Full Address: ${p1.address || 'Address provided in record'}
• Mobile Number: ${p1.phone || order.clientPhone}
• Aadhaar Card: ${p1.aadhaarLast4 && p1.aadhaarLast4 !== '0' ? `XXXX-XXXX-${p1.aadhaarLast4}` : '0'}
• PAN Card: ${p1.pan || 'N/A'}

SECOND PARTY DETAILS:
• Full Name: ${p2.fullName || 'N/A'}
• Full Address: ${p2.address || 'N/A'}
• Aadhaar Card: ${p2.aadhaarLast4 && p2.aadhaarLast4 !== '0' ? `XXXX-XXXX-${p2.aadhaarLast4}` : '0'}
• PAN Card: ${p2.pan || 'N/A'}

STAMP PAPER & DUTY:
• Stamp Paper Selected: ₹ ${stampValue}/-
• Stamp Paper Paid By: ${paidBy}
• State: ${order.legalData?.state || 'NCT of Delhi / Uttar Pradesh'}`;
}
