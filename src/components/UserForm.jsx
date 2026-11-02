
'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Calendar from 'react-calendar';
import {
  ArrowLeft,
  Calendar as CalendarIcon,
  Check,
  Eye,
  EyeOff,
  Lock,
  Save,
  Shield,
  User,
  Clock,
  AlertCircle,
} from 'lucide-react';

import PageHeader from './PageHeader';

import {
  saveEmployee,
  isEmpIdUnique,
  isUsernameUnique,
} from '../services/employeeService';

import {
  createUser,
  USER_ORGANIZATION_CODE,
  USER_ORGANIZATION_ID,
  USER_ORGANIZATION_NAME,
} from '../services/leadService';

import {
  getMaxDateFor18YearsOld,
  calculateAge,
  isAtLeast18YearsOld,
  validatePasswordStrength,
} from '../utils/validation';

/* =========================================================
   CONSTANTS
========================================================= */

const NAME_MAX_LENGTH = 50;
const MOBILE_MAX_LENGTH = 13;
const EMAIL_MAX_LENGTH = 254;

const DESIGNATIONS = [
  'Branch Manager',
  'Loan Officer',
  'Credit Analyst',
  'Senior Underwriter',
  'Audit Specialist',
  'Operations Executive',
  'Risk Analyst',
  'System Administrator',
];

const USER_ROLES = [
  'Super Admin',
  'Bank Admin',
  'Branch User',
];

const SYSTEM_ROLES = [
  'SUPER_ADMIN',
  'Maker',
  'Checker',
  'Viewer',
];

const BRANCHES = [
  'Pune',
  'Mumbai',
  'Koramangala',
  'Salt Lake',
  'Andheri West',
  'Pimpri',
  'Indiranagar',
  'Head Office',
];

/* =========================================================
   DATE HELPERS
========================================================= */

function parseLocalDate(value) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(
    String(value ?? '')
  );

  if (!match) return null;

  const [, year, month, day] = match;

  const date = new Date(
    Number(year),
    Number(month) - 1,
    Number(day)
  );

  if (
    date.getFullYear() !== Number(year) ||
    date.getMonth() !== Number(month) - 1 ||
    date.getDate() !== Number(day)
  ) {
    return null;
  }

  return date;
}

function formatLocalDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

/* =========================================================
   NAME INPUT VALIDATION
========================================================= */

