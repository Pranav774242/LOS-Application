'use client';

import { useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Plus,
  Trash2,
  Upload,
} from 'lucide-react';
import AppShell from './AppShell';
import Card from './Card';
import PageHeader from './PageHeader';
import { getApplicationId, getCustomerName } from './GoldLoanApplication';

export const RETAIL_LOAN_STORAGE_KEY = 'los.retailLoanApplications';

const RETAIL_STEPS = [
  'Borrower Details',
  'Related Party',
  'Loan Details',
  'Repayment Chart',
  'Basic Details',
  'Security Details',
  'Insurance Details',
  'Disbursement',
];

const blankRelatedParty = () => ({
  nameType: '',
  relation: '',
  customerNo: '',
  salutation: '',
  firstName: '',
  middleName: '',
  lastName: '',
});

function isValidDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(value || ''))) return false;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return date.getFullYear() === year
    && date.getMonth() === month - 1
    && date.getDate() === day;
}

export function createInitialRetailLoanForm(application) {
  const savedForm = application?.retailLoanForm
    && typeof application.retailLoanForm === 'object'
    && !Array.isArray(application.retailLoanForm)
    ? application.retailLoanForm
    : {};
  const goldLoan = application?.goldLoanForm
    && typeof application.goldLoanForm === 'object'
    && !Array.isArray(application.goldLoanForm)
    ? application.goldLoanForm
    : {};
  const savedCustomerName = application ? getCustomerName(application) : '';
  const nameParts = savedCustomerName && savedCustomerName !== 'Not available'
    ? savedCustomerName.split(/\s+/).filter(Boolean)
    : [];

  const rawProduct = application?.productName || application?.product || goldLoan.productName;
  const isGold = !rawProduct || /gold/i.test(rawProduct);
  const retailProductName = isGold ? 'Retail Personal Loan' : rawProduct;
  const rawProductCode = application?.productCode || goldLoan.productCode;
  const retailProductCode = isGold || !rawProductCode || /gld/i.test(rawProductCode) ? 'RTL-PERS-01' : rawProductCode;
  const rawSchemeCode = application?.schemeCode || goldLoan.schemeCode;
  const retailSchemeCode = isGold || !rawSchemeCode || /gld/i.test(rawSchemeCode) ? 'SCH-RTL-01' : rawSchemeCode;
  const rawSchemeDesc = application?.schemeDescription || goldLoan.schemeDescription;
  const retailSchemeDesc = isGold || !rawSchemeDesc || /gold/i.test(rawSchemeDesc) ? 'Standard Prime Scheme' : rawSchemeDesc;

  const rawAccountNo = application?.loanAccountNumber || goldLoan.loanAccountNumber || '';
  const retailAccountNo = rawAccountNo ? rawAccountNo.replace(/^GLA-/i, 'RLA-') : '';

  const initialAmount = String(application?.amount || goldLoan.sanctionLimit || '').replace(/[^\d.]/g, '') || (application ? '250000' : '');

  const initialForm = {
    loanAccountNumber: retailAccountNo,
    effectiveDate: application?.effectiveDate || goldLoan.effectiveDate || application?.applicationDate || '',
    customerId: application?.customerId || goldLoan.customerId || (application ? 'CUS-2024-00841' : ''),
    branch: application?.branch || goldLoan.branch || (application ? 'Main Branch' : ''),
    title: application?.title || goldLoan.title || (application ? 'Mr' : ''),
    firstName: nameParts[0] || goldLoan.firstName || (application ? 'Rohan' : ''),
    middleName: nameParts.length > 2 ? nameParts.slice(1, -1).join(' ') : (goldLoan.middleName || ''),
    lastName: nameParts.length > 1 ? nameParts[nameParts.length - 1] : (goldLoan.lastName || (application ? 'Mehta' : '')),
    productCode: retailProductCode,
    productName: retailProductName,
    schemeCode: retailSchemeCode,
    schemeDescription: retailSchemeDesc,
    accountStatus: application?.accountStatus || goldLoan.accountStatus || application?.status || (application ? 'Active' : ''),
    modeOfOperation: application?.modeOfOperation || goldLoan.modeOfOperation || (application ? 'Single' : ''),
    lastTransactionDate: application?.lastTransactionDate || goldLoan.lastTransactionDate || application?.applicationDate || '',
    sanctionedDate: application?.sanctionedDate || goldLoan.sanctionedDate || application?.applicationDate || (application ? '2024-06-18' : ''),
    loanAmount: initialAmount,
    interestRate: application?.interestRate || goldLoan.interestRate || (application ? '10.5' : ''),
    offsetRate: application?.offsetRate || (application ? '0.5' : ''),
    totalInterestRate: application?.totalInterestRate || (application ? '11.0' : ''),
    moratorium: application?.moratorium || (application ? '0' : ''),
    expiryDate: application?.expiryDate || goldLoan.expiryDate || (application ? '2025-06-18' : ''),
    instalmentAmount: application?.instalmentAmount || goldLoan.instalmentAmount || (application ? '22450' : ''),
    instalmentStartDate: application?.instalmentStartDate || goldLoan.repaymentStartDate || (application ? '2024-07-18' : ''),
    sanctioningAuthority: application?.sanctioningAuthority || goldLoan.sanctionAuthority || (application ? 'Branch Manager' : ''),
    tenureMonths: application?.tenureMonths || goldLoan.tenureMonths || (application ? '12' : ''),
    emiType: application?.emiType || 'Monthly',
    bulletPayment: application?.bulletPayment || (application ? '0' : ''),
    instalmentEndDate: application?.instalmentEndDate || application?.expiryDate || goldLoan.expiryDate || (application ? '2025-06-18' : ''),
    purposeCode: application?.purposeCode || goldLoan.basicDetails?.purposeLoan || (application ? 'PUR-01' : ''),
    prioritySector: application?.prioritySector || (goldLoan.basicDetails?.womenSector === 'Yes' ? 'Yes' : (application ? 'No' : '')),
    prioritySectorCode: application?.prioritySectorCode || goldLoan.basicDetails?.sectorCode || (application ? 'RETAIL' : ''),
    industryType: application?.industryType || (application ? 'Services' : ''),
    industrySubType: application?.industrySubType || (application ? 'Retail Trade' : ''),
    physicallyChallenged: application?.physicallyChallenged || (application ? 'No' : ''),
    termCode: application?.termCode || goldLoan.basicDetails?.termCode || (application ? 'SHORT' : ''),
    securityId: application?.securityId || (goldLoan.security?.securityId ? goldLoan.security.securityId.replace(/^SEC-/i, 'SEC-RTL-') : (application ? 'SEC-RTL-01' : '')),
    securityType: application?.securityType || (application ? 'Immovable Property' : ''),
    securityEffectiveDate: application?.securityEffectiveDate || application?.effectiveDate || goldLoan.effectiveDate || (application ? '2024-06-18' : ''),
    assetType: application?.assetType || (application ? 'Residential Apartment' : ''),
    securityAmount: application?.securityAmount || goldLoan.security?.limitAvailable || (application ? '350000' : ''),
    marginPercent: application?.marginPercent || goldLoan.security?.marginPercent || (application ? '20' : ''),
    assetAddress: application?.assetAddress || (application ? 'Flat 402, Green Heights' : ''),
    assetAddressLine2: application?.assetAddressLine2 || (application ? 'MG Road' : ''),
    city: application?.city || (application ? 'Mumbai' : ''),
    state: application?.state || (application ? 'Maharashtra' : ''),
    pincode: application?.pincode || (application ? '400001' : ''),
    valuationAmount: application?.valuationAmount || (application ? '350000' : ''),
    valuerName: application?.valuerName || goldLoan.security?.valuerDescription || (application ? 'Apex Valuers Pvt Ltd' : ''),
    valuationDate: application?.valuationDate || application?.effectiveDate || goldLoan.effectiveDate || (application ? '2024-06-18' : ''),
    inspectionBy: application?.inspectionBy || (application ? 'Technical Officer' : ''),
    inspectionDate: application?.inspectionDate || application?.effectiveDate || goldLoan.effectiveDate || (application ? '2024-06-18' : ''),
    inspectionReportName: application?.inspectionReportName || (application ? 'valuation_report_rohan.pdf' : ''),
    securityValue: application?.securityValue || (application ? '350000' : ''),
    insuranceCompany: application?.insuranceCompany || (application ? 'National Insurance Co' : ''),
    policyNumber: application?.policyNumber || (application ? 'POL-2024-9981' : ''),
    insuranceIssueDate: application?.insuranceIssueDate || application?.effectiveDate || goldLoan.effectiveDate || (application ? '2024-06-18' : ''),
    premiumAmount: application?.premiumAmount || (application ? '4500' : ''),
    sumAssured: application?.sumAssured || (application ? '350000' : ''),
    insuranceExpiryDate: application?.insuranceExpiryDate || application?.expiryDate || goldLoan.expiryDate || (application ? '2025-06-18' : ''),
    disbursementAccountNumber: application?.disbursementAccountNumber || goldLoan.disbursement?.accountNumber || (application ? '041018200001' : ''),
    disbursementAccountType: application?.disbursementAccountType || goldLoan.disbursement?.accountType || (application ? 'Savings Account' : ''),
    bankName: application?.bankName || goldLoan.disbursement?.bankName || (application ? 'Example Bank' : ''),
    ifscCode: application?.ifscCode || goldLoan.disbursement?.ifscCode || (application ? 'EXAM0000410' : ''),
    disbursementMode: application?.disbursementMode || goldLoan.disbursement?.mode || (application ? 'NEFT' : ''),
    disbursementAmount: application?.disbursementAmount || goldLoan.disbursement?.amount || initialAmount,
    relatedParties: Array.isArray(savedForm.relatedParties) && savedForm.relatedParties.length > 0
      ? savedForm.relatedParties.map((party) => ({ ...blankRelatedParty(), ...party }))
      : Array.isArray(goldLoan.relatedParties) && goldLoan.relatedParties.length > 0
        ? goldLoan.relatedParties.map((party) => ({ ...blankRelatedParty(), ...party }))
        : Array.from({ length: 5 }, blankRelatedParty),
  };

  const formFields = Object.keys(initialForm).filter((key) => key !== 'relatedParties');
  const numericFields = new Set([
    'loanAmount',
    'interestRate',
    'offsetRate',
    'totalInterestRate',
    'moratorium',
    'instalmentAmount',
    'tenureMonths',
    'bulletPayment',
    'securityAmount',
    'marginPercent',
    'valuationAmount',
    'securityValue',
    'premiumAmount',
    'sumAssured',
    'disbursementAmount',
  ]);
  const applicationFields = Object.fromEntries(
    formFields
      .filter((key) => (
        application?.[key] !== undefined
        && application?.[key] !== null
        && !(typeof application[key] === 'string' && !application[key].trim())
      ))
      .map((key) => [
        key,
        numericFields.has(key)
          ? String(application[key]).replace(/[^\d.-]/g, '')
          : application[key],
      ]),
  );

  return {
    ...initialForm,
    ...applicationFields,
    ...savedForm,
    relatedParties: Array.isArray(savedForm.relatedParties) && savedForm.relatedParties.length > 0
      ? savedForm.relatedParties.map((party) => ({ ...blankRelatedParty(), ...party }))
      : initialForm.relatedParties,
  };
}

