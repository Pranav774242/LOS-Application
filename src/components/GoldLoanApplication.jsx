'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Banknote, CheckCircle2, FilePlus2, ArrowLeft, ArrowRight, Check, Plus, Trash2, Eye, Pencil, X } from 'lucide-react';
import AppShell from './AppShell';
import Card from './Card';
import PageHeader from './PageHeader';
import LeadDatePicker from './LeadDatePicker';
import { getLoanProducts } from '../services/loanProducts';

const currencyFormatter = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 2,
});
export const GOLD_LOAN_STORAGE_KEY = 'los.goldLoanApplications';

function getLimitTotal(inventoryItems) {
  const total = inventoryItems.reduce((sum, item) => {
    const text = String(item.limit ?? '').trim();
    const value = Number(text);
    return text && Number.isFinite(value) && value > 0 ? sum + value : sum;
  }, 0);
  return total > 0 ? String(Math.round(total * 100) / 100) : '';
}

export function isGoldLoanApplication(application) {
  return String(application.product || application.loanType || '').trim().toLowerCase() === 'gold loan';
}

export function readSavedGoldLoanApplications() {
  const savedApplications = window.localStorage.getItem(GOLD_LOAN_STORAGE_KEY);
  if (!savedApplications) return [];

  const parsedApplications = JSON.parse(savedApplications);
  if (!Array.isArray(parsedApplications)) {
    throw new Error('Saved Gold Loan applications have an invalid format.');
  }

  return parsedApplications;
}

export function persistGoldLoanApplication(application) {
  const savedApplications = readSavedGoldLoanApplications().filter(
    (saved) => getApplicationId(saved) !== getApplicationId(application),
  );
  window.localStorage.setItem(
    GOLD_LOAN_STORAGE_KEY,
    JSON.stringify([...savedApplications, application]),
  );
}

export function createApplicationForm(application) {
  const savedForm = application.goldLoanForm
    && typeof application.goldLoanForm === 'object'
    && !Array.isArray(application.goldLoanForm)
    ? application.goldLoanForm
    : {};
  const initialForm = createInitialForm();
  const borrowerName = getCustomerName(application);
  const nameParts = borrowerName === 'Not available' ? [] : borrowerName.trim().split(/\s+/);
  const savedSecurity = savedForm.security && typeof savedForm.security === 'object'
    ? savedForm.security
    : {};
  const applicationSecurity = application.security && typeof application.security === 'object'
    ? application.security
    : {};
  const savedCharges = savedForm.charges && typeof savedForm.charges === 'object'
    ? savedForm.charges
    : {};
  const applicationCharges = application.charges && typeof application.charges === 'object'
    ? application.charges
    : {};
  const savedBasicDetails = savedForm.basicDetails && typeof savedForm.basicDetails === 'object'
    ? savedForm.basicDetails
    : {};
  const applicationBasicDetails = application.basicDetails && typeof application.basicDetails === 'object'
    ? application.basicDetails
    : {};
  const savedDisbursement = savedForm.disbursement && typeof savedForm.disbursement === 'object'
    ? savedForm.disbursement
    : {};
  const applicationDisbursement = application.disbursement && typeof application.disbursement === 'object'
    ? application.disbursement
    : {};
  const savedRelatedParties = Array.isArray(savedForm.relatedParties)
    ? savedForm.relatedParties
    : Array.isArray(application.relatedParties)
      ? application.relatedParties
      : initialForm.relatedParties;
  const relatedParties = savedRelatedParties.map((party, index) => ({
    ...initialForm.relatedParties[0],
    ...(party && typeof party === 'object' ? party : {}),
    id: party?.id || `party-${index + 1}`,
  }));
  const savedInventoryItems = Array.isArray(savedSecurity.inventoryItems)
    ? savedSecurity.inventoryItems
    : Array.isArray(applicationSecurity.inventoryItems)
      ? applicationSecurity.inventoryItems
      : initialForm.security.inventoryItems;
  const inventoryItems = (savedInventoryItems.length ? savedInventoryItems : initialForm.security.inventoryItems)
    .map((item, index) => ({
      ...initialForm.security.inventoryItems[index],
      ...(item && typeof item === 'object' ? item : {}),
      id: item?.id || `inventory-${index + 1}`,
    }))
    .filter((item) => Object.entries(item)
      .some(([field, value]) => field !== 'id' && String(value ?? '').trim()));
  if (inventoryItems.length === 0) {
    inventoryItems.push(...initialForm.security.inventoryItems);
  }
  const limitTotal = getLimitTotal(inventoryItems);
  const sanctionLimit = limitTotal;
  const tenureMonths = savedForm.tenureMonths || application.tenureMonths || '';
  const nestedFields = new Set(['relatedParties', 'charges', 'basicDetails', 'security', 'disbursement']);
  const applicationFields = Object.fromEntries(
    Object.keys(initialForm)
      .filter((field) => {
        const value = application[field];
        return !nestedFields.has(field)
          && value !== undefined
          && value !== null
          && !(typeof value === 'string' && !value.trim());
      })
      .map((field) => [field, application[field]]),
  );

  return {
    ...initialForm,
    ...applicationFields,
    ...savedForm,
    customerId: savedForm.customerId || application.customerId || '',
    branch: savedForm.branch || application.branch || '',
    firstName: savedForm.firstName || application.firstName || nameParts[0] || '',
    lastName: savedForm.lastName || application.lastName
      || (nameParts.length > 1 ? nameParts.slice(1).join(' ') : ''),
    sanctionLimit,
    relatedParties,
    charges: {
      ...initialForm.charges,
      ...applicationCharges,
      ...savedCharges,
      sanctionLimit,
      tenureMonths,
    },
    basicDetails: { ...initialForm.basicDetails, ...applicationBasicDetails, ...savedBasicDetails },
    security: {
      ...initialForm.security,
      ...applicationSecurity,
      ...savedSecurity,
      limitAvailable: limitTotal,
      inventoryItems,
    },
    disbursement: {
      ...initialForm.disbursement,
      ...applicationDisbursement,
      ...savedDisbursement,
    },
  };
}

export function getApplicationId(application) {
  return application.id || application.applicationId || 'Not available';
}

export function getCustomerName(application) {
  if (!application) return 'Not available';
  const form = application.goldLoanForm || application.retailLoanForm || {};
  const borrower = application.borrower || application.customerDetails || {};

  let title = form.title || borrower.title || application.title || '';
  let firstName = form.firstName || borrower.firstName || application.firstName || '';
  let lastName = form.lastName || borrower.lastName || application.lastName || '';

  if (!firstName && (application.customer || application.customerName || borrower.fullName || borrower.name)) {
    const rawName = (application.customer || application.customerName || borrower.fullName || borrower.name || '').trim();
    const parts = rawName.split(/\s+/);
    if (/^(mr|mrs|ms|dr|miss|shri|smt)\.?$/i.test(parts[0])) {
      if (!title) title = parts[0];
      firstName = parts[1] || '';
      lastName = parts.slice(2).join(' ') || '';
    } else {
      firstName = parts[0] || '';
      lastName = parts.slice(1).join(' ') || '';
    }
  }

  let formattedTitle = title ? title.trim() : '';
  if (/^(mr|mrs|ms|dr)$/i.test(formattedTitle)) {
    formattedTitle = `${formattedTitle.charAt(0).toUpperCase()}${formattedTitle.slice(1).toLowerCase()}.`;
  }

  const combined = [formattedTitle, firstName, lastName].filter(Boolean).join(' ').trim();
  if (combined) return combined;

  return (
    application.customer ||
    application.customerName ||
    borrower.fullName ||
    borrower.name ||
    'Not available'
  );
}

export function getCustomerCategory(application, customers) {
  const customer = customers.find(
    (record) => record.id === application.customerId,
  );
  const category =
    application.customerCategory ||
    application.category ||
    customer?.type ||
    '';
  const normalizedCategory = String(category).trim().toLowerCase();

  if (
    ['retail', 'individual', 'person'].some((value) =>
      normalizedCategory.includes(value),
    )
  ) {
    return 'Retail';
  }

  if (
    ['corporate', 'company', 'business', 'proprietorship', 'partnership'].some(
      (value) => normalizedCategory.includes(value),
    )
  ) {
    return 'Corporate';
  }

  return 'Not specified';
}

export function getStatusLabel(status) {
  const normalizedStatus = String(status || '').trim().toLowerCase();
  const knownStatuses = {
    approved: 'Approved',
    disbursed: 'Disbursed',
    rejected: 'Rejected',
    pending: 'Pending',
    draft: 'Pending',
    'in review': 'Under Review',
    'under review': 'Under Review',
    'awaiting kyc': 'Awaiting KYC',
    returned: 'Returned',
  };

  return knownStatuses[normalizedStatus] || status || 'Not available';
}

export function formatAmount(amount) {
  if (typeof amount === 'number' && Number.isFinite(amount)) {
    return currencyFormatter.format(amount);
  }

  if (typeof amount !== 'string') return 'Not available';

  const numericAmount = Number(amount.replace(/[^\d.-]/g, ''));
  return Number.isFinite(numericAmount) && amount.trim()
    ? currencyFormatter.format(numericAmount)
    : 'Not available';
}

export function formatApplicationDate(date) {
  if (!date) return 'Not available';

  const parsedDate = new Date(date);
  if (Number.isNaN(parsedDate.getTime())) return 'Not available';

  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(parsedDate);
}

export function getStatusClass(status) {
  return getStatusLabel(status).toLowerCase().replace(/\s+/g, '-');
}


const steps = [
  'Borrower Details',
  'Security Details',
  'Loan Details',
  'Charges & Fees',
  'Basic Details',
  'Related Party',
  'Disbursement',
];

const borrowerNamePattern = /^[\p{L}\p{M}]+(?:[ '-][\p{L}\p{M}]+)*$/u;
const nameInputPattern = /^[\p{L}\p{M} '-]*$/u;
const codeInputPattern = /^[A-Za-z0-9_-]*$/;
const nameError = 'Use letters only. Spaces, apostrophes, and hyphens are allowed.';
const MIN_TEXT_LENGTH = 3;
const MAX_TEXT_LENGTH = 125;
const MAX_NAME_LENGTH = 50;
const MAX_DESCRIPTION_LENGTH = 50;
const MIN_BANK_ACCOUNT_LENGTH = 9;
const MAX_BANK_ACCOUNT_LENGTH = 18;

const createInitialForm = () => ({
  loanAccountNumber: '',
  effectiveDate: '',
  customerId: '',
  branch: '',
  title: '',
  firstName: '',
  middleName: '',
  lastName: '',
  accountStatus: '',
  productCode: '',
  productName: '',
  schemeCode: '',
  schemeDescription: '',
  modeOfOperation: '',
  lastTransactionDate: '',
  relatedParties: Array.from({ length: 1 }, (_, index) => ({
    id: `party-${index + 1}`,
    nameType: '',
    customerNo: '',
    salutation: '',
    firstName: '',
    middleName: '',
    lastName: '',
  })),
  sanctionLimit: '',
  interestRate: '',
  instalments: '',
  emi: '',
  expiryDate: '',
  customerSourced: '',
  interestPayment: '',
  instalmentAmount: '',
  tenureMonths: '',
  sanctionAuthority: '',
  sanctionedDate: '',
  repaymentType: '',
  repaymentStartDate: '',
  accountClosure: '',
  charges: {
    sanctionLimit: '',
    processingFees: '',
    penalInterestPercent: '',
    tenureMonths: '',
    valuationCharges: '',
  },
  basicDetails: {
    purposeLoan: '',
    sectorCode: '',
    womenSector: '',
    termCode: '',
    subSectorCode: '',
  },
  security: {
    securityId: '',
    securityType: '',
    valuerCode: '',
    valuerDescription: '',
    marginPercent: '',
    limitAvailable: '',
    inventoryItems: Array.from({ length: 1 }, (_, index) => ({
      id: `inventory-${index + 1}`,
      itemId: '',
      ornamentDescription: '',
      grossWeight: '',
      netWeight: '',
      appraisalDate: '',
      purity: '',
      rate: '',
      amount: '',
      limit: '',
    })),
  },
  disbursement: {
    accountNumber: '',
    accountType: '',
    bankName: '',
    ifscCode: '',
    mode: '',
    type: '',
    amount: '',
    mobileNumber: '',
  },
});

const isValidDate = (value) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value || '')) return false;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return date.getFullYear() === year
    && date.getMonth() === month - 1
    && date.getDate() === day;
};

function validateTextLength(
  key,
  value,
  label,
  errors,
  required = true,
  minLength = MIN_TEXT_LENGTH,
  maxLength = MAX_TEXT_LENGTH,
) {
  const text = String(value ?? '').trim();
  if (!text) {
    if (required) errors[key] = `${label} is required.`;
    return;
  }
  if (text.length < minLength || text.length > maxLength) {
    errors[key] = `${label} must be between ${minLength} and ${maxLength} characters.`;
  }
}

function validateName(key, value, label, errors, required = true, maxLength = MAX_TEXT_LENGTH) {
  const text = String(value ?? '').trim();
  if (!text) {
    if (required) errors[key] = `${label} is required.`;
    return;
  }
  if (text.length < MIN_TEXT_LENGTH || text.length > maxLength) {
    errors[key] = `${label} must be between ${MIN_TEXT_LENGTH} and ${maxLength} characters.`;
    return;
  }
  if (!borrowerNamePattern.test(text)) {
    errors[key] = nameError;
  }
}

function validateDate(key, value, label, errors, required = false) {
  if (!String(value ?? '').trim()) {
    if (required) errors[key] = `${label} is required.`;
  } else if (!isValidDate(value)) {
    errors[key] = `Enter a valid ${label.toLowerCase()}.`;
  }
}

function validateNumber(key, value, label, errors, { required = false, positive = false } = {}) {
  if (!String(value ?? '').trim()) {
    if (required) errors[key] = `${label} is required.`;
    return;
  }
  const text = String(value).trim();
  const number = Number(text);
  if (!/^(?:\d+(?:\.\d*)?|\.\d+)$/.test(text)
    || !Number.isFinite(number)
    || number < 0
    || (positive && number === 0)) {
    errors[key] = `${label} must be a ${positive ? 'positive' : 'non-negative'} number.`;
  }
}