function filterNameInput(value) {
  return String(value ?? '')
    .replace(/[^a-zA-Z\s'-]/g, '')
    .slice(0, NAME_MAX_LENGTH);
}

function isValidName(value) {
  return /^[a-zA-Z]+(?:[ '-][a-zA-Z]+)*$/.test(
    String(value ?? '').trim()
  );
}

/* =========================================================
   MOBILE INPUT VALIDATION
========================================================= */

function filterMobileInput(value) {
  let input = String(value ?? '').replace(/[\s()-]/g, '');

  // Allow only a plus sign at the beginning.
  if (input.startsWith('+')) {
    const digits = input.slice(1).replace(/\D/g, '');

    // Allow the user to type the +91 prefix gradually.
    if (digits.length === 0) return '+';
    if (digits === '9') return '+9';

    if (!digits.startsWith('91')) {
      return '';
    }

    const mobileDigits = digits.slice(2).slice(0, 10);

    if (
      mobileDigits.length > 0 &&
      !/^[6-9]/.test(mobileDigits)
    ) {
      return '+91';
    }

    return `+91${mobileDigits}`;
  }

  // Optional 0 prefix.
  if (input.startsWith('0')) {
    const digits = input.slice(1).replace(/\D/g, '').slice(0, 10);

    if (digits.length === 0) return '0';

    if (!/^[6-9]/.test(digits)) {
      return '0';
    }

    return `0${digits}`;
  }

  // Standard 10-digit number.
  input = input.replace(/\D/g, '').slice(0, 10);

  if (input.length > 0 && !/^[6-9]/.test(input)) {
    return '';
  }

  return input;
}

function normalizeIndianMobile(value) {
  let mobile = String(value ?? '').replace(/\s/g, '');

  if (mobile.startsWith('+91')) {
    mobile = mobile.slice(3);
  } else if (mobile.startsWith('0')) {
    mobile = mobile.slice(1);
  }

  return mobile;
}

function isValidMobile(value) {
  return /^[6-9]\d{9}$/.test(String(value ?? ''));
}

/* =========================================================
   EMAIL VALIDATION
========================================================= */

function isValidEmail(value) {
  const email = String(value ?? '').trim();

  if (!email || email.length > EMAIL_MAX_LENGTH) {
    return false;
  }

  // Exactly one @ symbol.
  const parts = email.split('@');

  if (parts.length !== 2) {
    return false;
  }

  const [localPart, domain] = parts;

  if (!localPart || !domain) {
    return false;
  }

  if (localPart.length > 64 || domain.length > 253) {
    return false;
  }

  // RFC-style dot-atom local part.
  const localRegex =
    /^[a-zA-Z0-9!#$%&'*+/=?^_`{|}~.-]+$/;

  if (!localRegex.test(localPart)) {
    return false;
  }

  if (
    localPart.startsWith('.') ||
    localPart.endsWith('.') ||
    localPart.includes('..')
  ) {
    return false;
  }

  // Validate domain labels.
  const labels = domain.split('.');

  if (labels.length < 2) {
    return false;
  }

  for (const label of labels) {
    if (
      !label ||
      label.length > 63 ||
      !/^[a-zA-Z0-9](?:[a-zA-Z0-9-]*[a-zA-Z0-9])?$/.test(label)
    ) {
      return false;
    }
  }

  // Require a plausible alphabetic top-level domain.
  const tld = labels[labels.length - 1];

  if (!/^[a-zA-Z]{2,63}$/.test(tld)) {
    return false;
  }

  return true;
}

/* =========================================================
   COMPONENT
========================================================= */

export default function UserForm({
  mode = 'add',
  initialData = null,
}) {
  const router = useRouter();
  const isEdit = mode === 'edit';

  const maxDobDate = useMemo(
    () => getMaxDateFor18YearsOld(),
    []
  );

  const maxDobCalendarDate = useMemo(
    () => parseLocalDate(maxDobDate),
    [maxDobDate]
  );

  const minDobCalendarDate = useMemo(() => {
    const date = new Date();
    date.setFullYear(date.getFullYear() - 100);
    return date;
  }, []);

  const maxDobFormatted = useMemo(() => {
    const parts = maxDobDate.split('-');

    const date = new Date(
      Number(parts[0]),
      Number(parts[1]) - 1,
      Number(parts[2])
    );

    return date.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  }, [maxDobDate]);

  const [form, setForm] = useState({
    empNo: initialData?.empNo || initialData?.employeeId || '',
    title: initialData?.title || '',
    firstName: initialData?.firstName || initialData?.name?.split(' ')[0] || '',
    middleName: initialData?.middleName || '',
    lastName: initialData?.lastName || initialData?.name?.split(' ').slice(1).join(' ') || '',
    mobile: initialData?.mobile || '',
    dateOfBirth: initialData?.dateOfBirth || '',

    userName: initialData?.userName || '',
    password: '',
    confirmPassword: '',
    email: initialData?.email || '',

    allow2FA:
      initialData?.allow2FA ??
      (initialData?.twoFAEnabled === 'Y'),

    designation: initialData?.designation || '',
    userRole: initialData?.userRole || initialData?.role || '',
    systemRole: initialData?.systemRole || 'SUPER_ADMIN',
    status: initialData?.status || 'Active',

    allowMultiBranch:
      initialData?.allowMultiBranch ??
      (initialData?.multiBranchAccess === 'Y'),

    loginBranch:
      initialData?.loginBranch ||
      initialData?.branch ||
      '',

    allowLoginOnHolidays:
      initialData?.allowLoginOnHolidays ??
      (initialData?.loginOnHolidays === 'Y'),

    sessionTimeout:
      initialData?.sessionTimeout ??
      initialData?.idleTimeout ??
      initialData?.inactiveSessionTimeout ??
      900,

    badLogins: initialData?.badLogins ?? 3,

    loginTime: initialData?.loginTime || '09:00 AM',
    logoutTime: initialData?.logoutTime || '06:00 PM',
  });

  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  const submittingRef = useRef(false);
  const dobPickerRef = useRef(null);

  const [isDobCalendarOpen, setIsDobCalendarOpen] =
    useState(false);

  const selectedDob = parseLocalDate(form.dateOfBirth);

  /* =========================================================
     DOB OUTSIDE CLICK
  ========================================================= */

  useEffect(() => {
    if (!isDobCalendarOpen) return undefined;

    const handleClickOutside = (event) => {
      if (!dobPickerRef.current?.contains(event.target)) {
        setIsDobCalendarOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      document.removeEventListener(
        'mousedown',
        handleClickOutside
      );
    };
  }, [isDobCalendarOpen]);

  /* =========================================================
     FIELD VALIDATION
  ========================================================= */

  const validateField = (name, value, values = form) => {
    let err = '';

    switch (name) {
      case 'empNo':
        if (!String(value ?? '').trim()) {
          err = 'Emp ID is required.';
        } else if (
          String(value).trim().length < 3 ||
          String(value).trim().length > 20
        ) {
          err = 'Emp ID must be between 3 and 20 characters.';
        } else if (
          !/^[a-zA-Z0-9_-]+$/.test(String(value).trim())
        ) {
          err = 'Emp ID can only contain letters, numbers, hyphens, and underscores.';
        } else if (
          !isEmpIdUnique(String(value).trim(), initialData?.id)
        ) {
          err = 'This Emp ID is already in use by another employee.';
        }
        break;

      case 'title':
        if (!value || !['Mr.', 'Mrs.', 'Ms.'].includes(value)) {
          err = 'Please select a Title.';
        }
        break;

      case 'firstName':
        if (!String(value ?? '').trim()) {
          err = 'First Name is required.';
        } else if (String(value).trim().length > 50) {
          err = 'First Name must not exceed 50 characters.';
        } else if (!isValidName(value)) {
          err = 'First Name may contain letters, spaces, hyphens, and apostrophes only.';
        }
        break;

      case 'middleName':
        // Middle Name is optional.
        if (String(value ?? '').trim()) {
          if (String(value).trim().length > 50) {
            err = 'Middle Name must not exceed 50 characters.';
          } else if (!isValidName(value)) {
            err = 'Middle Name may contain letters, spaces, hyphens, and apostrophes only.';
          }
        }
        break;

      case 'lastName':
        if (!String(value ?? '').trim()) {
          err = 'Last Name is required.';
        } else if (String(value).trim().length > 50) {
          err = 'Last Name must not exceed 50 characters.';
        } else if (!isValidName(value)) {
          err = 'Last Name may contain letters, spaces, hyphens, and apostrophes only.';
        }
        break;

      case 'mobile': {
        const cleanMobile = normalizeIndianMobile(value);

        if (!cleanMobile) {
          err = 'Mobile number is required.';
        } else if (!isValidMobile(cleanMobile)) {
          err = 'Enter exactly 10 digits starting with 6, 7, 8, or 9. Optional +91 or 0 prefix is accepted.';
        }
        break;
      }

      case 'dateOfBirth':
        if (!value) {
          err = 'Date of Birth is required.';
        } else {
          const dob = parseLocalDate(value);

          const today = new Date();

          const todayString = formatLocalDate(today);

          if (!dob) {
            err = 'Please enter a valid Date of Birth.';
          } else if (value > todayString) {
            err = 'Date of Birth cannot be in the future.';
          } else if (!isAtLeast18YearsOld(value)) {
            const age = calculateAge(value);

            err = `Applicant must be at least 18 years old (current age is ${age} years). Must be born on or before ${maxDobFormatted}.`;
          } else if (calculateAge(value) > 100) {
            err = 'Maximum allowed age is 100 years.';
          }
        }
        break;

      case 'userName':
        if (!String(value ?? '').trim()) {
          err = 'User Name is required.';
        } else if (
          String(value).trim().length < 3 ||
          String(value).trim().length > 30
        ) {
          err = 'User Name must be between 3 and 30 characters.';
        } else if (
          !/^[a-zA-Z0-9._-]+$/.test(String(value).trim())
        ) {
          err = 'Username contains unsupported characters.';
        } else if (
          !isUsernameUnique(String(value).trim(), initialData?.id)
        ) {
          err = 'This User Name is already taken.';
        }
        break;

      case 'password':
        if (!isEdit && !value) {
          err = 'Password is required.';
        } else if (value) {
          err = validatePasswordStrength(value);

          if (
            !err &&
            String(values.userName ?? '').trim().toLowerCase() ===
              String(value).toLowerCase()
          ) {
            err = 'Password must not be the same as the username.';
          }
        }
        break;

      case 'confirmPassword':
        if (!isEdit && !value) {
          err = 'Confirm Password is required.';
        } else if (!isEdit && value !== values.password) {
          err = 'Passwords do not match.';
        }
        break;

      case 'email':
        if (!String(value ?? '').trim()) {
          err = 'Email ID is required.';
        } else if (String(value).trim().length > 254) {
          err = 'Email address must not exceed 254 characters.';
        } else if (!isValidEmail(value)) {
          err = 'Enter a valid email address with a valid domain.';
        }
        break;

      case 'designation':
        if (!DESIGNATIONS.includes(value)) {
          err = 'Please select a Designation.';
        }
        break;

      case 'userRole':
        if (!USER_ROLES.includes(value)) {
          err = 'Please select a valid User Role.';
        }
        break;

      case 'systemRole':
        if (!SYSTEM_ROLES.includes(value)) {
          err = 'Please select a System Role.';
        }
        break;

      case 'status':
        if (!['Active', 'Inactive', 'Suspended'].includes(value)) {
          err = 'Please select an Account Status.';
        }
        break;

      case 'loginBranch':
        if (
          !values.allowMultiBranch &&
          !BRANCHES.includes(value)
        ) {
          err = 'Please select a Login Branch.';
        }
        break;

      case 'sessionTimeout':
        if (
          value === '' ||
          value === null ||
          value === undefined
        ) {
          err = 'Session Timeout is required.';
        } else if (
          !/^\d+$/.test(String(value)) ||
          Number(value) < 60 ||
          Number(value) > 86400
        ) {
          err = 'Session Timeout must be between 60 and 86,400 seconds.';
        }
        break;

      case 'badLogins':
        if (
          value === '' ||
          value === null ||
          value === undefined
        ) {
          err = 'No. of Bad Login is required.';
        } else if (
          !/^\d+$/.test(String(value)) ||
          Number(value) < 0 ||
          Number(value) > 10
        ) {
          err = 'No. of Bad Login must be between 0 and 10.';
        }
        break;

      default:
        break;
    }

    return err;
  };

  /* =========================================================
     INPUT CHANGE HANDLER
  ========================================================= */

  const handleChange = (e) => {
    const input = e.currentTarget;

    const { name, type, checked } = input;

    const rawValue = input.value;

    let val;

    if (type === 'checkbox') {
      val = checked;
    } else if (
      ['firstName', 'middleName', 'lastName'].includes(name)
    ) {
      val = filterNameInput(rawValue);
    } else if (name === 'mobile') {
      val = filterMobileInput(rawValue);
    } else if (name === 'email') {
      val = rawValue.slice(0, EMAIL_MAX_LENGTH);
    } else if (name === 'sessionTimeout' || name === 'badLogins') {
      val = rawValue.replace(/\D/g, '');
    } else {
      val = rawValue;
    }

    // Immediately restore the previous value if the input is invalid.
    if (val === null || val === undefined) {
      input.value = String(form[name] ?? '');
      return;
    }

    // Update the displayed input when invalid characters were filtered.
    if (
      type !== 'checkbox' &&
      val !== rawValue &&
      typeof input.setSelectionRange === 'function'
    ) {
      const caret = input.selectionStart ?? rawValue.length;

      requestAnimationFrame(() => {
        const safeCaret = Math.min(caret, String(val).length);
        input.setSelectionRange(safeCaret, safeCaret);
      });
    }

    setSubmitError('');

    const nextForm = {
      ...form,
      [name]: val,
    };

    setForm((prev) => ({
      ...prev,
      [name]: val,
    }));

    if (name === 'allowMultiBranch') {
      setErrors((prev) => {
        const nextErrors = { ...prev };

        const branchError =
          checked || (!hasSubmitted && !touched.loginBranch)
            ? ''
            : validateField(
                'loginBranch',
                form.loginBranch,
                nextForm
              );

        if (branchError) {
          nextErrors.loginBranch = branchError;
        } else {
          delete nextErrors.loginBranch;
        }

        return nextErrors;
      });

      return;
    }

    if (
      hasSubmitted ||
      touched[name] ||
      name === 'password' ||
      name === 'confirmPassword'
    ) {
      setErrors((prev) => {
        const nextErrors = { ...prev };

        const error = validateField(name, val, nextForm);

        if (error) {
          nextErrors[name] = error;
        } else {
          delete nextErrors[name];
        }

        if (
          name === 'password' &&
          !isEdit &&
          (hasSubmitted ||
            touched.confirmPassword ||
            nextForm.confirmPassword)
        ) {
          const confirmError = validateField(
            'confirmPassword',
            nextForm.confirmPassword,
            nextForm
          );

          if (confirmError) {
            nextErrors.confirmPassword = confirmError;
          } else {
            delete nextErrors.confirmPassword;
          }
        }

        if (
          name === 'userName' &&
          (hasSubmitted || touched.password)
        ) {
          const passwordError = validateField(
            'password',
            nextForm.password,
            nextForm
          );

          if (passwordError) {
            nextErrors.password = passwordError;
          } else {
            delete nextErrors.password;
          }
        }

        return nextErrors;
      });
    }
  };

  /* =========================================================
     BLUR HANDLER
  ========================================================= */

  const handleBlur = (e) => {
    const { name, value, type, checked } = e.currentTarget;

    let inputValue = value;

    if (type === 'checkbox') {
      inputValue = checked;
    } else if (
      ['firstName', 'middleName', 'lastName'].includes(name)
    ) {
      inputValue = filterNameInput(value).trim();
    } else if (name === 'mobile') {
      inputValue = filterMobileInput(value);
    } else if (name === 'email') {
      inputValue = value.trim();
    }

    const nextForm = {
      ...form,
      [name]: inputValue,
    };

    if (inputValue !== form[name]) {
      setForm((prev) => ({
        ...prev,
        [name]: inputValue,
      }));
    }

    setTouched((prev) => ({
      ...prev,
      [name]: true,
    }));

    const errorMsg = validateField(
      name,
      inputValue,
      nextForm
    );

    setErrors((prev) => {
      const nextErrors = { ...prev };

      if (errorMsg) {
        nextErrors[name] = errorMsg;
      } else {
        delete nextErrors[name];
      }

      if (
        name === 'userName' &&
        (hasSubmitted || touched.password)
      ) {
        const passwordError = validateField(
          'password',
          nextForm.password,
          nextForm
        );

        if (passwordError) {
          nextErrors.password = passwordError;
        } else {
          delete nextErrors.password;
        }
      }

      if (
        name === 'password' &&
        !isEdit &&
        (hasSubmitted || touched.confirmPassword)
      ) {
        const confirmError = validateField(
          'confirmPassword',
          nextForm.confirmPassword,
          nextForm
        );

        if (confirmError) {
          nextErrors.confirmPassword = confirmError;
        } else {
          delete nextErrors.confirmPassword;
        }
      }

      return nextErrors;
    });
  };

  /* =========================================================
     DOB HANDLERS
  ========================================================= */

  const handleDateOfBirthChange = (date) => {
    if (!(date instanceof Date)) return;

    const value = formatLocalDate(date);

    const nextForm = {
      ...form,
      dateOfBirth: value,
    };

    const error = validateField(
      'dateOfBirth',
      value,
      nextForm
    );

    setForm((prev) => ({
      ...prev,
      dateOfBirth: value,
    }));

    setTouched((prev) => ({
      ...prev,
      dateOfBirth: true,
    }));

    setErrors((prev) => {
      const nextErrors = { ...prev };

      if (error) {
        nextErrors.dateOfBirth = error;
      } else {
        delete nextErrors.dateOfBirth;
      }

      return nextErrors;
    });

    setSubmitError('');
    setIsDobCalendarOpen(false);
  };

  const handleDateOfBirthBlur = (event) => {
    if (dobPickerRef.current?.contains(event.relatedTarget)) {
      return;
    }

    setTouched((prev) => ({
      ...prev,
      dateOfBirth: true,
    }));

    const error = validateField(
      'dateOfBirth',
      form.dateOfBirth
    );

    setErrors((prev) => {
      const nextErrors = { ...prev };

      if (error) {
        nextErrors.dateOfBirth = error;
      } else {
        delete nextErrors.dateOfBirth;
      }

      return nextErrors;
    });
  };

  /* =========================================================
     SUBMIT HANDLER
  ========================================================= */

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (submittingRef.current) return;

    setSubmitError('');
    setHasSubmitted(true);

    const newErrors = {};

    const fieldsToValidate = [
      'empNo',
      'title',
      'firstName',
      'middleName',
      'lastName',
      'userName',
      'mobile',
      'email',
      'dateOfBirth',
      'designation',
      'userRole',
      'systemRole',
      'status',
      'sessionTimeout',
      'badLogins',
    ];

    if (!isEdit || form.password) {
      fieldsToValidate.push('password');
    }

    if (!isEdit) {
      fieldsToValidate.push('confirmPassword');
    }

    if (!form.allowMultiBranch) {
      fieldsToValidate.push('loginBranch');
    }

    fieldsToValidate.forEach((field) => {
      const error = validateField(
        field,
        form[field],
        form
      );

      if (error) {
        newErrors[field] = error;
      }
    });

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);

      const firstErrorKey = Object.keys(newErrors)[0];

      const element = document.getElementById(
        `field-${firstErrorKey}`
      );

      if (element) {
        element.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
        });

        element.focus();
      }

      return;
    }

    submittingRef.current = true;
    setSubmitting(true);

    const fullName = [
      form.firstName,
      form.middleName,
      form.lastName,
    ]
      .map((name) => String(name ?? '').trim())
      .filter(Boolean)
      .join(' ');

    const branchValue = form.allowMultiBranch
      ? 'Multiple Branches'
      : form.loginBranch || 'Head Office';

    const toApiTime = (timeValue) => {
      const match = String(timeValue).match(
        /^(\d{1,2}):(\d{2})(?:\s*(AM|PM))?$/i
      );

      if (!match) return timeValue;

      let hours = Number(match[1]);

      const period = match[3]?.toUpperCase();

      if (period === 'PM' && hours < 12) {
        hours += 12;
      }

      if (period === 'AM' && hours === 12) {
        hours = 0;
      }

      return `${String(hours).padStart(2, '0')}:${match[2]}:00`;
    };

    const employeeRecord = {
      ...(initialData || {}),

      empNo: String(form.empNo).trim(),
      employeeId: String(form.empNo).trim(),

      title: form.title,

      name: fullName,
      fullName,

      firstName: String(form.firstName).trim(),
      middleName: String(form.middleName || '').trim(),
      lastName: String(form.lastName).trim(),

      userName: String(form.userName).trim(),

      mobile: normalizeIndianMobile(form.mobile),

      email: String(form.email).trim(),

      dateOfBirth: form.dateOfBirth,

      designation: form.designation,
      userRole: form.userRole,
      role: form.userRole,
      systemRole: form.systemRole,
      status: form.status,

      allow2FA: form.allow2FA,
      twoFAEnabled: form.allow2FA ? 'Y' : 'N',

      allowMultiBranch: form.allowMultiBranch,
      multiBranchAccess: form.allowMultiBranch ? 'Y' : 'N',

      loginBranch: branchValue,
      branch: branchValue,

      allowLoginOnHolidays: form.allowLoginOnHolidays,
      loginOnHolidays: form.allowLoginOnHolidays ? 'Y' : 'N',

      sessionTimeout: Number(form.sessionTimeout),
      idleTimeout: Number(form.sessionTimeout),
      inactiveSessionTimeout: String(form.sessionTimeout),

      badLogins: Number(form.badLogins),

      loginTime: form.loginTime,
      logoutTime: form.logoutTime,
    };

    try {
      if (!isEdit) {
        const userPayload = {
          empNo: employeeRecord.empNo,

          userCode: `USR-${employeeRecord.empNo.replace(
            /^EMP-?/i,
            ''
          )}`,

          username: employeeRecord.userName.toLowerCase(),

          password: form.password,

          firstName: employeeRecord.firstName,
          middleName: employeeRecord.middleName,
          lastName: employeeRecord.lastName,

          email: employeeRecord.email,
          mobile: employeeRecord.mobile,

          gender:
            employeeRecord.title === 'Mr.'
              ? 'MALE'
              : 'FEMALE',

          dob: employeeRecord.dateOfBirth,

          designation: employeeRecord.designation,

          userType: 'STAFF',

          role: employeeRecord.userRole.toUpperCase(),

          status:
            employeeRecord.status === 'Active'
              ? 'OPERATIVE'
              : employeeRecord.status === 'Inactive'
                ? 'INOPERATIVE'
                : 'SUSPENDED',

          twoFaEnabled: employeeRecord.allow2FA,

          multiBranchAccess: employeeRecord.allowMultiBranch,

          branchId: 1,
          branchName: 'Bank Of India Main Branch',

          organizationId: USER_ORGANIZATION_ID,
          organizationCode: USER_ORGANIZATION_CODE,
          organizationName: USER_ORGANIZATION_NAME,

          loginOnHolidays: employeeRecord.allowLoginOnHolidays,

          loginTime: toApiTime(employeeRecord.loginTime),
          logoutTime: toApiTime(employeeRecord.logoutTime),

          inactiveSessionTimeout: employeeRecord.sessionTimeout,
        };

        console.log(
          'Creating user with payload:',
          userPayload
        );

        await createUser(userPayload);
      }

      saveEmployee(employeeRecord);

      if (!isEdit) {
        setForm((currentForm) => ({
          ...currentForm,
          password: '',
          confirmPassword: '',
        }));
      }

      if (typeof window !== 'undefined') {
        window.sessionStorage.setItem(
          'los_user_notification',
          isEdit
            ? `Employee ${fullName} (${employeeRecord.empNo}) updated successfully.`
            : `New user ${fullName} (${employeeRecord.empNo}) created successfully.`
        );
      }

      router.push('/user_management');
    } catch (error) {
      setSubmitError(
        error instanceof Error
          ? error.message
          : 'Unable to save the user. Please try again.'
      );
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  };

  /* =========================================================
     REUSABLE INPUT STYLE
  ========================================================= */

  const helperStyle = {
    fontSize: '11px',
    color: '#647e82',
    marginTop: '4px',
    display: 'block',
  };

  /* =========================================================
     UI
  ========================================================= */

  return (
    <div>
      <PageHeader
        title={isEdit ? 'Edit Employee' : 'Add User'}
        action={
          <button
            type="button"
            className="secondary-button"
            onClick={() => router.push('/user_management')}
            aria-label="Back to User Management"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <ArrowLeft size={16} />
          </button>
        }
      />

      <form onSubmit={handleSubmit} noValidate>

        {/* ====================================================
            SECTION 1: EMPLOYEE AND PERSONAL INFORMATION
        ==================================================== */}

        <div className="form-card">
          <div className="form-card-title">
            <User size={18} color="#167c78" />
            <span>Employee and Personal Information</span>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: '18px',
            }}
          >
            <div>
              <label className="form-label" htmlFor="field-empNo">
                Emp ID <span>*</span>
              </label>

              <input
                id="field-empNo"
                name="empNo"
                type="text"
                maxLength={20}
                className={`form-input ${errors.empNo ? 'has-error' : ''}`}
                value={form.empNo}
                onChange={handleChange}
                onBlur={handleBlur}
                placeholder="e.g. EMP001"
                aria-invalid={Boolean(errors.empNo)}
              />

              {errors.empNo ? (
                <span className="field-error-text">
                  {errors.empNo}
                </span>
              ) : (
                <span style={helperStyle}>
                  Unique employee identifier (e.g. EMP001).
                </span>
              )}
            </div>

            <div>
              <label className="form-label" htmlFor="field-title">
                Title <span>*</span>
              </label>

              <select
                id="field-title"
                name="title"
                className={`form-input ${errors.title ? 'has-error' : ''}`}
                value={form.title}
                onChange={handleChange}
                onBlur={handleBlur}
                aria-invalid={Boolean(errors.title)}
              >
                <option value="">Select title</option>
                <option value="Mr.">Mr.</option>
                <option value="Mrs.">Mrs.</option>
                <option value="Ms.">Ms.</option>
              </select>

              {errors.title && (
                <span className="field-error-text">
                  {errors.title}
                </span>
              )}
            </div>

            <div>
              <label className="form-label" htmlFor="field-firstName">
                First Name <span>*</span>
              </label>

              <input
                id="field-firstName"
                name="firstName"
                type="text"
                maxLength={50}
                autoComplete="given-name"
                className={`form-input ${errors.firstName ? 'has-error' : ''}`}
                value={form.firstName}
                onChange={handleChange}
                onBlur={handleBlur}
                placeholder="Enter first name"
                aria-invalid={Boolean(errors.firstName)}
              />

              {errors.firstName ? (
                <span className="field-error-text">
                  {errors.firstName}
                </span>
              ) : (
                <span style={helperStyle}>
                  Maximum 50 characters.
                </span>
              )}
            </div>

            <div>
              <label className="form-label" htmlFor="field-middleName">
                Middle Name
              </label>

              <input
                id="field-middleName"
                name="middleName"
                type="text"
                maxLength={50}
                className={`form-input ${errors.middleName ? 'has-error' : ''}`}
                value={form.middleName}
                onChange={handleChange}
                onBlur={handleBlur}
                placeholder="Middle name (optional)"
                aria-invalid={Boolean(errors.middleName)}
              />

              {errors.middleName ? (
                <span className="field-error-text">
                  {errors.middleName}
                </span>
              ) : (
                <span style={helperStyle}>
                  Optional. Maximum 50 characters.
                </span>
              )}
            </div>

            <div>
              <label className="form-label" htmlFor="field-lastName">
                Last Name <span>*</span>
              </label>

              <input
                id="field-lastName"
                name="lastName"
                type="text"
                maxLength={50}
                autoComplete="family-name"
                className={`form-input ${errors.lastName ? 'has-error' : ''}`}
                value={form.lastName}
                onChange={handleChange}
                onBlur={handleBlur}
                placeholder="Enter last name"
                aria-invalid={Boolean(errors.lastName)}
              />

              {errors.lastName ? (
                <span className="field-error-text">
                  {errors.lastName}
                </span>
              ) : (
                <span style={helperStyle}>
                  Maximum 50 characters.
                </span>
              )}
            </div>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: '18px',
              marginTop: '18px',
            }}
          >
            <div>
              <label className="form-label" htmlFor="field-mobile">
                Mobile <span>*</span>{' '}
                <small style={{ color: '#167c78', fontWeight: 600 }}>
                  (Starts with 6, 7, 8, or 9)
                </small>
              </label>

              <input
                id="field-mobile"
                name="mobile"
                type="tel"
                inputMode="tel"
                maxLength={MOBILE_MAX_LENGTH}
                autoComplete="tel"
                className={`form-input ${errors.mobile ? 'has-error' : ''}`}
                value={form.mobile}
                onChange={handleChange}
                onBlur={handleBlur}
                placeholder="Enter mobile number"
                aria-invalid={Boolean(errors.mobile)}
              />

              {errors.mobile ? (
                <span className="field-error-text">
                  {errors.mobile}
                </span>
              ) : (
                <span style={helperStyle}>
                  Mobile number starting with 6, 7, 8, or 9. Optional +91 or 0 prefix is accepted.
                </span>
              )}
            </div>

            <div>
              <label className="form-label" htmlFor="field-dateOfBirth">
                Date of Birth <span>*</span>{' '}
                <small style={{ color: '#167c78', fontWeight: 600 }}>
                  (Min. 18 years old)
                </small>
              </label>

              <div className="dob-picker" ref={dobPickerRef}>
                <button
                  id="field-dateOfBirth"
                  type="button"
                  className={`dob-picker-trigger ${errors.dateOfBirth ? 'has-error' : ''}`}
                  aria-haspopup="dialog"
                  aria-expanded={isDobCalendarOpen}
                  aria-invalid={Boolean(errors.dateOfBirth)}
                  onClick={() => setIsDobCalendarOpen((open) => !open)}
                  onBlur={handleDateOfBirthBlur}
                >
                  <span className={selectedDob ? '' : 'dob-picker-placeholder'}>
                    {selectedDob
                      ? selectedDob.toLocaleDateString('en-IN', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        })
                      : 'Select date of birth'}
                  </span>

                  <CalendarIcon size={16} aria-hidden="true" />
                </button>

                <input
                  type="hidden"
                  name="dateOfBirth"
                  value={form.dateOfBirth}
                />

                {isDobCalendarOpen && (
                  <div
                    className="dob-calendar-popover"
                    role="dialog"
                    aria-label="Choose date of birth"
                  >
                    <Calendar
                      className="loan-birth-calendar"
                      value={selectedDob}
                      onChange={handleDateOfBirthChange}
                      minDate={minDobCalendarDate}
                      maxDate={maxDobCalendarDate}
                      defaultActiveStartDate={
                        selectedDob || maxDobCalendarDate
                      }
                      locale="en-IN"
                    />
                  </div>
                )}
              </div>

              {errors.dateOfBirth ? (
                <span className="field-error-text">
                  {errors.dateOfBirth}
                </span>
              ) : (
                <span style={helperStyle}>
                  Applicant must be at least 18 years old (born on or before {maxDobFormatted}).
                </span>
              )}
            </div>
          </div>
        </div>

        {/* ====================================================
            SECTION 2: LOGIN INFORMATION
        ==================================================== */}

        <div className="form-card">
          <div className="form-card-title">
            <Lock size={18} color="#167c78" />
            <span>Login Information</span>
          </div>

          <div className={`login-information-grid${isEdit ? ' edit' : ''}`}>
            <div>
              <label className="form-label" htmlFor="field-userName">
                User Name <span>*</span>
              </label>

              <input
                id="field-userName"
                name="userName"
                type="text"
                maxLength={30}
                autoComplete="username"
                className={`form-input ${errors.userName ? 'has-error' : ''}`}
                value={form.userName}
                onChange={handleChange}
                onBlur={handleBlur}
                placeholder="Login username"
                aria-invalid={Boolean(errors.userName)}
                style={{
                  fontWeight: 600,
                  background: '#fcfdfd',
                }}
              />

              {errors.userName ? (
                <span className="field-error-text">
                  {errors.userName}
                </span>
              ) : (
                <span style={helperStyle}>
                  Unique username for system authentication.
                </span>
              )}
            </div>

            <div>
              <label className="form-label" htmlFor="field-password">
                {isEdit
                  ? 'Password (leave blank to keep existing)'
                  : 'Password *'}
              </label>

              <div style={{ position: 'relative' }}>
                <input
                  id="field-password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  maxLength={128}
                  autoComplete="new-password"
                  className={`form-input ${errors.password ? 'has-error' : ''}`}
                  value={form.password}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  placeholder={
                    isEdit
                      ? 'Leave empty to keep existing'
                      : 'Enter strong password'
                  }
                  aria-invalid={Boolean(errors.password)}
                  style={{ paddingRight: '42px' }}
                />

                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  style={{
                    position: 'absolute',
                    right: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    border: 'none',
                    background: 'transparent',
                    cursor: 'pointer',
                    color: '#708087',
                    display: 'grid',
                    placeItems: 'center',
                  }}
                  aria-label={
                    showPassword ? 'Hide password' : 'Show password'
                  }
                >
                  {showPassword
                    ? <EyeOff size={16} />
                    : <Eye size={16} />}
                </button>
              </div>

              {errors.password ? (
                <span className="field-error-text">
                  {errors.password}
                </span>
              ) : (
                <span style={helperStyle}>
                  8-128 characters; include at least 3 of uppercase, lowercase, numbers, and symbols.
                </span>
              )}
            </div>

            {!isEdit && (
              <div>
                <label className="form-label" htmlFor="field-confirmPassword">
                  Confirm Password <span>*</span>
                </label>

                <input
                  id="field-confirmPassword"
                  name="confirmPassword"
                  type="password"
                  maxLength={128}
                  autoComplete="new-password"
                  className={`form-input ${errors.confirmPassword ? 'has-error' : ''}`}
                  value={form.confirmPassword}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  placeholder="Re-enter password"
                  aria-invalid={Boolean(errors.confirmPassword)}
                />

                {errors.confirmPassword ? (
                  <span className="field-error-text">
                    {errors.confirmPassword}
                  </span>
                ) : (
                  <span style={helperStyle}>
                    Enter the same password again.
                  </span>
                )}
              </div>
            )}

            <div>
              <label className="form-label" htmlFor="field-email">
                Email ID <span>*</span>
              </label>

              <input
                id="field-email"
                name="email"
                type="email"
                maxLength={254}
                autoComplete="email"
                className={`form-input ${errors.email ? 'has-error' : ''}`}
                value={form.email}
                onChange={handleChange}
                onBlur={handleBlur}
                placeholder="employee@bank.com"
                aria-invalid={Boolean(errors.email)}
              />

              {errors.email ? (
                <span className="field-error-text">
                  {errors.email}
                </span>
              ) : (
                <span style={helperStyle}>
                  Maximum 254 characters. Enter a valid email address.
                </span>
              )}
            </div>
          </div>
        </div>

        {/* ====================================================
            SECTION 3: ROLE AND ACCESS INFORMATION
        ==================================================== */}

        <div className="form-card">
          <div className="form-card-title">
            <Shield size={18} color="#167c78" />
            <span>Role and Access Information</span>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: '18px',
            }}
          >
            <div>
              <label className="form-label" htmlFor="field-designation">
                Designation <span>*</span>
              </label>

              <select
                id="field-designation"
                name="designation"
                className={`form-input ${errors.designation ? 'has-error' : ''}`}
                value={form.designation}
                onChange={handleChange}
                onBlur={handleBlur}
              >
                <option value="">Select Designation</option>

                {DESIGNATIONS.map((designation) => (
                  <option key={designation} value={designation}>
                    {designation}
                  </option>
                ))}
              </select>

              {errors.designation && (
                <span className="field-error-text">
                  {errors.designation}
                </span>
              )}
            </div>

            <div>
              <label className="form-label" htmlFor="field-userRole">
                User Role <span>*</span>
              </label>

              <select
                id="field-userRole"
                name="userRole"
                className={`form-input ${errors.userRole ? 'has-error' : ''}`}
                value={form.userRole}
                onChange={handleChange}
                onBlur={handleBlur}
              >
                <option value="">Select User Role</option>
                <option value="Super Admin">Super Admin User</option>
                <option value="Bank Admin">Bank Admin User</option>
                <option value="Branch User">Branch User</option>
              </select>

              {errors.userRole && (
                <span className="field-error-text">
                  {errors.userRole}
                </span>
              )}
            </div>

            <div>
              <label className="form-label" htmlFor="field-systemRole">
                System Role <span>*</span>
              </label>

              <select
                id="field-systemRole"
                name="systemRole"
                className={`form-input ${errors.systemRole ? 'has-error' : ''}`}
                value={form.systemRole}
                onChange={handleChange}
                onBlur={handleBlur}
              >
                <option value="">Select System Role</option>
                <option value="SUPER_ADMIN">SUPER_ADMIN</option>
                <option value="Maker">Maker</option>
                <option value="Checker">Checker</option>
                <option value="Viewer">Viewer</option>
              </select>

              {errors.systemRole && (
                <span className="field-error-text">
                  {errors.systemRole}
                </span>
              )}
            </div>

            <div>
              <label className="form-label" htmlFor="field-status">
                Status <span>*</span>
              </label>

              <select
                id="field-status"
                name="status"
                className={`form-input ${errors.status ? 'has-error' : ''}`}
                value={form.status}
                onChange={handleChange}
                onBlur={handleBlur}
              >
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
                <option value="Suspended">Suspended</option>
              </select>

              {errors.status && (
                <span className="field-error-text">
                  {errors.status}
                </span>
              )}
            </div>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: '18px',
              marginTop: '18px',
            }}
          >
            <div>
              <label className="form-label" htmlFor="field-loginBranch">
                Login Branch {!form.allowMultiBranch && <span>*</span>}
              </label>

              <select
                id="field-loginBranch"
                name="loginBranch"
                disabled={form.allowMultiBranch}
                className={`form-input ${errors.loginBranch ? 'has-error' : ''}`}
                value={
                  form.allowMultiBranch
                    ? ''
                    : form.loginBranch
                }
                onChange={handleChange}
                onBlur={handleBlur}
              >
                <option value="">
                  {form.allowMultiBranch
                    ? 'All branches permitted'
                    : 'Select Branch'}
                </option>

                {BRANCHES.map((branch) => (
                  <option key={branch} value={branch}>
                    {branch}
                  </option>
                ))}
              </select>

              {errors.loginBranch ? (
                <span className="field-error-text">
                  {errors.loginBranch}
                </span>
              ) : (
                <span style={helperStyle}>
                  {form.allowMultiBranch
                    ? 'Multi-branch access is enabled.'
                    : 'Primary operating branch assignment.'}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* ====================================================
            SECTION 4: SESSION AND LOGIN SETTINGS
        ==================================================== */}

        <div className="form-card">
          <div className="form-card-title">
            <Clock size={18} color="#167c78" />
            <span>Session and Login Settings</span>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: '18px',
            }}
          >
            <div>
              <label className="form-label" htmlFor="field-sessionTimeout">
                Session Timeout (in sec) <span>*</span>
              </label>

              <input
                id="field-sessionTimeout"
                name="sessionTimeout"
                type="text"
                inputMode="numeric"
                maxLength={5}
                className={`form-input ${errors.sessionTimeout ? 'has-error' : ''}`}
                value={form.sessionTimeout ?? ''}
                onChange={handleChange}
                onBlur={handleBlur}
                aria-invalid={Boolean(errors.sessionTimeout)}
              />

              {errors.sessionTimeout ? (
                <span className="field-error-text">
                  {errors.sessionTimeout}
                </span>
              ) : (
                <span style={helperStyle}>
                  Duration before the login session expires (60 - 86,400 seconds).
                </span>
              )}
            </div>

            <div>
              <label className="form-label" htmlFor="field-loginTime">
                Login Time
              </label>

              <input
                id="field-loginTime"
                name="loginTime"
                type="text"
                className="form-input"
                value={form.loginTime}
                onChange={handleChange}
                placeholder="09:00 AM"
              />

              <span style={helperStyle}>
                Permitted daily access window start time.
              </span>
            </div>

            <div>
              <label className="form-label" htmlFor="field-logoutTime">
                LogOut Time
              </label>

              <input
                id="field-logoutTime"
                name="logoutTime"
                type="text"
                className="form-input"
                value={form.logoutTime}
                onChange={handleChange}
                placeholder="06:00 PM"
              />

              <span style={helperStyle}>
                Permitted daily access window end time.
              </span>
            </div>
          </div>
        </div>

        {/* ====================================================
            GLOBAL ERROR BANNER
        ==================================================== */}

        {(Object.keys(errors).length > 0 || submitError) && (
          <div
            style={{
              padding: '12px 18px',
              borderRadius: '8px',
              background: '#fef2f2',
              border: '1px solid #fecaca',
              color: '#b91c1c',
              fontSize: '12px',
              marginBottom: '20px',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
            }}
          >
            <AlertCircle size={18} />

            <span>
              {submitError ||
                'Please correct the errors highlighted above before submitting the form.'}
            </span>
          </div>
        )}

        {/* ====================================================
            BOTTOM ACTIONS
        ==================================================== */}

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            gap: '14px',
            paddingTop: '10px',
            marginBottom: '40px',
          }}
        >
          <button
            type="button"
            className="secondary-button"
            onClick={() => router.push('/user_management')}
            style={{ minWidth: '110px' }}
          >
            Cancel
          </button>

          <button
            type="submit"
            disabled={submitting}
            aria-busy={submitting}
            className="primary-button"
            style={{
              minWidth: '140px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            {isEdit ? <Save size={16} /> : <Check size={16} />}

            {submitting
              ? 'Submitting...'
              : isEdit
                ? 'Save Changes'
                : 'Submit'}
          </button>
        </div>
      </form>
    </div>
  );
}
