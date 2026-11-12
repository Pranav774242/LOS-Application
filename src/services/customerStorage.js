export const CUSTOMER_STORAGE_KEY = 'los_customer_management_records';

export function readCustomerRecords(fallbackRecords = []) {
  if (typeof window === 'undefined') return fallbackRecords;

  const storedRecords = window.localStorage.getItem(CUSTOMER_STORAGE_KEY);
  if (!storedRecords) return fallbackRecords;

  const records = JSON.parse(storedRecords);
  if (!Array.isArray(records)) {
    throw new Error('Saved customer records have an invalid format.');
  }
  return records;
}

export function writeCustomerRecords(records) {
  window.localStorage.setItem(CUSTOMER_STORAGE_KEY, JSON.stringify(records));
}

function serializeFile(file) {
  return file && typeof file.name === 'string' ? { name: file.name } : null;
}

export function serializeCustomerForm(form) {
  return {
    ...form,
    appointmentLetter: serializeFile(form.appointmentLetter),
    salaryCertificate: serializeFile(form.salaryCertificate),
    formNo16: serializeFile(form.formNo16),
    documents: (form.documents || []).map((document) => ({
      ...document,
      file: serializeFile(document.file),
    })),
  };
}

export function getCustomerDisplayName(form) {
  return [form.fullName, form.middleName, form.lastName]
    .map((part) => String(part || '').trim())
    .filter(Boolean)
    .join(' ');
}

export function getCustomerInitials(name) {
  return String(name)
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

export function normalizeCustomerType(value, age) {
  const normalized = String(value || '').trim().toLowerCase();
  if (normalized === 'minor') return 'Minor';
  if (normalized === 'senior' || normalized === 'senior citizen') return 'Senior';
  if (normalized === 'adult' || normalized === 'normal') return 'Adult';

  const numericAge = String(age ?? '').trim() ? Number(age) : Number.NaN;
  if (Number.isFinite(numericAge) && numericAge < 18) return 'Minor';
  if (Number.isFinite(numericAge) && numericAge >= 60) return 'Senior';
  return 'Adult';
}

export function getCustomerLoanHistory(customerId, applications = []) {
  return applications
    .filter((application) => application.customerId === customerId)
    .map((application, index) => {
      const loan = application.goldLoanForm || {};
      const disbursement = loan.disbursement || {};

      return {
        id: application.id || `${customerId}-loan-${index + 1}`,
        source: 'application',
        bankName: disbursement.bankName || '',
        accountNumber: disbursement.accountNumber || loan.loanAccountNumber || '',
        loanType: loan.productName || application.product || '',
        totalOutstanding: loan.outstandingAmount || loan.totalOutstanding || '',
        emi: loan.instalmentAmount || loan.installmentAmount || '',
        expiryDate: loan.expiryDate || ''
      };
    });
}

export function createCustomerRecord(form, existingCustomer = {}) {
  const name = getCustomerDisplayName(form) || existingCustomer.name || '';
  return {
    ...existingCustomer,
    name,
    initials: getCustomerInitials(name),
    type: form.customerType || existingCustomer.type || 'Individual',
    phone: form.mobileNo || existingCustomer.phone || '',
    email: form.email || existingCustomer.email || '',
    kyc: form.kycStatus || existingCustomer.kyc || '',
    activeLoans: existingCustomer.activeLoans ?? 0,
    onboardingForm: serializeCustomerForm(form),
  };
}