function validateCode(key, value, label, errors, required = false) {
  const text = String(value ?? '').trim();
  if (!text) {
    if (required) errors[key] = `${label} is required.`;
    return;
  }
  if (text.length < MIN_TEXT_LENGTH || text.length > 30 || !/^[A-Za-z0-9_-]+$/.test(text)) {
    errors[key] = `${label} must be 3–30 characters and contain only letters, numbers, hyphens, or underscores.`;
  }
}

function validateIdentifier(key, value, label, errors, required = true) {
  const text = String(value ?? '').trim();
  if (!text) {
    if (required) errors[key] = `${label} is required.`;
    return;
  }
  if (text.length < MIN_TEXT_LENGTH || text.length > MAX_TEXT_LENGTH) {
    errors[key] = `${label} must be between ${MIN_TEXT_LENGTH} and ${MAX_TEXT_LENGTH} characters.`;
    return;
  }
  if (!/^[A-Za-z0-9_-]+$/.test(text)) {
    errors[key] = `${label} can contain only letters, numbers, hyphens, and underscores.`;
  }
}

function validatePercentage(key, value, label, errors, required = false) {
  validateNumber(key, value, label, errors, { required });
  if (String(value ?? '').trim()) {
    const number = Number(value);
    if (Number.isFinite(number) && (number < 0 || number > 100)) {
      errors[key] = `${label} must be between 0 and 100%.`;
    }
  }
}

function validateWholeNumber(key, value, label, errors, { required = false, min = 0, max = Number.MAX_SAFE_INTEGER } = {}) {
  if (!String(value ?? '').trim()) {
    if (required) errors[key] = `${label} is required.`;
    return;
  }
  const text = String(value).trim();
  const number = Number(text);
  if (!/^\d+$/.test(text) || !Number.isSafeInteger(number) || number < min || number > max) {
    errors[key] = `${label} must be a whole number between ${min} and ${max}.`;
  }
}

function validateInventoryItem(item, index) {
  const errors = {};
  const prefix = `security.inventoryItems.${index}.`;
  validateIdentifier(`${prefix}itemId`, item.itemId, 'Inventory item ID', errors);
  validateTextLength(`${prefix}ornamentDescription`, item.ornamentDescription, 'Ornament description', errors, true, MIN_TEXT_LENGTH, MAX_DESCRIPTION_LENGTH);
  validateNumber(`${prefix}grossWeight`, item.grossWeight, 'Gross weight', errors, { required: true, positive: true });
  validateNumber(`${prefix}netWeight`, item.netWeight, 'Net weight', errors, { required: true, positive: true });
  validateDate(`${prefix}appraisalDate`, item.appraisalDate, 'Appraisal date', errors, true);
  if (!['18K', '22K', '24K'].includes(item.purity)) {
    errors[`${prefix}purity`] = 'Select 18K, 22K, or 24K purity.';
  }
  validateNumber(`${prefix}rate`, item.rate, 'Rate', errors, { required: true, positive: true });
  validateNumber(`${prefix}amount`, item.amount, 'Amount', errors, { required: true, positive: true });
  validateNumber(`${prefix}limit`, item.limit, 'Limit', errors, { required: true, positive: true });
  if (
    String(item.grossWeight ?? '').trim()
    && String(item.netWeight ?? '').trim()
    && Number(item.netWeight) > Number(item.grossWeight)
  ) {
    errors[`${prefix}netWeight`] = 'Net weight cannot exceed gross weight.';
  }
  if (
    String(item.amount ?? '').trim()
    && String(item.limit ?? '').trim()
    && Number(item.limit) > Number(item.amount)
  ) {
    errors[`${prefix}limit`] = 'Item limit cannot exceed the assessed amount.';
  }
  return errors;
}

function validateSecurity(values) {
  const errors = {};
  const security = values.security;
  const key = (field) => `security.${field}`;

  validateCode(key('securityId'), security.securityId, 'Security ID', errors, true);
  validateCode(key('valuerCode'), security.valuerCode, 'Valuer code', errors, true);
  validateTextLength(key('valuerDescription'), security.valuerDescription, 'Valuer description', errors);
  validatePercentage(key('marginPercent'), security.marginPercent, 'Margin', errors, true);
  validateNumber(key('limitAvailable'), security.limitAvailable, 'Limit available for sanction', errors, {
    required: true,
    positive: true,
  });

  const filledItems = security.inventoryItems
    .map((item, index) => ({ item, index }))
    .filter(({ item }) => Object.entries(item)
      .some(([field, value]) => field !== 'id' && String(value ?? '').trim()));

  if (filledItems.length === 0) {
    errors['security.inventoryItems'] = 'Enter at least one gold item.';
  }

  security.inventoryItems.forEach((item, index) => {
    Object.assign(errors, validateInventoryItem(item, index));
  });
  return errors;
}

function getBankAccountNumberError(value) {
  const accountNumber = String(value ?? '');
  if (!accountNumber) return 'Account number is required.';
  if (/\p{L}/u.test(accountNumber)) return 'Only numeric values are allowed.';
  if (!/^\d+$/.test(accountNumber)) return 'Special characters are not allowed.';
  if (accountNumber.length < MIN_BANK_ACCOUNT_LENGTH) {
    return 'Account number must contain at least 9 digits.';
  }
  if (accountNumber.length > MAX_BANK_ACCOUNT_LENGTH) {
    return 'Account number cannot exceed 18 digits.';
  }
  return '';
}

function validateStep(stepIndex, values) {
  const errors = {};

  if (stepIndex === 0) {
    validateIdentifier('loanAccountNumber', values.loanAccountNumber, 'Loan account number', errors);
    validateDate('effectiveDate', values.effectiveDate, 'Effective date', errors, true);
    validateIdentifier('customerId', values.customerId, 'Customer ID', errors);
    if (!String(values.title ?? '').trim()) errors.title = 'Title is required.';
    validateName('firstName', values.firstName, 'First name', errors, true, MAX_NAME_LENGTH);
    validateName('middleName', values.middleName, 'Middle name', errors, false, MAX_NAME_LENGTH);
    validateName('lastName', values.lastName, 'Last name', errors, true, MAX_NAME_LENGTH);
    validateIdentifier('productCode', values.productCode, 'Product code', errors);
    validateTextLength('productName', values.productName, 'Product description', errors, true, MIN_TEXT_LENGTH, MAX_DESCRIPTION_LENGTH);
    validateCode('schemeCode', values.schemeCode, 'Scheme code', errors, true);
    validateTextLength('schemeDescription', values.schemeDescription, 'Scheme description', errors, true, MIN_TEXT_LENGTH, MAX_DESCRIPTION_LENGTH);
    validateDate('lastTransactionDate', values.lastTransactionDate, 'Last transaction date', errors);
    if (values.lastTransactionDate && isValidDate(values.effectiveDate)
      && isValidDate(values.lastTransactionDate) && values.lastTransactionDate < values.effectiveDate) {
      errors.lastTransactionDate = 'Last transaction date cannot precede the effective date.';
    }
    if (!String(values.accountStatus ?? '').trim()) errors.accountStatus = 'Account status is required.';
    if (!String(values.modeOfOperation ?? '').trim()) {
      errors.modeOfOperation = 'Mode of operation is required.';
    }
  }

  if (stepIndex === 1) {
    Object.assign(errors, validateSecurity(values));
  }

  if (stepIndex === 2) {
    validateNumber('sanctionLimit', values.sanctionLimit, 'Sanction limit', errors, { required: true, positive: true });
    validatePercentage('interestRate', values.interestRate, 'Interest rate', errors, true);
    const tenureMaximum = /^\d+$/.test(String(values.tenureMonths ?? ''))
      ? Math.min(600, Number(values.tenureMonths))
      : 600;
    validateWholeNumber('instalments', values.instalments, 'Number of instalments', errors, {
      required: true,
      min: 1,
      max: tenureMaximum,
    });
    if (String(values.instalments ?? '').trim()
      && String(values.tenureMonths ?? '').trim()
      && Number(values.instalments) > Number(values.tenureMonths)) {
      errors.instalments = 'Number of instalments cannot exceed the selected tenure.';
    }
    if (!String(values.emi ?? '').trim()) errors.emi = 'Select Yes or No for EMI.';
    validateDate('sanctionedDate', values.sanctionedDate, 'Sanctioned date', errors, true);
    if (isValidDate(values.effectiveDate) && isValidDate(values.sanctionedDate)
      && values.sanctionedDate < values.effectiveDate) {
      errors.sanctionedDate = 'Sanctioned date cannot precede the effective date.';
    }
    validateWholeNumber('tenureMonths', values.tenureMonths, 'Tenure', errors, { required: true, min: 1, max: 600 });
    validateName('sanctionAuthority', values.sanctionAuthority, 'Sanction authority', errors, true, MAX_NAME_LENGTH);
    validateNumber('instalmentAmount', values.instalmentAmount, 'Instalment amount', errors, { required: true, positive: true });
    validateDate('expiryDate', values.expiryDate, 'Expiry date', errors, true);
    validateDate('repaymentStartDate', values.repaymentStartDate, 'Repayment start date', errors, true);
    if (!['Walkin', 'Lead by staff', 'Referred by Customer'].includes(values.customerSourced)) {
      errors.customerSourced = 'Select how the customer was sourced.';
    }
    if (!['Maturity', 'Monthly', 'Quarterly', 'Half Yearly'].includes(values.interestPayment)) {
      errors.interestPayment = 'Select an interest payment frequency.';
    }
    if (!['EMI', 'Bullet', 'Partial'].includes(values.repaymentType)) {
      errors.repaymentType = 'Select a repayment type.';
    }
    if (!['Yes', 'No'].includes(values.accountClosure)) {
      errors.accountClosure = 'Select Yes or No for account closure.';
    }
    if (isValidDate(values.sanctionedDate) && isValidDate(values.expiryDate)
      && values.expiryDate <= values.sanctionedDate) {
      errors.expiryDate = 'Expiry date must be after the sanctioned date.';
    }
    if (isValidDate(values.sanctionedDate) && isValidDate(values.repaymentStartDate)
      && values.repaymentStartDate < values.sanctionedDate) {
      errors.repaymentStartDate = 'Repayment start date cannot precede the sanctioned date.';
    }
    if (isValidDate(values.expiryDate) && isValidDate(values.repaymentStartDate)
      && values.repaymentStartDate > values.expiryDate) {
      errors.repaymentStartDate = 'Repayment start date cannot be after the expiry date.';
    }
  }

  if (stepIndex === 3) {
    const charges = values.charges;
    validateNumber('charges.sanctionLimit', charges.sanctionLimit, 'Sanction limit', errors, { required: true, positive: true });
    validateNumber('charges.processingFees', charges.processingFees, 'Processing fees', errors, { required: true });
    validatePercentage('charges.penalInterestPercent', charges.penalInterestPercent, 'Penal interest', errors, true);
    validateWholeNumber('charges.tenureMonths', charges.tenureMonths, 'Tenure', errors, { required: true, min: 1, max: 600 });
    validateNumber('charges.valuationCharges', charges.valuationCharges, 'Valuation charges', errors, { required: true });
  }

  if (stepIndex === 4) {
    const basic = values.basicDetails;
    for (const field of ['sectorCode', 'termCode', 'subSectorCode']) {
      validateCode(`basicDetails.${field}`, basic[field], field.replace(/([A-Z])/g, ' $1').toLowerCase(), errors, true);
    }
    if (!['Yes', 'No'].includes(basic.womenSector)) {
      errors['basicDetails.womenSector'] = 'Select Yes or No for women sector.';
    }
  }

  if (stepIndex === 5) {
    values.relatedParties.forEach((party) => {
      const hasPartyData = Object.entries(party)
        .some(([field, value]) => field !== 'id' && String(value ?? '').trim());
      if (!hasPartyData) return;
      const prefix = `relatedParties.${party.id}.`;
      if (!String(party.nameType ?? '').trim()) errors[`${prefix}nameType`] = 'Name type is required.';
      validateIdentifier(`${prefix}customerNo`, party.customerNo, 'Customer number', errors);
      if (!String(party.salutation ?? '').trim()) errors[`${prefix}salutation`] = 'Salutation is required.';
      validateName(`${prefix}firstName`, party.firstName, 'First name', errors, true, MAX_NAME_LENGTH);
      validateName(`${prefix}middleName`, party.middleName, 'Middle name', errors, false, MAX_NAME_LENGTH);
      validateName(`${prefix}lastName`, party.lastName, 'Last name', errors, true, MAX_NAME_LENGTH);
    });
  }

  if (stepIndex === 6) {
    const disbursement = values.disbursement;
    const accountNumberError = getBankAccountNumberError(disbursement.accountNumber);
    if (accountNumberError) errors['disbursement.accountNumber'] = accountNumberError;
    validateTextLength('disbursement.bankName', disbursement.bankName, 'Bank name', errors, true, MIN_TEXT_LENGTH, MAX_NAME_LENGTH);
    if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(String(disbursement.ifscCode ?? '').trim().toUpperCase())) {
      errors['disbursement.ifscCode'] = 'Enter a valid 11-character IFSC code.';
    }
    if (!['Internal Transfer', 'NEFT', 'RTGS', 'IMPS', 'Pay Check'].includes(disbursement.mode)) {
      errors['disbursement.mode'] = 'Select a mode of disbursement.';
    }
    if (!['Full', 'Partial'].includes(disbursement.type)) {
      errors['disbursement.type'] = 'Select Full or Partial disbursement.';
    }
    validateNumber('disbursement.amount', disbursement.amount, 'Disbursement amount', errors, { required: true, positive: true });
    if (!/^[6-9]\d{9}$/.test(String(disbursement.mobileNumber ?? '').trim())) {
      errors['disbursement.mobileNumber'] = 'Enter a valid 10-digit Indian mobile number.';
    }
    if (String(disbursement.amount ?? '').trim() && String(values.sanctionLimit ?? '').trim()
      && Number(disbursement.amount) > Number(values.sanctionLimit)) {
      errors['disbursement.amount'] = 'Disbursement amount cannot exceed the sanction limit.';
    }
    if (
      disbursement.type === 'Full'
      && String(disbursement.amount ?? '').trim()
      && String(values.sanctionLimit ?? '').trim()
      && Number(disbursement.amount) !== Number(values.sanctionLimit)
    ) {
      errors['disbursement.amount'] = 'Full disbursement amount must equal the sanction limit.';
    }
  }

  return errors;
}

