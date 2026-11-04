'use client';

import { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { State } from 'country-state-city';
import LeadDatePicker from './LeadDatePicker';
import { getLoanProducts } from '../services/loanProducts';
import { createLead } from '../services/lead_management';

const indianStates = State.getStatesOfCountry('IN').map((state) => state.name);

const verhoeffMultiplication = [
  [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
  [1, 2, 3, 4, 0, 6, 7, 8, 9, 5],
  [2, 3, 4, 0, 1, 7, 8, 9, 5, 6],
  [3, 4, 0, 1, 2, 8, 9, 5, 6, 7],
  [4, 0, 1, 2, 3, 9, 5, 6, 7, 8],
  [5, 9, 8, 7, 6, 0, 4, 3, 2, 1],
  [6, 5, 9, 8, 7, 1, 0, 4, 3, 2],
  [7, 6, 5, 9, 8, 2, 1, 0, 4, 3],
  [8, 7, 6, 5, 9, 3, 2, 1, 0, 4],
  [9, 8, 7, 6, 5, 4, 3, 2, 1, 0],
];

const verhoeffPermutation = [
  [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
  [1, 5, 7, 6, 2, 8, 3, 0, 9, 4],
  [5, 8, 0, 3, 7, 9, 6, 1, 4, 2],
  [8, 9, 1, 6, 0, 4, 3, 5, 2, 7],
  [9, 4, 5, 3, 1, 2, 6, 8, 7, 0],
  [4, 2, 8, 6, 5, 7, 3, 9, 0, 1],
  [2, 7, 9, 3, 8, 0, 6, 4, 1, 5],
  [7, 0, 4, 6, 9, 1, 3, 2, 5, 8],
];

const hasValidAadhaarChecksum = (value) => {
  let checksum = 0;
  const digits = value.split('').reverse().map(Number);

  digits.forEach((digit, index) => {
    checksum = verhoeffMultiplication[checksum][verhoeffPermutation[index % 8][digit]];
  });

  return checksum === 0;
};

const normalizePan = (value) => {
  let pan = '';

  for (const character of value.toUpperCase().replace(/[^A-Z0-9]/g, '')) {
    const position = pan.length;
    const expectedPattern = position < 5 || position === 9 ? /^[A-Z]$/ : /^[0-9]$/;

    if (expectedPattern.test(character)) pan += character;
    if (pan.length === 10) break;
  }

  return pan;
};

const getAgeFromDob = (dateString) => {
  if (!dateString) return '';
  const dob = new Date(dateString);
  if (Number.isNaN(dob.getTime())) return '';

  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const monthDiff = today.getMonth() - dob.getMonth();

  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
    age -= 1;
  }

  return age;
};

const getTodayInputDate = () => {
  const today = new Date();
  const localDate = new Date(today.getTime() - today.getTimezoneOffset() * 60000);
  return localDate.toISOString().slice(0, 10);
};

const includeCurrentOption = (options, value) => (
  value && !options.includes(value) ? [value, ...options] : options
);

const getCustomerTypeFromAge = (age) => {
  if (age === '' || age === null || Number.isNaN(Number(age))) return '';
  if (Number(age) < 18) return 'Minor';
  if (Number(age) >= 60) return 'Senior Citizen';
  return 'Normal';
};

const initialForm = {
  namePrefix: '',
  firstName: '',
  middleName: '',
  lastName: '',
  dateOfBirth: '',
  passportExpiryDate: '',
  age: '',
  customerType: '',
  mobileNumber: '',
  email: '',
  otpNumber: '',
  otpSent: false,
  panCard: '',
  aadhaarCard: '',
  residentialStatus: '',
  gender: '',
  maritalStatus: '',
  passportNo: '',
  dependents: '',
  loanProductType: '',
  loanAmount: '',
  interestRate: '',
  loanPurpose: '',
  securityAmount: '',
  tenure: '',
  tenureUnit: 'month',
  instalments: '',
  collateral: '',
  employmentType: '',
  annualIncome: '',
  designation: '',
  employerName: '',
  location: '',
  state: '',
  takeHomePay: '',
  deductions: '',
  bankName: '',
  primaryBankAccount: '',
  acquisitionChannel: '',
  referralDate: '',
  partnerId: '',
  partnerName: '',
  employeeId: '',
  employeeName: '',
  status: 'Pending',
};

const getLeadFormValues = (lead) => {
  if (!lead) return initialForm;

  const nameParts = String(lead.customerName || lead.name || '').trim().split(/\s+/).filter(Boolean);
  return {
    ...initialForm,
    ...lead,
    firstName: lead.firstName || nameParts[0] || '',
    middleName: lead.middleName || (nameParts.length > 2 ? nameParts.slice(1, -1).join(' ') : ''),
    lastName: lead.lastName || (nameParts.length > 1 ? nameParts[nameParts.length - 1] : ''),
    mobileNumber: lead.mobileNumber || lead.mobile || '',
    email: lead.email || lead.emailAddress || '',
    panCard: lead.panCard || lead.panNumber || '',
    aadhaarCard: lead.aadhaarCard || lead.aadhaarNumber || '',
    passportNo: lead.passportNo || lead.passportNumber || '',
    dependents: lead.dependents ?? lead.numberOfDependents ?? '',
    loanProductType: lead.loanProductType || lead.product || '',
    loanAmount: lead.loanAmount || String(lead.amount || '').replace(/,/g, ''),
    loanPurpose: lead.loanPurpose || lead.purposeOfLoan || '',
    instalments: lead.instalments ?? lead.numberOfInstalments ?? '',
    monthlyEmi: lead.monthlyEmi ?? lead.emi ?? '',
    collateral: lead.collateral ?? lead.downPaymentCollateral ?? '',
    annualIncome: lead.annualIncome ?? '',
    takeHomePay: lead.takeHomePay ?? '',
    deductions: lead.deductions ?? lead.deductionsOrEmisPayable ?? '',
    primaryBankAccount: lead.primaryBankAccount || lead.accountNumber || '',
    acquisitionChannel: lead.acquisitionChannel || lead.source || '',
    referralDate: lead.referralDate || lead.date || '',
    partnerId: lead.partnerId || lead.sourcingAgentPartnerId || '',
    partnerName: lead.partnerName || lead.agentPartnerName || '',
    status: lead.status || 'Pending',
  };
};

const steps = [
  { title: 'Personal Details', fields: [
    { name: 'firstName', label: 'First Name', required: true },
    { name: 'middleName', label: 'Middle Name' },
    { name: 'lastName', label: 'Last Name', required: true },
    { name: 'dateOfBirth', label: 'Date of Birth', type: 'date', required: true },
    { name: 'mobileNumber', label: 'Mobile Number', inputMode: 'numeric', maxLength: 10, required: true },
    { name: 'email', label: 'Email ID', type: 'email', maxLength: 254 },
    { name: 'otpNumber', label: 'OTP Number', inputMode: 'numeric', maxLength: 6 },
    { name: 'panCard', label: 'PAN Card', pattern: '[A-Z]{5}[0-9]{4}[A-Z]', maxLength: 10, required: true },
    { name: 'aadhaarCard', label: 'Aadhaar Card', inputMode: 'numeric', pattern: '[0-9]{12}', maxLength: 12, required: true },
    { name: 'residentialStatus', label: 'Residential Status', type: 'select', options: ['Resident', 'Non-Resident'] },
    { name: 'gender', label: 'Gender', type: 'select', options: ['Female', 'Male', 'Other', 'Prefer not to say'], required: true },
    { name: 'maritalStatus', label: 'Marital Status', type: 'select', options: ['Single', 'Married', 'Divorced', 'Other'], required: true },
    { name: 'dependents', label: 'No. of Dependents', type: 'number', min: 0, step: 1 },
  ] },
  { title: 'Loan Details', fields: [
    { name: 'loanProductType', label: 'Loan Product Type', type: 'select', options: ['Personal Loan', 'Home Loan', 'Business Loan', 'Vehicle Loan', 'Education Loan'], required: true },
    { name: 'loanAmount', label: 'Loan Amount', type: 'number', min: 1, step: 1, required: true },
    { name: 'loanPurpose', label: 'Purpose of Loan', type: 'select', options: ['Home purchase', 'Home renovation', 'Medical expenses', 'Education', 'Business expansion', 'Debt consolidation', 'Vehicle purchase', 'Other'], required: true },
    { name: 'tenure', label: 'Tenure', type: 'number', min: 1, step: 1, required: true },
    { name: 'instalments', label: 'No. of Instalments', type: 'number', min: 1, step: 1 },
    { name: 'collateral', label: 'Down Payment / Collateral', type: 'number', min: 1, step: 1, required: true },
  ] },
  { title: 'Income & Employment', fields: [
    { name: 'employmentType', label: 'Employment Type', type: 'select', options: ['Salaried', 'Self-Employed', 'Corporate Employee', 'Business Owner', 'Other'], required: true },
    { name: 'annualIncome', label: 'Annual Income', type: 'number', min: 1, step: 1, required: true },
    { name: 'designation', label: 'Designation' },
    { name: 'employerName', label: 'Employer / Business Name', wide: true },
    { name: 'bankName', label: 'Bank Name' },
    { name: 'primaryBankAccount', label: 'Primary Bank Account', inputMode: 'numeric', pattern: '[0-9]{9,18}', maxLength: 18 },
  ] },
  { title: 'Referral & Assignment', fields: [
    { name: 'acquisitionChannel', label: 'Lead Acquisition Channel', type: 'select', options: ['Bank Generated', 'Branch', 'Website', 'Mobile App', 'Customer Referral', 'Direct Sales', 'Partner / Agent', 'Other'], required: true },
    { name: 'referralDate', label: 'Date', type: 'date' },
    { name: 'partnerId', label: 'Sourcing Agent / Partner ID' },
    { name: 'partnerName', label: 'Agent / Partner Name', wide: true },
    { name: 'employeeId', label: 'Emp ID' },
    { name: 'employeeName', label: 'Emp Name' },
  ] },
];

const newLeadInlineStyles = `
.lead-modal-backdrop{position:fixed;z-index:1200;inset:0;display:grid;place-items:center;padding:22px;background:rgba(18,39,45,.58);backdrop-filter:blur(3px)}
.lead-modal-backdrop .lead-modal{display:flex;flex-direction:column;width:min(1160px,96vw);height:min(850px,92vh);height:min(850px,92dvh);max-height:92vh;max-height:92dvh;overflow:hidden;border:1px solid #d8e4e1;border-radius:8px;background:#fff;box-shadow:0 28px 80px rgba(15,39,43,.28)}
.lead-modal-backdrop .lead-modal-header{display:flex;align-items:center;justify-content:space-between;gap:18px;padding:19px 24px;border-bottom:1px solid #e4ece9;background:#fff}
.lead-modal-backdrop .lead-modal-header h2{margin:0;color:#193f42;font-size:19px;font-weight:750}
.lead-modal-backdrop .lead-modal-header p{margin:5px 0 0;color:#718284;font-size:11px;line-height:1.5}
.lead-modal-backdrop .lead-modal-close{display:grid;place-items:center;flex:none;width:34px;height:34px;border:1px solid #dbe5e2;border-radius:5px;background:#fff;color:#53696b;cursor:pointer}
.lead-modal-backdrop .lead-modal-close:hover{background:#f2f7f5;color:#176e67}
.lead-modal-backdrop .lead-form{display:flex;flex:1;min-height:0;flex-direction:column;overflow:auto;padding:18px 22px 20px}
.lead-modal-backdrop .lead-step-layout{display:grid;grid-template-columns:210px minmax(0,1fr);align-items:start;gap:26px;min-height:100%}
.lead-modal-backdrop .lead-step-nav{position:sticky;top:0;display:flex;flex-direction:column;gap:6px;max-height:calc(92dvh - 150px);overflow:auto;padding:3px 16px 3px 0;border-right:1px solid #e6edeb}
.lead-modal-backdrop .lead-step-item{display:flex;align-items:center;gap:10px;min-height:43px;padding:7px 9px;border:1px solid transparent;border-radius:5px;background:#fff;color:#627678;text-align:left;font-size:11px;font-weight:650;cursor:pointer}
.lead-modal-backdrop .lead-step-item:hover:not(:disabled){background:#f5f9f7}
.lead-modal-backdrop .lead-step-item:disabled{cursor:not-allowed;opacity:.5}
.lead-modal-backdrop .lead-step-item.active{border-color:#c8ded8;background:#eef7f4;color:#176e67}
.lead-modal-backdrop .lead-step-item.complete{color:#26745f}
.lead-modal-backdrop .lead-step-number{display:grid;place-items:center;flex:none;width:25px;height:25px;border:1px solid #d5e0de;border-radius:50%;background:#fff;color:#52696b;font-size:10px;font-weight:700}
.lead-modal-backdrop .lead-step-item.active .lead-step-number{border-color:#177e7a;background:#177e7a;color:#fff}
.lead-modal-backdrop .lead-step-item.complete .lead-step-number{border-color:#b8dfd3;background:#e5f5ef;color:#26745f}
.lead-modal-backdrop .lead-step-panel{min-width:0;padding:1px 0 0}
.lead-modal-backdrop .lead-step-heading{margin:0 0 19px;padding-bottom:14px;border-bottom:1px solid #e8eeec}
.lead-modal-backdrop .lead-step-heading>span{color:#177e7a;font-size:9px;font-weight:800;letter-spacing:.08em;text-transform:uppercase}
.lead-modal-backdrop .lead-step-heading h3{margin:4px 0 0;color:#1e4548;font-size:17px;font-weight:750}
.lead-modal-backdrop .lead-personal-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));align-items:start;gap:15px 16px}
.lead-modal-backdrop .lead-name-combo{display:grid;grid-template-columns:76px minmax(0,1fr);align-items:end;gap:8px;min-width:0}
.lead-modal-backdrop .lead-personal-demographics{grid-column:1/-1;display:grid;grid-template-columns:minmax(0,1fr) minmax(72px,.42fr) minmax(0,1fr);gap:15px;width:min(100%,780px)}
.lead-modal-backdrop .lead-personal-actions{grid-column:1/-1;display:flex;justify-content:flex-end;flex-wrap:wrap;gap:8px}
.lead-modal-backdrop .lead-field{display:flex;min-width:0;flex-direction:column;gap:6px;color:#3a5557;font-size:10px;font-weight:700}
.lead-modal-backdrop .lead-field span em{color:#bb4646;font-style:normal}
.lead-modal-backdrop .lead-step-panel input,.lead-modal-backdrop .lead-step-panel select{width:100%;min-width:0;height:39px;min-height:39px;padding:0 10px;border:1px solid #cbd9d6;border-radius:5px;background:#fff;color:#263f41;font:inherit;font-size:12px;outline:none}
.lead-modal-backdrop .lead-step-panel input:focus,.lead-modal-backdrop .lead-step-panel select:focus{border-color:#568e88;box-shadow:0 0 0 3px rgba(23,126,122,.1)}
.lead-modal-backdrop .lead-step-panel input:disabled,.lead-modal-backdrop .lead-step-panel select:disabled{background:#f1f5f4;color:#839291;cursor:not-allowed;opacity:1}
.lead-modal-backdrop .lead-step-panel input[aria-invalid=true]{border-color:#bd4848;background:#fffafa}
.lead-modal-backdrop .lead-step-panel input[readonly]{background:#f4f7f6;color:#66797a}
.lead-modal-backdrop .lead-computed-field{background:#f4f7f6!important}
.lead-modal-backdrop .lead-personal-demographics input{height:37px}
.lead-modal-backdrop .lead-personal-actions button,.lead-modal-backdrop .lead-verify-button,.lead-modal-backdrop .lead-otp-verify,.lead-modal-backdrop .lead-income-consent{display:inline-flex;align-items:center;justify-content:center;min-height:36px;padding:0 11px;border:1px solid #cbded9;border-radius:5px;background:#f3f8f6;color:#226b62;font-size:10px;font-weight:700;cursor:pointer}
.lead-modal-backdrop .lead-personal-actions button:hover,.lead-modal-backdrop .lead-verify-button:hover,.lead-modal-backdrop .lead-otp-verify:hover,.lead-modal-backdrop .lead-income-consent:hover{background:#e7f2ee}
.lead-modal-backdrop .lead-mobile-field,.lead-modal-backdrop .lead-identity-field,.lead-modal-backdrop .lead-otp-field{display:grid;grid-template-columns:minmax(0,1fr) auto;align-items:end;gap:8px;min-width:0}
.lead-modal-backdrop .lead-inline-hint,.lead-modal-backdrop .lead-mobile-message,.lead-modal-backdrop .lead-otp-message{grid-column:1/-1;margin:0;color:#718284;font-size:10px;font-weight:500;line-height:1.45}
.lead-modal-backdrop .lead-inline-hint-error{color:#aa3b3b}
.lead-modal-backdrop .lead-otp-field{grid-template-columns:minmax(0,1fr) auto}
.lead-modal-backdrop .lead-otp-verify:disabled{cursor:not-allowed;opacity:.55}
.lead-modal-backdrop .lead-step-panel>div[style*="grid-template-columns"]{gap:15px 16px!important}
.lead-modal-backdrop .lead-income-content{display:grid;gap:18px}
.lead-modal-backdrop .lead-income-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));align-items:end;gap:14px}
.lead-modal-backdrop .lead-income-grid .lead-income-employer{grid-column:span 2}
.lead-modal-backdrop .lead-income-actions{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}
.lead-modal-backdrop .lead-income-actions button{min-height:42px;padding:7px;border:1px solid #d8e4e1;border-radius:5px;background:#f7faf9;color:#53696b;font-size:10px;font-weight:650;line-height:1.3}
.lead-modal-backdrop .lead-referral-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));align-items:end;gap:14px 16px}
.lead-modal-backdrop .lead-referral-grid .lead-field input,.lead-modal-backdrop .lead-referral-grid .lead-field select{width:100%;min-height:39px;padding:0 10px;border:1px solid #cbd9d6;border-radius:5px;background:#fff;color:#263f41;font-size:12px}
.lead-modal-backdrop .lead-referral-grid .lead-referral-date input[type=date]{display:block;box-sizing:border-box;width:100%;min-width:0;max-width:100%;padding:0 8px}
.lead-modal-backdrop .lead-referral-partner-name{max-width:250px}
.lead-modal-backdrop .lead-submit-error{margin:0 0 14px;padding:10px 12px;border:1px solid #efcaca;border-radius:5px;background:#fff5f5;color:#9d3030;font-size:12px;line-height:1.45}
.lead-modal-backdrop .lead-modal-footer{display:flex;justify-content:flex-end;gap:8px;margin-top:auto;padding-top:18px}
.lead-modal-backdrop .lead-save-btn,.lead-modal-backdrop .lead-cancel-btn,.lead-modal-backdrop .lead-previous-btn{display:inline-flex;align-items:center;justify-content:center;gap:6px;min-width:96px;min-height:37px;padding:0 12px;border:1px solid #d2dfdc;border-radius:5px;background:#fff;color:#52696b;font-size:11px;font-weight:700;cursor:pointer}
.lead-modal-backdrop .lead-save-btn{border-color:#177e7a;background:#177e7a;color:#fff}
.lead-modal-backdrop .lead-save-btn:hover{border-color:#0c6662;background:#0c6662}
.lead-modal-backdrop .lead-cancel-btn:hover,.lead-modal-backdrop .lead-previous-btn:hover{background:#f2f7f5}
@media(max-width:760px){.lead-modal-backdrop{padding:10px}.lead-modal-backdrop .lead-modal{width:96vw;height:94dvh;max-height:94dvh}.lead-modal-backdrop .lead-modal-header{padding:15px 16px}.lead-modal-backdrop .lead-form{padding:15px 16px}.lead-modal-backdrop .lead-step-layout{grid-template-columns:1fr;gap:16px}.lead-modal-backdrop .lead-step-nav{position:static;display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:5px;max-height:none;overflow:visible;padding:0 0 11px;border-right:0;border-bottom:1px solid #e6edeb}.lead-modal-backdrop .lead-step-item{min-height:58px;flex-direction:column;justify-content:center;gap:4px;padding:5px 2px;text-align:center;font-size:9px}.lead-modal-backdrop .lead-step-panel{padding:0}.lead-modal-backdrop .lead-personal-grid{grid-template-columns:repeat(2,minmax(0,1fr));gap:13px}.lead-modal-backdrop .lead-personal-demographics{grid-template-columns:minmax(0,1.2fr) minmax(65px,.5fr) minmax(0,1fr);gap:10px}.lead-modal-backdrop .lead-income-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.lead-modal-backdrop .lead-referral-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.lead-modal-backdrop .lead-income-actions{grid-template-columns:repeat(2,minmax(0,1fr))}}
@media(max-width:480px){.lead-modal-backdrop .lead-personal-grid,.lead-modal-backdrop .lead-referral-grid,.lead-modal-backdrop .lead-income-grid{grid-template-columns:1fr}.lead-modal-backdrop .lead-name-combo{grid-template-columns:70px minmax(0,1fr)}.lead-modal-backdrop .lead-personal-demographics{grid-template-columns:1fr;width:100%}.lead-modal-backdrop .lead-personal-demographics,.lead-modal-backdrop .lead-identity-field{grid-column:1}.lead-modal-backdrop .lead-personal-actions{grid-column:1;justify-content:stretch}.lead-modal-backdrop .lead-personal-actions button{flex:1}.lead-modal-backdrop .lead-income-grid .lead-income-employer{grid-column:auto}.lead-modal-backdrop .lead-modal-footer{flex-wrap:wrap}.lead-modal-backdrop .lead-save-btn,.lead-modal-backdrop .lead-cancel-btn,.lead-modal-backdrop .lead-previous-btn{flex:1}.lead-modal-backdrop .lead-mobile-field,.lead-modal-backdrop .lead-identity-field,.lead-modal-backdrop .lead-otp-field{grid-template-columns:1fr}.lead-modal-backdrop .lead-verify-button,.lead-modal-backdrop .lead-otp-verify{width:100%}}
`;

export default function NewLead({ open, onClose, onCreate, onUpdate, initialData = null }) {
  const [form, setForm] = useState(initialForm);
  const [activeStep, setActiveStep] = useState(0);
  const [otpMessage, setOtpMessage] = useState('');
  const [mobileMessage, setMobileMessage] = useState('');
  const [aadhaarMessage, setAadhaarMessage] = useState('');
  const [aadhaarValidated, setAadhaarValidated] = useState(false);
  const [loanProducts, setLoanProducts] = useState([]);
  const [productsLoading, setProductsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionError, setSubmissionError] = useState('');
  const [downPaymentMessage, setDownPaymentMessage] = useState('');

  useEffect(() => {
    if (!open) return undefined;

    setForm(getLeadFormValues(initialData));
    setActiveStep(0);
    setOtpMessage('');
    setMobileMessage('');
    setAadhaarMessage('');
    setAadhaarValidated(false);
    setSubmissionError('');
    setDownPaymentMessage('');
    setIsSubmitting(false);
    const controller = new AbortController();
    setProductsLoading(true);
    let accessToken;
    try {
      accessToken = JSON.parse(window.localStorage.getItem('authData'))?.accessToken;
    } catch {
      accessToken = null;
    }

    getLoanProducts(controller.signal, accessToken)
      .then(setLoanProducts)
      .catch((error) => {
        if (error.name !== 'AbortError') setLoanProducts([]);
      })
      .finally(() => {
        if (!controller.signal.aborted) setProductsLoading(false);
      });

    return () => {
      controller.abort();
    };
  }, [open, initialData]);

  if (!open) return null;

  const computedAge = form.dateOfBirth ? getAgeFromDob(form.dateOfBirth) : '';
  const computedCustomerType = form.dateOfBirth ? getCustomerTypeFromAge(computedAge) : '';
  const tenureMonths = Number(form.tenure) * ({ month: 1, quarter: 3, year: 12 }[form.tenureUnit] || 1);
  const computedInstalments = Number.isFinite(tenureMonths) && tenureMonths > 0 ? String(tenureMonths) : '';
  const principal = Number(form.loanAmount) - Number(form.collateral || 0);
  const annualInterestRate = form.interestRate === '' ? null : Number(form.interestRate);
  const monthlyRate = Number.isFinite(annualInterestRate) && annualInterestRate >= 0 ? annualInterestRate / 1200 : null;
  const calculatedEmi = principal > 0 && tenureMonths > 0 && monthlyRate !== null
    ? monthlyRate === 0
      ? principal / tenureMonths
      : (principal * monthlyRate) / (1 - ((1 + monthlyRate) ** -tenureMonths))
    : null;
  const computedMonthlyEmi = Number.isFinite(calculatedEmi) ? String(Math.round(calculatedEmi)) : '';
  const calculatedTotalInterest = calculatedEmi === null ? null : Math.max(0, (calculatedEmi * tenureMonths) - principal);
  const computedTotalInterest = Number.isFinite(calculatedTotalInterest) ? String(Math.round(calculatedTotalInterest)) : '';
  const computedTotalAmount = principal > 0 && computedTotalInterest !== ''
    ? String(Math.round(principal + Number(computedTotalInterest)))
    : '';
  const todayInputDate = getTodayInputDate();
  const aadhaarInputInvalid = Boolean(aadhaarMessage && /required|remaining|invalid|enter a valid/i.test(aadhaarMessage));
  const downPaymentExceedsLoan = form.loanAmount !== ''
    && Number(form.loanAmount) > 0
    && form.collateral !== ''
    && Number(form.collateral) >= Number(form.loanAmount);
  const downPaymentError = downPaymentMessage || (downPaymentExceedsLoan ? 'Down payment below the loan amount.' : '');

  const handleChange = (event) => {
    const { name, value } = event.target;
    const normalizedValue = name === 'aadhaarCard' || name === 'otpNumber'
      ? value.replace(/\D/g, '').slice(0, name === 'aadhaarCard' ? 12 : 6)
      : name === 'mobileNumber' ? value.replace(/\D/g, '').slice(0, 10)
      : ['firstName', 'middleName', 'lastName'].includes(name) ? value.replace(/[^\p{L}\p{M} .'-]/gu, '').slice(0, 100)
      : name === 'panCard' ? normalizePan(value)
      : name === 'passportNo' ? value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8) : value;

    if (name === 'collateral') {
      if (value !== '' && form.loanAmount !== '' && Number(form.loanAmount) > 0 && Number(value) >= Number(form.loanAmount)) {
        setDownPaymentMessage('Down payment below the loan amount.');
        return;
      }
      setDownPaymentMessage('');
    }

    if (name === 'loanAmount') {
      const downPayment = Number(form.collateral);
      setDownPaymentMessage(value !== ''
        && Number(value) > 0
        && form.collateral !== ''
        && downPayment >= Number(value)
        ? 'Down payment below the loan amount.'
        : '');
    }

    setForm((current) => ({
      ...current,
      [name]: normalizedValue,
      ...(name === 'acquisitionChannel' && !['Bank Generated', 'Branch'].includes(normalizedValue)
        ? { referralDate: '', partnerId: '', partnerName: '', employeeId: '', employeeName: '' }
        : {}),
      ...(name === 'employmentType' && value === 'Self-Employed' ? { designation: '' } : {}),
      ...(name === 'loanProductType'
        ? { interestRate: String(loanProducts.find((product) => product.name === value)?.annualInterestRate ?? '') }
        : {}),
      ...(name === 'aadhaarCard' ? { otpSent: false, otpNumber: '' } : {}),
    }));
    if (name === 'aadhaarCard') {
      setAadhaarValidated(false);
      setOtpMessage('');
      setAadhaarMessage(!normalizedValue
        ? 'Aadhaar number is required.'
        : normalizedValue.length < 12
          ? `Enter all 12 digits. ${12 - normalizedValue.length} remaining.`
          : hasValidAadhaarChecksum(normalizedValue)
            ? '12-digit format and checksum are valid. Identity verification still requires an authorized service.'
            : 'This 12-digit number has an invalid checksum. Check the Aadhaar number.');
    }
    if (name === 'mobileNumber') setMobileMessage('');
  };

  const resetAndClose = (force = false) => {
    if (isSubmitting && !force) return;
    setForm(initialForm);
    setActiveStep(0);
    setOtpMessage('');
    setMobileMessage('');
    setAadhaarMessage('');
    setAadhaarValidated(false);
    setSubmissionError('');
    setDownPaymentMessage('');
    setIsSubmitting(false);
    onClose();
  };

  const validateStep = () => {
    if (activeStep === 1) {
      const collateralField = document.querySelector('.lead-step-panel input[name="collateral"]');
      const amount = Number(form.loanAmount);
      const downPayment = Number(form.collateral || 0);
      const invalidDownPayment = amount > 0 && downPayment >= amount;

      if (invalidDownPayment) {
        setDownPaymentMessage('Down payment below the loan amount.');
        collateralField?.focus();
        return false;
      }
    }

    if (activeStep === 0) {
      const aadhaarField = document.querySelector('.lead-step-panel input[name="aadhaarCard"]');
      const aadhaar = form.aadhaarCard;
      const invalidAadhaar = !/^[0-9]{12}$/.test(aadhaar) || !hasValidAadhaarChecksum(aadhaar);
      aadhaarField?.setCustomValidity(invalidAadhaar ? 'Enter a valid 12-digit Aadhaar number.' : '');
      if (invalidAadhaar) {
        setAadhaarMessage(!aadhaar ? 'Aadhaar number is required.' : 'Enter a valid 12-digit Aadhaar number with a valid checksum.');
      }
    }

    const fields = Array.from(document.querySelectorAll('.lead-step-panel input, .lead-step-panel select'));
    const invalidField = fields.find((field) => field.willValidate && !field.checkValidity());

    if (invalidField) {
      invalidField.focus();
      invalidField.reportValidity();
      return false;
    }

    if (activeStep === 0 && !form.dateOfBirth) {
      setSubmissionError('Date of Birth is required.');
      document.querySelector('[data-date-picker-trigger="dateOfBirth"]')?.focus();
      return false;
    }

    return true;
  };

  const handleNext = () => {
    if (validateStep()) setActiveStep((current) => current + 1);
  };

  const handleValidateAndSendOtp = () => {
    if (!/^[0-9]{12}$/.test(form.aadhaarCard) || !hasValidAadhaarChecksum(form.aadhaarCard)) {
      setAadhaarValidated(false);
      setAadhaarMessage('Enter a valid 12-digit Aadhaar number.');
      setOtpMessage('Enter and validate a valid 12-digit Aadhaar number first.');
      return;
    }

    setAadhaarValidated(true);
    setAadhaarMessage('Aadhaar number format and checksum are valid.');
    setOtpMessage('OTP delivery to the Aadhaar-registered mobile will be connected through the backend.');
  };

  const handleVerifyMobile = () => {
    if (!/^[6-9]\d{9}$/.test(form.mobileNumber)) {
      setMobileMessage('Enter a valid 10-digit mobile number starting with 6-9.');
      return;
    }
    setMobileMessage('Number format is valid. OTP ownership verification requires the backend mobile-verification service.');
  };

  const handleVerifyOtp = () => {
    if (!aadhaarValidated) {
      setOtpMessage('Validate the Aadhaar number before entering the OTP.');
      return;
    }

    if (!/^[0-9]{6}$/.test(form.otpNumber)) {
      setOtpMessage('Enter the 6-digit OTP to check its format.');
      return;
    }

    setOtpMessage('Aadhaar OTP verification is not configured. Connect an authorized Aadhaar KYC provider to verify this code.');
  };

  const formatCurrency = (value) => new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(value);

  const renderField = (field) => (
    <label className={`lead-field${field.wide ? ' lead-field-wide' : ''}`} key={field.name}>
      <span>{field.label}{field.required && <em> *</em>}</span>
      {field.type === 'select' ? (
        <select name={field.name} value={form[field.name]} onChange={handleChange} required={field.required}>
          <option value="">Select {field.label.toLowerCase()}</option>
          {includeCurrentOption(field.options, form[field.name]).map((option) => <option key={option} value={option}>{option}</option>)}
        </select>
      ) : (
        <input
          type={field.type || 'text'}
          name={field.name}
          value={form[field.name]}
          onChange={handleChange}
          required={field.required}
          pattern={field.pattern}
          maxLength={field.maxLength}
          inputMode={field.inputMode}
          min={field.min}
          step={field.step}
          max={field.type === 'date' ? new Date().toISOString().slice(0, 10) : undefined}
          autoComplete="off"
        />
      )}
    </label>
  );

  const renderPersonalDetails = () => (
    <div className="lead-personal-grid">
      <div className="lead-name-combo">
        <label className="lead-field lead-prefix-field">
          <span>Title</span>
          <select name="namePrefix" value={form.namePrefix} onChange={handleChange}>
      <option value="">Mr</option>
            {includeCurrentOption(['Ms', 'Mrs', 'Miss', 'Dr', 'Other'], form.namePrefix).map((title) => <option key={title} value={title}>{title}</option>)}
          </select>
        </label>
        <label className="lead-field">
          <span>First Name <em>*</em></span>
          <input name="firstName" value={form.firstName} onChange={handleChange} required maxLength={100} autoComplete="given-name" />
        </label>
      </div>
      <label className="lead-field">
        <span>Middle Name</span>
        <input name="middleName" value={form.middleName} onChange={handleChange} maxLength={100} autoComplete="additional-name" />
      </label>
      <label className="lead-field">
        <span>Last Name <em>*</em></span>
        <input name="lastName" value={form.lastName} onChange={handleChange} required maxLength={100} autoComplete="family-name" />
      </label>

      <div className="lead-personal-actions">
        <button type="button" style={{ minWidth: '168px', minHeight: '42px', border: '1px solid #bfd4e8', background: '#edf3fb', color: '#20476d', borderRadius: '6px', fontWeight: 600, padding: '0 16px' }}>
          De-Duplicate Check
        </button>
        <button type="button" style={{ minWidth: '150px', minHeight: '42px', border: '1px solid #bfd4e8', background: '#edf3fb', color: '#20476d', borderRadius: '6px', fontWeight: 600, padding: '0 16px' }}>
          Blacklist Check
        </button>
      </div>

      <div className="lead-personal-demographics">
        <label className="lead-field">
          <span>Date of Birth <em>*</em></span>
          <LeadDatePicker
            id="lead-date-of-birth"
            name="dateOfBirth"
            label="Date of Birth"
            value={form.dateOfBirth}
            onChange={(value) => {
              handleChange({ target: { name: 'dateOfBirth', value } });
              setSubmissionError('');
            }}
            max={todayInputDate}
            required
          />
        </label>
        <label className="lead-field">
          <span>Age</span>
          <input name="age" value={computedAge} readOnly className="lead-computed-field" />
        </label>
        <label className="lead-field">
          <span>Customer Type</span>
          <input name="customerType" value={computedCustomerType} readOnly className="lead-computed-field" />
        </label>
      </div>

      <div className="lead-mobile-field">
        <label className="lead-field">
          <span>Mobile Number <em>*</em></span>
          <input name="mobileNumber" type="tel" value={form.mobileNumber} onChange={handleChange} inputMode="numeric" autoComplete="tel-national" pattern="[6-9][0-9]{9}" maxLength={10} required title="Enter a 10-digit mobile number starting with 6-9." />
        </label>
        <button type="button" className="lead-verify-button" onClick={handleVerifyMobile}>Verify Mobile</button>
        {mobileMessage ? <p role="status" className="lead-mobile-message">{mobileMessage}</p> : null}
      </div>

      <label className="lead-field">
        <span>Email ID</span>
        <input name="email" type="email" value={form.email} onChange={handleChange} maxLength={254} autoComplete="email" />
      </label>

      <div className="lead-identity-field">
        <label className="lead-field">
          <span>Aadhaar Number <em>*</em></span>
          <input name="aadhaarCard" value={form.aadhaarCard} onChange={handleChange} inputMode="numeric" autoComplete="off" pattern="[0-9]{12}" maxLength={12} required aria-invalid={aadhaarInputInvalid} aria-describedby="lead-aadhaar-hint" title="Enter a valid 12-digit Aadhaar number without spaces." />
        </label>
        <button type="button" onClick={handleValidateAndSendOtp} className="lead-verify-button">
          Validate &amp; Send OTP
        </button>
        <p id="lead-aadhaar-hint" role="status" className={`lead-inline-hint${aadhaarInputInvalid ? ' lead-inline-hint-error' : ''}`}>{aadhaarMessage || 'Enter the 12-digit Aadhaar number. Checksum validation does not confirm identity.'}</p>
      </div>

      <div className="lead-otp-field">
        <label className="lead-field">
          <span>OTP Number</span>
          <input name="otpNumber" value={form.otpNumber} onChange={handleChange} inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} title="Enter the 6-digit OTP." disabled={!aadhaarValidated} />
        </label>
        <button type="button" className="lead-otp-verify" onClick={handleVerifyOtp} disabled={!aadhaarValidated}>Verify OTP</button>
        {otpMessage ? <p className="lead-otp-message" role="status">{otpMessage}</p> : null}
      </div>

      <label className="lead-field">
          <span>PAN Card <em>*</em></span>
          <input name="panCard" value={form.panCard} onChange={handleChange} autoComplete="off" maxLength={10} pattern="[A-Z]{5}[0-9]{4}[A-Z]" required title="Enter PAN in the format ABCDE1234F." />
      </label>

      <label className="lead-field">
        <span>Residential Status</span>
        <select name="residentialStatus" value={form.residentialStatus} onChange={handleChange}>
          <option value="">Select</option>
          {includeCurrentOption(['Resident', 'Non-Resident'], form.residentialStatus).map((status) => <option key={status} value={status}>{status}</option>)}
        </select>
      </label>

      <label className="lead-field">
          <span>Gender <em>*</em></span>
          <select name="gender" value={form.gender} onChange={handleChange} required>
          <option value="">Select</option>
          {includeCurrentOption(['Female', 'Male', 'Other'], form.gender).map((gender) => <option key={gender} value={gender}>{gender}</option>)}
        </select>
      </label>

      <label className="lead-field">
          <span>Marital Status <em>*</em></span>
          <select name="maritalStatus" value={form.maritalStatus} onChange={handleChange} required>
          <option value="">Select</option>
          {includeCurrentOption(['Single', 'Married', 'Divorced', 'Other'], form.maritalStatus).map((status) => <option key={status} value={status}>{status}</option>)}
        </select>
      </label>

      <label className="lead-field">
        <span>Passport No.</span>
        <input name="passportNo" value={form.passportNo} onChange={handleChange} pattern="[A-Z][0-9]{7}" maxLength={8} title="Enter an Indian passport number in the format A1234567." />
      </label>

      <label className="lead-field">
        <span>Passport Expiry Date</span>
        <LeadDatePicker
          id="lead-passport-expiry-date"
          name="passportExpiryDate"
          label="Passport Expiry Date"
          value={form.passportExpiryDate}
          onChange={(value) => handleChange({ target: { name: 'passportExpiryDate', value } })}
          min={todayInputDate}
        />
      </label>

    </div>
  );

  const renderLoanDetails = () => (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '18px 20px' }}>
      <label className="lead-field" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <span>Loan Product Type <em>*</em></span>
        <select name="loanProductType" value={form.loanProductType} onChange={handleChange} required={loanProducts.length > 0 && (!initialData || Boolean(initialData.loanProductType || initialData.product))} disabled={productsLoading} style={{ minHeight: '42px' }}>
          <option value="">{productsLoading ? 'Loading products...' : loanProducts.length ? 'Select product' : 'No products available'}</option>
          {form.loanProductType && !loanProducts.some((product) => product.name === form.loanProductType)
            ? <option value={form.loanProductType}>{form.loanProductType}</option>
            : null}
          {loanProducts.map((product) => <option key={product.id} value={product.name}>{product.name}</option>)}
        </select>
      </label>

      <label className="lead-field" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <span>Loan Amount <em>*</em></span>
        <input name="loanAmount" type="number" min="1" value={form.loanAmount} onChange={handleChange} required={!initialData || Boolean(initialData.loanAmount || initialData.amount)} style={{ minHeight: '42px' }} />
      </label>

      <label className="lead-field" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <span>Purpose of Loan</span>
        <select name="loanPurpose" value={form.loanPurpose} onChange={handleChange} required={!initialData || Boolean(initialData.loanPurpose || initialData.purposeOfLoan)} style={{ minHeight: '42px' }}>
          <option value="">Select purpose</option>
          {includeCurrentOption(['Home purchase', 'Home renovation', 'Medical expenses', 'Education', 'Business expansion', 'Debt consolidation', 'Vehicle purchase', 'Other'], form.loanPurpose).map((purpose) => <option key={purpose} value={purpose}>{purpose}</option>)}
        </select>
      </label>

      <label className="lead-field" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <span>Down Payment <em>*</em></span>
        <input
          name="collateral"
          type="number"
          min="1"
          value={form.collateral}
          onChange={handleChange}
          required={!initialData || Boolean(initialData.collateral || initialData.downPaymentCollateral)}
          aria-invalid={Boolean(downPaymentError)}
          aria-describedby={downPaymentError ? 'lead-down-payment-error' : undefined}
          style={{ minHeight: '42px' }}
        />
        {downPaymentError ? <p id="lead-down-payment-error" role="alert" className="lead-inline-hint lead-inline-hint-error">{downPaymentError}</p> : null}
      </label>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 120px', gap: '12px' }}>
        <label className="lead-field" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <span>Tenure</span>
          <input name="tenure" type="number" min="1" value={form.tenure} onChange={handleChange} required={!initialData || Boolean(initialData.tenure)} style={{ minHeight: '42px' }} />
        </label>
        <label className="lead-field" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <span>Unit</span>
          <select name="tenureUnit" value={form.tenureUnit} onChange={handleChange} style={{ minHeight: '42px' }}>
            {includeCurrentOption(['month', 'quarter', 'year'], form.tenureUnit).map((unit) => <option key={unit} value={unit}>{unit[0].toUpperCase() + unit.slice(1)}</option>)}
          </select>
        </label>
      </div>

      <label className="lead-field" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <span>No. of Instalments</span>
        <input name="instalments" value={computedInstalments} readOnly style={{ minHeight: '42px', background: '#f6f8fa' }} />
      </label>

      <label className="lead-field" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <span>Interest Rate (% p.a.) <em>*</em></span>
        <input name="interestRate" type="number" min="0" max="100" step="0.01" value={form.interestRate} onChange={handleChange} required={!initialData || Boolean(initialData.interestRate)} style={{ minHeight: '42px' }} />
      </label>

      <label className="lead-field" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <span>Monthly EMI</span>
        <input name="monthlyEmi" value={computedMonthlyEmi ? formatCurrency(Number(computedMonthlyEmi)) : ''} readOnly style={{ minHeight: '42px', background: '#f6f8fa' }} />
        {calculatedEmi !== null ? <span style={{ color: '#708087', fontSize: '11px', fontWeight: 400 }}>{`Calculated over ${computedInstalments} months at ${annualInterestRate}% annual interest on the loan amount after down payment.`}</span> : null}
      </label>

      <label className="lead-field" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <span>Total Interest</span>
        <input name="totalInterest" value={computedTotalInterest ? formatCurrency(Number(computedTotalInterest)) : ''} readOnly style={{ minHeight: '42px', background: '#f6f8fa' }} />
      </label>

      <label className="lead-field" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <span>Total Amount</span>
        <input name="securityAmount" value={computedTotalAmount ? formatCurrency(Number(computedTotalAmount)) : ''} readOnly style={{ minHeight: '42px', background: '#f6f8fa' }} />
      </label>

    </div>
  );

  const renderIncomeProfile = () => (
    <div className="lead-income-content">
      <div className="lead-income-grid">
        <label className="lead-field">
          <span>Employment Type <em>*</em></span>
          <select name="employmentType" value={form.employmentType} onChange={handleChange} required={!initialData || Boolean(initialData.employmentType)}>
            <option value="">Select type</option>
            {includeCurrentOption(['Employee', 'Salaried', 'Self-Employed'], form.employmentType).map((type) => <option key={type} value={type}>{type}</option>)}
          </select>
        </label>

        <label className="lead-field">
          <span>Annual Income <em>*</em></span>
          <input name="annualIncome" type="number" min="1" value={form.annualIncome} onChange={handleChange} required={!initialData || Boolean(initialData.annualIncome)} />
        </label>

        <label className="lead-field">
          <span>Designation</span>
          <input name="designation" value={form.designation} onChange={handleChange} disabled={form.employmentType === 'Self-Employed'} />
        </label>

        <label className="lead-field lead-income-employer">
          <span>{form.employmentType === 'Self-Employed' ? 'Business Name' : 'Employer / Business Name'}</span>
          <input name="employerName" value={form.employerName} onChange={handleChange} disabled={['Employee', 'Salaried'].includes(form.employmentType)} />
        </label>

        <label className="lead-field">
          <span>Location</span>
          <input name="location" value={form.location} onChange={handleChange} />
        </label>

        <label className="lead-field">
          <span>State</span>
          <input name="state" value={form.state} onChange={handleChange} list="lead-indian-states" autoComplete="address-level1" />
          <datalist id="lead-indian-states">
            {indianStates.map((state) => <option key={state} value={state} />)}
          </datalist>
        </label>

        <label className="lead-field">
          <span>Take Home Pay</span>
          <input name="takeHomePay" type="number" min="0" value={form.takeHomePay} onChange={handleChange} />
        </label>

        <label className="lead-field">
          <span>Monthly Expenses (including EMIs)</span>
          <input name="deductions" type="number" min="0" value={form.deductions} onChange={handleChange} />
        </label>

        <label className="lead-field">
          <span>Bank Name</span>
          <input name="bankName" value={form.bankName} onChange={handleChange} />
        </label>

        <label className="lead-field">
          <span>Account Number</span>
          <input name="primaryBankAccount" value={form.primaryBankAccount} onChange={handleChange} inputMode="numeric" maxLength={18} />
        </label>

        <button type="button" className="lead-income-consent">A/c Stmt - Consent</button>
      </div>

      <div className="lead-income-actions" aria-label="Income and credit checks">
        <button type="button">CIBIL Liability Check</button>
        <button type="button">Debt-to-Income DTI</button>
        <button type="button">Loan-to-Value LTV</button>
        <button type="button">Debt Service Coverage Ratio DSCR</button>
        <button type="button">Net Disposable Income NDI</button>
      </div>
    </div>
  );

  const renderReferralDetails = () => (
    <div className="lead-referral-grid">
      {(() => {
        const referralEnabled = ['Bank Generated', 'Branch'].includes(form.acquisitionChannel);
        return <>
      <label className="lead-field lead-referral-channel">
        <span>Lead Acquisition Channel <em>*</em></span>
  
<select
  name="acquisitionChannel"
  value={form.acquisitionChannel}
  onChange={handleChange}
>
  <option value="">Select channel</option>
  {includeCurrentOption(
    [
      'Bank Generated',
      'Branch',
      'Website',
      'Mobile App',
      'Customer Referral',
      'Direct Sales',
      'Partner / Agent',
      'Other'
    ],
    form.acquisitionChannel
  ).map((channel) => (
    <option key={channel} value={channel}>
      {channel}
    </option>
  ))}
</select>

      </label>

      <label className="lead-field lead-referral-date">
        <span>Date</span>
        <LeadDatePicker
          id="lead-referral-date"
          name="referralDate"
          label="Referral Date"
          value={form.referralDate}
          onChange={(value) => handleChange({ target: { name: 'referralDate', value } })}
          disabled={!referralEnabled}
        />
      </label>

      <label className="lead-field lead-referral-partner-id">
        <span>Sourcing Agent / Partner ID</span>
        <input name="partnerId" value={form.partnerId} onChange={handleChange} disabled={!referralEnabled} />
      </label>

      <label className="lead-field lead-referral-partner-name">
        <span>Agent / Partner Name</span>
        <input name="partnerName" value={form.partnerName} onChange={handleChange} disabled={!referralEnabled} />
      </label>

      <label className="lead-field lead-referral-employee-id">
        <span>Emp ID</span>
        <input name="employeeId" value={form.employeeId} onChange={handleChange} disabled={!referralEnabled} />
      </label>

      <label className="lead-field lead-referral-employee-name">
        <span>Emp Name</span>
        <input name="employeeName" value={form.employeeName} onChange={handleChange} disabled={!referralEnabled} />
      </label>

         </>;
      })()}
    </div>
  );

  const renderFooter = () => (
    <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', marginTop: '28px', paddingTop: '10px' }}>
      {activeStep > 0 && (
        <button type="button" className="lead-cancel-btn" onClick={() => setActiveStep((current) => current - 1)} style={{ minWidth: '120px' }}>
          <ChevronLeft size={16} /> Previous
        </button>
      )}

      {activeStep < steps.length - 1 ? (
        <button type="button" className="lead-save-btn" onClick={handleNext} style={{ minWidth: '120px' }}>
          Next <ChevronRight size={16} />
        </button>
      ) : (
        <button type="button" className="lead-save-btn" onClick={handleSubmit} disabled={isSubmitting} style={{ minWidth: '120px' }}>
        {isSubmitting ? 'Submitting...' : initialData ? 'Save Changes' : 'Submit'}
        </button>
      )}

      <button type="button" className="lead-cancel-btn" onClick={() => resetAndClose()} disabled={isSubmitting} style={{ minWidth: '120px' }}>
        Cancel
      </button>
    </div>
  );

  const handleSubmit = async () => {
    if (isSubmitting) return;
    setSubmissionError('');

    const requiredFields = Array.from(document.querySelectorAll('.lead-step-panel input[required], .lead-step-panel select[required]'));
    const missing = requiredFields.filter((field) => !field.disabled && (!field.value || !field.value.toString().trim()));

    if (missing.length > 0) {
      const firstMissing = missing[0];
      firstMissing.focus();
      window.alert('Please fill all mandatory fields before submitting the lead.');
      return;
    }
    if (!form.dateOfBirth) {
      document.querySelector('[data-date-picker-trigger="dateOfBirth"]')?.focus();
      window.alert('Please fill all mandatory fields before submitting the lead.');
      return;
    }

    const customerName = [form.namePrefix, form.firstName, form.middleName, form.lastName].filter(Boolean).join(' ').trim();
    const leadData = {
      ...form,
      customerName,
      name: customerName,
      age: computedAge,
      customerType: computedCustomerType,
      instalments: computedInstalments,
      monthlyEmi: computedMonthlyEmi,
      totalInterest: computedTotalInterest,
      securityAmount: computedTotalAmount,
      status: initialData ? form.status : 'Pending',
    };
    delete leadData.otpNumber;
    delete leadData.otpSent;

    const numericValue = (value) => value === '' || value === null || value === undefined ? null : Number(value);

    if (initialData) {
      const updates = {
        customerName,
        mobileNumber: form.mobileNumber,
        dateOfBirth: form.dateOfBirth || null,
        age: numericValue(computedAge),
        customerType: computedCustomerType || null,
        panNumber: form.panCard || null,
        aadhaarNumber: form.aadhaarCard || null,
        residentialStatus: form.residentialStatus || null,
        gender: form.gender || null,
        maritalStatus: form.maritalStatus || null,
        passportNumber: form.passportNo || null,
        passportExpiryDate: form.passportExpiryDate || null,
        emailAddress: form.email || null,
        numberOfDependents: numericValue(form.dependents),
        loanAmount: numericValue(form.loanAmount),
        tenure: numericValue(tenureMonths),
        numberOfInstalments: numericValue(computedInstalments),
        emi: numericValue(computedMonthlyEmi),
        annualIncome: numericValue(form.annualIncome),
        designation: form.designation || null,
      };

      setIsSubmitting(true);
      try {
        await onUpdate(leadData, updates);
        resetAndClose(true);
      } catch (error) {
        setSubmissionError(error instanceof Error ? error.message : 'Unable to update the lead. Please try again.');
      } finally {
        setIsSubmitting(false);
      }
      return;
    }

    const requestData = {
      customerName,
      mobileNumber: form.mobileNumber,
      dateOfBirth: form.dateOfBirth,
      age: numericValue(computedAge),
      customerType: computedCustomerType,
      panNumber: form.panCard,
      panValidationStatus: 'PENDING',
      aadhaarNumber: form.aadhaarCard,
      aadhaarValidationStatus: 'PENDING',
      residentialStatus: form.residentialStatus || null,
      gender: form.gender,
      maritalStatus: form.maritalStatus,
      passportNumber: form.passportNo || null,
      passportExpiryDate: form.passportExpiryDate || null,
      emailAddress: form.email || null,
      pinCode: null,
      numberOfDependents: numericValue(form.dependents),
      loanProductType: form.loanProductType,
      loanAmount: numericValue(form.loanAmount),
      purposeOfLoan: form.loanPurpose,
      tenure: numericValue(tenureMonths),
      numberOfInstalments: numericValue(computedInstalments),
      emi: numericValue(computedMonthlyEmi),
      interestRate: numericValue(form.interestRate),
      totalInterest: numericValue(computedTotalInterest),
      securityAmount: numericValue(form.securityAmount) ?? 0,
      downPaymentCollateral: numericValue(form.collateral),
      employmentType: form.employmentType === 'Employee' ? 'Salaried' : form.employmentType,
      annualIncome: numericValue(form.annualIncome),
      designation: form.designation || null,
      employerName: form.employerName || null,
      location: form.location || null,
      state: form.state || null,
      takeHomePay: numericValue(form.takeHomePay),
      deductionsOrEmisPayable: numericValue(form.deductions),
      bankName: form.bankName || null,
      accountNumber: form.primaryBankAccount || null,
      accountStatementConsent: false,
      cibilLiabilityCheck: null,
      debtToIncomeRatio: null,
      loanToValueRatio: null,
      debtServiceCoverageRatio: null,
      netDisposableIncome: null,
      leadAcquisitionChannel: form.acquisitionChannel,
      date: form.referralDate || todayInputDate,
      sourcingAgentPartnerId: form.partnerId || null,
      agentPartnerName: form.partnerName || null,
      employeeId: form.employeeId || null,
      employeeName: form.employeeName || null,
    };

    setIsSubmitting(true);
    try {
      const result = await createLead(requestData);
      onCreate(leadData, result);
      resetAndClose(true);
    } catch (error) {
      setSubmissionError(error instanceof Error ? error.message : 'Unable to create the lead. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="lead-modal-backdrop" onMouseDown={(event) => {
      if (event.target === event.currentTarget) resetAndClose();
    }}>
      <style>{newLeadInlineStyles}</style>
      <div className="lead-modal" onMouseDown={(event) => event.stopPropagation()}>
        <div className="lead-modal-header">
          <div>
            <h2>{initialData ? `Edit Lead ${initialData.id}` : 'New Lead'}</h2>
            <p>{initialData ? 'Update the lead information.' : 'Capture the applicant and loan requirements.'}</p>
          </div>
          <button type="button" className="lead-modal-close" aria-label="Close form" onClick={() => resetAndClose()} disabled={isSubmitting}>
            <X size={18} />
          </button>
        </div>

        <form className="lead-form" onSubmit={(event) => event.preventDefault()}>
          {submissionError ? <p className="lead-submit-error" role="alert">{submissionError}</p> : null}
          <div className="lead-step-layout">
            <nav className="lead-step-nav" aria-label="Lead form steps">
              {steps.map((step, index) => (
                <button
                  type="button"
                  key={step.title}
                  className={`lead-step-item${index === activeStep ? ' active' : ''}${index < activeStep ? ' complete' : ''}`}
                  onClick={() => index < activeStep && setActiveStep(index)}
                  aria-current={index === activeStep ? 'step' : undefined}
                  aria-label={`Step ${index + 1}: ${step.title}`}
                >
                  <span className="lead-step-number">{index < activeStep ? '✓' : index + 1}</span>
                  <span>{step.title}</span>
                </button>
              ))}
            </nav>

            <section className="lead-step-panel" aria-labelledby="lead-step-title">
              <div className="lead-step-heading">
                <span>Step {activeStep + 1} of {steps.length}</span>
                <h3 id="lead-step-title">{steps[activeStep].title}</h3>
              </div>
              {activeStep === 0 ? (
                renderPersonalDetails()
              ) : activeStep === 1 ? (
                renderLoanDetails()
              ) : activeStep === 2 ? (
                renderIncomeProfile()
              ) : activeStep === 3 ? (
                renderReferralDetails()
              ) : (
                <div className="lead-step-fields">
                  {steps[activeStep].fields.map(renderField)}
                </div>
              )}
              {renderFooter()}
            </section>
          </div>
        </form>
      </div>
    </div>
  );
}