export function readSavedRetailLoanApplications() {
  if (typeof window === 'undefined') return [];
  const value = window.localStorage.getItem(RETAIL_LOAN_STORAGE_KEY);
  if (!value) return [];

  const parsed = JSON.parse(value);
  if (!Array.isArray(parsed)) {
    throw new Error('Saved Retail Loan applications have an invalid format.');
  }
  return parsed;
}

export function persistRetailLoanApplication(application) {
  if (typeof window === 'undefined') return;
  const saved = readSavedRetailLoanApplications().filter(
    (record) => getApplicationId(record) !== getApplicationId(application),
  );
  window.localStorage.setItem(
    RETAIL_LOAN_STORAGE_KEY,
    JSON.stringify([...saved, application]),
  );
}

function RetailField({
  label,
  name,
  value,
  onChange,
  type = 'text',
  options,
  error,
  required = false,
  readOnly = false,
  placeholder,
  className = '',
  ...inputProps
}) {
  const inputId = `field-${name}`;
  return (
    <div className={`retail-field ${error ? 'has-error' : ''} ${className}`}>
      <label htmlFor={inputId} className="retail-field-label">
        <span>{label}</span>
        {required && <span className="retail-required" aria-hidden="true"> *</span>}
      </label>
      {options ? (
        <div className="retail-select-wrapper">
          <select
            id={inputId}
            name={name}
            value={value ?? ''}
            onChange={(event) => onChange(name, event.target.value)}
            aria-invalid={Boolean(error)}
            aria-describedby={error ? `${inputId}-error` : undefined}
            disabled={readOnly}
            required={required}
            className="retail-select-control"
            {...inputProps}
          >
            <option value="">{placeholder || 'Select'}</option>
            {options.map((option) => {
              const optVal = typeof option === 'object' ? option.value : option;
              const optLabel = typeof option === 'object' ? option.label : option;
              return (
                <option value={optVal} key={optVal}>{optLabel}</option>
              );
            })}
          </select>
          <span className="retail-select-chevron" aria-hidden="true">
            <ChevronDown size={15} />
          </span>
        </div>
      ) : (
        <input
          id={inputId}
          name={name}
          type={type}
          value={value ?? ''}
          onChange={(event) => onChange(name, event.target.value)}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${inputId}-error` : undefined}
          readOnly={readOnly}
          required={required}
          placeholder={placeholder}
          className="retail-input-control"
          {...inputProps}
        />
      )}
      {error && (
        <span className="retail-field-error-text" id={`${inputId}-error`} role="alert">
          {error}
        </span>
      )}
    </div>
  );
}

export function getRepaymentRows(form) {
  const amount = Number(form.loanAmount);
  const tenure = Number(form.tenureMonths);
  const annualRate = Number(form.totalInterestRate || form.interestRate);
  if (!Number.isFinite(amount) || amount <= 0 || !Number.isInteger(tenure) || tenure <= 0) {
    return [];
  }

  const monthlyRate = Number.isFinite(annualRate) && annualRate > 0
    ? annualRate / 1200
    : 0;
  const enteredInstalment = Number(form.instalmentAmount);
  const instalment = Number.isFinite(enteredInstalment) && enteredInstalment > 0
    ? enteredInstalment
    : monthlyRate
      ? amount * monthlyRate / (1 - ((1 + monthlyRate) ** -tenure))
      : amount / tenure;
  const start = form.instalmentStartDate ? new Date(`${form.instalmentStartDate}T00:00:00`) : null;
  let balance = amount;

  return Array.from({ length: Math.min(tenure, 120) }, (_, index) => {
    const interest = balance * monthlyRate;
    const principal = Math.min(balance, Math.max(0, instalment - interest));
    const currentBalance = Math.max(0, balance - principal);
    const date = start ? new Date(start.getFullYear(), start.getMonth() + index, start.getDate()) : null;
    balance = currentBalance;
    return {
      month: date
        ? date.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })
        : index + 1,
      instalment: Math.min(instalment, principal + interest),
      interest,
      principal,
      balance: currentBalance,
    };
  });
}

function formatRupees(value) {
  return Number.isFinite(value)
    ? value.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : '—';
}

export default function RetailLoanApplicationForm({
  application,
  onBack,
  onCreate,
  onSave,
  backLabel = 'Loan Dashboard',
}) {
  const isEditMode = Boolean(application);
  const [form, setForm] = useState(() => createInitialRetailLoanForm(application));
  const [currentStep, setCurrentStep] = useState(0);
  const [errors, setErrors] = useState({});
  const [dirty, setDirty] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');
  const [saveError, setSaveError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const submissionLock = useRef(false);
  const repaymentRows = useMemo(() => getRepaymentRows(form), [form]);

  const sectionDescriptions = [
    'Enter the borrower identity, account information, and product details.',
    'Add any co-applicant, guarantor, or other related parties associated with this loan.',
    'Review the requested loan amount, interest rates, and repayment terms.',
    'Review the calculated instalment schedule and amortisation forecast.',
    'Provide industry classification, purpose codes, and priority sector details.',
    'Provide the security asset details, valuation, and inspection report.',
    'Enter the insurance policy coverage and validity details.',
    'Provide the bank account and mode for loan disbursement.',
  ];

  const updateField = (name, value) => {
    setForm((current) => ({ ...current, [name]: value }));
    setDirty(true);
    setSaveMessage('');
    setErrors((current) => {
      if (!current[name]) return current;
      const next = { ...current };
      delete next[name];
      return next;
    });
  };

  const updateRelatedParty = (index, field, value) => {
    setForm((current) => ({
      ...current,
      relatedParties: current.relatedParties.map((party, row) => (
        row === index ? { ...party, [field]: value } : party
      )),
    }));
    setDirty(true);
    setErrors((current) => {
      const next = { ...current };
      delete next[`relatedParties.${index}.${field}`];
      return next;
    });
  };

  const validateStep = (step) => {
    const next = {};
    const namePattern = /^[\p{L}\p{M}]+(?:[ '-][\p{L}\p{M}]+)*$/u;
    const validateNumbers = (fields, { positive = [], integers = [], percentages = [] } = {}) => {
      fields.forEach((field) => {
        const value = String(form[field] ?? '').trim();
        if (!value) return;
        const number = Number(value);
        if (!Number.isFinite(number) || number < 0 || (positive.includes(field) && number <= 0)) {
          next[field] = positive.includes(field)
            ? 'Enter a number greater than zero.'
            : 'Enter a valid non-negative number.';
        } else if (integers.includes(field) && !Number.isInteger(number)) {
          next[field] = 'Enter a whole number.';
        } else if (percentages.includes(field) && number > 100) {
          next[field] = 'Enter a percentage from 0 to 100.';
        }
      });
    };
    const validateDates = (fields) => {
      fields.forEach((field) => {
        if (form[field] && !isValidDate(String(form[field]).trim())) {
          next[field] = 'Enter a valid date.';
        }
      });
    };

    if (step === 0) {
      if (!String(form.customerId || '').trim()) {
        next.customerId = 'Customer ID is required.';
      } else if (!/^CUS-\d{4}-\d{5}$/.test(String(form.customerId).trim())) {
        next.customerId = 'Use customer ID format CUS-YYYY-NNNNN.';
      }
      if (!String(form.firstName || '').trim()) {
        next.firstName = 'First name is required.';
      } else if (!namePattern.test(String(form.firstName).trim())) {
        next.firstName = 'Enter a valid first name.';
      }
      if (!String(form.lastName || '').trim()) {
        next.lastName = 'Last name is required.';
      } else if (!namePattern.test(String(form.lastName).trim())) {
        next.lastName = 'Enter a valid last name.';
      }
      if (form.middleName && !namePattern.test(String(form.middleName).trim())) {
        next.middleName = 'Enter a valid middle name.';
      }
      if (form.loanAccountNumber && !/^[A-Za-z0-9_-]+$/.test(String(form.loanAccountNumber).trim())) {
        next.loanAccountNumber = 'Use letters, numbers, hyphens, and underscores only.';
      }
      validateDates(['effectiveDate', 'lastTransactionDate']);
    }

    if (step === 1) {
      form.relatedParties.forEach((party, index) => {
        ['firstName', 'middleName', 'lastName'].forEach((field) => {
          const value = String(party[field] || '').trim();
          if (value && !namePattern.test(value)) {
            next[`relatedParties.${index}.${field}`] = 'Enter a valid name.';
          }
        });
      });
    }

    if (step === 2 || step === 3) {
      if (!String(form.loanAmount || '').trim()) {
        next.loanAmount = 'Loan amount is required.';
      }
      validateNumbers(
        ['loanAmount', 'instalmentAmount', 'bulletPayment', 'interestRate', 'offsetRate', 'totalInterestRate', 'tenureMonths', 'moratorium'],
        {
          positive: ['loanAmount'],
          integers: ['tenureMonths', 'moratorium'],
          percentages: ['interestRate', 'offsetRate', 'totalInterestRate'],
        },
      );
      validateDates(['sanctionedDate', 'expiryDate', 'instalmentStartDate', 'instalmentEndDate']);
      if (form.expiryDate && form.sanctionedDate && form.expiryDate < form.sanctionedDate) {
        next.expiryDate = 'Expiry date must be on or after the sanctioned date.';
      }
      if (form.instalmentStartDate && form.instalmentEndDate && form.instalmentEndDate < form.instalmentStartDate) {
        next.instalmentEndDate = 'End date must be on or after the start date.';
      }
    }

    if (step === 5) {
      validateNumbers(['securityAmount', 'marginPercent', 'valuationAmount'], {
        percentages: ['marginPercent'],
      });
      validateDates(['securityEffectiveDate', 'valuationDate', 'inspectionDate']);
      if (form.pincode && !/^\d{6}$/.test(String(form.pincode).trim())) {
        next.pincode = 'Enter a 6-digit PIN code.';
      }
    }

    if (step === 6) {
      validateNumbers(['securityValue', 'premiumAmount', 'sumAssured']);
      validateDates(['insuranceIssueDate', 'insuranceExpiryDate']);
      if (form.insuranceIssueDate && form.insuranceExpiryDate && form.insuranceExpiryDate < form.insuranceIssueDate) {
        next.insuranceExpiryDate = 'Expiry date must be on or after the issue date.';
      }
    }

    if (step === 7) {
      validateNumbers(['disbursementAmount']);
      if (form.ifscCode && !/^[A-Z]{4}0[A-Z0-9]{6}$/i.test(String(form.ifscCode).trim())) {
        next.ifscCode = 'Enter a valid 11-character IFSC code.';
      }
    }

    return next;
  };

  const navigateToStep = (target) => {
    if (target <= currentStep) {
      setCurrentStep(target);
      return;
    }
    for (let step = currentStep; step < target; step += 1) {
      const nextErrors = validateStep(step);
      if (Object.keys(nextErrors).length) {
        setErrors(nextErrors);
        setCurrentStep(step);
        return;
      }
    }
    setErrors({});
    setCurrentStep(target);
  };

  const cancel = () => {
    if (dirty && !window.confirm(`Return to the ${backLabel} and discard unsaved changes?`)) return;
    onBack?.();
  };

  const submit = (event) => {
    event.preventDefault();
    if (isSubmitting || submissionLock.current) return;
    const nextErrors = RETAIL_STEPS.reduce(
      (allErrors, _, index) => ({ ...allErrors, ...validateStep(index) }),
      {},
    );
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) {
      const firstInvalidStep = RETAIL_STEPS.findIndex((_, index) => (
        Object.keys(validateStep(index)).length > 0
      ));
      setCurrentStep(firstInvalidStep < 0 ? 0 : firstInvalidStep);
      return;
    }

    const normalizedForm = Object.fromEntries(
      Object.entries(form).map(([key, value]) => [
        key,
        key === 'relatedParties'
          ? value.map((party) => Object.fromEntries(
            Object.entries(party).map(([partyKey, partyValue]) => [
              partyKey,
              typeof partyValue === 'string' ? partyValue.trim() : partyValue,
            ]),
          ))
          : typeof value === 'string' ? value.trim() : value,
      ]),
    );
    const fullName = [normalizedForm.firstName, normalizedForm.middleName, normalizedForm.lastName]
      .filter(Boolean)
      .join(' ')
      .trim();
    const updatedApplication = {
      ...(application || {}),
      id: getApplicationId(application || {}) === 'Not available'
        ? `RL-${window.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`}`
        : getApplicationId(application),
      customer: fullName,
      customerName: fullName,
      customerId: normalizedForm.customerId,
      product: normalizedForm.productName || application?.product || 'Retail Personal Loan',
      amount: normalizedForm.loanAmount,
      branch: normalizedForm.branch,
      applicationDate: application?.applicationDate || new Date().toISOString().slice(0, 10),
      status: application?.status || 'Pending',
      retailLoanForm: normalizedForm,
    };

    try {
      submissionLock.current = true;
      setIsSubmitting(true);
      if (isEditMode) onSave?.(updatedApplication);
      else onCreate?.(updatedApplication);
      setDirty(false);
      setSaveError('');
      setSaveMessage(isEditMode ? 'Changes saved successfully.' : 'Retail Loan application saved successfully.');
      setTimeout(() => {
        onBack?.();
      }, 1000);
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : 'The application could not be saved.');
      setSaveMessage('');
      submissionLock.current = false;
      setIsSubmitting(false);
    }
  };

  const clearStep = () => {
    const fieldsByStep = [
      ['loanAccountNumber', 'effectiveDate', 'customerId', 'branch', 'title', 'firstName', 'middleName', 'lastName', 'productCode', 'productName', 'schemeCode', 'schemeDescription', 'accountStatus', 'modeOfOperation', 'lastTransactionDate'],
      ['relatedParties'],
      ['sanctionedDate', 'loanAmount', 'interestRate', 'offsetRate', 'totalInterestRate', 'moratorium', 'expiryDate', 'instalmentAmount', 'instalmentStartDate', 'sanctioningAuthority', 'tenureMonths', 'emiType', 'bulletPayment', 'instalmentEndDate'],
      [],
      ['purposeCode', 'prioritySector', 'prioritySectorCode', 'industryType', 'industrySubType', 'physicallyChallenged', 'termCode'],
      ['securityId', 'securityType', 'securityEffectiveDate', 'assetType', 'securityAmount', 'marginPercent', 'assetAddress', 'assetAddressLine2', 'city', 'state', 'pincode', 'valuationAmount', 'valuerName', 'valuationDate', 'inspectionBy', 'inspectionDate', 'inspectionReportName'],
      ['securityValue', 'insuranceCompany', 'policyNumber', 'insuranceIssueDate', 'premiumAmount', 'sumAssured', 'insuranceExpiryDate'],
      ['disbursementAccountNumber', 'disbursementAccountType', 'bankName', 'ifscCode', 'disbursementMode', 'disbursementAmount'],
    ];
    setForm((current) => {
      const cleared = { ...current };
      fieldsByStep[currentStep].forEach((field) => {
        cleared[field] = field === 'relatedParties'
          ? Array.from({ length: 5 }, blankRelatedParty)
          : '';
      });
      return cleared;
    });
    setErrors({});
    setDirty(true);
  };

  const input = (label, name, options = {}) => (
    <RetailField
      key={name}
      label={label}
      name={name}
      value={form[name]}
      onChange={updateField}
      error={errors[name]}
      {...options}
    />
  );

  return (
    <AppShell title={isEditMode ? 'Edit Retail Loan Application' : 'Retail Loan Application'}>
      <div className="retail-form-page">
        <PageHeader
          title={isEditMode ? 'Edit Retail Loan Application' : 'Retail Loan Application'}
          description={isEditMode ? `Application ID: ${getApplicationId(application)}` : 'Complete the retail loan origination steps below.'}
          action={(
            <button
              className="icon-button loan-dashboard-back"
              type="button"
              onClick={cancel}
              aria-label={`Back to ${backLabel}`}
              title={`Back to ${backLabel}`}
            >
              <ArrowLeft size={19} aria-hidden="true" />
            </button>
          )}
        />

        <Card className="loan-application-card">
          <div className="retail-form-container">
            {/* Step Navigation Bar */}
            <nav className="retail-stepper" aria-label="Retail loan application steps">
              {RETAIL_STEPS.map((step, index) => {
                const isCurrent = index === currentStep;
                const isComplete = index < currentStep;
                return (
                  <button
                    type="button"
                    key={step}
                    className={`retail-step-item ${isCurrent ? 'active' : ''} ${isComplete ? 'complete' : ''}`}
                    onClick={() => navigateToStep(index)}
                    aria-current={isCurrent ? 'step' : undefined}
                    aria-label={`Step ${index + 1}: ${step}${isComplete ? ', completed' : ''}`}
                  >
                    <span className="retail-step-circle">
                      {isComplete ? <Check size={14} strokeWidth={2.5} aria-hidden="true" /> : index + 1}
                    </span>
                    <span className="retail-step-title">{step}</span>
                  </button>
                );
              })}
            </nav>

            <form className="retail-form-panel" onSubmit={submit} noValidate>
              {/* Step Header */}
              <header className="retail-step-header">
                <span className="retail-step-kicker">
                  STEP {String(currentStep + 1).padStart(2, '0')} OF {String(RETAIL_STEPS.length).padStart(2, '0')}
                </span>
                <h2 className="retail-step-heading">{RETAIL_STEPS[currentStep]}</h2>
                <p className="retail-step-subtitle">{sectionDescriptions[currentStep]}</p>
              </header>

              {saveMessage && (
                <div className="retail-alert success" role="status">
                  <Check size={16} aria-hidden="true" />
                  <span>{saveMessage}</span>
                </div>
              )}
              {saveError && (
                <div className="retail-alert error" role="alert">
                  <span>{saveError}</span>
                </div>
              )}

              {/* Step 0: Borrower Details */}
              {currentStep === 0 && (
                <div className="retail-sections-stack">
                  {/* Section 1: Application Information */}
                  <section className="retail-section-card">
                    <div className="retail-section-header">
                      <h3 className="retail-section-title">Application Information</h3>
                    </div>
                    <div className="retail-grid two-column">
                      {input('Loan Account Number', 'loanAccountNumber', { placeholder: 'e.g. RL-2026-001' })}
                      {input('Effective Date', 'effectiveDate', { type: 'date' })}
                      {input('Customer ID', 'customerId', { required: true, placeholder: 'CUS-YYYY-NNNNN' })}
                      {input('Branch', 'branch', { placeholder: 'Branch code or location' })}
                      {input('Account Status', 'accountStatus', {
                        options: ['Draft', 'Pending', 'In review', 'Approved', 'Disbursed', 'Awaiting KYC', 'Returned', 'Rejected', 'Active', 'Closed'],
                      })}
                      {input('Last Transaction Date', 'lastTransactionDate', { type: 'date' })}
                    </div>
                  </section>

                  {/* Section 2: Borrower Information */}
                  <section className="retail-section-card">
                    <div className="retail-section-header">
                      <h3 className="retail-section-title">Borrower Information</h3>
                    </div>
                    <div className="retail-grid borrower-grid">
                      {input('Title', 'title', { options: ['Mr', 'Mrs', 'Ms', 'Dr', 'Other'] })}
                      {input('First Name', 'firstName', { required: true, placeholder: 'Enter first name' })}
                      {input('Middle Name', 'middleName', { placeholder: 'Enter middle name' })}
                      {input('Last Name', 'lastName', { required: true, placeholder: 'Enter last name' })}
                    </div>
                  </section>

                  {/* Section 3: Loan Product Information */}
                  <section className="retail-section-card">
                    <div className="retail-section-header">
                      <h3 className="retail-section-title">Loan Product Information</h3>
                    </div>
                    <div className="retail-grid two-column">
                      {input('Product Code', 'productCode', { placeholder: 'e.g. RTL-PERS-01' })}
                      {input('Product Description', 'productName', { placeholder: 'e.g. Retail Personal Loan' })}
                      {input('Scheme Code', 'schemeCode', { placeholder: 'e.g. SCH-01' })}
                      {input('Scheme Description', 'schemeDescription', { placeholder: 'e.g. Standard Prime Scheme' })}
                      {input('Mode of Operation', 'modeOfOperation', {
                        options: ['Single', 'Joint', 'Either or Survivor', 'Anyone or Survivor'],
                      })}
                    </div>
                  </section>
                </div>
              )}

              {/* Step 1: Related Party */}
              {currentStep === 1 && (
                <section className="retail-section-card">
                  <div className="retail-section-header with-action">
                    <div>
                      <h3 className="retail-section-title">Related Party Information</h3>
                      <p className="retail-section-subtitle">Add co-applicants, guarantors, or nominees associated with this loan.</p>
                    </div>
                    <button
                      type="button"
                      className="retail-btn-secondary add-btn"
                      onClick={() => {
                        setForm((current) => ({
                          ...current,
                          relatedParties: [...current.relatedParties, blankRelatedParty()],
                        }));
                        setDirty(true);
                      }}
                    >
                      <Plus size={15} aria-hidden="true" /> Add Related Party
                    </button>
                  </div>
                  <div className="retail-table-wrap">
                    <table className="retail-data-table">
                      <thead>
                        <tr>
                          <th style={{ width: 44 }}>Sr.</th>
                          <th>Name Type</th>
                          <th>Relation</th>
                          <th>Customer No</th>
                          <th>Sal</th>
                          <th>First Name</th>
                          <th>Middle Name</th>
                          <th>Last Name</th>
                          <th style={{ width: 48 }} aria-label="Actions" />
                        </tr>
                      </thead>
                      <tbody>
                        {form.relatedParties.map((party, index) => (
                          <tr key={party.id || index}>
                            <td className="row-number">{index + 1}</td>
                            {[
                              ['nameType', ['Applicant', 'Guarantor', 'Co-applicant', 'Nominee']],
                              ['relation', ['Spouse', 'Parent', 'Sibling', 'Child', 'Other']],
                              ['customerNo'],
                              ['salutation', ['Mr', 'Mrs', 'Ms', 'Dr']],
                              ['firstName'],
                              ['middleName'],
                              ['lastName'],
                            ].map(([field, options]) => (
                              <td key={field}>
                                {options ? (
                                  <div className="table-select-wrapper">
                                    <select
                                      aria-label={`${field} for related party ${index + 1}`}
                                      value={party[field] || ''}
                                      onChange={(event) => updateRelatedParty(index, field, event.target.value)}
                                      className="table-select"
                                    >
                                      <option value="">Select</option>
                                      {options.map((option) => (
                                        <option key={option} value={option}>{option}</option>
                                      ))}
                                    </select>
                                    <ChevronDown size={13} className="table-chevron" />
                                  </div>
                                ) : (
                                  <input
                                    aria-label={`${field} for related party ${index + 1}`}
                                    value={party[field] || ''}
                                    aria-invalid={Boolean(errors[`relatedParties.${index}.${field}`])}
                                    onChange={(event) => updateRelatedParty(index, field, event.target.value)}
                                    className="table-input"
                                    placeholder={field}
                                  />
                                )}
                                {errors[`relatedParties.${index}.${field}`] && (
                                  <small className="retail-field-error-text">
                                    {errors[`relatedParties.${index}.${field}`]}
                                  </small>
                                )}
                              </td>
                            ))}
                            <td>
                              <button
                                className="retail-icon-btn danger"
                                type="button"
                                onClick={() => {
                                  setForm((current) => ({
                                    ...current,
                                    relatedParties: current.relatedParties.filter((_, row) => row !== index),
                                  }));
                                  setDirty(true);
                                }}
                                aria-label={`Remove related party ${index + 1}`}
                                title={`Remove related party ${index + 1}`}
                              >
                                <Trash2 size={14} aria-hidden="true" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>
              )}

              {/* Step 2: Loan Details */}
              {currentStep === 2 && (
                <section className="retail-section-card">
                  <div className="retail-section-header">
                    <h3 className="retail-section-title">Loan Details & Terms</h3>
                  </div>
                  <div className="retail-grid two-column">
                    {input('Sanctioned Date', 'sanctionedDate', { type: 'date' })}
                    {input('Sanctioning Authority', 'sanctioningAuthority', { placeholder: 'e.g. Branch Manager' })}
                    {input('Loan Amount (₹)', 'loanAmount', { type: 'number', min: '0', step: '0.01', required: true, placeholder: '0.00' })}
                    {input('Tenure (months)', 'tenureMonths', { type: 'number', min: '1', step: '1', placeholder: 'e.g. 36' })}
                    {input('Interest Rate %', 'interestRate', { type: 'number', min: '0', step: '0.01', placeholder: 'e.g. 10.50' })}
                    {input('Offset Rate %', 'offsetRate', { type: 'number', min: '0', step: '0.01', placeholder: 'e.g. 0.00' })}
                    {input('Total Interest Rate %', 'totalInterestRate', { type: 'number', min: '0', step: '0.01', placeholder: 'e.g. 10.50' })}
                    {input('Moratorium (months)', 'moratorium', { type: 'number', min: '0', step: '1', placeholder: '0' })}
                    {input('Expiry Date', 'expiryDate', { type: 'date' })}
                    {input('Instalment Amount (₹)', 'instalmentAmount', { type: 'number', min: '0', step: '0.01', placeholder: '0.00' })}
                    {input('Instalment Start Date', 'instalmentStartDate', { type: 'date' })}
                    {input('EMI Frequency', 'emiType', { options: ['Monthly', 'Quarterly', 'User Defined'] })}
                    {input('Bullet Payment (₹)', 'bulletPayment', { type: 'number', min: '0', step: '0.01', placeholder: '0.00' })}
                    {input('Instalment End Date', 'instalmentEndDate', { type: 'date' })}
                  </div>
                </section>
              )}

              {/* Step 3: Repayment Chart */}
              {currentStep === 3 && (
                <div className="retail-sections-stack">
                  <section className="retail-section-card">
                    <div className="retail-section-header">
                      <h3 className="retail-section-title">Repayment Calculation Parameters</h3>
                    </div>
                    <div className="retail-grid three-column">
                      {input('Loan Amount (₹)', 'loanAmount', { type: 'number', min: '0', step: '0.01', placeholder: '0.00' })}
                      {input('Tenure (months)', 'tenureMonths', { type: 'number', min: '1', step: '1', placeholder: 'Months' })}
                      {input('Instalment Start Date', 'instalmentStartDate', { type: 'date' })}
                    </div>
                  </section>

                  <section className="retail-section-card">
                    <div className="retail-section-header">
                      <h3 className="retail-section-title">Amortisation Schedule Forecast</h3>
                      <p className="retail-section-subtitle">Estimated monthly principal, interest, and remaining balance breakdown.</p>
                    </div>
                    <div className="retail-table-wrap">
                      <table className="retail-data-table chart-table">
                        <thead>
                          <tr>
                            <th>Month</th>
                            <th>Principal Amount (₹)</th>
                            <th>Instalment Amt (₹)</th>
                            <th>Interest (₹)</th>
                            <th>Principal (₹)</th>
                            <th>Balance Amount (₹)</th>
                          </tr>
                        </thead>
                        <tbody>
                          {repaymentRows.length ? repaymentRows.map((row, index) => (
                            <tr key={`${row.month}-${index}`}>
                              <td className="row-number">{row.month}</td>
                              <td>{formatRupees(index === 0 ? Number(form.loanAmount) : repaymentRows[index - 1].balance)}</td>
                              <td>{formatRupees(row.instalment)}</td>
                              <td>{formatRupees(row.interest)}</td>
                              <td>{formatRupees(row.principal)}</td>
                              <td><strong>{formatRupees(row.balance)}</strong></td>
                            </tr>
                          )) : (
                            <tr>
                              <td colSpan="6" className="table-empty-cell">
                                Enter a valid loan amount and tenure above to generate the repayment schedule.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </section>
                </div>
              )}

              {/* Step 4: Basic Details */}
              {currentStep === 4 && (
                <section className="retail-section-card">
                  <div className="retail-section-header">
                    <h3 className="retail-section-title">Classification & Priority Sector</h3>
                  </div>
                  <div className="retail-grid two-column">
                    {input('Purpose Code', 'purposeCode', { placeholder: 'e.g. PUR-01' })}
                    {input('Priority Sector [Y/N]', 'prioritySector', { options: ['Yes', 'No'] })}
                    {input('Priority Sector Code', 'prioritySectorCode', { placeholder: 'e.g. PSC-02' })}
                    {input('Industry Type', 'industryType', { placeholder: 'e.g. Services' })}
                    {input('Industry Sub Type', 'industrySubType', { placeholder: 'e.g. Retail Trade' })}
                    {input('Physically Challenged', 'physicallyChallenged', { options: ['Yes', 'No'] })}
                    {input('Term Code', 'termCode', { placeholder: 'e.g. TRM-01' })}
                  </div>
                </section>
              )}

              {/* Step 5: Security Details */}
              {currentStep === 5 && (
                <div className="retail-sections-stack">
                  <section className="retail-section-card">
                    <div className="retail-section-header">
                      <h3 className="retail-section-title">Security & Collateral Information</h3>
                    </div>
                    <div className="retail-grid two-column">
                      {input('Security ID', 'securityId', { placeholder: 'e.g. SEC-101' })}
                      {input('Security Type', 'securityType', { placeholder: 'e.g. Immovable Property' })}
                      {input('Effective Date', 'securityEffectiveDate', { type: 'date' })}
                      {input('Asset Type', 'assetType', { placeholder: 'e.g. Residential Apartment' })}
                      {input('Security Amount (₹)', 'securityAmount', { type: 'number', min: '0', step: '0.01', placeholder: '0.00' })}
                      {input('Margin %', 'marginPercent', { type: 'number', min: '0', max: '100', step: '0.01', placeholder: 'e.g. 20' })}
                    </div>
                  </section>

                  <section className="retail-section-card">
                    <div className="retail-section-header">
                      <h3 className="retail-section-title">Asset Location & Valuation</h3>
                    </div>
                    <div className="retail-grid two-column">
                      {input('Address', 'assetAddress', { placeholder: 'Address line 1' })}
                      {input('Address Line 2', 'assetAddressLine2', { placeholder: 'Address line 2' })}
                      {input('City', 'city', { placeholder: 'City' })}
                      {input('State', 'state', { placeholder: 'State' })}
                      {input('Pincode', 'pincode', { inputMode: 'numeric', maxLength: 6, placeholder: '6-digit PIN' })}
                      {input('Valuation Amount (₹)', 'valuationAmount', { type: 'number', min: '0', step: '0.01', placeholder: '0.00' })}
                      {input('Valuer Name', 'valuerName', { placeholder: 'Certified Valuer Name' })}
                      {input('Valuation Done On', 'valuationDate', { type: 'date' })}
                      {input('Inspection By', 'inspectionBy', { placeholder: 'Inspector Name or Agency' })}
                      {input('Inspection Done On', 'inspectionDate', { type: 'date' })}
                      <div className="retail-field span-full">
                        <label className="retail-field-label">Inspection Report</label>
                        <label className="retail-file-picker">
                          <Upload size={16} aria-hidden="true" />
                          <span>{form.inspectionReportName || 'Click to select report document (.pdf, .jpg, .png)'}</span>
                          <input
                            type="file"
                            accept=".pdf,.jpg,.jpeg,.png"
                            className="retail-hidden-file-input"
                            onChange={(event) => updateField('inspectionReportName', event.target.files?.[0]?.name || '')}
                          />
                        </label>
                      </div>
                    </div>
                  </section>
                </div>
              )}

              {/* Step 6: Insurance Details */}
              {currentStep === 6 && (
                <section className="retail-section-card">
                  <div className="retail-section-header">
                    <h3 className="retail-section-title">Insurance Policy & Coverage</h3>
                  </div>
                  <div className="retail-grid two-column">
                    {input('Security Value (₹)', 'securityValue', { type: 'number', min: '0', step: '0.01', placeholder: '0.00' })}
                    {input('Premium Amount (₹)', 'premiumAmount', { type: 'number', min: '0', step: '0.01', placeholder: '0.00' })}
                    {input('Insurance Company', 'insuranceCompany', { placeholder: 'Insurer name' })}
                    {input('Sum Assured (₹)', 'sumAssured', { type: 'number', min: '0', step: '0.01', placeholder: '0.00' })}
                    {input('Policy Number', 'policyNumber', { placeholder: 'Policy number' })}
                    {input('Insurance Expiry Date', 'insuranceExpiryDate', { type: 'date' })}
                    {input('Insurance Issue Date', 'insuranceIssueDate', { type: 'date' })}
                  </div>
                </section>
              )}

              {/* Step 7: Disbursement */}
              {currentStep === 7 && (
                <section className="retail-section-card">
                  <div className="retail-section-header">
                    <h3 className="retail-section-title">Disbursement Account & Mode</h3>
                  </div>
                  <div className="retail-grid two-column">
                    {input('Account Number', 'disbursementAccountNumber', { placeholder: 'Bank account number' })}
                    {input('Account Type', 'disbursementAccountType', { options: ['Savings Account', 'Current Account'] })}
                    {input('Bank Name', 'bankName', { placeholder: 'Bank name' })}
                    {input('IFSC Code', 'ifscCode', { maxLength: 11, placeholder: '11-character IFSC' })}
                    {input('Disbursement Mode', 'disbursementMode', { options: ['NEFT', 'RTGS', 'IMPS', 'Cheque'] })}
                    {input('Disbursement Amount (₹)', 'disbursementAmount', { type: 'number', min: '0', step: '0.01', placeholder: '0.00' })}
                  </div>
                </section>
              )}

              {/* Bottom Navigation */}
              <div className="retail-form-actions">
                <div className="retail-actions-group">
                  <button type="button" className="retail-btn-secondary" onClick={cancel}>
                    Cancel
                  </button>
                  {currentStep > 0 && (
                    <button
                      type="button"
                      className="retail-btn-secondary"
                      onClick={() => setCurrentStep((step) => step - 1)}
                    >
                      <ChevronLeft size={16} aria-hidden="true" /> Previous
                    </button>
                  )}
                </div>

                <div className="retail-actions-group">
                  {(currentStep === 5 || currentStep === 6) && (
                    <button type="button" className="retail-btn-secondary" onClick={clearStep}>
                      Clear
                    </button>
                  )}
                  {currentStep < RETAIL_STEPS.length - 1 ? (
                    <button
                      type="button"
                      className="retail-btn-primary"
                      onClick={() => navigateToStep(currentStep + 1)}
                    >
                      Next <ChevronRight size={16} aria-hidden="true" />
                    </button>
                  ) : (
                    <button type="submit" className="retail-btn-primary" disabled={isSubmitting}>
                      {isSubmitting ? 'Saving...' : isEditMode ? 'Save Changes' : 'Submit'}
                      <Check size={16} aria-hidden="true" />
                    </button>
                  )}
                </div>
              </div>
            </form>
          </div>
        </Card>
      </div>

      <style jsx>{`
        .retail-form-page {
          min-width: 0;
          color: #243039;
        }

        :global(.loan-dashboard-back) {
          width: 40px;
          height: 40px;
          border: 1px solid #dfe8e8;
          border-radius: 8px;
          background: #fff;
          color: #4a6369;
          display: grid;
          place-items: center;
          transition: border-color .15s ease, background .15s ease;
        }

        :global(.loan-dashboard-back:hover) {
          border-color: #b8d4cf;
          background: #f4faf9;
          color: #177e7a;
        }

        :global(.loan-application-card) {
          padding: 24px;
          border: 1px solid #dfe9eb;
          border-radius: 12px;
          background: #fff;
          box-shadow: 0 4px 20px rgba(18, 42, 54, 0.04);
        }

        .retail-form-container {
          display: flex;
          flex-direction: column;
          gap: 24px;
          min-height: 0;
        }

        /* 1. Step Navigation: Horizontal Stepper */
        .retail-stepper {
          display: flex;
          flex-direction: row;
          align-items: center;
          gap: 8px;
          width: 100%;
          min-width: 0;
          overflow-x: auto;
          overflow-y: hidden;
          padding: 2px 2px 16px;
          border-bottom: 1px solid #e5ecec;
          scrollbar-width: thin;
          -webkit-overflow-scrolling: touch;
        }

        .retail-step-item {
          display: inline-flex;
          flex: 0 0 auto;
          align-items: center;
          gap: 9px;
          padding: 8px 14px;
          border: 1px solid transparent;
          border-radius: 8px;
          background: transparent;
          color: #60747a;
          font-family: inherit;
          font-size: 13px;
          font-weight: 600;
          white-space: nowrap;
          cursor: pointer;
          transition: background .15s ease, color .15s ease, border-color .15s ease;
        }

        .retail-step-item:hover {
          background: #f7fafb;
          color: #1d3b48;
        }

        .retail-step-item.active {
          border-color: #cfe1df;
          color: #165f5c;
          background: #edf6f4;
        }

        .retail-step-item.complete {
          color: #247b67;
        }

        .retail-step-circle {
          display: grid;
          width: 26px;
          height: 26px;
          flex: 0 0 26px;
          place-items: center;
          border: 1px solid #d7e2e3;
          border-radius: 50%;
          background: #fff;
          color: #657b81;
          font-size: 11px;
          font-weight: 700;
          transition: all .15s ease;
        }

        .retail-step-item.active .retail-step-circle {
          border-color: #177e7a;
          background: #177e7a;
          color: #fff;
        }

        .retail-step-item.complete .retail-step-circle {
          border-color: #b8dfd3;
          background: #e5f5ef;
          color: #26795f;
        }

        .retail-step-title {
          line-height: 1.2;
        }

        /* 2. Form Panel & Step Header */
        .retail-form-panel {
          min-width: 0;
          display: flex;
          flex-direction: column;
        }

        .retail-step-header {
          margin-bottom: 22px;
          padding-bottom: 4px;
        }

        .retail-step-kicker {
          display: inline-block;
          color: #177e7a;
          font-size: 11px;
          font-weight: 800;
          letter-spacing: .12em;
          text-transform: uppercase;
          margin-bottom: 6px;
        }

        .retail-step-heading {
          margin: 0 0 6px;
          color: #1d3b48;
          font-size: 24px;
          font-weight: 700;
          letter-spacing: -0.01em;
        }

        .retail-step-subtitle {
          margin: 0;
          color: #708087;
          font-size: 13px;
          line-height: 1.5;
        }

        /* Alerts */
        .retail-alert {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 20px;
          padding: 12px 16px;
          border-radius: 8px;
          font-size: 13px;
          line-height: 1.4;
        }

        .retail-alert.success {
          border: 1px solid #bfe0d0 !important;
          background: #f0faf5 !important;
          color: #246e53 !important;
        }

        .retail-alert.success :global(svg) {
          color: #246e53 !important;
        }

        .retail-alert.error {
          border: 1px solid #f3d4d4 !important;
          background: #fff5f5 !important;
          color: #b42318 !important;
        }

        .retail-alert.error :global(svg) {
          color: #b42318 !important;
        }

        /* 3. Section Cards */
        .retail-sections-stack {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .retail-section-card {
          border: 1px solid #dfe9eb;
          border-radius: 10px;
          background: #fff;
          padding: 20px 22px 18px;
          box-shadow: 0 1px 4px rgba(18, 42, 54, 0.02);
        }

        .retail-section-header {
          margin-bottom: 18px;
          padding-bottom: 10px;
          border-bottom: 1px solid #f0f4f5;
        }

        .retail-section-header.with-action {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 16px;
        }

        .retail-section-title {
          margin: 0;
          color: #1d3b48;
          font-size: 16px;
          font-weight: 700;
          letter-spacing: -0.01em;
        }

        .retail-section-subtitle {
          margin: 4px 0 0;
          color: #708087;
          font-size: 12px;
        }

        /* 4. Grids */
        .retail-grid {
          display: grid;
          gap: 16px 20px;
        }

        .retail-grid.two-column {
          grid-template-columns: repeat(2, minmax(0, 1fr));
        }

        .retail-grid.three-column {
          grid-template-columns: repeat(3, minmax(0, 1fr));
        }

        .retail-grid.borrower-grid {
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 14px;
        }

        .span-full {
          grid-column: 1 / -1;
        }

        /* 5. Field Controls */
        :global(.retail-field) {
          display: flex;
          flex-direction: column;
          gap: 7px;
          min-width: 0;
        }

        :global(.retail-field-label) {
          display: flex;
          align-items: center;
          gap: 4px;
          color: #304b59;
          font-size: 12px;
          font-weight: 600;
          line-height: 1.3;
          text-align: left;
        }

        :global(.retail-required) {
          color: #c74444;
          font-weight: 700;
        }

        :global(.retail-input-control),
        :global(.retail-select-control) {
          width: 100%;
          min-width: 0;
          height: 42px;
          padding: 0 12px;
          border: 1px solid #d7e2e5;
          border-radius: 8px;
          background: #f8fbfc;
          color: #1b3541;
          font-family: inherit;
          font-size: 13px;
          outline: none;
          transition: border-color .15s ease, box-shadow .15s ease, background .15s ease;
        }

        :global(.retail-input-control:focus),
        :global(.retail-select-control:focus) {
          border-color: #177e7a;
          background: #fff;
          box-shadow: 0 0 0 3px rgba(23, 126, 122, 0.12);
        }

        :global(.retail-input-control::placeholder) {
          color: #8c9ea6;
        }

        :global(.retail-field.has-error .retail-input-control),
        :global(.retail-field.has-error .retail-select-control) {
          border-color: #dc2626;
          background: #fffafb;
        }

        :global(.retail-field.has-error .retail-input-control:focus),
        :global(.retail-field.has-error .retail-select-control:focus) {
          border-color: #dc2626;
          box-shadow: 0 0 0 3px rgba(220, 38, 38, 0.12);
        }

        :global(.retail-select-wrapper) {
          position: relative;
          display: flex;
          align-items: center;
          width: 100%;
        }

        :global(.retail-select-control) {
          appearance: none;
          padding-right: 34px;
          cursor: pointer;
        }

        :global(.retail-select-chevron) {
          position: absolute;
          right: 12px;
          display: grid;
          place-items: center;
          color: #60747a;
          pointer-events: none;
        }

        :global(.retail-field-error-text) {
          display: block;
          color: #b42318;
          font-size: 11px;
          font-weight: 500;
          line-height: 1.35;
          margin-top: 2px;
        }

        /* File Upload Picker */
        .retail-file-picker {
          display: flex;
          align-items: center;
          gap: 10px;
          min-height: 42px;
          padding: 0 14px;
          border: 1px dashed #c0d3d8;
          border-radius: 8px;
          background: #f8fbfc;
          color: #35535d;
          font-size: 13px;
          cursor: pointer;
          transition: border-color .15s ease, background .15s ease;
        }

        .retail-file-picker:hover {
          border-color: #177e7a;
          background: #f2f8f7;
          color: #177e7a;
        }

        .retail-hidden-file-input {
          display: none;
        }

        /* 6. Tables (Related Party & Repayment Chart) */
        .retail-table-wrap {
          width: 100%;
          overflow-x: auto;
          border: 1px solid #dfe8eb;
          border-radius: 8px;
          background: #fff;
        }

        .retail-data-table {
          width: 100%;
          min-width: 860px;
          border-collapse: collapse;
          font-size: 12px;
          color: #2e4652;
          text-align: left;
        }

        .retail-data-table th {
          background: #f4f8f9;
          color: #435e67;
          font-weight: 700;
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: .04em;
          padding: 10px 12px;
          border-bottom: 1px solid #dfe8eb;
          white-space: nowrap;
        }

        .retail-data-table td {
          padding: 8px 10px;
          border-bottom: 1px solid #edf2f3;
          vertical-align: middle;
        }

        .retail-data-table tbody tr:last-child td {
          border-bottom: none;
        }

        .retail-data-table tbody tr:hover {
          background: #fafcfd;
        }

        .row-number {
          color: #708087;
          font-weight: 600;
          text-align: center;
        }

        .table-select-wrapper {
          position: relative;
          display: flex;
          align-items: center;
          min-width: 110px;
        }

        .table-select {
          width: 100%;
          height: 34px;
          padding: 0 24px 0 8px;
          border: 1px solid #d7e2e5;
          border-radius: 6px;
          background: #f8fbfc;
          color: #1b3541;
          font-family: inherit;
          font-size: 12px;
          appearance: none;
          outline: none;
        }

        .table-select:focus {
          border-color: #177e7a;
          background: #fff;
        }

        :global(.table-chevron) {
          position: absolute;
          right: 8px;
          color: #60747a;
          pointer-events: none;
        }

        .table-input {
          width: 100%;
          min-width: 90px;
          height: 34px;
          padding: 0 8px;
          border: 1px solid #d7e2e5;
          border-radius: 6px;
          background: #f8fbfc;
          color: #1b3541;
          font-family: inherit;
          font-size: 12px;
          outline: none;
        }

        .table-input:focus {
          border-color: #177e7a;
          background: #fff;
        }

        .retail-icon-btn {
          display: grid;
          place-items: center;
          width: 30px;
          height: 30px;
          border: 1px solid transparent;
          border-radius: 6px;
          background: transparent;
          cursor: pointer;
          transition: background .15s ease, color .15s ease;
        }

        .retail-icon-btn.danger {
          color: #8c4a4a;
        }

        .retail-icon-btn.danger:hover {
          border-color: #f3d4d4;
          background: #fff4f4;
          color: #c72d2d;
        }

        .table-empty-cell {
          padding: 30px 16px !important;
          text-align: center;
          color: #708087;
          font-size: 13px;
        }

        /* 7. Bottom Navigation Buttons */
        .retail-form-actions {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          margin-top: 28px;
          padding-top: 20px;
          border-top: 1px solid #edf1f3;
        }

        .retail-actions-group {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: 10px;
        }

        .retail-btn-secondary,
        .retail-btn-primary {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          min-height: 42px;
          min-width: 110px;
          padding: 0 18px;
          border-radius: 8px;
          font-family: inherit;
          font-size: 13px;
          font-weight: 700;
          cursor: pointer;
          transition: transform .15s ease, box-shadow .15s ease, background .15s ease, border-color .15s ease;
        }

        .retail-btn-secondary {
          border: 1px solid #dce5e8;
          background: #ffffff;
          color: #224c5f;
        }

        .retail-btn-secondary:hover {
          border-color: #cbd8dc;
          background: #f5f8f9;
          transform: translateY(-1px);
        }

        .retail-btn-secondary.add-btn {
          min-height: 36px;
          font-size: 12px;
          padding: 0 14px;
        }

        .retail-btn-primary {
          border: 1px solid #1f66d6;
          background: #1f66d6;
          color: #ffffff;
          box-shadow: 0 4px 14px rgba(31, 102, 214, 0.22);
        }

        .retail-btn-primary:hover {
          background: #1858bd;
          border-color: #1858bd;
          transform: translateY(-1px);
          box-shadow: 0 6px 18px rgba(31, 102, 214, 0.28);
        }

        .retail-btn-primary:disabled {
          opacity: 0.65;
          cursor: wait;
          transform: none;
          box-shadow: none;
        }

        .retail-step-item:focus-visible,
        .retail-btn-secondary:focus-visible,
        .retail-btn-primary:focus-visible,
        :global(.loan-dashboard-back:focus-visible) {
          outline: 3px solid rgba(23, 126, 122, 0.35);
          outline-offset: 2px;
        }

        /* Responsive Breakpoints */
        @media (max-width: 1024px) {
          .retail-grid.borrower-grid {
            grid-template-columns: repeat(4, minmax(0, 1fr));
            gap: 12px;
          }
        }

        @media (max-width: 820px) {
          :global(.loan-application-card) {
            padding: 18px;
          }

          .retail-grid.two-column,
          .retail-grid.three-column {
            grid-template-columns: 1fr;
          }

          .retail-grid.borrower-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .retail-stepper {
            gap: 6px;
            padding-bottom: 12px;
          }

          .retail-step-item {
            padding: 6px 10px;
            font-size: 11px;
          }

          .retail-step-circle {
            width: 24px;
            height: 24px;
            flex-basis: 24px;
            font-size: 10px;
          }

          .retail-section-header.with-action {
            flex-direction: column;
            align-items: stretch;
          }

          .retail-section-header.with-action .retail-btn-secondary {
            align-self: flex-start;
          }
        }

        @media (max-width: 540px) {
          :global(.loan-application-card) {
            padding: 14px 12px;
          }

          .retail-section-card {
            padding: 14px 14px 12px;
          }

          .retail-grid.borrower-grid {
            grid-template-columns: 1fr;
          }

          .retail-step-heading {
            font-size: 20px;
          }

          .retail-form-actions {
            flex-direction: column-reverse;
            align-items: stretch;
            gap: 12px;
          }

          .retail-actions-group {
            width: 100%;
            justify-content: space-between;
          }

          .retail-actions-group .retail-btn-secondary,
          .retail-actions-group .retail-btn-primary {
            flex: 1;
            min-width: 0;
          }
        }
      `}</style>
    </AppShell>
  );
}