function LoanField({
  id,
  label,
  value,
  onChange,
  error,
  type = 'text',
  required = false,
  options,
  placeholder,
  list,
  min,
  max,
  maxLength,
  step,
  readOnly = false,
  strictName = false,
  onInvalidNameInput,
  strictCode = false,
  onInvalidCodeInput,
  numericOnly = false,
  onInvalidNumericInput,
  onInvalidLengthInput,
  showRequiredOnBlur = true,
}) {
  const [showTouchedRequiredError, setShowTouchedRequiredError] = useState(false);
  const displayedError = error || (
    showTouchedRequiredError && required && !String(value ?? '').trim()
      ? `${label} is required.`
      : ''
  );
  const handleValueChange = (nextValue) => {
    setShowTouchedRequiredError(false);
    onChange(nextValue);
  };
  const handleChange = (event) => {
    const nextValue = event.target.value;
    if (numericOnly && !/^\d*$/.test(nextValue)) {
      onInvalidNumericInput?.(nextValue);
      return;
    }
    if (strictName && !nameInputPattern.test(nextValue)) {
      onInvalidNameInput?.();
      return;
    }
    if (strictCode && (!codeInputPattern.test(nextValue) || (maxLength && nextValue.length > maxLength))) {
      onInvalidCodeInput?.();
      return;
    }
    if (maxLength && nextValue.length > maxLength) {
      onInvalidLengthInput?.();
      return;
    }
    handleValueChange(nextValue);
  };

  const handleBeforeInput = (event) => {
    if (
      (!strictName && !strictCode && !numericOnly && !maxLength)
      || !event.nativeEvent.inputType?.startsWith('insert')
    ) return;
    const inserted = event.nativeEvent.data;
    if (inserted == null) return;
    const input = event.currentTarget;
    const nextValue = value.slice(0, input.selectionStart)
      + inserted
      + value.slice(input.selectionEnd);
    if (numericOnly && !/^\d+$/.test(inserted)) {
      event.preventDefault();
      onInvalidNumericInput?.(inserted);
      return;
    }
    if (maxLength && nextValue.length > maxLength) {
      event.preventDefault();
      onInvalidLengthInput?.();
      return;
    }
    if (
      strictName
      && !nameInputPattern.test(nextValue)
    ) {
      event.preventDefault();
      onInvalidNameInput?.();
    }
    if (strictCode && (!codeInputPattern.test(nextValue) || (maxLength && nextValue.length > maxLength))) {
      event.preventDefault();
      onInvalidCodeInput?.();
    }
  };

  const handlePaste = (event) => {
    const pasted = event.clipboardData.getData('text');
    const input = event.currentTarget;
    const nextValue = value.slice(0, input.selectionStart)
      + pasted
      + value.slice(input.selectionEnd);
    if (numericOnly && !/^\d*$/.test(pasted)) {
      event.preventDefault();
      onInvalidNumericInput?.(pasted);
      return;
    }
    if (maxLength && nextValue.length > maxLength) {
      event.preventDefault();
      onInvalidLengthInput?.();
      return;
    }
    if (
      strictName
      && !nameInputPattern.test(nextValue)
    ) {
      event.preventDefault();
      onInvalidNameInput?.();
    }
    if (strictCode && (!codeInputPattern.test(nextValue) || (maxLength && nextValue.length > maxLength))) {
      event.preventDefault();
      onInvalidCodeInput?.();
    }
  };
  const handleBlur = (event) => {
    if (showRequiredOnBlur
      && !event.currentTarget.contains(event.relatedTarget)
      && required
      && !String(value ?? '').trim()) {
      setShowTouchedRequiredError(true);
    }
  };

  return (
    <label className="loan-field" htmlFor={id} onBlurCapture={handleBlur}>
      <span>{label}{required ? <> <em>*</em></> : ''}</span>
      {options ? (
        <select
          id={id}
          value={value}
          onChange={(event) => handleValueChange(event.target.value)}
          aria-invalid={Boolean(displayedError)}
          aria-describedby={displayedError ? `${id}-error` : undefined}
          required={required}
        >
          <option value="">{placeholder || `Select ${label.toLowerCase()}`}</option>
          {options.map((option) => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </select>
      ) : type === 'date' ? (
        <LeadDatePicker
          id={id}
          label={label}
          value={value}
          onChange={handleValueChange}
          required={required}
          invalid={Boolean(displayedError)}
        />
      ) : (
        <input
          id={id}
          type={type}
          value={value}
          onChange={handleChange}
          onBeforeInput={handleBeforeInput}
          onPaste={handlePaste}
          placeholder={placeholder}
          list={list}
          min={min}
          max={max}
          maxLength={maxLength}
          step={step}
          readOnly={readOnly}
          inputMode={numericOnly ? 'numeric' : type === 'number' ? 'decimal' : undefined}
          onKeyDown={type === 'number' ? (event) => {
            if (['e', 'E', '+', '-'].includes(event.key)) event.preventDefault();
          } : undefined}
          aria-invalid={Boolean(displayedError)}
          aria-describedby={displayedError ? `${id}-error` : undefined}
          required={required}
        />
      )}
      {displayedError && <span className="field-error" id={`${id}-error`} role="alert">{displayedError}</span>}
    </label>
  );
}

const titles = ['Mr', 'Ms', 'Mrs', 'Dr', 'Other'].map((value) => ({ value, label: value }));
const nameTypes = ['Co-applicant', 'Guarantor', 'Reference', 'Other'].map((value) => ({ value, label: value }));
const modesOfOperation = [
  'Single',
  'Joint',
  'Either or Survivor',
  'Anyone or Survivor',
  'Former or Survivor',
  'Other',
].map((value) => ({ value, label: value }));
const yesNoOptions = ['Yes', 'No'].map((value) => ({ value, label: value }));
const loanPurposeOptions = [
  'Home purchase',
  'Home renovation',
  'Medical expenses',
  'Education',
  'Business expansion',
  'Debt consolidation',
  'Vehicle purchase',
  'Other',
].map((value) => ({ value, label: value }));
const accountTypeOptions = ['Savings Account', 'Current Account']
  .map((value) => ({ value, label: value }));
const securityTypeOptions = ['Gold Jewellery', 'Gold Coins', 'Gold Bars']
  .map((value) => ({ value, label: value }));

const goldLoanDetailLabels = {
  loanAccountNumber: 'Loan Account Number',
  effectiveDate: 'Effective Date',
  accountStatus: 'Account Status',
  lastTransactionDate: 'Last Transaction Date',
  customerId: 'Customer ID',
  title: 'Title',
  firstName: 'First Name',
  middleName: 'Middle Name',
  lastName: 'Last Name',
  productCode: 'Product Code',
  productName: 'Product Description',
  schemeCode: 'Scheme Code',
  schemeDescription: 'Scheme Description',
  modeOfOperation: 'Mode of Operation',
  sanctionLimit: 'Sanction Limit',
  tenureMonths: 'Tenure',
  interestRate: 'Interest Rate',
  sanctionAuthority: 'Sanction Authority',
  instalments: 'Number of Instalments',
  sanctionedDate: 'Sanctioned Date',
  emi: 'EMI',
  instalmentAmount: 'Instalment Amount',
  expiryDate: 'Expiry Date',
  repaymentType: 'Repayment Type',
  customerSourced: 'Customer Sourced',
  repaymentStartDate: 'Repayment Start Date',
  interestPayment: 'Interest Payment',
  accountClosure: 'Account Closure',
  securityId: 'Security ID',
  securityType: 'Security Type',
  valuerCode: 'Valuer Code',
  valuerDescription: 'Valuer Description',
  marginPercent: 'Margin',
  limitAvailable: 'Limit Available for Sanction',
  itemId: 'Inventory Item ID',
  ornamentDescription: 'Ornament Description',
  grossWeight: 'Gross Weight',
  netWeight: 'Net Weight',
  appraisalDate: 'Appraisal Date',
  purity: 'Assessed Purity',
  rate: 'Rate',
  amount: 'Amount',
  limit: 'Item Limit',
  processingFees: 'Processing Fees',
  penalInterestPercent: 'Penal Interest',
  valuationCharges: 'Valuation Charges',
  purposeLoan: 'Purpose of Loan',
  sectorCode: 'Sector Code',
  womenSector: 'Women Sector',
  termCode: 'Term Code',
  subSectorCode: 'Sub-Sector Code',
  accountNumber: 'Account Number',
  accountType: 'Type of Account',
  bankName: 'Bank Name',
  ifscCode: 'IFSC Code',
  mode: 'Mode of Disbursement',
  type: 'Disbursement Type',
  mobileNumber: 'Mobile Number',
};

function hasDetailValue(value) {
  if (typeof value === 'string') return value.trim() !== '';
  if (typeof value === 'number') return Number.isFinite(value);
  return typeof value === 'boolean';
}

function displayGoldLoanValue(value) {
  return hasDetailValue(value) ? String(value) : 'Not Provided';
}

function formatGoldLoanDetail(field, value) {
  if (!hasDetailValue(value)) return 'Not Provided';
  if (field.toLowerCase().includes('date')) return formatApplicationDate(value);
  if (
    ['sanctionLimit', 'instalmentAmount', 'limitAvailable', 'processingFees', 'valuationCharges', 'rate', 'amount', 'limit']
      .includes(field)
  ) {
    return formatAmount(value);
  }
  if (['interestRate', 'marginPercent', 'penalInterestPercent'].includes(field)) {
    return `${value}%`;
  }
  if (['grossWeight', 'netWeight'].includes(field)) return `${value} g`;
  if (field === 'tenureMonths') return `${value} months`;
  return String(value);
}

function getGoldLoanDetailEntries(values, fields) {
  return fields
    .map(([field, label]) => ({
      label: label || goldLoanDetailLabels[field] || field,
      value: formatGoldLoanDetail(field, values[field]),
    }));
}

function GoldLoanDetailSection({ title, entries, children }) {
  if (!entries.length && !children) return null;

  return (
    <section className="gold-view-section">
      <h2>{title}</h2>
      {entries.length > 0 && (
        <dl className="gold-view-detail-grid">
          {entries.map(({ label, value }) => (
            <div key={label}>
              <dt>{label}</dt>
              <dd>{value}</dd>
            </div>
          ))}
        </dl>
      )}
      {children}
    </section>
  );
}

export function GoldLoanApplicationView({
  application,
  onBack,
  backLabel = 'Loan Dashboard',
}) {
  const [activeTab, setActiveTab] = useState('overview');
  const form = createApplicationForm(application);
  const applicationId = getApplicationId(application);
  const customerName = getCustomerName(application) === 'Not available'
    ? [form.firstName, form.middleName, form.lastName].filter(Boolean).join(' ')
    : getCustomerName(application);
  const loanType = application.product || application.loanType || 'Gold Loan';
  const loanAmount = formatAmount(form.sanctionLimit || application.amount);
  const populatedParties = form.relatedParties.filter((party) => (
    Object.entries(party).some(([field, value]) => field !== 'id' && hasDetailValue(value))
  ));
  const populatedInventory = form.security.inventoryItems.filter((item) => (
    Object.entries(item).some(([field, value]) => field !== 'id' && hasDetailValue(value))
  ));
  const applicationInfo = getGoldLoanDetailEntries({
    loanAccountNumber: form.loanAccountNumber,
    effectiveDate: form.effectiveDate,
    accountStatus: form.accountStatus,
    lastTransactionDate: form.lastTransactionDate,
  }, [
    ['loanAccountNumber'],
    ['effectiveDate'],
    ['accountStatus'],
    ['lastTransactionDate'],
  ]);
  const overviewDetails = [
    { label: 'Application ID', value: applicationId },
    { label: 'Customer', value: customerName },
    ...getGoldLoanDetailEntries(form, [['customerId']]),
    { label: 'Loan Amount', value: loanAmount },
    { label: 'Loan Type', value: loanType },
    ...applicationInfo.slice(0, 1),
    ...(hasDetailValue(application.branch) ? [{ label: 'Branch', value: application.branch }] : []),
    ...(hasDetailValue(application.status)
      ? [{ label: 'Current Status', value: getStatusLabel(application.status) }]
      : []),
    ...getGoldLoanDetailEntries(form, [
      ['productName'],
      ['schemeCode'],
      ['interestRate'],
      ['tenureMonths'],
    ]),
  ];
  const applicationInformation = [
    ...applicationInfo,
    ...(hasDetailValue(application.applicationDate || application.createdAt || application.date)
      ? [{
        label: 'Application Date',
        value: formatApplicationDate(application.applicationDate || application.createdAt || application.date),
      }]
      : []),
    ...(hasDetailValue(application.updated)
      ? [{ label: 'Last Updated', value: application.updated }]
      : []),
    ...(hasDetailValue(application.branch) ? [{ label: 'Branch', value: application.branch }] : []),
    ...(hasDetailValue(application.status)
      ? [{ label: 'Application Status', value: getStatusLabel(application.status) }]
      : []),
  ];
  const borrowerDetails = getGoldLoanDetailEntries(form, [
    ['customerId'],
    ['title'],
    ['firstName'],
    ['middleName'],
    ['lastName'],
  ]);
  const productDetails = getGoldLoanDetailEntries(form, [
    ['productCode'],
    ['productName'],
    ['schemeCode'],
    ['schemeDescription'],
    ['modeOfOperation'],
  ]);
  const securityDetails = getGoldLoanDetailEntries(form.security, [
    ['securityId'],
    ['securityType'],
    ['valuerCode'],
    ['valuerDescription'],
    ['marginPercent'],
    ['limitAvailable'],
  ]);
  const financialDetails = getGoldLoanDetailEntries(form, [
    ['sanctionLimit'],
    ['tenureMonths'],
    ['interestRate'],
    ['sanctionAuthority'],
    ['instalments'],
    ['sanctionedDate'],
    ['emi'],
    ['instalmentAmount'],
    ['expiryDate'],
    ['repaymentType'],
    ['customerSourced'],
    ['repaymentStartDate'],
    ['interestPayment'],
    ['accountClosure'],
  ]);
  const chargeDetails = getGoldLoanDetailEntries(form.charges, [
    ['sanctionLimit'],
    ['tenureMonths', 'Tenure'],
    ['processingFees'],
    ['valuationCharges'],
    ['penalInterestPercent'],
  ]);
  const basicDetails = getGoldLoanDetailEntries(form.basicDetails, [
    ['purposeLoan'],
    ['sectorCode'],
    ['womenSector'],
    ['termCode'],
    ['subSectorCode'],
  ]);
  const bankDetails = getGoldLoanDetailEntries(form.disbursement, [
    ['accountNumber'],
    ['accountType'],
    ['bankName'],
    ['ifscCode'],
    ['mode'],
    ['type'],
    ['amount', 'Disbursement Amount'],
    ['mobileNumber'],
  ]);
  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'borrower', label: 'Borrower Details' },
    { id: 'security', label: 'Security Details' },
    { id: 'loan', label: 'Loan Details' },
    { id: 'charges', label: 'Charges & Fees' },
    { id: 'basic', label: 'Basic Details' },
    { id: 'related', label: 'Related Party' },
    { id: 'disbursement', label: 'Disbursement' },
  ];
  useEffect(() => {
    setActiveTab('overview');
  }, [applicationId]);

  const handleTabKeyDown = (event) => {
    const currentIndex = tabs.findIndex((tab) => tab.id === activeTab);
    let targetIndex = currentIndex;
    if (event.key === 'ArrowRight') targetIndex = (currentIndex + 1) % tabs.length;
    else if (event.key === 'ArrowLeft') targetIndex = (currentIndex - 1 + tabs.length) % tabs.length;
    else if (event.key === 'Home') targetIndex = 0;
    else if (event.key === 'End') targetIndex = tabs.length - 1;
    else return;

    event.preventDefault();
    setActiveTab(tabs[targetIndex].id);
    event.currentTarget.parentElement
      ?.querySelectorAll('[role="tab"]')
      [targetIndex]?.focus();
  };

  return (
    <AppShell title={`View: ${getApplicationId(application)}`}>
      <div className="gold-view-page">
        <PageHeader
          title="View Gold Loan Application"
          description={`Application ID: ${getApplicationId(application)}`}
          action={(
            <button
              className="icon-button loan-dashboard-back"
              type="button"
              onClick={onBack}
              aria-label={`Back to ${backLabel}`}
              title={`Back to ${backLabel}`}
            >
              <ArrowLeft size={19} aria-hidden="true" />
            </button>
          )}
        />
        <Card className="gold-view-card">
          <div className="gold-view-summary" aria-label="Application summary">
            <div className="gold-view-summary-item gold-view-summary-customer">
              <span>Customer</span><strong>{customerName || 'Not provided'}</strong>
            </div>
            <div className="gold-view-summary-item gold-view-summary-amount">
              <span>Loan Amount</span><strong>{loanAmount}</strong>
            </div>
            <div className="gold-view-summary-item">
              <span>Loan Type</span><strong>{loanType}</strong>
            </div>
            <div className="gold-view-summary-item">
              <span>Branch</span><strong>{application.branch || 'Not provided'}</strong>
            </div>
            <div className="gold-view-summary-item">
              <span>Status</span>
              <strong>
                <span className={`gold-view-status ${getStatusClass(application.status)}`}>
                  {getStatusLabel(application.status)}
                </span>
              </strong>
            </div>
            <div className="gold-view-summary-item">
              <span>Loan Account</span>
              <strong>{form.loanAccountNumber || 'Not provided'}</strong>
            </div>
          </div>

          <nav className="gold-view-tabs" role="tablist" aria-label="Application details sections">
            {tabs.map((tab) => (
              <button
                className={`gold-view-tab ${activeTab === tab.id ? 'active' : ''}`}
                id={`gold-view-tab-${tab.id}`}
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={activeTab === tab.id}
                aria-controls="gold-view-tabpanel"
                tabIndex={activeTab === tab.id ? 0 : -1}
                onClick={() => setActiveTab(tab.id)}
                onKeyDown={handleTabKeyDown}
              >
                {tab.label}
              </button>
            ))}
          </nav>

          <div
            className="gold-view-tabpanel"
            id="gold-view-tabpanel"
            role="tabpanel"
            aria-labelledby={`gold-view-tab-${activeTab}`}
            tabIndex={0}
          >
            {activeTab === 'overview' && (
              <GoldLoanDetailSection title="Application Overview" entries={overviewDetails}>
                <div className="gold-view-overview-caption">
                  Select a section above to review the complete application details.
                </div>
              </GoldLoanDetailSection>
            )}
            {activeTab === 'borrower' && (
              <>
                <GoldLoanDetailSection title="Application Information" entries={applicationInformation} />
                <GoldLoanDetailSection title="Borrower Details" entries={borrowerDetails} />
              </>
            )}
            {activeTab === 'security' && (
              <GoldLoanDetailSection title="Security Details" entries={securityDetails}>
                {populatedInventory.length > 0 && (
                  <div className="gold-view-table-wrap">
                    <table className="gold-view-table">
                      <thead>
                        <tr>
                          <th scope="col">Item ID</th>
                          <th scope="col">Ornament</th>
                          <th scope="col">Gross Weight</th>
                          <th scope="col">Net Weight</th>
                          <th scope="col">Appraisal Date</th>
                          <th scope="col">Purity</th>
                          <th scope="col">Rate</th>
                          <th scope="col">Appraised Value</th>
                          <th scope="col">Eligible Value</th>
                        </tr>
                      </thead>
                      <tbody>
                        {populatedInventory.map((item, index) => (
                          <tr key={item.id || `inventory-${index}`}>
                            <td>{displayGoldLoanValue(item.itemId)}</td>
                            <td>{displayGoldLoanValue(item.ornamentDescription)}</td>
                            <td>{hasDetailValue(item.grossWeight) ? `${item.grossWeight} g` : 'Not Provided'}</td>
                            <td>{hasDetailValue(item.netWeight) ? `${item.netWeight} g` : 'Not Provided'}</td>
                            <td>{hasDetailValue(item.appraisalDate) ? formatApplicationDate(item.appraisalDate) : 'Not Provided'}</td>
                            <td>{displayGoldLoanValue(item.purity)}</td>
                            <td>{hasDetailValue(item.rate) ? formatAmount(item.rate) : 'Not Provided'}</td>
                            <td>{hasDetailValue(item.amount) ? formatAmount(item.amount) : 'Not Provided'}</td>
                            <td>{hasDetailValue(item.limit) ? formatAmount(item.limit) : 'Not Provided'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
                {populatedInventory.length === 0 && (
                  <p className="gold-view-empty">No security inventory items have been provided.</p>
                )}
              </GoldLoanDetailSection>
            )}
            {activeTab === 'loan' && (
              <>
                <GoldLoanDetailSection title="Product and Scheme Details" entries={productDetails} />
                <GoldLoanDetailSection title="Loan and Repayment Details" entries={financialDetails} />
              </>
            )}
            {activeTab === 'charges' && (
              <GoldLoanDetailSection title="Charges and Fees" entries={chargeDetails} />
            )}
            {activeTab === 'basic' && (
              <GoldLoanDetailSection title="Basic Details" entries={basicDetails} />
            )}
            {activeTab === 'related' && (
              <GoldLoanDetailSection title="Related Parties" entries={[]}>
                {populatedParties.length > 0 && (
                  <div className="gold-view-table-wrap">
                    <table className="gold-view-table">
                      <thead>
                        <tr>
                          <th scope="col">Party Type</th>
                          <th scope="col">Customer Number</th>
                          <th scope="col">Title</th>
                          <th scope="col">First Name</th>
                          <th scope="col">Middle Name</th>
                          <th scope="col">Last Name</th>
                        </tr>
                      </thead>
                      <tbody>
                        {populatedParties.map((party, index) => (
                          <tr key={party.id || `party-${index}`}>
                            <td>{party.nameType || '—'}</td>
                            <td>{party.customerNo || '—'}</td>
                            <td>{party.salutation || '—'}</td>
                            <td>{party.firstName || '—'}</td>
                            <td>{party.middleName || '—'}</td>
                            <td>{party.lastName || '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
                {populatedParties.length === 0 && (
                  <p className="gold-view-empty">No related parties have been provided.</p>
                )}
              </GoldLoanDetailSection>
            )}
            {activeTab === 'disbursement' && (
              <GoldLoanDetailSection title="Disbursement and Bank Details" entries={bankDetails} />
            )}
          </div>
          {!application.goldLoanForm && (
            <p className="gold-view-readonly-note">
              This development record contains dashboard details only; no additional Gold Loan form data is saved yet.
            </p>
          )}
          <p className="gold-view-readonly-note">This application is read-only.</p>
        </Card>
        <style jsx>{`
          .gold-view-page { min-width: 0; }
          :global(.gold-view-card) {
            min-width: 0;
            padding: 22px;
          }
          :global(.loan-dashboard-back) {
            width: 40px;
            height: 40px;
            border: 1px solid #dfe8e8;
            border-radius: 8px;
            background: #fff;
            transition: background .16s ease, border-color .16s ease, color .16s ease;
          }
          :global(.loan-dashboard-back:hover) {
            border-color: #b8d4cf;
            color: #165f5c;
            background: #edf6f4;
          }
          .gold-view-page :global(.page-header) {
            align-items: flex-start;
            margin-bottom: 22px;
          }
          .gold-view-page :global(.page-header h1) {
            margin-bottom: 5px;
            color: #173e46;
            font-size: 25px;
          }
          .gold-view-page :global(.page-header p) {
            color: #718185;
            font-size: 12px;
          }
          .gold-view-summary {
            display: grid;
            grid-template-columns: repeat(3, minmax(0, 1fr));
            gap: 11px;
            padding-bottom: 18px;
            border-bottom: 1px solid #e8eeee;
          }
          .gold-view-summary-item {
            min-width: 0;
            display: flex;
            flex-direction: column;
            align-items: flex-start;
            justify-content: center;
            gap: 7px;
            min-height: 82px;
            padding: 13px 15px;
            border: 1px solid #e5ecec;
            border-radius: 8px;
            background: #fcfdfd;
            box-shadow: 0 2px 7px rgb(23 63 73 / 3%);
            transition: border-color .16s ease, box-shadow .16s ease, transform .16s ease;
          }
          .gold-view-summary-item:hover {
            border-color: #c9dedb;
            box-shadow: 0 4px 12px rgb(23 63 73 / 6%);
            transform: translateY(-1px);
          }
          .gold-view-summary-item > span {
            color: #718185;
            font-size: 11px;
            font-weight: 600;
            line-height: 1.35;
          }
          .gold-view-summary-item strong {
            max-width: 100%;
            overflow-wrap: anywhere;
            color: #34565b;
            font-size: 13px;
            font-weight: 700;
            line-height: 1.45;
          }
          .gold-view-summary-customer { border-left: 3px solid #5b9c91; }
          .gold-view-summary-amount { border-left: 3px solid #7195b4; }
          .gold-view-summary-amount strong { color: #173f49; font-size: 15px; }
          .gold-view-status {
            display: inline-flex;
            align-items: center;
            min-height: 24px;
            padding: 5px 9px;
            border-radius: 20px;
            color: #617377;
            background: #eef2f2;
            font-size: 11px;
            font-weight: 700;
            line-height: 1;
            white-space: normal;
          }
          .gold-view-status.approved, .gold-view-status.disbursed { color: #31815e; background: #e7f3eb; }
          .gold-view-status.pending, .gold-view-status.awaiting-kyc, .gold-view-status.returned { color: #a16f35; background: #fbf1e2; }
          .gold-view-status.under-review { color: #4d7c9f; background: #eaf1f7; }
          .gold-view-status.rejected { color: #a95757; background: #faeaea; }
          .gold-view-tabs {
            display: flex;
            gap: 5px;
            width: 100%;
            margin: 18px 0 14px;
            padding: 5px;
            overflow-x: auto;
            border: 1px solid #e3ebea;
            border-radius: 9px;
            background: #f7faf9;
            scrollbar-width: thin;
            scrollbar-color: #bdcfcc transparent;
          }
          .gold-view-tab {
            flex: 0 0 auto;
            min-height: 37px;
            padding: 8px 13px;
            border: 1px solid transparent;
            border-radius: 6px;
            color: #65777a;
            background: transparent;
            font-size: 11px;
            font-weight: 600;
            white-space: nowrap;
            transition: color .16s ease, background .16s ease, border-color .16s ease;
          }
          .gold-view-tab:hover {
            border-color: #d7e6e3;
            color: #165f5c;
            background: #edf6f4;
          }
          .gold-view-tab.active {
            border-color: #c5ddda;
            color: #145e5b;
            background: #e8f3f1;
            box-shadow: inset 0 -2px 0 #177e7a;
            font-weight: 700;
          }
          .gold-view-tab:focus-visible {
            outline: 3px solid rgb(23 126 122 / 22%);
            outline-offset: 1px;
          }
          .gold-view-tabpanel { min-width: 0; }
          .gold-view-tabpanel:focus-visible {
            outline: 2px solid rgb(23 126 122 / 28%);
            outline-offset: 3px;
          }
          .gold-view-tabpanel :global(.gold-view-section + .gold-view-section) { margin-top: 13px; }
          :global(.gold-view-section) {
            min-width: 0;
            padding: 17px;
            border: 1px solid #e2eaea;
            border-radius: 9px;
            background: #fff;
            box-shadow: 0 2px 8px rgb(23 63 73 / 3%);
          }
          :global(.gold-view-section h2) {
            margin: 0 0 13px;
            padding-bottom: 10px;
            border-bottom: 1px solid #edf2f1;
            color: #173e46;
            font: 700 14px Manrope, sans-serif;
          }
          :global(.gold-view-detail-grid) {
            display: grid;
            grid-template-columns: repeat(3, minmax(0, 1fr));
            gap: 9px;
            margin: 0;
          }
          :global(.gold-view-detail-grid > div) {
            min-width: 0;
            padding: 10px 11px;
            border: 1px solid #edf2f1;
            border-radius: 7px;
            background: #fbfdfd;
          }
          :global(.gold-view-detail-grid dt) {
            margin-bottom: 5px;
            color: #718185;
            font-size: 11px;
            line-height: 1.4;
          }
          :global(.gold-view-detail-grid dd) {
            margin: 0;
            overflow-wrap: anywhere;
            color: #34565b;
            font-size: 12px;
            font-weight: 650;
            line-height: 1.5;
          }
          .gold-view-overview-caption {
            margin-top: 13px;
            color: #718185;
            font-size: 11px;
          }
          .gold-view-table-wrap {
            width: 100%;
            margin-top: 15px;
            overflow-x: auto;
            border: 1px solid #e7eeed;
            border-radius: 7px;
          }
          .gold-view-table {
            width: 100%;
            min-width: 780px;
            border-collapse: collapse;
            color: #405d61;
            font-size: 11px;
            text-align: left;
          }
          .gold-view-table th {
            padding: 11px 12px;
            border: 0;
            border-bottom: 1px solid #e7eeed;
            color: #718185;
            background: #f7faf9;
            font-size: 9px;
            letter-spacing: .45px;
            text-transform: uppercase;
            white-space: nowrap;
          }
          .gold-view-table td {
            padding: 11px 12px;
            border-bottom: 1px solid #edf2f1;
            color: #34565b;
            line-height: 1.45;
            vertical-align: top;
          }
          .gold-view-table tbody tr:last-child td { border-bottom: 0; }
          .gold-view-table tbody tr:hover { background: #fbfdfd; }
          .gold-view-empty {
            margin: 14px 0 0;
            padding: 18px;
            border: 1px dashed #dce7e5;
            border-radius: 7px;
            color: #718185;
            font-size: 12px;
            text-align: center;
          }
          .gold-view-readonly-note {
            margin: 15px 0 0;
            color: #718185;
            font-size: 11px;
          }
          @media (max-width: 850px) {
            .gold-view-summary { grid-template-columns: repeat(2, minmax(0, 1fr)); }
            :global(.gold-view-detail-grid) { grid-template-columns: repeat(2, minmax(0, 1fr)); }
          }
          @media (max-width: 520px) {
            :global(.gold-view-card) { padding: 14px; }
            .gold-view-summary { grid-template-columns: 1fr; }
            .gold-view-page :global(.page-header) { align-items: center; gap: 12px; }
            .gold-view-page :global(.page-header h1) { font-size: 21px; }
            .gold-view-tabs { margin-top: 14px; }
            .gold-view-tab { min-height: 35px; padding: 7px 11px; }
            :global(.gold-view-detail-grid) { grid-template-columns: 1fr; }
            :global(.gold-view-section) { padding: 14px; }
          }
        `}</style>
      </div>
    </AppShell>
  );
}

export function LoanApplicationFormPage({
  onBack,
  application,
  onSave,
  onCreate,
  backLabel = 'Loan Dashboard',
}) {
  const router = useRouter();
  const isEditMode = Boolean(application);
  const [form, setForm] = useState(() => (
    application ? createApplicationForm(application) : createInitialForm()
  ));
  const [currentStep, setCurrentStep] = useState(0);
  const [validationErrors, setValidationErrors] = useState({});
  const [hasAttemptedSubmit, setHasAttemptedSubmit] = useState(false);
  const [touchedDisbursementFields, setTouchedDisbursementFields] = useState(() => new Set());
  const [products, setProducts] = useState([]);
  const [productsError, setProductsError] = useState('');
  const [partyToDelete, setPartyToDelete] = useState(null);
  const [showFrontendSuccess, setShowFrontendSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isFormDirty, setIsFormDirty] = useState(false);
  const [saveError, setSaveError] = useState('');
  const nextPartyId = useRef(form.relatedParties.reduce((highestId, party) => {
    const match = /^party-(\d+)$/.exec(party.id);
    return match ? Math.max(highestId, Number(match[1])) : highestId;
  }, 0));
  const nextInventoryId = useRef(form.security.inventoryItems.reduce((highestId, item) => {
    const match = /^inventory-(\d+)$/.exec(item.id);
    return match ? Math.max(highestId, Number(match[1])) : highestId;
  }, 0));
  const cancelDeleteButtonRef = useRef(null);
  const confirmDeleteButtonRef = useRef(null);
  const successNavigationTimeout = useRef(null);

  useEffect(() => () => {
    if (successNavigationTimeout.current) {
      window.clearTimeout(successNavigationTimeout.current);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();

    async function loadProducts() {
      let accessToken;
      try {
        const authData = JSON.parse(window.localStorage.getItem('authData') || '{}');
        accessToken = authData.accessToken;
      } catch {
        setProductsError('Product suggestions could not be loaded. You can enter product details manually.');
        return;
      }

      try {
        const result = await getLoanProducts(controller.signal, accessToken);
        if (!controller.signal.aborted) setProducts(Array.isArray(result) ? result : []);
      } catch {
        if (!controller.signal.aborted) {
          setProductsError('Product suggestions could not be loaded. You can enter product details manually.');
        }
      }
    }

    loadProducts();
    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (!partyToDelete) return undefined;
    cancelDeleteButtonRef.current?.focus();
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') setPartyToDelete(null);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [partyToDelete]);

  const updateForm = (nextForm, fieldKeys = [], stepIndex = currentStep) => {
    setForm(nextForm);
    setIsFormDirty(true);
    setShowFrontendSuccess(false);
    if (!fieldKeys.length) return;
    const stepErrors = validateStep(stepIndex, nextForm);
    setValidationErrors((previousErrors) => {
      const nextErrors = { ...previousErrors };
      fieldKeys.forEach((key) => {
        if (stepErrors[key]) nextErrors[key] = stepErrors[key];
        else delete nextErrors[key];
      });
      return nextErrors;
    });
  };

  const updateField = (field, value) => {
    const nextForm = { ...form, [field]: value };
    const fieldKeys = [field];
    if (field === 'tenureMonths') {
      nextForm.charges = { ...form.charges, tenureMonths: value };
      if (String(form.instalments ?? '').trim() || validationErrors.instalments) {
        fieldKeys.push('instalments');
      }
    }
    updateForm(nextForm, fieldKeys);
  };

  const updateParty = (partyId, field, value) => {
    updateForm({
      ...form,
      relatedParties: form.relatedParties.map((party) => (
        party.id === partyId ? { ...party, [field]: value } : party
      )),
    }, [`relatedParties.${partyId}.${field}`], 5);
  };

  const addRelatedParty = () => {
    nextPartyId.current += 1;
    updateForm({
      ...form,
      relatedParties: [
        ...form.relatedParties,
        {
          id: `party-${nextPartyId.current}`,
          nameType: '',
          customerNo: '',
          salutation: '',
          firstName: '',
          middleName: '',
          lastName: '',
        },
      ],
    });
  };

  const removeRelatedParty = (partyId) => {
    const nextForm = {
      ...form,
      relatedParties: form.relatedParties.filter((party) => party.id !== partyId),
    };
    setForm(nextForm);
    setIsFormDirty(true);
    setShowFrontendSuccess(false);
    setValidationErrors((errors) => Object.fromEntries(
      Object.entries(errors).filter(([key]) => !key.startsWith(`relatedParties.${partyId}.`)),
    ));
  };

  const confirmRemoveRelatedParty = () => {
    if (!partyToDelete) return;
    removeRelatedParty(partyToDelete);
    setPartyToDelete(null);
  };

  const trapDeleteDialogFocus = (event) => {
    if (event.key !== 'Tab') return;
    if (event.shiftKey && document.activeElement === cancelDeleteButtonRef.current) {
      event.preventDefault();
      confirmDeleteButtonRef.current?.focus();
    } else if (!event.shiftKey && document.activeElement === confirmDeleteButtonRef.current) {
      event.preventDefault();
      cancelDeleteButtonRef.current?.focus();
    }
  };

  const goToNextStep = () => {
    const errors = validateStep(currentStep, form);
    setValidationErrors(errors);
    if (Object.keys(errors).length === 0) {
      setCurrentStep((step) => Math.min(step + 1, steps.length - 1));
      setShowFrontendSuccess(false);
    }
  };

  const goToPreviousStep = () => {
    setValidationErrors({});
    setCurrentStep((step) => Math.max(step - 1, 0));
    setShowFrontendSuccess(false);
  };

  const handleCancel = () => handleReturnToDashboard();

  const handleSubmit = (event) => {
    event.preventDefault();
    if (isSubmitting) return;
    setHasAttemptedSubmit(true);

    const allErrors = steps.reduce((errors, _, index) => (
      { ...errors, ...validateStep(index, form) }
    ), {});
    setValidationErrors(allErrors);

    if (Object.keys(allErrors).length > 0) {
      const invalidStep = steps.findIndex((_, index) => (
        Object.keys(validateStep(index, form)).length > 0
      ));
      setCurrentStep(invalidStep >= 0 ? invalidStep : 0);
      return;
    }

    if (isEditMode) {
      if (typeof onSave !== 'function') {
        setSaveError('Changes could not be saved because the local save handler is unavailable.');
        return;
      }

      setIsSubmitting(true);
      setSaveError('');
      try {
        const customerName = [form.firstName, form.middleName, form.lastName]
          .filter(Boolean)
          .join(' ')
          .trim();
        onSave({
          ...application,
          ...(customerName ? { customer: customerName, customerName } : {}),
          ...(form.sanctionLimit ? { amount: String(form.sanctionLimit) } : {}),
          branch: form.branch,
          goldLoanForm: form,
        });
        setIsFormDirty(false);
        setShowFrontendSuccess(true);
      } catch (error) {
        setSaveError(
          `Changes could not be saved in this browser${error instanceof Error ? `: ${error.message}` : '.'}`,
        );
        setShowFrontendSuccess(false);
      } finally {
        setIsSubmitting(false);
      }
      return;
    }

    if (typeof onCreate === 'function') {
      setIsSubmitting(true);
      setSaveError('');
      try {
        onCreate(form);
        setIsFormDirty(false);
        setShowFrontendSuccess(true);
        successNavigationTimeout.current = window.setTimeout(
          () => router.push('/gold_loan_application'),
          1500,
        );
      } catch (error) {
        setSaveError(
          `Application could not be saved in this browser${error instanceof Error ? `: ${error.message}` : '.'}`,
        );
        setShowFrontendSuccess(false);
      } finally {
        setIsSubmitting(false);
      }
      return;
    }

    setSaveError('Application could not be submitted because the save handler is unavailable.');
    setShowFrontendSuccess(false);
    setIsSubmitting(false);
  };

  const selectProduct = (name) => {
    const matchedProduct = products.find(
      (product) => String(product.name ?? '').toLowerCase() === name.trim().toLowerCase(),
    );
    const fieldKeys = ['productName'];
    if (matchedProduct) fieldKeys.push('productCode');
    updateForm({
      ...form,
      productName: name,
      ...(matchedProduct ? { productCode: String(matchedProduct.id ?? '') } : {}),
    }, fieldKeys, 0);
  };

  const relatedPartyError = (party, field) => (
    validationErrors[`relatedParties.${party.id}.${field}`]
  );

  const invalidNameInput = (field) => {
    setValidationErrors((errors) => ({ ...errors, [field]: nameError }));
  };

  const invalidCodeInput = (field) => {
    if (field.startsWith('disbursement.')) {
      setTouchedDisbursementFields((fields) => new Set([...fields, field.slice('disbursement.'.length)]));
    }
    setValidationErrors((errors) => ({
      ...errors,
      [field]: 'Use letters, numbers, hyphens, and underscores only.',
    }));
  };

  const invalidNumericInput = (field, attemptedValue) => {
    if (field.startsWith('disbursement.')) {
      setTouchedDisbursementFields((fields) => new Set([...fields, field.slice('disbursement.'.length)]));
    }
    const message = /\p{L}/u.test(attemptedValue)
      ? 'Only numeric values are allowed.'
      : 'Special characters are not allowed.';
    setValidationErrors((errors) => ({
      ...errors,
      [field]: message,
    }));
  };

  const invalidAccountNumberLengthInput = () => {
    setTouchedDisbursementFields((fields) => new Set([...fields, 'accountNumber']));
    setValidationErrors((errors) => ({
      ...errors,
      'disbursement.accountNumber': 'Account number cannot exceed 18 digits.',
    }));
  };

  const invalidLengthInput = (field, label, maxLength) => {
    if (field.startsWith('disbursement.')) {
      setTouchedDisbursementFields((fields) => new Set([...fields, field.slice('disbursement.'.length)]));
    }
    setValidationErrors((errors) => ({
      ...errors,
      [field]: `${label} must be ${maxLength} characters or fewer.`,
    }));
  };

  const updateSectionField = (section, field, value) => {
    const nextForm = {
      ...form,
      [section]: { ...form[section], [field]: value },
    };
    if (section === 'disbursement') {
      setTouchedDisbursementFields((fields) => new Set([...fields, field]));
    }
    updateForm(nextForm, [`${section}.${field}`]);
  };

  const disbursementFieldError = (field) => (
    hasAttemptedSubmit || touchedDisbursementFields.has(field)
      ? validationErrors[`disbursement.${field}`]
      : undefined
  );

  const updateInventoryItem = (index, field, value) => {
    const inventoryItems = form.security.inventoryItems.map((item, itemIndex) => (
      itemIndex === index ? { ...item, [field]: value } : item
    ));
    const limitAvailable = getLimitTotal(inventoryItems);
    const nextForm = {
      ...form,
      sanctionLimit: limitAvailable,
      charges: { ...form.charges, sanctionLimit: limitAvailable },
      security: {
        ...form.security,
        inventoryItems,
        limitAvailable,
      },
    };
    const prefix = `security.inventoryItems.${index}.`;
    const fieldKeys = [`${prefix}${field}`];
    if (limitAvailable || validationErrors['security.limitAvailable']) {
      fieldKeys.push('security.limitAvailable');
    }
    if (field === 'amount' && String(form.security.inventoryItems[index].limit ?? '').trim()) {
      fieldKeys.push(`${prefix}limit`);
    }
    if (field === 'grossWeight' && String(form.security.inventoryItems[index].netWeight ?? '').trim()) {
      fieldKeys.push(`${prefix}netWeight`);
    }
    updateForm(nextForm, fieldKeys, 1);
  };

  const addInventoryItem = () => {
    const lastIndex = form.security.inventoryItems.length - 1;
    const rowErrors = validateInventoryItem(
      form.security.inventoryItems[lastIndex],
      lastIndex,
    );
    if (Object.keys(rowErrors).length > 0) {
      setValidationErrors((errors) => ({ ...errors, ...rowErrors }));
      return;
    }

    nextInventoryId.current += 1;
    const nextIndex = nextInventoryId.current;
    const nextForm = {
      ...form,
      security: {
        ...form.security,
        inventoryItems: [
          ...form.security.inventoryItems,
          {
            id: `inventory-${nextIndex}`,
            itemId: '',
            ornamentDescription: '',
            grossWeight: '',
            netWeight: '',
            appraisalDate: '',
            purity: '',
            rate: '',
            amount: '',
            limit: '',
          },
        ],
      },
    };
    setForm(nextForm);
    setIsFormDirty(true);
    setShowFrontendSuccess(false);
  };

  const removeInventoryItem = (itemId) => {
    const remainingItems = form.security.inventoryItems.length === 1
      ? [{
        ...form.security.inventoryItems[0],
        itemId: '',
        ornamentDescription: '',
        grossWeight: '',
        netWeight: '',
        appraisalDate: '',
        purity: '',
        rate: '',
        amount: '',
        limit: '',
      }]
      : form.security.inventoryItems.filter((item) => item.id !== itemId);
    const limitAvailable = getLimitTotal(remainingItems);
    const nextForm = {
      ...form,
      sanctionLimit: limitAvailable,
      charges: { ...form.charges, sanctionLimit: limitAvailable },
      security: {
        ...form.security,
        inventoryItems: remainingItems,
        limitAvailable,
      },
    };
    setForm(nextForm);
    setIsFormDirty(true);
    setShowFrontendSuccess(false);
    setValidationErrors((errors) => {
      const nextErrors = Object.fromEntries(
        Object.entries(errors).filter(([key]) => !key.startsWith('security.inventoryItems.')),
      );
      if (limitAvailable || !errors['security.limitAvailable']) {
        delete nextErrors['security.limitAvailable'];
      }
      return nextErrors;
    });
  };

  const navigateToStep = (targetStep) => {
    if (targetStep <= currentStep) {
      setCurrentStep(targetStep);
      setValidationErrors({});
      setShowFrontendSuccess(false);
      return;
    }

    for (let stepIndex = currentStep; stepIndex < targetStep; stepIndex += 1) {
      const errors = validateStep(stepIndex, form);
      if (Object.keys(errors).length > 0) {
        setValidationErrors(errors);
        setCurrentStep(stepIndex);
        setShowFrontendSuccess(false);
        return;
      }
    }

    setCurrentStep(targetStep);
    setValidationErrors({});
    setShowFrontendSuccess(false);
  };

  const handleReturnToDashboard = () => {
    if (
      isFormDirty
      && !window.confirm(
        `Return to the ${backLabel} and discard ${isEditMode ? 'unsaved changes' : 'this application'}?`,
      )
    ) {
      return;
    }

    if (typeof onBack === 'function') {
      onBack();
    } else {
      router.push('/loan_application');
    }
  };

  return (
    <AppShell>
      <div className="loan-application-shell">
        <div className="loan-form-back-row">
          <button
            className="loan-form-back"
            type="button"
            onClick={handleReturnToDashboard}
            aria-label={`Back to ${backLabel}`}
            title={`Back to ${backLabel}`}
          >
            <ArrowLeft size={18} aria-hidden="true" />
            <span>Back</span>
          </button>
        </div>
        <PageHeader
          title={isEditMode ? 'Edit Gold Loan Application' : 'Gold Loan Application'}
          description={isEditMode ? `Application ID: ${getApplicationId(application)}` : undefined}
        />

        <Card className="loan-application-card">
          <div className="loan-form-layout">
            <nav className="loan-form-nav" aria-label="Loan application sections">
              {steps.map((label, index) => {
                const isCurrent = index === currentStep;
                const isComplete = index < currentStep;
                return (
                  <button
                    className={`loan-form-nav-item ${isCurrent ? 'active' : ''} ${isComplete ? 'complete' : ''}`}
                    key={label}
                    type="button"
                    onClick={() => navigateToStep(index)}
                    aria-current={isCurrent ? 'step' : undefined}
                    aria-label={`Step ${index + 1}: ${label}${isComplete ? ', completed' : ''}`}
                  >
                    <span className="loan-form-nav-number">
                      {isComplete ? <Check size={13} aria-hidden="true" /> : index + 1}
                    </span>
                    <span>{label}</span>
                  </button>
                );
              })}
            </nav>

            <div className="loan-form-panel">

          {productsError && (
            <div className="bank-master-alert" role="status">
              <span>{productsError}</span>
            </div>
          )}
          {showFrontendSuccess && (
            <div className="bank-master-success" role="status">
              <Check size={17} aria-hidden="true" />
              <span>
                {isEditMode
                  ? 'Changes saved in this browser.'
                  : typeof onCreate === 'function'
                    ? 'Gold Loan Application Submitted Successfully.'
                    : 'Application submitted successfully.'}
              </span>
            </div>
          )}
          {saveError && <div className="bank-master-alert" role="alert">{saveError}</div>}

          <form onSubmit={handleSubmit} noValidate>
            {currentStep === 0 && (
              <div className="loan-form-section">
                <h2>Borrower Details</h2>

                <div className="loan-form-section-inner">
                  <h3>Application information</h3>
                  <div className="loan-form-grid">
                    <LoanField
                      id="loanAccountNumber"
                      label="Loan Account Number"
                      value={form.loanAccountNumber}
                      onChange={(value) => updateField('loanAccountNumber', value)}
                      error={validationErrors.loanAccountNumber}
                      min={MIN_TEXT_LENGTH}
                      maxLength={MAX_TEXT_LENGTH}
                      strictCode
                      onInvalidCodeInput={() => invalidCodeInput('loanAccountNumber')}
                      required
                    />
                    <LoanField
                      id="effectiveDate"
                      label="Effective Date"
                      type="date"
                      value={form.effectiveDate}
                      onChange={(value) => updateField('effectiveDate', value)}
                      error={validationErrors.effectiveDate}
                      required
                    />
                    <LoanField
                      id="accountStatus"
                      label="Account Status"
                      value={form.accountStatus}
                      onChange={(value) => updateField('accountStatus', value)}
                      options={['Active', 'Pending', 'Closed'].map((value) => ({ value, label: value }))}
                      error={validationErrors.accountStatus}
                      required
                    />
                    <LoanField
                      id="lastTransactionDate"
                      label="Last Transaction Date"
                      type="date"
                      value={form.lastTransactionDate}
                      onChange={(value) => updateField('lastTransactionDate', value)}
                      error={validationErrors.lastTransactionDate}
                    />
                    <LoanField
                      id="customerId"
                      label="Customer ID"
                      value={form.customerId}
                      onChange={(value) => updateField('customerId', value)}
                      error={validationErrors.customerId}
                      min={MIN_TEXT_LENGTH}
                      maxLength={MAX_TEXT_LENGTH}
                      strictCode
                      onInvalidCodeInput={() => invalidCodeInput('customerId')}
                      required
                    />
                    <LoanField
                      id="branch"
                      label="Branch"
                      value={form.branch}
                      onChange={(value) => updateField('branch', value)}
                      error={validationErrors.branch}
                      maxLength={MAX_TEXT_LENGTH}
                    />
                  </div>
                </div>

                <div className="loan-form-section-inner">
                  <h3 className="borrower-information-heading">Borrower Information</h3>
                  <div className="loan-form-grid borrower-information-grid">
                    <LoanField
                      id="title"
                      label="Title"
                      value={form.title}
                      onChange={(value) => updateField('title', value)}
                      options={titles}
                      error={validationErrors.title}
                      required
                    />
                    <LoanField
                      id="firstName"
                      label="First Name"
                      value={form.firstName}
                      onChange={(value) => updateField('firstName', value)}
                      error={validationErrors.firstName}
                      strictName
                      maxLength={MAX_NAME_LENGTH}
                      onInvalidNameInput={() => invalidNameInput('firstName')}
                      onInvalidLengthInput={() => invalidLengthInput('firstName', 'First name', MAX_NAME_LENGTH)}
                      required
                    />
                    <LoanField
                      id="middleName"
                      label="Middle Name"
                      value={form.middleName}
                      onChange={(value) => updateField('middleName', value)}
                      error={validationErrors.middleName}
                      strictName
                      maxLength={MAX_NAME_LENGTH}
                      onInvalidNameInput={() => invalidNameInput('middleName')}
                      onInvalidLengthInput={() => invalidLengthInput('middleName', 'Middle name', MAX_NAME_LENGTH)}
                    />
                    <LoanField
                      id="lastName"
                      label="Last Name"
                      value={form.lastName}
                      onChange={(value) => updateField('lastName', value)}
                      error={validationErrors.lastName}
                      strictName
                      maxLength={MAX_NAME_LENGTH}
                      onInvalidNameInput={() => invalidNameInput('lastName')}
                      onInvalidLengthInput={() => invalidLengthInput('lastName', 'Last name', MAX_NAME_LENGTH)}
                      required
                    />
                  </div>
                </div>

                <div className="loan-form-section-inner">
                  <h3>Gold loan information</h3>
                  <div className="loan-form-grid">
                    <LoanField
                      id="productCode"
                      label="Product Code"
                      value={form.productCode}
                      onChange={(value) => updateField('productCode', value)}
                      error={validationErrors.productCode}
                      min={MIN_TEXT_LENGTH}
                      maxLength={MAX_TEXT_LENGTH}
                      strictCode
                      onInvalidCodeInput={() => invalidCodeInput('productCode')}
                      required
                    />
                    <LoanField
                      id="productName"
                      label="Product Description"
                      value={form.productName}
                      onChange={selectProduct}
                      error={validationErrors.productName}
                      list="loan-product-options"
                      maxLength={MAX_DESCRIPTION_LENGTH}
                      onInvalidLengthInput={() => invalidLengthInput('productName', 'Product description', MAX_DESCRIPTION_LENGTH)}
                      required
                    />
                    <LoanField
                      id="schemeCode"
                      label="Scheme Code"
                      value={form.schemeCode}
                      onChange={(value) => updateField('schemeCode', value)}
                      error={validationErrors.schemeCode}
                      maxLength={30}
                      strictCode
                      onInvalidCodeInput={() => invalidCodeInput('schemeCode')}
                      required
                    />
                    <LoanField
                      id="schemeDescription"
                      label="Scheme Description"
                      value={form.schemeDescription}
                      onChange={(value) => updateField('schemeDescription', value)}
                      error={validationErrors.schemeDescription}
                      maxLength={MAX_DESCRIPTION_LENGTH}
                      onInvalidLengthInput={() => invalidLengthInput('schemeDescription', 'Scheme description', MAX_DESCRIPTION_LENGTH)}
                      required
                    />
                    <LoanField
                      id="modeOfOperation"
                      label="Mode of Operation"
                      value={form.modeOfOperation}
                      onChange={(value) => updateField('modeOfOperation', value)}
                      options={modesOfOperation}
                      error={validationErrors.modeOfOperation}
                      required
                    />
                  </div>
                  <datalist id="loan-product-options">
                    {products.map((product) => (
                      <option key={String(product.id)} value={product.name} />
                    ))}
                  </datalist>
                </div>
              </div>
            )}

            {currentStep === 5 && (
              <div className="loan-form-section">
                <div className="panel-heading">
                  <div>
                    <h2>Related Party</h2>
                    <p>Add co-applicants, guarantors, or other parties associated with this application.</p>
                  </div>
                  <button className="secondary-button" type="button" onClick={addRelatedParty}>
                    <Plus size={16} aria-hidden="true" />
                    Add Related Party
                  </button>
                </div>

                {form.relatedParties.length === 0 ? (
                  <div className="bank-master-empty" style={{ minHeight: 180, flexDirection: 'column' }}>
                    <p>No related parties added.</p>
                    <span>Add a related party if one is associated with this application. This step can be left empty.</span>
                  </div>
                ) : (
                  <div className="loan-data-table-wrap" style={{ overflowX: 'auto' }}>
                    <table className="loan-data-table" style={{ minWidth: 1040 }}>
                      <thead>
                        <tr>
                          <th scope="col">Sr. No.</th>
                          <th scope="col">Name Type</th>
                          <th scope="col">Customer No.</th>
                          <th scope="col">Salutation</th>
                          <th scope="col">First Name</th>
                          <th scope="col">Middle Name</th>
                          <th scope="col">Last Name</th>
                          <th scope="col" aria-label="Actions">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {form.relatedParties.map((party, index) => (
                          <tr key={party.id}>
                            <td>{index + 1}</td>
                            <td>
                              <LoanField
                                id={`${party.id}-nameType`}
                                label="Name Type"
                                value={party.nameType}
                                onChange={(value) => updateParty(party.id, 'nameType', value)}
                                options={nameTypes}
                                error={relatedPartyError(party, 'nameType')}
                                required
                              />
                            </td>
                            <td>
                              <LoanField
                                id={`${party.id}-customerNo`}
                                label="Customer No."
                                value={party.customerNo}
                                onChange={(value) => updateParty(party.id, 'customerNo', value)}
                                error={relatedPartyError(party, 'customerNo')}
                                maxLength={MAX_TEXT_LENGTH}
                                strictCode
                                onInvalidCodeInput={() => invalidCodeInput(`relatedParties.${party.id}.customerNo`)}
                                required
                              />
                            </td>
                            <td>
                              <LoanField
                                id={`${party.id}-salutation`}
                                label="Salutation"
                                value={party.salutation}
                                onChange={(value) => updateParty(party.id, 'salutation', value)}
                                options={titles}
                                error={relatedPartyError(party, 'salutation')}
                                required
                              />
                            </td>
                            <td>
                              <LoanField
                                id={`${party.id}-firstName`}
                                label="First Name"
                                value={party.firstName}
                                onChange={(value) => updateParty(party.id, 'firstName', value)}
                                error={relatedPartyError(party, 'firstName')}
                                strictName
                                maxLength={MAX_NAME_LENGTH}
                                onInvalidNameInput={() => invalidNameInput(`relatedParties.${party.id}.firstName`)}
                                onInvalidLengthInput={() => invalidLengthInput(`relatedParties.${party.id}.firstName`, 'First name', MAX_NAME_LENGTH)}
                                required
                              />
                            </td>
                            <td>
                              <LoanField
                                id={`${party.id}-middleName`}
                                label="Middle Name"
                                value={party.middleName}
                                onChange={(value) => updateParty(party.id, 'middleName', value)}
                                error={relatedPartyError(party, 'middleName')}
                                strictName
                                maxLength={MAX_NAME_LENGTH}
                                onInvalidNameInput={() => invalidNameInput(`relatedParties.${party.id}.middleName`)}
                                onInvalidLengthInput={() => invalidLengthInput(`relatedParties.${party.id}.middleName`, 'Middle name', MAX_NAME_LENGTH)}
                              />
                            </td>
                            <td>
                              <LoanField
                                id={`${party.id}-lastName`}
                                label="Last Name"
                                value={party.lastName}
                                onChange={(value) => updateParty(party.id, 'lastName', value)}
                                error={relatedPartyError(party, 'lastName')}
                                strictName
                                maxLength={MAX_NAME_LENGTH}
                                onInvalidNameInput={() => invalidNameInput(`relatedParties.${party.id}.lastName`)}
                                onInvalidLengthInput={() => invalidLengthInput(`relatedParties.${party.id}.lastName`, 'Last name', MAX_NAME_LENGTH)}
                                required
                              />
                            </td>
                            <td>
                              <button
                                className="icon-button"
                                type="button"
                                onClick={() => setPartyToDelete(party.id)}
                                aria-label={`Remove related party ${index + 1}`}
                                title="Remove related party"
                              >
                                <Trash2 size={16} aria-hidden="true" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {currentStep === 2 && (
              <div className="loan-form-section">
                <h2>Loan Details</h2>
                <div className="loan-form-section-inner">
                  <div className="loan-form-grid">
                    <LoanField id="sanctionLimit" label="Sanction Limit (Rs.)" type="number" min="0.01" step="any" value={form.sanctionLimit} error={validationErrors.sanctionLimit} readOnly required />
                    <LoanField id="tenureMonths" label="Tenure (months)" type="number" min="1" max="600" step="1" value={form.tenureMonths} onChange={(value) => updateField('tenureMonths', value)} error={validationErrors.tenureMonths} required />
                    <LoanField id="interestRate" label="Interest Rate (%)" type="number" min="0" max="100" step="any" value={form.interestRate} onChange={(value) => updateField('interestRate', value)} error={validationErrors.interestRate} required />
                    <LoanField id="sanctionAuthority" label="Sanction Authority" value={form.sanctionAuthority} onChange={(value) => updateField('sanctionAuthority', value)} error={validationErrors.sanctionAuthority} maxLength={MAX_NAME_LENGTH} onInvalidLengthInput={() => invalidLengthInput('sanctionAuthority', 'Sanction authority', MAX_NAME_LENGTH)} required />
                    <LoanField id="instalments" label="No. of Instalments" type="number" min="1" max={form.tenureMonths || 600} step="1" value={form.instalments} onChange={(value) => updateField('instalments', value)} error={validationErrors.instalments} required />
                    <LoanField id="sanctionedDate" label="Sanctioned Date" type="date" value={form.sanctionedDate} onChange={(value) => updateField('sanctionedDate', value)} error={validationErrors.sanctionedDate} required />
                    <LoanField id="emi" label="EMI (Y/N)" value={form.emi} onChange={(value) => updateField('emi', value)} options={yesNoOptions} error={validationErrors.emi} required />
                    <LoanField id="instalmentAmount" label="Instalment Amount (Rs.)" type="number" min="0.01" step="any" value={form.instalmentAmount} onChange={(value) => updateField('instalmentAmount', value)} error={validationErrors.instalmentAmount} required />
                    <LoanField id="expiryDate" label="Expiry Date" type="date" value={form.expiryDate} onChange={(value) => updateField('expiryDate', value)} error={validationErrors.expiryDate} required />
                    <LoanField
                      id="repaymentType"
                      label="Re-Payment Type"
                      value={form.repaymentType}
                      onChange={(value) => updateField('repaymentType', value)}
                      options={['EMI', 'Bullet', 'Partial'].map((value) => ({ value, label: value }))}
                      error={validationErrors.repaymentType}
                      required
                    />
                    <LoanField
                      id="customerSourced"
                      label="Customer Sourced"
                      value={form.customerSourced}
                      onChange={(value) => updateField('customerSourced', value)}
                      options={['Walkin', 'Lead by staff', 'Referred by Customer'].map((value) => ({ value, label: value }))}
                      error={validationErrors.customerSourced}
                      required
                    />
                    <LoanField id="repaymentStartDate" label="Re-Payment Start Date" type="date" value={form.repaymentStartDate} onChange={(value) => updateField('repaymentStartDate', value)} error={validationErrors.repaymentStartDate} required />
                    <LoanField
                      id="interestPayment"
                      label="Interest Payment"
                      value={form.interestPayment}
                      onChange={(value) => updateField('interestPayment', value)}
                      options={['Maturity', 'Monthly', 'Quarterly', 'Half Yearly'].map((value) => ({ value, label: value }))}
                      error={validationErrors.interestPayment}
                      required
                    />
                    <LoanField id="accountClosure" label="Account Closure (Y/N)" value={form.accountClosure} onChange={(value) => updateField('accountClosure', value)} options={yesNoOptions} error={validationErrors.accountClosure} required />
                  </div>
                </div>
              </div>
            )}

            {currentStep === 3 && (
              <div className="loan-form-section">
                <h2>Charges &amp; Fees</h2>
                <div className="loan-form-section-inner">
                  <div className="loan-form-grid">
                    <LoanField id="chargesSanctionLimit" label="Sanction Limit (Rs.)" type="number" min="0.01" step="any" value={form.charges.sanctionLimit} error={validationErrors['charges.sanctionLimit']} readOnly required />
                    <LoanField id="chargesTenure" label="Tenure (months)" type="number" min="1" max="600" step="1" value={form.charges.tenureMonths} error={validationErrors['charges.tenureMonths']} readOnly required />
                    <LoanField id="processingFees" label="Processing Fees (Rs.)" type="number" min="0" step="any" value={form.charges.processingFees} onChange={(value) => updateSectionField('charges', 'processingFees', value)} error={validationErrors['charges.processingFees']} required />
                    <LoanField id="valuationCharges" label="Valuation Charges (Rs.)" type="number" min="0" step="any" value={form.charges.valuationCharges} onChange={(value) => updateSectionField('charges', 'valuationCharges', value)} error={validationErrors['charges.valuationCharges']} required />
                    <LoanField id="penalInterestPercent" label="Penal Interest (%)" type="number" min="0" max="100" step="any" value={form.charges.penalInterestPercent} onChange={(value) => updateSectionField('charges', 'penalInterestPercent', value)} error={validationErrors['charges.penalInterestPercent']} required />
                  </div>
                </div>
              </div>
            )}

            {currentStep === 4 && (
              <div className="loan-form-section">
                <h2>Basic Details</h2>
                <div className="loan-form-section-inner">
                  <div className="loan-form-grid">
                    <LoanField
                      id="purposeLoan"
                      label="Purpose of Loan"
                      value={form.basicDetails.purposeLoan}
                      onChange={(value) => updateSectionField('basicDetails', 'purposeLoan', value)}
                      options={form.basicDetails.purposeLoan
                        && !loanPurposeOptions.some(({ value }) => value === form.basicDetails.purposeLoan)
                        ? [{ value: form.basicDetails.purposeLoan, label: form.basicDetails.purposeLoan }, ...loanPurposeOptions]
                        : loanPurposeOptions}
                      error={validationErrors['basicDetails.purposeLoan']}
                    />
                    <LoanField
                      id="sectorCode"
                      label="Sector Code"
                      value={form.basicDetails.sectorCode}
                      onChange={(value) => updateSectionField('basicDetails', 'sectorCode', value)}
                      error={validationErrors['basicDetails.sectorCode']}
                      maxLength={30}
                      strictCode
                      onInvalidCodeInput={() => invalidCodeInput('basicDetails.sectorCode')}
                      required
                    />
                    <LoanField
                      id="womenSector"
                      label="Women Sector"
                      value={form.basicDetails.womenSector}
                      onChange={(value) => updateSectionField('basicDetails', 'womenSector', value)}
                      options={yesNoOptions}
                      error={validationErrors['basicDetails.womenSector']}
                      required
                    />
                    <LoanField
                      id="termCode"
                      label="Term Code"
                      value={form.basicDetails.termCode}
                      onChange={(value) => updateSectionField('basicDetails', 'termCode', value)}
                      error={validationErrors['basicDetails.termCode']}
                      maxLength={30}
                      strictCode
                      onInvalidCodeInput={() => invalidCodeInput('basicDetails.termCode')}
                      required
                    />
                    <LoanField
                      id="subSectorCode"
                      label="Sub-Sector Code"
                      value={form.basicDetails.subSectorCode}
                      onChange={(value) => updateSectionField('basicDetails', 'subSectorCode', value)}
                      error={validationErrors['basicDetails.subSectorCode']}
                      maxLength={30}
                      strictCode
                      onInvalidCodeInput={() => invalidCodeInput('basicDetails.subSectorCode')}
                      required
                    />
                  </div>
                </div>
              </div>
            )}

            {currentStep === 1 && (
              <div className="loan-form-section">
                <h2>Security Details</h2>
                <div className="loan-form-section-inner">
                  <div className="loan-form-grid">
                    <LoanField id="securityId" label="Security ID" value={form.security.securityId} onChange={(value) => updateSectionField('security', 'securityId', value)} error={validationErrors['security.securityId']} maxLength={30} strictCode onInvalidCodeInput={() => invalidCodeInput('security.securityId')} required />
                    <LoanField
                      id="securityType"
                      label="Security Type"
                      value={form.security.securityType}
                      onChange={(value) => updateSectionField('security', 'securityType', value)}
                      options={form.security.securityType
                        && !securityTypeOptions.some(({ value }) => value === form.security.securityType)
                        ? [{ value: form.security.securityType, label: form.security.securityType }, ...securityTypeOptions]
                        : securityTypeOptions}
                    />
                    <LoanField id="valuerCode" label="Valuer Code" value={form.security.valuerCode} onChange={(value) => updateSectionField('security', 'valuerCode', value)} error={validationErrors['security.valuerCode']} maxLength={30} strictCode onInvalidCodeInput={() => invalidCodeInput('security.valuerCode')} required />
                    <LoanField id="valuerDescription" label="Valuer Description" value={form.security.valuerDescription} onChange={(value) => updateSectionField('security', 'valuerDescription', value)} error={validationErrors['security.valuerDescription']} maxLength={MAX_TEXT_LENGTH} required />
                  </div>
                </div>

                <div className="loan-form-section-inner">
                  <div className="loan-data-table-wrap">
                    <table className="loan-data-table" style={{ minWidth: 1050 }}>
                      <thead>
                        <tr>
                          <th scope="col">Sr.</th>
                          <th scope="col">Inventory Item ID</th>
                          <th scope="col">Ornament Description</th>
                          <th scope="col">Gross Weight</th>
                          <th scope="col">Net Weight</th>
                          <th scope="col">Appraisal Date</th>
                          <th scope="col">Assessed Purity Carat</th>
                          <th scope="col">Rate (Rs.)</th>
                          <th scope="col">Amount (Rs.)</th>
                          <th scope="col">Limit (Rs.)</th>
                          <th scope="col">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {form.security.inventoryItems.map((item, index) => {
                          const fieldError = (field) => validationErrors[`security.inventoryItems.${index}.${field}`];
                          return (
                            <tr key={item.id}>
                              <td>{index + 1}</td>
                              <td><LoanField id={`${item.id}-itemId`} label="Inventory Item ID" value={item.itemId} onChange={(value) => updateInventoryItem(index, 'itemId', value)} error={fieldError('itemId')} required /></td>
                              <td><LoanField id={`${item.id}-description`} label="Ornament Description" value={item.ornamentDescription} onChange={(value) => updateInventoryItem(index, 'ornamentDescription', value)} error={fieldError('ornamentDescription')} maxLength={MAX_DESCRIPTION_LENGTH} onInvalidLengthInput={() => invalidLengthInput(`security.inventoryItems.${index}.ornamentDescription`, 'Ornament description', MAX_DESCRIPTION_LENGTH)} required /></td>
                              <td><LoanField id={`${item.id}-grossWeight`} label="Gross Weight" type="number" min="0.01" step="any" value={item.grossWeight} onChange={(value) => updateInventoryItem(index, 'grossWeight', value)} error={fieldError('grossWeight')} required /></td>
                              <td><LoanField id={`${item.id}-netWeight`} label="Net Weight" type="number" min="0.01" step="any" value={item.netWeight} onChange={(value) => updateInventoryItem(index, 'netWeight', value)} error={fieldError('netWeight')} required /></td>
                              <td><LoanField id={`${item.id}-appraisalDate`} label="Appraisal Date" type="date" value={item.appraisalDate} onChange={(value) => updateInventoryItem(index, 'appraisalDate', value)} error={fieldError('appraisalDate')} required /></td>
                              <td><LoanField id={`${item.id}-purity`} label="Purity" value={item.purity} onChange={(value) => updateInventoryItem(index, 'purity', value)} options={['18K', '22K', '24K'].map((value) => ({ value, label: value }))} error={fieldError('purity')} required /></td>
                              <td><LoanField id={`${item.id}-rate`} label="Rate" type="number" min="0.01" step="any" value={item.rate} onChange={(value) => updateInventoryItem(index, 'rate', value)} error={fieldError('rate')} required /></td>
                              <td><LoanField id={`${item.id}-amount`} label="Amount" type="number" min="0.01" step="any" value={item.amount} onChange={(value) => updateInventoryItem(index, 'amount', value)} error={fieldError('amount')} required /></td>
                              <td><LoanField id={`${item.id}-limit`} label="Limit" type="number" min="0.01" step="any" value={item.limit} onChange={(value) => updateInventoryItem(index, 'limit', value)} error={fieldError('limit')} required /></td>
                              <td>
                                <button
                                  className="icon-button"
                                  type="button"
                                  onClick={() => removeInventoryItem(item.id)}
                                  aria-label={`Delete gold item ${index + 1}`}
                                  title="Delete gold item"
                                >
                                  <Trash2 size={16} aria-hidden="true" />
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                  {validationErrors['security.inventoryItems'] && (
                    <span className="field-error" role="alert">{validationErrors['security.inventoryItems']}</span>
                  )}
                  <button className="secondary-button" type="button" onClick={addInventoryItem}>
                    <Plus size={16} aria-hidden="true" /> Add Gold Item
                  </button>
                </div>

                <div className="loan-form-section-inner">
                  <div className="loan-form-grid">
                    <LoanField id="marginPercent" label="Margin (%)" type="number" min="0" max="100" step="any" value={form.security.marginPercent} onChange={(value) => updateSectionField('security', 'marginPercent', value)} error={validationErrors['security.marginPercent']} required />
                    <LoanField id="limitAvailable" label="Limit Available for Sanction (Rs.)" type="number" min="0.01" step="any" value={form.security.limitAvailable} error={validationErrors['security.limitAvailable']} readOnly required />
                  </div>
                </div>
              </div>
            )}

            {currentStep === 6 && (
              <div className="loan-form-section">
                <h2>Disbursement</h2>
                <div className="loan-form-section-inner">
                  <div className="loan-form-grid">
                    <LoanField
                      id="disbursementAccountNumber"
                      label="Account Number"
                      value={form.disbursement.accountNumber}
                      onChange={(value) => updateSectionField('disbursement', 'accountNumber', value)}
                      error={disbursementFieldError('accountNumber')}
                      maxLength={MAX_BANK_ACCOUNT_LENGTH}
                      numericOnly
                      onInvalidNumericInput={(attemptedValue) => invalidNumericInput('disbursement.accountNumber', attemptedValue)}
                      onInvalidLengthInput={invalidAccountNumberLengthInput}
                      required
                    />
                    <LoanField id="disbursementMode" label="Mode of Disbursement" value={form.disbursement.mode} onChange={(value) => updateSectionField('disbursement', 'mode', value)} options={['Internal Transfer', 'NEFT', 'RTGS', 'IMPS', 'Pay Check'].map((value) => ({ value, label: value }))} error={disbursementFieldError('mode')} required />
                    <LoanField
                      id="disbursementAccountType"
                      label="Type of Account"
                      value={form.disbursement.accountType}
                      onChange={(value) => updateSectionField('disbursement', 'accountType', value)}
                      options={form.disbursement.accountType
                        && !accountTypeOptions.some(({ value }) => value === form.disbursement.accountType)
                        ? [{ value: form.disbursement.accountType, label: form.disbursement.accountType }, ...accountTypeOptions]
                        : accountTypeOptions}
                      error={disbursementFieldError('accountType')}
                    />
                    <LoanField id="disbursementType" label="Disbursement Type" value={form.disbursement.type} onChange={(value) => updateSectionField('disbursement', 'type', value)} options={['Full', 'Partial'].map((value) => ({ value, label: value }))} error={disbursementFieldError('type')} required />
                    <LoanField id="disbursementBankName" label="Bank Name" value={form.disbursement.bankName} onChange={(value) => updateSectionField('disbursement', 'bankName', value)} error={disbursementFieldError('bankName')} maxLength={MAX_NAME_LENGTH} onInvalidLengthInput={() => invalidLengthInput('disbursement.bankName', 'Bank name', MAX_NAME_LENGTH)} required />
                    <LoanField id="disbursementAmount" label="Disbursement Amount (Rs.)" type="number" min="0.01" step="any" value={form.disbursement.amount} onChange={(value) => updateSectionField('disbursement', 'amount', value)} error={disbursementFieldError('amount')} required />
                    <LoanField id="disbursementIfsc" label="IFSC Code" value={form.disbursement.ifscCode} onChange={(value) => updateSectionField('disbursement', 'ifscCode', value.toUpperCase())} error={disbursementFieldError('ifscCode')} maxLength={11} strictCode onInvalidCodeInput={() => invalidCodeInput('disbursement.ifscCode')} required />
                    <LoanField id="disbursementMobile" label="Mobile Number" type="tel" value={form.disbursement.mobileNumber} onChange={(value) => updateSectionField('disbursement', 'mobileNumber', value.replace(/\D/g, '').slice(0, 10))} error={disbursementFieldError('mobileNumber')} maxLength={10} required />
                  </div>
                </div>
              </div>
            )}

            <div className="loan-step-actions">
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                <button className="loan-secondary-btn" type="button" onClick={handleCancel}>Cancel</button>
                {currentStep > 0 && (
                  <button className="loan-secondary-btn" type="button" onClick={goToPreviousStep}>
                    <ArrowLeft size={16} aria-hidden="true" />
                    Previous
                  </button>
                )}
              </div>
              {currentStep < steps.length - 1 ? (
                <button className="loan-primary-btn" type="button" onClick={goToNextStep}>
                  Next <ArrowRight size={16} aria-hidden="true" />
                </button>
              ) : (
                <button className="loan-primary-btn" type="submit" disabled={isSubmitting}>
                  {isSubmitting ? 'Saving...' : isEditMode ? 'Save Changes' : 'Submit'}
                  <Check size={16} aria-hidden="true" />
                </button>
              )}
            </div>
          </form>
            </div>
          </div>
        </Card>

        {partyToDelete && (
          <div className="loan-delete-overlay" role="presentation">
            <section
              className="loan-delete-dialog"
              role="alertdialog"
              aria-modal="true"
              aria-labelledby="loan-delete-title"
              aria-describedby="loan-delete-message"
              onKeyDown={trapDeleteDialogFocus}
            >
              <h2 id="loan-delete-title">Delete related party</h2>
              <p id="loan-delete-message">Are you sure you want to delete this related party?</p>
              <div className="loan-delete-actions">
                <button
                  ref={cancelDeleteButtonRef}
                  className="loan-delete-cancel"
                  type="button"
                  onClick={() => setPartyToDelete(null)}
                >
                  Cancel
                </button>
                <button
                  ref={confirmDeleteButtonRef}
                  className="loan-delete-confirm"
                  type="button"
                  onClick={confirmRemoveRelatedParty}
                >
                  Delete
                </button>
              </div>
            </section>
          </div>
        )}
        <style jsx>{`
          .loan-application-shell {
            min-width: 0;
          }

          :global(.loan-dashboard-back) {
            width: 40px;
            height: 40px;
            border: 1px solid #dfe8e8;
            background: #fff;
          }

          :global(.loan-form-back) {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
            min-height: 38px;
            margin-bottom: 12px;
            padding: 0 13px;
            border: 1px solid #d2dfe2;
            border-radius: 8px;
            background: #f7f9fa;
            color: #1d3b48;
            font: inherit;
            font-size: 13px;
            font-weight: 650;
            cursor: pointer;
            transition: border-color .15s ease, background .15s ease, color .15s ease;
          }
          :global(.loan-form-back:hover) {
            border-color: #b8d4cf;
            background: #f4faf9;
            color: #177e7a;
          }

          .loan-form-back-row {
            display: flex;
            justify-content: flex-end;
          }

          :global(.loan-dashboard-back:hover) {
            border-color: #b8d4cf;
          }

          :global(.loan-application-card) {
            padding: 20px;
          }

          .loan-form-layout {
            display: grid;
            grid-template-columns: minmax(0, 1fr);
            gap: 20px;
            min-height: 600px;
          }

          /* Keep all seven application sections in one horizontal navigation row. */
          .loan-form-nav {
            display: flex;
            flex-direction: row;
            align-items: center;
            gap: 7px;
            width: 100%;
            min-width: 0;
            overflow-x: auto;
            overflow-y: hidden;
            padding: 0 0 12px;
            border-right: 0;
            border-bottom: 1px solid #e5ecec;
            scrollbar-width: thin;
          }

          .loan-form-nav-item {
            min-height: 42px;
            display: inline-flex;
            flex: 0 0 auto;
            align-items: center;
            gap: 8px;
            white-space: nowrap;
            padding: 7px 10px;
            border: 1px solid transparent;
            border-radius: 7px;
            color: #60747a;
            font-size: 12px;
            font-weight: 600;
            text-align: left;
          }

          .loan-form-nav-item:hover {
            background: #f6faf9;
          }

          .loan-form-nav-item.active {
            border-color: #cfe1df;
            color: #165f5c;
            background: #edf6f4;
          }

          .loan-form-nav-item.complete {
            color: #247b67;
          }

          .loan-form-nav-number {
            width: 26px;
            height: 26px;
            display: grid;
            flex: 0 0 26px;
            place-items: center;
            border: 1px solid #d7e2e3;
            border-radius: 50%;
            color: #657b81;
            background: #fff;
            font-size: 11px;
          }

          .loan-form-nav-item.active .loan-form-nav-number {
            border-color: #177e7a;
            color: #fff;
            background: #177e7a;
          }

          .loan-form-nav-item.complete .loan-form-nav-number {
            border-color: #b8dfd3;
            color: #26795f;
            background: #e5f5ef;
          }

          .loan-form-panel {
            min-width: 0;
          }

          :global(.loan-field em) {
            color: #dc2626;
            font-style: normal;
          }

          :global(.loan-primary-btn) {
            background: #177e7a;
            border-color: #177e7a;
            color: #fff;
            box-shadow: 0 6px 18px rgba(23, 126, 122, 0.18);
          }

          .borrower-information-grid {
            grid-template-columns: repeat(4, minmax(0, 1fr));
            align-items: start;
            gap: 14px;
          }

          .borrower-information-grid > * {
            min-width: 0;
          }

          .loan-data-table-wrap {
            width: 100%;
            max-width: 100%;
            overflow-x: auto;
          }

          .loan-data-table {
            width: 100%;
            border-collapse: collapse;
          }

          .repayment-assumption,
          .section-help {
            margin: 12px 0 0;
            color: #708087;
            font-size: 12px;
            line-height: 1.55;
          }

          .repayment-table-scroll {
            overflow-x: auto;
            margin-top: 18px;
            border: 1px solid #dfe8eb;
            border-radius: 7px;
          }

          .repayment-table {
            min-width: 850px;
          }

          .repayment-empty {
            min-height: 140px;
            margin-top: 18px;
          }

          .security-file-control {
            position: relative;
            width: 100%;
            min-height: 42px;
            display: flex;
            align-items: center;
            gap: 8px;
            overflow: hidden;
            padding: 0 11px;
            border: 1px solid #dfe8eb;
            border-radius: 8px;
            color: #35535d;
            background: #f7fafb;
            font-size: 12px;
            font-weight: 500;
          }

          .security-file-control > span {
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
          }

          .security-file-control input {
            position: absolute;
            inset: 0;
            width: 100%;
            height: 100%;
            cursor: pointer;
            opacity: 0;
          }

          .security-file-control:focus-within {
            border-color: #177e7a;
            box-shadow: 0 0 0 3px #177e7a1a;
          }

          .security-file-help {
            color: #7c8b8f;
            font-size: 10px;
            font-weight: 400;
            line-height: 1.4;
          }

          .security-message {
            margin-top: 14px;
            padding: 10px 12px;
            border: 1px solid #c9e6d6;
            border-radius: 7px;
            color: #25613d;
            background: #f1fbf5;
            font-size: 12px;
          }

          .security-actions {
            display: flex;
            justify-content: flex-end;
            gap: 10px;
            margin-top: 16px;
          }

          .workflow-unavailable {
            min-height: 180px;
            flex-direction: column;
            gap: 8px;
            padding: 24px;
            text-align: center;
          }

          .workflow-unavailable strong {
            color: #395b60;
          }

          .workflow-unavailable span {
            max-width: 460px;
            color: #708087;
            font-size: 12px;
            line-height: 1.5;
          }

          .loan-form-nav-item:focus-visible,
          :global(.loan-dashboard-back:focus-visible) {
            outline: 3px solid #177e7a55;
            outline-offset: 2px;
          }

          @media (max-width: 1000px) {
            .loan-form-layout {
              grid-template-columns: minmax(0, 1fr);
              gap: 18px;
            }

            /* Keep all four borrower-name fields on one row on desktop/tablet. */
            .borrower-information-grid {
              grid-template-columns: repeat(4, minmax(0, 1fr));
              gap: 12px;
            }
          }

          @media (max-width: 720px) {
            :global(.loan-application-card) {
              padding: 16px;
            }

            .loan-form-layout {
              grid-template-columns: 1fr;
              gap: 18px;
              min-height: 0;
            }

            .loan-form-nav {
              display: flex;
              flex-direction: row;
              flex-wrap: nowrap;
              gap: 5px;
              overflow-x: auto;
              padding: 0 0 12px;
              border-right: 0;
              border-bottom: 1px solid #e5ecec;
            }

            .loan-form-nav-item {
              flex: 0 0 auto;
              min-height: 40px;
              padding: 6px 8px;
              font-size: 10px;
              white-space: nowrap;
            }

            .loan-form-nav-number {
              width: 23px;
              height: 23px;
              flex-basis: 23px;
            }

            .borrower-information-grid {
              grid-template-columns: repeat(2, minmax(0, 1fr));
            }

            .security-actions {
              flex-direction: column-reverse;
            }

            .security-actions button {
              width: 100%;
            }
          }

          @media (max-width: 440px) {
            .borrower-information-grid {
              grid-template-columns: 1fr;
            }
          }
        `}</style>
      </div>
    </AppShell>
  );
}
