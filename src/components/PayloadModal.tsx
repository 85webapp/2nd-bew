/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Payload Ingestion Simulator Modal
 * Simulates Website A Lock-Travel-Unlock Flow with 1-Click Encrypted Ingestion
 */

import React, { useState } from 'react';
import { X, Zap, Lock, Unlock, ShieldCheck, ArrowRight } from 'lucide-react';
import { encryptPayload, decryptPayload } from '../utils/crypto';
import { Order } from '../types';

interface PayloadModalProps {
  isOpen: boolean;
  onClose: () => void;
  masterKey: string;
  onIngestOrder: (newOrder: Order) => void;
  onSendNotification: (msg: string) => void;
}

export const PayloadModal: React.FC<PayloadModalProps> = ({
  isOpen,
  onClose,
  masterKey,
  onIngestOrder,
  onSendNotification
}) => {
  const [selectedPreset, setSelectedPreset] = useState<string>('rent_delhi');
  const [customPayloadJson, setCustomPayloadJson] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');

  if (!isOpen) return null;

  const presets = [
    {
      id: 'rent_delhi',
      name: 'Residential Rent Agreement (Delhi)',
      category: 'legal',
      getData: () => ({
        id: `DOC-2026-${Math.floor(1000 + Math.random() * 9000)}`,
        referenceCode: `WA-DL-${Date.now().toString().slice(-4)}`,
        category: 'legal',
        formType: 'residential_rental_agreement',
        formName: 'Residential Rental / Tenancy Agreement',
        clientName: 'Siddharth V. Rao',
        clientPhone: '+91 98108 55412',
        clientEmail: 'siddharth.rao@gmail.com',
        stampDutyValue: 500,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        status: 'decrypted',
        source: 'Website A',
        signatureVerified: true,
        legalData: {
          documentType: 'residential_rental_agreement',
          documentTitle: 'RESIDENTIAL LEASE AND TENANCY AGREEMENT',
          stampDutyAmount: 500,
          state: 'NCT of Delhi',
          executionDate: new Date().toISOString().split('T')[0],
          executionPlace: 'New Delhi',
          party1: {
            fullName: 'Krishan Kant Bansal',
            relationshipType: 'S/o',
            relativeName: 'O. P. Bansal',
            age: 62,
            pan: 'AABPB1920M',
            aadhaarLast4: '3901',
            phone: '+91 98110 33221',
            email: 'kkbansal@delhicapital.in',
            address: 'House No. 12, Golf Links, New Delhi - 110003'
          },
          party2: {
            fullName: 'Siddharth V. Rao',
            relationshipType: 'S/o',
            relativeName: 'V. R. Rao',
            age: 34,
            pan: 'BZZPR8192K',
            aadhaarLast4: '6612',
            phone: '+91 98108 55412',
            email: 'siddharth.rao@gmail.com',
            address: 'Flat 6B, Mayfair Apartments, New Delhi - 110017'
          },
          propertyDetails: {
            premisesType: '3 BHK Floor with Terraced Balcony',
            fullAddress: 'A-22, First Floor, South Extension Part II, New Delhi - 110049',
            monthlyRentOrConsideration: 52000,
            securityDeposit: 104000,
            lockInPeriodMonths: 6,
            agreementDurationMonths: 11,
            noticePeriodDays: 30
          }
        }
      })
    },
    {
      id: 'affidavit_name',
      name: 'Name Change Affidavit (Notary)',
      category: 'legal',
      getData: () => ({
        id: `DOC-2026-${Math.floor(1000 + Math.random() * 9000)}`,
        referenceCode: `WA-NC-${Date.now().toString().slice(-4)}`,
        category: 'legal',
        formType: 'name_change_affidavit',
        formName: 'Name Change & Gazette Affidavit',
        clientName: 'Ananya Sen',
        clientPhone: '+91 98300 44192',
        clientEmail: 'ananya.sen@outlook.com',
        stampDutyValue: 100,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        status: 'stamp_pending',
        source: 'Website A',
        signatureVerified: true,
        legalData: {
          documentType: 'name_change_affidavit',
          documentTitle: 'AFFIDAVIT FOR CHANGE OF NAME FOR OFFICIAL GAZETTE',
          stampDutyAmount: 100,
          state: 'West Bengal',
          executionDate: new Date().toISOString().split('T')[0],
          executionPlace: 'Kolkata',
          party1: {
            fullName: 'Ananya Sen',
            relationshipType: 'D/o',
            relativeName: 'Subir Kumar Sen',
            age: 26,
            pan: 'AFKPS8890P',
            aadhaarLast4: '8812',
            phone: '+91 98300 44192',
            email: 'ananya.sen@outlook.com',
            address: '14/2, Ballygunge Circular Road, Kolkata - 700019'
          },
          affidavitDetails: {
            deponentName: 'Ananya Sen',
            reasonForAffidavit: 'Formal Renunciation of previous spelling Ananyaa and Adoption of Ananya Sen',
            declarationStatements: [
              'That my name has been erroneously spelled as Ananyaa Sen in my secondary school leaving certificate.',
              'That I have officially adopted the name Ananya Sen for all civil, academic, and banking records.'
            ]
          }
        }
      })
    },
    {
      id: 'gst_lead',
      name: 'New GST Registration Lead (Tax)',
      category: 'registration',
      getData: () => ({
        id: `REG-2026-${Math.floor(1000 + Math.random() * 9000)}`,
        referenceCode: `WA-REG-GST-${Date.now().toString().slice(-4)}`,
        category: 'registration',
        formType: 'gst_registration',
        formName: 'New GST Registration & Filing Portal',
        clientName: 'Ritesh B. Agarwal',
        clientPhone: '+91 98210 66521',
        clientEmail: 'ritesh@agarwal-fabrics.com',
        stampDutyValue: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        status: 'decrypted',
        source: 'Website A',
        signatureVerified: true,
        registrationData: {
          serviceType: 'gst_registration',
          serviceTitle: 'GST New Business Registration',
          applicantName: 'Ritesh B. Agarwal',
          panNumber: 'AAGPA9910D',
          aadhaarNumber: 'XXXX-XXXX-9120',
          contactNumber: '+91 98210 66521',
          email: 'ritesh@agarwal-fabrics.com',
          businessName: 'Agarwal Premium Textiles & Fabrics',
          constitutionType: 'Proprietorship',
          businessAddress: 'Shop 104, Ring Road Textile Market, Surat, Gujarat - 395002',
          annualTurnover: '₹ 80,00,000 projected',
          taxYearOrAssessmentYear: 'FY 2026-27',
          documentChecklist: [
            { id: 'pan', label: 'PAN Card of Applicant', required: true, uploaded: true, verified: true },
            { id: 'aadhaar', label: 'Aadhaar Card (Linked with Mobile OTP)', required: true, uploaded: true, verified: true },
            { id: 'address_proof', label: 'Surat Municipal Electricity Bill', required: true, uploaded: true, verified: false },
            { id: 'noc_rent', label: 'Commercial Market Rent Agreement', required: true, uploaded: true, verified: false },
            { id: 'bank_proof', label: 'Bank Statement / Cancelled Cheque', required: true, uploaded: true, verified: false }
          ],
          officerNotes: 'Client applied via Website A GST Instant Calculator. Mobile OTP verified.'
        }
      })
    }
  ];

  const handleSimulateLockTravelUnlock = async () => {
    setIsProcessing(true);
    setStatusMessage('Lock: Encrypting payload on Website A with AES-256...');

    try {
      let payloadData: any;
      if (customPayloadJson.trim()) {
        payloadData = JSON.parse(customPayloadJson);
      } else {
        const preset = presets.find(p => p.id === selectedPreset);
        payloadData = preset ? preset.getData() : presets[0].getData();
      }

      // Step 1: Encrypt (Lock)
      const encryptedCipher = await encryptPayload(payloadData, masterKey);
      setStatusMessage('Travel: Transmitting encrypted AES-256 ciphertext payload across network...');

      await new Promise(r => setTimeout(r, 400));

      // Step 2: Auto-Decrypt (Unlock)
      setStatusMessage('Unlock: CTC System verifying Master Key & auto-decrypting payload...');
      const decryptedResult = await decryptPayload(encryptedCipher, masterKey);

      if (!decryptedResult.success || !decryptedResult.data) {
        throw new Error(decryptedResult.error || 'Decryption failed');
      }

      const newOrder = decryptedResult.data as Order;
      newOrder.encryptedPayload = encryptedCipher;
      newOrder.status = 'decrypted';

      await new Promise(r => setTimeout(r, 300));

      // Ingest order into parent state
      onIngestOrder(newOrder);

      // Fire Telegram alert
      onSendNotification(
        `🔐 *CTC ALERT: Inbound Encrypted Order Ingested*\n• ID: ${newOrder.id}\n• Client: ${newOrder.clientName}\n• Service: ${newOrder.formName}\n• Category: ${newOrder.category.toUpperCase()}\n• Decryption: AES-256-GCM Verified`
      );

      setStatusMessage('Success! Ingested and decrypted order.');
      setTimeout(() => {
        setIsProcessing(false);
        onClose();
      }, 700);

    } catch (err: any) {
      setIsProcessing(false);
      setStatusMessage(`Error: ${err.message}`);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
      <div className="bg-white rounded-2xl border border-gray-200 shadow-2xl max-w-lg w-full">
        
        {/* Header */}
        <div className="p-5 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-blue-50 text-blue-600">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Simulate Website A Ingest</h3>
              <p className="text-xs text-slate-500">Test Lock-Travel-Unlock Flow with AES-256 Payload</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4 text-xs">
          
          <div>
            <label className="block font-semibold text-slate-700 mb-2">
              Select Sample Payload Template:
            </label>
            <div className="space-y-2">
              {presets.map((p) => (
                <label
                  key={p.id}
                  className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-colors ${
                    selectedPreset === p.id 
                      ? 'border-blue-600 bg-blue-50/50 text-blue-900 font-bold' 
                      : 'border-gray-200 bg-white hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <input
                      type="radio"
                      name="preset"
                      value={p.id}
                      checked={selectedPreset === p.id}
                      onChange={() => setSelectedPreset(p.id)}
                      className="text-blue-600 focus:ring-blue-500"
                    />
                    <span>{p.name}</span>
                  </div>
                  <span className="text-[10px] font-mono uppercase bg-slate-100 px-2 py-0.5 rounded text-slate-600">
                    {p.category}
                  </span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Or Paste Custom JSON / Encrypted Payload:
            </label>
            <textarea
              rows={3}
              value={customPayloadJson}
              onChange={(e) => setCustomPayloadJson(e.target.value)}
              placeholder='Optional: { "clientName": "...", "formType": "..." } or iv:ciphertext'
              className="w-full px-3 py-2 rounded-lg border border-gray-300 font-mono text-xs bg-white"
            />
          </div>

          {statusMessage && (
            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs font-mono text-slate-800 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0" />
              <span>{statusMessage}</span>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-100 flex items-center justify-between bg-slate-50/50">
          <span className="text-[11px] text-slate-500 font-mono">
            Lock ➔ Travel ➔ Unlock
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-600 hover:bg-slate-200 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSimulateLockTravelUnlock}
              disabled={isProcessing}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-sm transition-all active:scale-95 disabled:opacity-50"
            >
              <Zap className="w-3.5 h-3.5" />
              <span>{isProcessing ? 'Processing Ingest...' : 'Execute AES-256 Ingestion'}</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
