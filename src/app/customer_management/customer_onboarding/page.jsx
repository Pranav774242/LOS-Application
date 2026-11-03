
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  ArrowRight,
  Briefcase,
  Download,
  Eye,
  FileText,
  Home,
  Landmark,
  Plus,
  Trash2,
  UploadCloud,
  Wallet
} from 'lucide-react';
import AppShell from '../../../components/AppShell';
import { api } from '../../../services/api.js';
import {
  createCustomerRecord,
  readCustomerRecords,
  writeCustomerRecords,
} from '../../../services/customerStorage';

function createCustomerId(records) {
  let id;
  do {
    const suffix = String(Math.floor(Math.random() * 100000)).padStart(5, '0');
    id = `CUS-${new Date().getFullYear()}-${suffix}`;
  } while (records.some((record) => record.id === id));
  return id;
}

const wizardSteps = [
  { id: 'personal', label: 'Personal Details', icon: UserIcon },
  { id: 'address', label: 'Address Details', icon: Home },
  { id: 'employment', label: 'Employment info', icon: Briefcase },
  { id: 'income', label: 'Income Details', icon: Wallet },
  { id: 'documents', label: 'Documents', icon: FileText },
  { id: 'loan', label: 'Loan Details', icon: Landmark }
];

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MOBILE_REGEX = /^[6-9]\d{9}$/;
const PAN_REGEX = /^[A-Z]{5}[0-9]{4}[A-Z]$/;
const AADHAAR_REGEX = /^\d{12}$/;
const PIN_REGEX = /^\d{6}$/;
const CKYC_REGEX = /^\d{14}$/;
const NAME_REGEX = /^[A-Za-z][A-Za-z .'-]*$/;
const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ACCEPTED_FILE_EXTENSIONS = ['pdf', 'jpg', 'jpeg', 'png'];
const PERSON_NAME_FIELDS = new Set([
  'fullName',
  'middleName',
  'lastName',
  'fatherName',
  'motherName'
]);
const DIGIT_FIELDS = new Set([
  'mobileNo',
  'alternateContact',
  'aadhaarNumber',
  'pinCode',
  'bankAccountNo',
  'accountNumber',
  'kycRegn'
]);
const MONEY_FIELDS = new Set([
  'annualIncome',
  'grossIncome',
  'tdsPaid',
  'totalOutstanding',
  'emi'
]);

const sanitizeInput = (key, value) => {
  if (typeof value !== 'string') return value;

  if (PERSON_NAME_FIELDS.has(key)) {
    return value.replace(/[^A-Za-z .'-]/g, '').replace(/ {2,}/g, ' ');
  }

  if (DIGIT_FIELDS.has(key)) {
    const limit = key === 'mobileNo' || key === 'alternateContact'
      ? 10
      : key === 'aadhaarNumber'
        ? 12
        : key === 'pinCode'
          ? 6
          : key === 'kycRegn'
            ? 14
            : undefined;
    const digits = value.replace(/\D/g, '');
    return limit ? digits.slice(0, limit) : digits;
  }

  if (MONEY_FIELDS.has(key)) {
    const normalized = value.replace(/[^\d.]/g, '');
    const decimalIndex = normalized.indexOf('.');
    return decimalIndex === -1
      ? normalized
      : `${normalized.slice(0, decimalIndex + 1)}${normalized
        .slice(decimalIndex + 1)
        .replace(/\./g, '')}`;
  }

  return value;
};

const createPreviousEmployment = () => ({
  employmentType: '',
  employerName: '',
  designation: '',
  location: '',
  dateOfJoining: '',
  dateOfRelieving: ''
});

const createDocument = (name, required = false) => ({
  name,
  required,
  file: null,
  expiryDate: '',
  remarks: ''
});

const documentTemplates = {
  Retail: [
    'PAN Card',
    'Identity Proof (Aadhaar / Passport / Voter ID)',
    'Address Proof',
    'Passport-size Photograph',
    'Recent Bank Statements (6 months)',
    'Income Proof (Salary Slips / ITR)'
  ],
  Corporate: [
    'Company PAN Card',
    'Certificate of Incorporation / Registration',
    'Memorandum and Articles of Association / Partnership Deed',
    'Board Resolution / Authorised Signatory Proof',
    'GST Registration Certificate',
    'Registered Business Address Proof',
    'KYC Documents for Directors / Partners',
    'Audited Financial Statements (3 years)',
    'Income Tax Returns (3 years)',
    'Bank Statements (12 months)'
  ]
};

const createDocuments = (category) =>
  documentTemplates[category].map((name) => createDocument(name, true));

const createTaxReturns = () => {
  const now = new Date();
  const currentFinancialYear =
    now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;

  return [0, 1, 2].map((offset) => ({
    financialYear: `${currentFinancialYear - offset}-${String(
      currentFinancialYear - offset + 1
    ).slice(-2)}`,
    grossIncome: '',
    tdsPaid: ''
  }));
};

const createInitialForm = () => ({
  leadId: '',
  panCard: '',
    branch: '',
  title: '',
  fullName: '',
  middleName: '',
  lastName: '',
  dob: '',
  age: '',
  fatherName: '',
  motherName: '',
  email: '',
  customerType: '',
  kycStatus: 'Pending',
  aadhaarNumber: '',
  gender: '',
  kycRegn: '',
  maritalStatus: '',
  mobileNo: '',
  occupation: '',
  alternateContact: '',
  residentialStatus: '',
  residentialType: '',
  flatBuildingName: '',
  streetRoad: '',
  landMark: '',
  city: '',
  state: '',
  pinCode: '',
  employmentType: '',
  loanCategory: 'Retail',
  designation: '',
  employerName: '',
  dateOfJoining: '',
  qualification: '',
  empEmailId: '',
  location: '',
  dateOfRetirement: '',
  appointmentLetter: null,
  previousEmployment: [],
  annualIncome: '',
  incomeTaxFilerStatus: '',
  bankName: '',
  bankAccountNo: '',
  riskCategory: '',
  salaryCertificate: null,
  formNo16: null,
  taxReturns: createTaxReturns(),
  documents: createDocuments('Retail'),
  loanHistory: []
});

const normalizePan = (value) => {
  const characters = value.toUpperCase().replace(/[^A-Z0-9]/g, '');
  let pan = '';

  for (const character of characters) {
    const position = pan.length;
    const valid =
      position < 5
        ? /[A-Z]/.test(character)
        : position < 9
          ? /\d/.test(character)
          : /[A-Z]/.test(character);

    if (valid) pan += character;
    if (pan.length === 10) break;
  }

  return pan;
};

const getAge = (dateOfBirth) => {
  if (!dateOfBirth) return '';

  const [year, month, day] = dateOfBirth.split('-').map(Number);
  const date = new Date(year, month - 1, day);

  if (
    Number.isNaN(date.getTime()) ||
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return '';
  }

  const today = new Date();
  let age = today.getFullYear() - year;

  if (
    today.getMonth() < month - 1 ||
    (today.getMonth() === month - 1 && today.getDate() < day)
  ) {
    age -= 1;
  }

  return String(age);
};

const isValidDate = (value) => {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;

  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(year, month - 1, day);

  return (
    date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day
  );
};

const isFutureDate = (value) =>
  isValidDate(value) && value > new Date().toISOString().slice(0, 10);

const isNonNegativeNumber = (value) =>
  value !== '' && Number.isFinite(Number(value)) && Number(value) >= 0;

const getFileError = (file) => {
  if (!file) return '';

  const extension = file.name.split('.').pop()?.toLowerCase();

  if (!ACCEPTED_FILE_EXTENSIONS.includes(extension)) {
    return 'Upload a PDF, JPG, JPEG, or PNG file.';
  }

  if (file.size > MAX_FILE_SIZE) {
    return 'File size must be 5 MB or less.';
  }

  return '';
};

const validateStep = (stepIndex, values) => {
  const errors = {};

  const required = (key, value, message) => {
    if (!String(value ?? '').trim()) errors[key] = message;
  };

  const validateMoney = (
    key,
    value,
    label,
    { requiredValue = false, positive = false } = {}
  ) => {
    if (!String(value ?? '').trim()) {
      if (requiredValue) errors[key] = `${label} is required.`;
      return;
    }

    if (
      !isNonNegativeNumber(value) ||
      (positive && Number(value) <= 0)
    ) {
      errors[key] = `${label} must be a valid ${
        positive ? 'positive' : 'non-negative'
      } amount.`;
    }
  };

  if (stepIndex === 0) {
    required('fullName', values.fullName, 'First name is required.');
    required('lastName', values.lastName, 'Last name is required.');
    [
      ['fullName', values.fullName, 'First name'],
      ['middleName', values.middleName, 'Middle name'],
      ['lastName', values.lastName, 'Last name'],
      ['fatherName', values.fatherName, "Father's / husband's name"],
      ['motherName', values.motherName, "Mother's name"]
    ].forEach(([key, value, label]) => {
      if (value && !NAME_REGEX.test(value.trim())) {
        errors[key] = `${label} can contain letters and spaces only.`;
      }
    });
    required('customerType', values.customerType, 'Customer type is required.');
    required('dob', values.dob, 'Date of birth is required.');

    if (values.dob && !isValidDate(values.dob)) {
      errors.dob = 'Enter a valid date of birth.';
    } else if (isFutureDate(values.dob)) {
      errors.dob = 'Date of birth cannot be in the future.';
    } else if (values.dob && getAge(values.dob) && Number(getAge(values.dob)) < 18) {
      errors.dob = 'Applicant must be at least 18 years old.';
    }

    required('gender', values.gender, 'Select a gender.');
    required(
      'fatherName',
      values.fatherName,
      "Father's / husband's name is required."
    );
    required('motherName', values.motherName, "Mother's name is required.");
    required('mobileNo', values.mobileNo, 'Mobile number is required.');

    if (values.mobileNo && !MOBILE_REGEX.test(values.mobileNo)) {
      errors.mobileNo = 'Enter a valid Indian 10-digit mobile number.';
    }

    required('email', values.email, 'Email address is required.');

    if (values.email && !EMAIL_REGEX.test(values.email)) {
      errors.email = 'Enter a valid email address.';
    }

    required('panCard', values.panCard, 'PAN number is required.');

    if (values.panCard && !PAN_REGEX.test(values.panCard)) {
      errors.panCard =
        'Enter a valid PAN number in the format ABCDE1234F.';
    }

    if (
      values.aadhaarNumber &&
      !AADHAAR_REGEX.test(values.aadhaarNumber)
    ) {
      errors.aadhaarNumber = 'Aadhaar number must contain 12 digits.';
    }

    if (values.kycRegn && !CKYC_REGEX.test(values.kycRegn)) {
      errors.kycRegn = 'CKYC registration number must contain 14 digits.';
    }

    if (
      values.alternateContact &&
      !MOBILE_REGEX.test(values.alternateContact)
    ) {
      errors.alternateContact =
        'Enter a valid Indian 10-digit contact number.';
    }
  }

  if (stepIndex === 1) {
    required(
      'residentialType',
      values.residentialType,
      'Select a residential type.'
    );
    required('residentialStatus', values.residentialStatus, 'Select a residential status.');
    required('flatBuildingName', values.flatBuildingName, 'Flat / building name is required.');
    required('streetRoad', values.streetRoad, 'Street / road is required.');
    required('city', values.city, 'City is required.');
    required('state', values.state, 'State is required.');
    required('pinCode', values.pinCode, 'PIN code is required.');

    if (values.pinCode && !PIN_REGEX.test(values.pinCode)) {
      errors.pinCode = 'PIN code must contain 6 digits.';
    }
    ['flatBuildingName', 'streetRoad', 'landMark', 'city'].forEach((field) => {
      if (values[field] && !/^[A-Za-z0-9 .,'#/-]+$/.test(values[field])) {
        errors[field] = 'Use letters, numbers, spaces, and common address punctuation only.';
      }
    });
  }

  if (stepIndex === 2) {
    required(
      'employmentType',
      values.employmentType,
      'Select an employment type.'
    );
    const selfEmployed = values.employmentType === 'Self Employed';
    required('designation', values.designation, `${selfEmployed ? 'Nature of business / profession' : 'Designation'} is required.`);
    required('employerName', values.employerName, `${selfEmployed ? 'Business / trade name' : 'Employer name'} is required.`);
    required(
      'dateOfJoining',
      values.dateOfJoining,
      `${selfEmployed ? 'Business start date' : 'Date of joining'} is required.`
    );

    if (values.dateOfJoining && !isValidDate(values.dateOfJoining)) {
      errors.dateOfJoining = 'Enter a valid date of joining.';
    } else if (isFutureDate(values.dateOfJoining)) {
      errors.dateOfJoining = 'Date of joining cannot be in the future.';
    }

    required('qualification', values.qualification, 'Qualification is required.');
    required('location', values.location, `${selfEmployed ? 'Business location' : 'Employer location'} is required.`);
    if (values.employerName && !/^[A-Za-z0-9 .,'&()/-]+$/.test(values.employerName)) {
      errors.employerName = 'Employer name contains unsupported characters.';
    }
    if (values.designation && !/^[A-Za-z0-9 .,'&()/-]+$/.test(values.designation)) {
      errors.designation = 'Designation contains unsupported characters.';
    }
    if (values.qualification && !/^[A-Za-z0-9 .,'&()/-]+$/.test(values.qualification)) {
      errors.qualification = 'Qualification contains unsupported characters.';
    }

    if (values.empEmailId && !EMAIL_REGEX.test(values.empEmailId)) {
      errors.empEmailId = 'Enter a valid employee email address.';
    }

    if (!selfEmployed && values.dateOfRetirement) {
      if (!isValidDate(values.dateOfRetirement)) {
        errors.dateOfRetirement = 'Enter a valid retirement date.';
      } else if (
        values.dateOfJoining &&
        isValidDate(values.dateOfJoining) &&
        values.dateOfRetirement <= values.dateOfJoining
      ) {
        errors.dateOfRetirement =
          'Retirement date must be after the date of joining.';
      } else if (!isFutureDate(values.dateOfRetirement)) {
        errors.dateOfRetirement = 'Retirement date must be in the future.';
      }
    }

    if (values.appointmentLetter) {
      const fileError = getFileError(values.appointmentLetter);
      if (fileError) errors.appointmentLetter = fileError;
    }

    values.previousEmployment.forEach((record, index) => {
      const prefix = `previousEmployment.${index}.`;
      const hasValues = Object.values(record).some((value) =>
        String(value ?? '').trim()
      );

      if (!hasValues) return;

      if (record.employerName && !/^[A-Za-z0-9 .,'&()/-]+$/.test(record.employerName)) {
        errors[`${prefix}employerName`] = 'Employer name contains unsupported characters.';
      }
      if (record.designation && !/^[A-Za-z0-9 .,'&()/-]+$/.test(record.designation)) {
        errors[`${prefix}designation`] = 'Designation contains unsupported characters.';
      }
      if (record.location && !/^[A-Za-z0-9 .,'#/-]+$/.test(record.location)) {
        errors[`${prefix}location`] = 'Location contains unsupported characters.';
      }

      required(
        `${prefix}employmentType`,
        record.employmentType,
        'Employment type is required.'
      );
      required(
        `${prefix}employerName`,
        record.employerName,
        'Employer name is required.'
      );
      required(
        `${prefix}designation`,
        record.designation,
        'Designation is required.'
      );
      required(`${prefix}location`, record.location, 'Location is required.');
      required(
        `${prefix}dateOfJoining`,
        record.dateOfJoining,
        'Date of joining is required.'
      );
      required(
        `${prefix}dateOfRelieving`,
        record.dateOfRelieving,
        'Date of relieving is required.'
      );

      if (record.dateOfJoining && !isValidDate(record.dateOfJoining)) {
        errors[`${prefix}dateOfJoining`] = 'Enter a valid joining date.';
      }

      if (record.dateOfRelieving && !isValidDate(record.dateOfRelieving)) {
        errors[`${prefix}dateOfRelieving`] = 'Enter a valid relieving date.';
      }

      if (
        isValidDate(record.dateOfJoining) &&
        isValidDate(record.dateOfRelieving) &&
        record.dateOfRelieving < record.dateOfJoining
      ) {
        errors[`${prefix}dateOfRelieving`] =
          'Relieving date cannot be before joining date.';
      }
    });
  }

  if (stepIndex === 3) {
    validateMoney('annualIncome', values.annualIncome, 'Annual income', {
      requiredValue: true,
      positive: true
    });

    required(
      'incomeTaxFilerStatus',
      values.incomeTaxFilerStatus,
      'Select an income tax filer status.'
    );
    required('bankName', values.bankName, 'Bank name is required.');
    if (values.bankName && !/^[A-Za-z0-9 .,'&()/-]+$/.test(values.bankName)) {
      errors.bankName = 'Bank name contains unsupported characters.';
    }
    required(
      'bankAccountNo',
      values.bankAccountNo,
      'Bank account number is required.'
    );
    required('riskCategory', values.riskCategory, 'Select a risk category.');

    ['salaryCertificate', 'formNo16'].forEach((field) => {
      if (values[field]) {
        const fileError = getFileError(values[field]);
        if (fileError) errors[field] = fileError;
      }
    });

    values.taxReturns.forEach((row, index) => {
      if (!row.grossIncome && !row.tdsPaid) return;

      validateMoney(
        `taxReturns.${index}.grossIncome`,
        row.grossIncome,
        'Gross income',
        { requiredValue: true }
      );
      validateMoney(
        `taxReturns.${index}.tdsPaid`,
        row.tdsPaid,
        'TDS paid',
        { requiredValue: true }
      );
    });
  }

  if (stepIndex === 4) {
    values.documents.forEach((document, index) => {
      required(`documents.${index}.name`, document.name, 'Document name is required.');
      if (document.required && !document.file) {
        errors[`documents.${index}.file`] = `${document.name || 'This document'} is required.`;
      }
      if (document.name && !/^[A-Za-z0-9 .,'&()/-]+$/.test(document.name)) {
        errors[`documents.${index}.name`] = 'Document name contains unsupported characters.';
      }
      if (document.remarks && !/^[A-Za-z0-9 .,'&#()/-]+$/.test(document.remarks)) {
        errors[`documents.${index}.remarks`] = 'Remarks contain unsupported characters.';
      }

      if (document.file) {
        const fileError = getFileError(document.file);
        if (fileError) errors[`documents.${index}.file`] = fileError;
      }

      if (document.expiryDate && !isValidDate(document.expiryDate)) {
        errors[`documents.${index}.expiryDate`] =
          'Enter a valid expiry date.';
      } else if (document.expiryDate && document.expiryDate < new Date().toISOString().slice(0, 10)) {
        errors[`documents.${index}.expiryDate`] = 'Document expiry date cannot be in the past.';
      }
    });
  }

  if (stepIndex === 5) {
    values.loanHistory.forEach((loan, index) => {
      const prefix = `loanHistory.${index}.`;
      const hasValues = Object.values(loan).some((value) =>
        String(value ?? '').trim()
      );

      if (!hasValues) return;

      if (loan.bankName && !/^[A-Za-z0-9 .,'&()/-]+$/.test(loan.bankName)) {
        errors[`${prefix}bankName`] = 'Bank name contains unsupported characters.';
      }
      if (loan.loanType && !/^[A-Za-z0-9 .,'&()/-]+$/.test(loan.loanType)) {
        errors[`${prefix}loanType`] = 'Loan type contains unsupported characters.';
      }

      if (loan.accountNumber && !/^\d+$/.test(loan.accountNumber)) {
        errors[`${prefix}accountNumber`] = 'Account number must contain digits only.';
      }

      required(`${prefix}bankName`, loan.bankName, 'Bank name is required.');
      required(
        `${prefix}accountNumber`,
        loan.accountNumber,
        'Account number is required.'
      );
      required(
        `${prefix}loanType`,
        loan.loanType,
        'Type of loan is required.'
      );

      validateMoney(
        `${prefix}totalOutstanding`,
        loan.totalOutstanding,
        'Total outstanding',
        { requiredValue: true }
      );
      validateMoney(`${prefix}emi`, loan.emi, 'EMI', {
        requiredValue: true
      });

      required(
        `${prefix}expiryDate`,
        loan.expiryDate,
        'Expiry date is required.'
      );

      if (loan.expiryDate && !isValidDate(loan.expiryDate)) {
        errors[`${prefix}expiryDate`] = 'Enter a valid expiry date.';
      }
    });
  }

  return errors;
};

function UserIcon(props) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      {...props}
    >
      <path d="M16 19v-1a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v1" />
      <circle cx="10" cy="7" r="4" />
      <path d="M20 19v-1a4 4 0 0 0-3-3.87" />
      <path d="M16 4.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  type = 'text',
  inputMode,
  maxLength,
  error,
  min,
  max,
  step,
  readOnly,
  children
}) {
  const id = `field-${label.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;

  return (
    <label className="loan-field" htmlFor={id}>
      <span>{label}</span>

      {children || (
        <input
          id={id}
          type={type}
          value={value ?? ''}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          inputMode={inputMode || undefined}
          maxLength={maxLength}
          min={min}
          max={max}
          step={step}
          readOnly={readOnly}
          aria-invalid={Boolean(error)}
        />
      )}

      <FieldError message={error} />
    </label>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
  placeholder = 'Select',
  error
}) {
  return (
    <label className="loan-field">
      <span>{label}</span>

      <select
        value={value ?? ''}
        onChange={(event) => onChange(event.target.value)}
        aria-label={label}
        aria-invalid={Boolean(error)}
      >
        <option value="">{placeholder}</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>

      <FieldError message={error} />
    </label>
  );
}

function FieldError({ message }) {
  return message ? (
    <span className="field-error" role="alert">
      {message}
    </span>
  ) : null;
}

function TableInput({
  value,
  onChange,
  type = 'text',
  placeholder,
  min,
  step,
  error,
  label
}) {
  return (
    <>
      <input
        type={type}
        value={value ?? ''}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        min={min}
        step={step}
        aria-label={label}
        aria-invalid={Boolean(error)}
      />
      <FieldError message={error} />
    </>
  );
}

function FileUpload({ label, file, onChange, error }) {
  return (
    <div className="loan-upload-row">
      <span className="loan-file-label">{label}</span>

      <label className="loan-file-input">
        <UploadCloud size={15} />
        <input
          type="file"
          accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
          onChange={(event) => {
            onChange(event.target.files?.[0] || null);
            event.target.value = '';
          }}
        />
        <span>{file?.name || 'Upload'}</span>
      </label>

      <FieldError message={error} />
    </div>
  );
}

export default function LoanApplicationPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(0);
  const [form, setForm] = useState(createInitialForm);
  const [validationErrors, setValidationErrors] = useState({});
  const [submissionSuccess, setSubmissionSuccess] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [customerId, setCustomerId] = useState('');
  const [isInitialized, setIsInitialized] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [saveError, setSaveError] = useState('');

  useEffect(() => {
    const requestedCustomerId = new URLSearchParams(window.location.search).get('edit');
    if (!requestedCustomerId) {
      setIsInitialized(true);
      return;
    }

    setIsEditMode(true);
    setCustomerId(requestedCustomerId);
    try {
      const customer = readCustomerRecords(api.customers).find(
        (record) => record.id === requestedCustomerId,
      );
      if (!customer) {
        setLoadError('The selected customer could not be found.');
        return;
      }

      const savedForm = customer.onboardingForm && typeof customer.onboardingForm === 'object'
        ? customer.onboardingForm
        : {};
      const [firstName, ...lastNameParts] = String(customer.name || '').trim().split(/\s+/);
      const digitsOnlyPhone = String(customer.phone || '').replace(/\D/g, '');
      setForm({
        ...createInitialForm(),
        ...savedForm,
        fullName: savedForm.fullName || firstName || '',
        lastName: savedForm.lastName || lastNameParts.join(' '),
        customerType: savedForm.customerType || customer.type || '',
        kycStatus: savedForm.kycStatus || customer.kyc || 'Pending',
        mobileNo: savedForm.mobileNo || (MOBILE_REGEX.test(digitsOnlyPhone) ? digitsOnlyPhone : ''),
        email: savedForm.email || customer.email || '',
        documents: Array.isArray(savedForm.documents) ? savedForm.documents : createDocuments('Retail'),
        taxReturns: Array.isArray(savedForm.taxReturns) ? savedForm.taxReturns : createTaxReturns(),
        previousEmployment: Array.isArray(savedForm.previousEmployment) ? savedForm.previousEmployment : [],
        loanHistory: Array.isArray(savedForm.loanHistory) ? savedForm.loanHistory : [],
      });
    } catch (error) {
      setLoadError(error instanceof Error ? `Customer details could not be loaded: ${error.message}` : 'Customer details could not be loaded.');
    } finally {
      setIsInitialized(true);
    }
  }, []);

  const updateField = (field, value) => {
    const sanitizedValue = sanitizeInput(field, value);
    const employmentReset = field === 'employmentType' && value !== form.employmentType
      ? {
        designation: '', employerName: '', dateOfJoining: '', qualification: '',
        empEmailId: '', location: '', dateOfRetirement: '', appointmentLetter: null,
        previousEmployment: []
      }
      : {};
    const nextForm = {
      ...form,
      [field]: sanitizedValue,
      ...employmentReset,
      ...(field === 'dob' ? { age: getAge(sanitizedValue) } : {})
    };

    setForm((previous) => ({
      ...previous,
      [field]: sanitizedValue,
      ...employmentReset,
      ...(field === 'dob' ? { age: getAge(sanitizedValue) } : {})
    }));

    const stepErrors = validateStep(currentStep, nextForm);
    let liveError = stepErrors[field];
    if (sanitizedValue !== value) {
      if (PERSON_NAME_FIELDS.has(field)) {
        liveError = 'Use letters and spaces only.';
      } else if (MONEY_FIELDS.has(field)) {
        liveError = 'Enter a non-negative amount using digits and at most one decimal point.';
      } else {
        liveError = 'Use digits only.';
      }
    }

    setValidationErrors((previous) => {
      const errors = { ...(previous[currentStep] || {}) };
      if (liveError) errors[field] = liveError;
      else delete errors[field];
      return { ...previous, [currentStep]: errors };
    });
    setSubmissionSuccess(false);
  };

  const updateArrayItem = (collection, index, field, value) => {
    const sanitizedValue = sanitizeInput(field, value);
    const nextForm = {
      ...form,
      [collection]: form[collection].map((item, itemIndex) =>
        itemIndex === index
          ? { ...item, [field]: sanitizedValue }
          : item
      )
    };

    setForm(nextForm);

    const errorKey = `${collection}.${index}.${field}`;
    const stepErrors = validateStep(currentStep, nextForm);
    let liveError = stepErrors[errorKey];
    if (sanitizedValue !== value) {
      liveError = MONEY_FIELDS.has(field)
        ? 'Enter a non-negative amount using digits and at most one decimal point.'
        : 'Use digits only.';
    }

    setValidationErrors((previous) => {
      const errors = { ...(previous[currentStep] || {}) };
      if (liveError) errors[errorKey] = liveError;
      else delete errors[errorKey];
      return { ...previous, [currentStep]: errors };
    });
    setSubmissionSuccess(false);
  };

  const updateFile = (field, file) => {
    if (file) {
      const fileError = getFileError(file);

      if (fileError) {
        setValidationErrors((previous) => ({
          ...previous,
          [currentStep]: {
            ...(previous[currentStep] || {}),
            [field]: fileError
          }
        }));
        return;
      }
    }

    updateField(field, file);
  };

  const updateDocumentFile = (index, file) => {
    if (file) {
      const fileError = getFileError(file);

      if (fileError) {
        setValidationErrors((previous) => ({
          ...previous,
          [currentStep]: {
            ...(previous[currentStep] || {}),
            [`documents.${index}.file`]: fileError
          }
        }));
        return;
      }
    }

    updateArrayItem('documents', index, 'file', file);
  };

  const isLastStep = currentStep === wizardSteps.length - 1;
  const currentStepErrors = validationErrors[currentStep] || {};

  const validateCurrentStep = () => {
    const errors = validateStep(currentStep, form);

    setValidationErrors((previous) => ({
      ...previous,
      [currentStep]: errors
    }));

    return Object.keys(errors).length === 0;
  };

  const navigateToStep = (targetStep) => {
    if (targetStep <= currentStep) {
      setCurrentStep(targetStep);
      return;
    }

    const errorsByStep = {};
    for (let step = currentStep; step < targetStep; step += 1) {
      const stepErrors = validateStep(step, form);
      errorsByStep[step] = stepErrors;
      if (Object.keys(stepErrors).length) {
        setValidationErrors((previous) => ({ ...previous, ...errorsByStep }));
        setCurrentStep(step);
        return;
      }
    }
    setValidationErrors((previous) => ({ ...previous, ...errorsByStep }));
    setCurrentStep(targetStep);
  };

  const goNext = () => {
    if (!validateCurrentStep()) return;

    if (!isLastStep) {
      setCurrentStep((previous) => previous + 1);
      return;
    }

    const allErrors = wizardSteps.map((_, index) =>
      validateStep(index, form)
    );

    const firstInvalidStep = allErrors.findIndex(
      (errors) => Object.keys(errors).length > 0
    );

    if (firstInvalidStep !== -1) {
      setValidationErrors((previous) => ({
        ...previous,
        [firstInvalidStep]: allErrors[firstInvalidStep]
      }));

      setCurrentStep(firstInvalidStep);
      return;
    }

    try {
      const records = readCustomerRecords(api.customers);
      const existingCustomer = records.find((record) => record.id === customerId);
      const id = customerId || createCustomerId(records);
      const updatedCustomer = createCustomerRecord(form, {
        ...(existingCustomer || {}),
        id,
      });
      writeCustomerRecords([
        ...records.filter((record) => record.id !== id),
        updatedCustomer,
      ]);
      setCustomerId(id);
      setSaveError('');
      setSubmissionSuccess(true);
      if (!isEditMode) {
        setIsEditMode(true);
      }
    } catch (error) {
      setSaveError(error instanceof Error ? `Customer details could not be saved: ${error.message}` : 'Customer details could not be saved.');
      setSubmissionSuccess(false);
    }
  };

  const goBack = () => {
    if (currentStep > 0) {
      setCurrentStep((previous) => previous - 1);
    }
  };

  const openDocument = (file) => {
    if (!file) return;
    if (!(file instanceof Blob)) {
      window.alert('The original file is not available in this browser session. Upload it again to preview.');
      return;
    }

    const fileUrl = URL.createObjectURL(file);
    const preview = window.open(fileUrl, '_blank');

    if (!preview) {
      URL.revokeObjectURL(fileUrl);
      window.alert(
        'The document could not be opened. Allow pop-ups or use Download instead.'
      );
      return;
    }

    preview.opener = null;
    window.setTimeout(() => URL.revokeObjectURL(fileUrl), 60000);
  };

  const downloadDocument = (file) => {
    if (!file) return;
    if (!(file instanceof Blob)) {
      window.alert('The original file is not available in this browser session. Upload it again to download.');
      return;
    }

    const fileUrl = URL.createObjectURL(file);
    const link = document.createElement('a');

    link.href = fileUrl;
    link.download = file.name;

    document.body.appendChild(link);
    link.click();
    link.remove();

    window.setTimeout(() => URL.revokeObjectURL(fileUrl), 1000);
  };

  const removeDocument = (index) => {
    setForm((previous) => ({
      ...previous,
      documents: previous.documents.filter(
        (_, itemIndex) => itemIndex !== index
      )
    }));

    setValidationErrors((previous) => ({
      ...previous,
      [currentStep]: Object.fromEntries(
        Object.entries(previous[currentStep] || {}).filter(
          ([key]) => !key.startsWith('documents.')
        )
      )
    }));
  };

  const removeArrayItem = (collection, index) => {
    setForm((previous) => ({
      ...previous,
      [collection]: previous[collection].filter(
        (_, itemIndex) => itemIndex !== index
      )
    }));

    setValidationErrors((previous) => ({
      ...previous,
      [currentStep]: Object.fromEntries(
        Object.entries(previous[currentStep] || {}).filter(
          ([key]) => !key.startsWith(`${collection}.`)
        )
      )
    }));
  };

  if (!isInitialized || loadError) {
    return (
      <AppShell title={isEditMode ? 'Edit Individual Customer' : 'Individual Customer Onboarding'}>
        <div className="loan-application-shell">
          <Link href="/customer_management" className="loan-back-button" style={{ textDecoration: 'none' }}>
            <ArrowLeft size={16} />
            Back
          </Link>
          <div className="loan-application-card customer-onboarding-state">
            {loadError ? (
              <>
                <h2>Unable to load customer</h2>
                <p role="alert">{loadError}</p>
              </>
            ) : <p>Loading customer details...</p>}
          </div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell title={isEditMode ? 'Edit Individual Customer' : 'Individual Customer Onboarding'}>
      <div className="loan-application-shell">
        <div className="loan-onboarding-heading" style={{ marginTop: '-15px', marginBottom: '26px', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h1 style={{ margin: 0, color: '#23474C', font: '700 23px Manrope' }}>{isEditMode ? 'Edit Individual Customer' : 'Individual Customer Onboarding'}</h1>
            {isEditMode && <p className="customer-edit-id">Customer ID: {customerId}</p>}
          </div>
          <Link href="/customer_management" className="loan-back-button" style={{ height: '32px', minWidth: 'auto', padding: '0 10px', gap: '5px', fontSize: '13px', background: '#368262', borderColor: '#368262', color: '#fff', textDecoration: 'none' }}>
            <ArrowLeft size={14} />
            Back
          </Link>
        </div>
        <div className="loan-application-card">
          <nav className="loan-stepper" aria-label="Customer onboarding steps">
            {wizardSteps.map((step, index) => {
              const Icon = step.icon;
              const isActive = index === currentStep;
              const isDone = index < currentStep;

              return (
                <button
                  key={step.id}
                  type="button"
                  className={`loan-step customer-onboarding-step ${isActive ? 'active' : ''} ${
                    isDone ? 'done' : ''
                  }`}
                  onClick={() => navigateToStep(index)}
                  aria-current={isActive ? 'step' : undefined}
                  aria-label={`Step ${index + 1}: ${step.label}${isDone ? ', completed' : ''}`}
                >
                  <span className="loan-step-bubble">
                    <Icon size={16} aria-hidden="true" />
                  </span>
                  <span className="loan-step-text">{step.label}</span>
                </button>
              );
            })}
          </nav>

          {submissionSuccess && (
            <div className="loan-form-success" role="status">
              <strong>{isEditMode ? 'Customer details saved successfully.' : 'Individual Customer Onboarding submitted successfully.'}</strong>
              <span>Customer ID: {customerId}</span>
            </div>
          )}
          {saveError && <div className="loan-form-error" role="alert">{saveError}</div>}

          {/* Step 1: Personal Details */}
          {currentStep === 0 && (
            <div className="loan-form-section">
              <h2>Applicant Details</h2>

              <div className="field-grid two-col">
                <Field
                  label="Lead ID"
                  value={form.leadId}
                  onChange={(value) => updateField('leadId', value)}
                  placeholder="Enter Lead ID"
                />

               

                <Field
                  label="PAN Card *"
                  value={form.panCard}
                  onChange={(value) =>
                    updateField('panCard', normalizePan(value))
                  }
                  placeholder="ABCDE1234F"
                  maxLength={10}
                  error={currentStepErrors.panCard}
                />
                 <Field
                  label="Branch"
                  value={form.branch}
                  onChange={(value) => updateField('branch', value)}
                  placeholder="Enter Branch"
                />
              </div>

              <div className="field-grid name-four-col">
                <SelectField
                  label="Title"
                  value={form.title}
                  onChange={(value) => updateField('title', value)}
                  options={['Mr', 'Miss', 'Mrs']}
                />

                <Field
                  label="First Name *"
                  value={form.fullName}
                  onChange={(value) => updateField('fullName', value)}
                  placeholder="Enter First Name"
                  error={currentStepErrors.fullName}
                />

                <Field
                  label="Middle Name"
                  value={form.middleName}
                  onChange={(value) => updateField('middleName', value)}
                  placeholder="Enter Middle Name"
                  error={currentStepErrors.middleName}
                />

                <Field
                  label="Last Name *"
                  value={form.lastName}
                  onChange={(value) => updateField('lastName', value)}
                  placeholder="Enter Last Name"
                  error={currentStepErrors.lastName}
                />
              </div>

              <div className="field-grid two-col">
                <Field
                  label="Date of Birth *"
                  type="date"
                  value={form.dob}
                  onChange={(value) => updateField('dob', value)}
                  error={currentStepErrors.dob}
                  max={new Date().toISOString().slice(0, 10)}
                />

                <Field
                  label="Age"
                  value={form.age}
                  onChange={() => {}}
                  placeholder="Calculated from date of birth"
                  readOnly
                />

                <Field
                  label="Father's / Husband's Name *"
                  value={form.fatherName}
                  onChange={(value) => updateField('fatherName', value)}
                  placeholder="Enter Father's / Husband's Name"
                  error={currentStepErrors.fatherName}
                />

                <Field
                  label="Mother's Name *"
                  value={form.motherName}
                  onChange={(value) => updateField('motherName', value)}
                  placeholder="Enter Mother's Name"
                  error={currentStepErrors.motherName}
                />

                <Field
                  label="Email ID *"
                  type="email"
                  value={form.email}
                  onChange={(value) => updateField('email', value)}
                  placeholder="Enter Email Address"
                  error={currentStepErrors.email}
                />

                <Field
                  label="Customer Type *"
                  value={form.customerType}
                  onChange={(value) => updateField('customerType', value)}
                  placeholder="Enter Customer Type"
                  error={currentStepErrors.customerType}
                />

                <Field
                  label="KYC Status"
                  value={form.kycStatus}
                  onChange={(value) => updateField('kycStatus', value)}
                  placeholder="Enter KYC Status"
                />

                <Field
                  label="Aadhaar Card Number"
                  value={form.aadhaarNumber}
                  onChange={(value) =>
                    updateField(
                      'aadhaarNumber',
                      value.replace(/\D/g, '').slice(0, 12)
                    )
                  }
                  placeholder="Enter 12-digit Aadhaar Number"
                  inputMode="numeric"
                  maxLength={12}
                  error={currentStepErrors.aadhaarNumber}
                />

                <Field
                  label="CKYC Registration Number"
                  value={form.kycRegn}
                  onChange={(value) => updateField('kycRegn', value)}
                  placeholder="Enter CKYC Registration Number"
                  error={currentStepErrors.kycRegn}
                />

                <label className="field-block compact">
                  <span>Gender *</span>
                  <div className="radio-group">
                    {['Male', 'Female', 'Other'].map((option) => (
                      <label key={option} className="radio-option">
                        <input
                          type="radio"
                          name="gender"
                          checked={form.gender === option}
                          onChange={() => updateField('gender', option)}
                          aria-invalid={Boolean(currentStepErrors.gender)}
                        />
                        <span>{option}</span>
                      </label>
                    ))}
                  </div>
                  <FieldError message={currentStepErrors.gender} />
                </label>

                <Field
                  label="Mobile Number *"
                  value={form.mobileNo}
                  onChange={(value) =>
                    updateField(
                      'mobileNo',
                      value.replace(/\D/g, '').slice(0, 10)
                    )
                  }
                  placeholder="Enter 10-digit Mobile Number"
                  inputMode="numeric"
                  maxLength={10}
                  error={currentStepErrors.mobileNo}
                />

                <Field
                  label="Alternate Contact Number"
                  value={form.alternateContact}
                  onChange={(value) =>
                    updateField(
                      'alternateContact',
                      value.replace(/\D/g, '').slice(0, 10)
                    )
                  }
                  placeholder="Enter Alternate Contact Number"
                  inputMode="numeric"
                  maxLength={10}
                  error={currentStepErrors.alternateContact}
                />

                <Field
                  label="Occupation"
                  value={form.occupation}
                  onChange={(value) => updateField('occupation', value)}
                  placeholder="Enter Occupation"
                />
              </div>

              <div className="field-grid two-col">
                <label className="field-block compact">
                  <span>Marital Status</span>
                  <div className="radio-group">
                    {['Married', 'Unmarried', 'Widowed', 'Divorced'].map(
                      (option) => (
                        <label key={option} className="radio-option">
                          <input
                            type="radio"
                            name="maritalStatus"
                            checked={form.maritalStatus === option}
                            onChange={() =>
                              updateField('maritalStatus', option)
                            }
                          />
                          <span>{option}</span>
                        </label>
                      )
                    )}
                  </div>
                </label>
              </div>

            </div>
          )}

          {/* Step 2: Address Details */}
          {currentStep === 1 && (
            <div className="loan-form-section">
              <h2>Address Details</h2>

              <div className="field-grid two-col">
                <SelectField
                  label="Residential Status *"
                  value={form.residentialStatus}
                  onChange={(value) =>
                    updateField('residentialStatus', value)
                  }
                  options={['Resident', 'Non-Resident']}
                  error={currentStepErrors.residentialStatus}
                />

                <SelectField
                  label="Residential Type *"
                  value={form.residentialType}
                  onChange={(value) =>
                    updateField('residentialType', value)
                  }
                  options={[
                    'Owned',
                    'Rented',
                    'Family Owned',
                    'Company Provided'
                  ]}
                  error={currentStepErrors.residentialType}
                />

                <Field
                  label="Flat / Building Name *"
                  value={form.flatBuildingName}
                  onChange={(value) =>
                    updateField('flatBuildingName', value)
                  }
                  placeholder="Enter Flat / Building Name"
                  error={currentStepErrors.flatBuildingName}
                />

                <Field
                  label="Street / Road *"
                  value={form.streetRoad}
                  onChange={(value) => updateField('streetRoad', value)}
                  placeholder="Enter Street / Road"
                  error={currentStepErrors.streetRoad}
                />

                <Field
                  label="Landmark"
                  value={form.landMark}
                  onChange={(value) => updateField('landMark', value)}
                  placeholder="Enter Landmark"
                />

                <Field
                  label="City *"
                  value={form.city}
                  onChange={(value) => updateField('city', value)}
                  placeholder="Enter City"
                  error={currentStepErrors.city}
                />

                <SelectField
                  label="State *"
                  value={form.state}
                  onChange={(value) => updateField('state', value)}
                  options={[
                    'Andhra Pradesh',
                    'Assam',
                    'Bihar',
                    'Chhattisgarh',
                    'Delhi',
                    'Goa',
                    'Gujarat',
                    'Haryana',
                    'Himachal Pradesh',
                    'Jharkhand',
                    'Karnataka',
                    'Kerala',
                    'Madhya Pradesh',
                    'Maharashtra',
                    'Odisha',
                    'Punjab',
                    'Rajasthan',
                    'Tamil Nadu',
                    'Telangana',
                    'Uttar Pradesh',
                    'Uttarakhand',
                    'West Bengal'
                  ]}
                  error={currentStepErrors.state}
                />

                <Field
                  label="PIN Code *"
                  value={form.pinCode}
                  onChange={(value) =>
                    updateField(
                      'pinCode',
                      value.replace(/\D/g, '').slice(0, 6)
                    )
                  }
                  placeholder="Enter 6-digit PIN Code"
                  inputMode="numeric"
                  maxLength={6}
                  error={currentStepErrors.pinCode}
                />

              </div>
            </div>
          )}

          {/* Step 3: Employment Information */}
          {currentStep === 2 && (
            <div className="loan-form-section">
              <h2>Employment Information</h2>

              <div className="field-grid three-col">
                <SelectField
                  label="Employment Type *"
                  value={form.employmentType}
                  onChange={(value) => updateField('employmentType', value)}
                  options={[
                    'Salaried',
                    'Self Employed'
                  ]}
                  error={currentStepErrors.employmentType}
                />

                <Field
                  label={`${form.employmentType === 'Self Employed' ? 'Nature of Business / Profession' : 'Designation'} *`}
                  value={form.designation}
                  onChange={(value) => updateField('designation', value)}
                  placeholder={form.employmentType === 'Self Employed' ? 'Enter Nature of Business / Profession' : 'Enter Designation'}
                  error={currentStepErrors.designation}
                />

                <Field
                  label={`${form.employmentType === 'Self Employed' ? 'Business / Trade Name' : 'Employer Name'} *`}
                  value={form.employerName}
                  onChange={(value) => updateField('employerName', value)}
                  placeholder={form.employmentType === 'Self Employed' ? 'Enter Business / Trade Name' : 'Enter Employer Name'}
                  error={currentStepErrors.employerName}
                />

                <Field
                  label={`${form.employmentType === 'Self Employed' ? 'Business Start Date' : 'Date of Joining'} *`}
                  type="date"
                  value={form.dateOfJoining}
                  onChange={(value) => updateField('dateOfJoining', value)}
                  error={currentStepErrors.dateOfJoining}
                  max={new Date().toISOString().slice(0, 10)}
                />

                <Field
                  label="Qualification *"
                  value={form.qualification}
                  onChange={(value) => updateField('qualification', value)}
                  placeholder="Enter Qualification"
                  error={currentStepErrors.qualification}
                />

                <Field
                  label={form.employmentType === 'Self Employed' ? 'Business Email ID' : 'Employee Email ID'}
                  type="email"
                  value={form.empEmailId}
                  onChange={(value) => updateField('empEmailId', value)}
                  placeholder="Enter Employee Email ID"
                  error={currentStepErrors.empEmailId}
                />

                <Field
                  label={form.employmentType === 'Self Employed' ? 'Business Location *' : 'Employer Location *'}
                  value={form.location}
                  onChange={(value) => updateField('location', value)}
                  placeholder={form.employmentType === 'Self Employed' ? 'Enter Business Location' : 'Enter Employer Location'}
                  error={currentStepErrors.location}
                />

                {form.employmentType !== 'Self Employed' && (
                  <Field
                    label="Date of Retirement"
                    type="date"
                    value={form.dateOfRetirement}
                    onChange={(value) => updateField('dateOfRetirement', value)}
                    error={currentStepErrors.dateOfRetirement}
                    min={form.dateOfJoining || undefined}
                  />
                )}

                <FileUpload
                  label={form.employmentType === 'Self Employed' ? 'Business Proof Upload' : 'Appointment Letter Upload'}
                  file={form.appointmentLetter}
                  onChange={(file) => updateFile('appointmentLetter', file)}
                  error={currentStepErrors.appointmentLetter}
                />
              </div>

              {form.employmentType !== 'Self Employed' && <div className="loan-data-table-wrap">
                <h3>Previous Employment Details</h3>

                <table className="loan-data-table">
                  <thead>
                    <tr>
                      <th>Employment Type</th>
                      <th>Employer Name</th>
                      <th>Designation</th>
                      <th>Location</th>
                      <th>Date of Joining</th>
                      <th>Date of Relieving</th>
                      <th>Actions</th>
                    </tr>
                  </thead>

                  <tbody>
                    {form.previousEmployment.map((record, index) => {
                      const errorKey = (field) =>
                        currentStepErrors[
                          `previousEmployment.${index}.${field}`
                        ];

                      return (
                        <tr key={`employment-${index}`}>
                          <td>
                            <TableInput
                              label="Employment Type"
                              value={record.employmentType}
                              onChange={(value) =>
                                updateArrayItem(
                                  'previousEmployment',
                                  index,
                                  'employmentType',
                                  value
                                )
                              }
                              placeholder="Type"
                              error={errorKey('employmentType')}
                            />
                          </td>

                          <td>
                            <TableInput
                              label="Employer Name"
                              value={record.employerName}
                              onChange={(value) =>
                                updateArrayItem(
                                  'previousEmployment',
                                  index,
                                  'employerName',
                                  value
                                )
                              }
                              placeholder="Employer"
                              error={errorKey('employerName')}
                            />
                          </td>

                          <td>
                            <TableInput
                              label="Designation"
                              value={record.designation}
                              onChange={(value) =>
                                updateArrayItem(
                                  'previousEmployment',
                                  index,
                                  'designation',
                                  value
                                )
                              }
                              placeholder="Designation"
                              error={errorKey('designation')}
                            />
                          </td>

                          <td>
                            <TableInput
                              label="Location"
                              value={record.location}
                              onChange={(value) =>
                                updateArrayItem(
                                  'previousEmployment',
                                  index,
                                  'location',
                                  value
                                )
                              }
                              placeholder="Location"
                              error={errorKey('location')}
                            />
                          </td>

                          <td>
                            <TableInput
                              label="Date of Joining"
                              type="date"
                              value={record.dateOfJoining}
                              onChange={(value) =>
                                updateArrayItem(
                                  'previousEmployment',
                                  index,
                                  'dateOfJoining',
                                  value
                                )
                              }
                              error={errorKey('dateOfJoining')}
                            />
                          </td>

                          <td>
                            <TableInput
                              label="Date of Relieving"
                              type="date"
                              value={record.dateOfRelieving}
                              onChange={(value) =>
                                updateArrayItem(
                                  'previousEmployment',
                                  index,
                                  'dateOfRelieving',
                                  value
                                )
                              }
                              error={errorKey('dateOfRelieving')}
                            />
                          </td>

                          <td>
                            <button
                              type="button"
                              className="loan-inline-button danger"
                              aria-label="Delete employment record"
                              onClick={() =>
                                removeArrayItem('previousEmployment', index)
                              }
                            >
                              <Trash2 size={14} />
                            </button>
                          </td>
                        </tr>
                      );
                    })}

                    {form.previousEmployment.length === 0 && (
                      <tr>
                        <td colSpan={7}>
                          No previous employment records added.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>

                <button
                  type="button"
                  className="loan-inline-button add-row-button"
                  onClick={() =>
                    setForm((previous) => ({
                      ...previous,
                      previousEmployment: [
                        ...previous.previousEmployment,
                        createPreviousEmployment()
                      ]
                    }))
                  }
                >
                  <Plus size={14} /> Add Previous Employment
                </button>
              </div>}
            </div>
          )}

          {/* Step 4: Income Details */}
          {currentStep === 3 && (
            <div className="loan-form-section">
              <h2>Income Details</h2>

              <div className="field-grid two-col">
                <Field
                  label="Annual Income *"
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.annualIncome}
                  onChange={(value) => updateField('annualIncome', value)}
                  placeholder="Enter Annual Income"
                  inputMode="decimal"
                  error={currentStepErrors.annualIncome}
                />

                <SelectField
                  label="Income Tax Filer Status *"
                  value={form.incomeTaxFilerStatus}
                  onChange={(value) =>
                    updateField('incomeTaxFilerStatus', value)
                  }
                  options={['Filer', 'Non-Filer']}
                  error={currentStepErrors.incomeTaxFilerStatus}
                />

                <Field
                  label="Name of the Bank *"
                  value={form.bankName}
                  onChange={(value) => updateField('bankName', value)}
                  placeholder="Enter Bank Name"
                  error={currentStepErrors.bankName}
                />

                <Field
                  label="Bank Account Number *"
                  value={form.bankAccountNo}
                  onChange={(value) => updateField('bankAccountNo', value)}
                  placeholder="Enter Bank Account Number"
                  inputMode="numeric"
                  error={currentStepErrors.bankAccountNo}
                />

                <SelectField
                  label="Risk Category *"
                  value={form.riskCategory}
                  onChange={(value) => updateField('riskCategory', value)}
                  options={['Low', 'Medium', 'High']}
                  error={currentStepErrors.riskCategory}
                />

                <FileUpload
                  label="Salary Certificate Upload"
                  file={form.salaryCertificate}
                  onChange={(file) => updateFile('salaryCertificate', file)}
                  error={currentStepErrors.salaryCertificate}
                />

                <FileUpload
                  label="Form No. 16 Upload"
                  file={form.formNo16}
                  onChange={(file) => updateFile('formNo16', file)}
                  error={currentStepErrors.formNo16}
                />
              </div>

              <div className="loan-data-table-wrap">
                <h3>Income Tax Filing Details</h3>

                <table className="loan-data-table">
                  <thead>
                    <tr>
                      <th>Financial Year</th>
                      <th>Gross Income</th>
                      <th>TDS Paid</th>
                    </tr>
                  </thead>

                  <tbody>
                    {form.taxReturns.map((row, index) => (
                      <tr key={row.financialYear}>
                        <td>{row.financialYear}</td>
                        <td>
                          <TableInput
                            label={`${row.financialYear} gross income`}
                            type="number"
                            min="0"
                            step="0.01"
                            value={row.grossIncome}
                            onChange={(value) =>
                              updateArrayItem(
                                'taxReturns',
                                index,
                                'grossIncome',
                                value
                              )
                            }
                            error={
                              currentStepErrors[
                                `taxReturns.${index}.grossIncome`
                              ]
                            }
                          />
                        </td>
                        <td>
                          <TableInput
                            label={`${row.financialYear} TDS paid`}
                            type="number"
                            min="0"
                            step="0.01"
                            value={row.tdsPaid}
                            onChange={(value) =>
                              updateArrayItem(
                                'taxReturns',
                                index,
                                'tdsPaid',
                                value
                              )
                            }
                            error={
                              currentStepErrors[
                                `taxReturns.${index}.tdsPaid`
                              ]
                            }
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Step 5: Document Details */}
          {currentStep === 4 && (
            <div className="loan-form-section">
              <h2>Document Details</h2>
              <div className="loan-doc-category">
                <SelectField
                  label="Loan Category *"
                  value={form.loanCategory}
                  onChange={(category) => {
                    setForm((previous) => {
                      const existingDocuments = new Map(previous.documents.map((document) => [document.name, document]));
                      const requiredDocuments = documentTemplates[category].map((name) =>
                        existingDocuments.get(name) || createDocument(name, true)
                      );
                      const additionalDocuments = previous.documents.filter((document) => !document.required);
                      return { ...previous, loanCategory: category, documents: [...requiredDocuments, ...additionalDocuments] };
                    });
                    setValidationErrors((previous) => ({ ...previous, [4]: {} }));
                  }}
                  options={['Retail', 'Corporate']}
                />
                <p>Select the loan segment to load its standard mandatory document checklist.</p>
              </div>

              <div className="loan-data-table-wrap">
                <table className="loan-data-table">
                  <thead>
                    <tr>
                      <th>Serial Number</th>
                      <th>Document Name</th>
                      <th>Document Upload</th>
                      <th>Expiry Date</th>
                      <th>Remarks</th>
                      <th>View / Delete</th>
                    </tr>
                  </thead>

                  <tbody>
                    {form.documents.map((row, index) => {
                      const fileError =
                        currentStepErrors[`documents.${index}.file`];
                      const expiryError =
                        currentStepErrors[`documents.${index}.expiryDate`];

                      return (
                        <tr key={`document-${index}`}>
                          <td>{index + 1}</td>

                          <td>
                            {row.required ? (
                              <strong className="loan-standard-document">{row.name}</strong>
                            ) : (
                              <TableInput
                                label="Document name"
                                value={row.name}
                                onChange={(value) => updateArrayItem('documents', index, 'name', value)}
                                placeholder="Document Name"
                                error={currentStepErrors[`documents.${index}.name`]}
                              />
                            )}
                            {row.required && <span className="loan-doc-required">Required document</span>}
                          </td>

                          <td>
                            <label className="loan-file-input">
                              <UploadCloud size={15} />
                              <input
                                type="file"
                                accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
                                aria-required={row.required || undefined}
                                onChange={(event) => {
                                  updateDocumentFile(
                                    index,
                                    event.target.files?.[0] || null
                                  );
                                  event.target.value = '';
                                }}
                              />
                              <span>{row.file?.name || (row.required ? 'Upload required *' : 'Upload')}</span>
                            </label>
                            <FieldError message={fileError} />
                          </td>

                          <td>
                            <TableInput
                              label="Document expiry date"
                              type="date"
                              value={row.expiryDate}
                              onChange={(value) =>
                                updateArrayItem(
                                  'documents',
                                  index,
                                  'expiryDate',
                                  value
                                )
                              }
                              error={expiryError}
                            />
                          </td>

                          <td>
                            <TableInput
                              label="Document remarks"
                              value={row.remarks}
                              onChange={(value) =>
                                updateArrayItem(
                                  'documents',
                                  index,
                                  'remarks',
                                  value
                                )
                              }
                              placeholder="Add remark"
                              error={currentStepErrors[`documents.${index}.remarks`]}
                            />
                          </td>

                          <td>
                            <div className="loan-table-actions">
                              <button
                                type="button"
                                className="loan-inline-button"
                                onClick={() => openDocument(row.file)}
                                disabled={!row.file}
                                title={
                                  row.file
                                    ? 'View document'
                                    : 'Upload a document to view'
                                }
                              >
                                <Eye size={14} /> View
                              </button>

                              <button
                                type="button"
                                className="loan-inline-button"
                                onClick={() => downloadDocument(row.file)}
                                disabled={!row.file}
                                title={
                                  row.file
                                    ? 'Download document'
                                    : 'Upload a document to download'
                                }
                              >
                                <Download size={14} /> Download
                              </button>

                              <button
                                type="button"
                                className="loan-inline-button danger"
                                onClick={() => removeDocument(index)}
                                disabled={row.required}
                                title={row.required ? 'Required document cannot be removed' : 'Remove document'}
                                aria-label={`Delete ${row.name || 'document'}`}
                              >
                                <Trash2 size={14} /> Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}

                    {form.documents.length === 0 && (
                      <tr>
                        <td colSpan={6}>No documents added.</td>
                      </tr>
                    )}
                  </tbody>
                </table>

                <button
                  type="button"
                  className="loan-inline-button add-row-button"
                  onClick={() =>
                    setForm((previous) => ({
                      ...previous,
                      documents: [
                        ...previous.documents,
                        createDocument('')
                      ]
                    }))
                  }
                >
                  <Plus size={14} /> Add Document
                </button>

                <p className="loan-file-help">
                  Supported formats: PDF, JPG, JPEG, PNG. Maximum file size: 5
                  MB.
                </p>
              </div>
            </div>
          )}

          {/* Step 6: Loan Details */}
          {currentStep === 5 && (
            <div className="loan-form-section">
              <h2>Loan History</h2>

              <div className="loan-data-table-wrap">
                <table className="loan-data-table">
                  <thead>
                    <tr>
                      <th>Serial Number</th>
                      <th>Bank Name</th>
                      <th>Account Number</th>
                      <th>Type of Loan</th>
                      <th>Total Outstanding</th>
                      <th>EMI</th>
                      <th>Expiry Date</th>
                      <th>Actions</th>
                    </tr>
                  </thead>

                  <tbody>
                    {form.loanHistory.map((loan, index) => {
                      const errorKey = (field) =>
                        currentStepErrors[`loanHistory.${index}.${field}`];

                      return (
                        <tr key={`loan-${index}`}>
                          <td>{index + 1}</td>

                          <td>
                            <TableInput
                              label="Bank name"
                              value={loan.bankName}
                              onChange={(value) =>
                                updateArrayItem(
                                  'loanHistory',
                                  index,
                                  'bankName',
                                  value
                                )
                              }
                              placeholder="Bank Name"
                              error={errorKey('bankName')}
                            />
                          </td>

                          <td>
                            <TableInput
                              label="Account number"
                              value={loan.accountNumber}
                              onChange={(value) =>
                                updateArrayItem(
                                  'loanHistory',
                                  index,
                                  'accountNumber',
                                  value
                                )
                              }
                              placeholder="Account Number"
                              error={errorKey('accountNumber')}
                            />
                          </td>

                          <td>
                            <TableInput
                              label="Type of loan"
                              value={loan.loanType}
                              onChange={(value) =>
                                updateArrayItem(
                                  'loanHistory',
                                  index,
                                  'loanType',
                                  value
                                )
                              }
                              placeholder="Type of Loan"
                              error={errorKey('loanType')}
                            />
                          </td>

                          <td>
                            <TableInput
                              label="Total outstanding"
                              type="number"
                              min="0"
                              step="0.01"
                              value={loan.totalOutstanding}
                              onChange={(value) =>
                                updateArrayItem(
                                  'loanHistory',
                                  index,
                                  'totalOutstanding',
                                  value
                                )
                              }
                              error={errorKey('totalOutstanding')}
                            />
                          </td>

                          <td>
                            <TableInput
                              label="EMI"
                              type="number"
                              min="0"
                              step="0.01"
                              value={loan.emi}
                              onChange={(value) =>
                                updateArrayItem(
                                  'loanHistory',
                                  index,
                                  'emi',
                                  value
                                )
                              }
                              error={errorKey('emi')}
                            />
                          </td>

                          <td>
                            <TableInput
                              label="Expiry date"
                              type="date"
                              value={loan.expiryDate}
                              onChange={(value) =>
                                updateArrayItem(
                                  'loanHistory',
                                  index,
                                  'expiryDate',
                                  value
                                )
                              }
                              error={errorKey('expiryDate')}
                            />
                          </td>

                          <td>
                            <button
                              type="button"
                              className="loan-inline-button danger"
                              aria-label={`Delete loan record ${index + 1}`}
                              onClick={() =>
                                removeArrayItem('loanHistory', index)
                              }
                            >
                              <Trash2 size={14} />
                            </button>
                          </td>
                        </tr>
                      );
                    })}

                    {form.loanHistory.length === 0 && (
                      <tr>
                        <td colSpan={8}>No loan history records added.</td>
                      </tr>
                    )}
                  </tbody>
                </table>

                <button
                  type="button"
                  className="loan-inline-button add-row-button"
                  onClick={() =>
                    setForm((previous) => ({
                      ...previous,
                      loanHistory: [
                        ...previous.loanHistory,
                        {
                          bankName: '',
                          accountNumber: '',
                          loanType: '',
                          totalOutstanding: '',
                          emi: '',
                          expiryDate: ''
                        }
                      ]
                    }))
                  }
                >
                  <Plus size={14} /> Add Loan Record
                </button>
              </div>
            </div>
          )}

          {/* Navigation */}
          <div className={`loan-form-actions ${currentStep === 0 ? 'first-step' : ''}`}>
            {currentStep > 0 && (
              <button
                type="button"
                className="loan-back-button"
                onClick={goBack}
              >
                <ArrowLeft size={16} />
                Back
              </button>
            )}

            <button
              type="button"
              className="loan-continue-button"
              onClick={goNext}
              style={{ height: '36px', minWidth: '112px', width: 'auto', padding: '0 14px', gap: '6px', borderRadius: '7px', fontSize: '13px', background: '#368262', borderColor: '#368262' }}
            >
              {isLastStep ? 'Submit' : 'Continue'}
              <ArrowRight size={14} />
            </button>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
