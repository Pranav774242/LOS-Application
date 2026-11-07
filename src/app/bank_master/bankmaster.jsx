'use client';

import { useEffect, useState } from 'react';
import {
  Building2,
  Check,
  ChevronLeft,
  ChevronRight,
  Landmark,
  LoaderCircle,
  MapPin,
  Plus,
  RotateCcw,
  Save,
  SlidersHorizontal
} from 'lucide-react';
import AppShell from '../../components/AppShell';
import { getBankMaster, updateBankMaster } from '../../services/bankmaster';
import { getLookupOptions, getLookupTypes } from '../../services/lookups';

const steps = [
  { id: 'bank', label: 'Bank Info', icon: Building2 },
  { id: 'address', label: 'Address Details', icon: MapPin },
  { id: 'accounts', label: 'Account Details', icon: Landmark },
  { id: 'limits', label: 'Limit Details', icon: SlidersHorizontal }
];

const emptyAccount = () => ({ particulars: '', bankName: '', accountType: '', accountNumber: '', micrCode: '', ifscCode: '' });
const validateAccount = (account, prefix = 'account-draft-') => {
  const errors = {};
  for (const [key, label] of [['bankName', 'Bank name'], ['accountType', 'Account type'], ['accountNumber', 'Account number'], ['micrCode', 'MICR code'], ['ifscCode', 'IFSC code']]) {
    if (!String(account[key] || '').trim()) errors[`${prefix}${key}`] = `${label} is required.`;
  }
  if (account.accountNumber && !/^[A-Z0-9 -]{4,34}$/i.test(account.accountNumber.trim())) {
    errors[`${prefix}accountNumber`] = 'Use 4–34 letters, numbers, spaces, or hyphens.';
  }
  if (account.micrCode && !/^\d{9}$/.test(account.micrCode.trim())) errors[`${prefix}micrCode`] = 'MICR code must contain 9 digits.';
  if (account.ifscCode && !/^[A-Z]{4}0[A-Z0-9]{6}$/i.test(account.ifscCode.trim())) {
    errors[`${prefix}ifscCode`] = 'Enter a valid 11-character IFSC code.';
  }
  return errors;
};
const emptyForm = () => ({
  bankCode: '', bankName: '', bankType: '', licenseNumber: '', pan: '', gstNumber: '', branchCount: '',
  addressType: '', pincode: '', address: '', addressLine2: '', landmark: '', city: '', state: '',
  accounts: [], approvalAuthority: '',
  singlePartyLimit: '', groupExposureLimit: '', sanctionMargin: '', penaltyCharge: '', penaltyRate: ''
});

function firstValue(source, keys) {
  for (const key of keys) {
    const value = source?.[key];
    if (value !== undefined && value !== null && value !== '') return value;
  }
  return '';
}

function toForm(profile) {
  const form = emptyForm();
  const accountData = firstValue(profile, ['other_bank_details', 'otherBankDetails', 'account_details', 'accountDetails']);
  const accounts = Array.isArray(accountData) ? accountData.map((account) => ({
    particulars: String(firstValue(account, ['particulars', 'particular', 'purpose'])),
    bankName: firstValue(account, ['bank_name', 'bankName']),
    accountType: firstValue(account, ['account_type', 'accountType']),
    accountNumber: firstValue(account, ['account_number', 'account_no', 'accountNumber']),
    micrCode: firstValue(account, ['micr_code', 'micrCode']),
    ifscCode: firstValue(account, ['ifsc_code', 'ifscCode'])
  })) : [];

  return {
    ...form,
    bankCode: String(firstValue(profile, ['bank_code', 'bankCode', 'code'])),
    bankName: String(firstValue(profile, ['bank_name', 'bankName', 'name', 'legal_name'])),
    bankType: String(firstValue(profile, ['bank_type', 'bankType', 'type'])),
    licenseNumber: String(firstValue(profile, ['license_number', 'registration_license_number', 'licenseNumber', 'registration_number'])),
    pan: String(firstValue(profile, ['PAN', 'pan', 'pan_number'])),
    gstNumber: String(firstValue(profile, ['gst_number', 'gst_no', 'gstNumber'])),
    branchCount: String(firstValue(profile, ['number_of_branches', 'branch_count', 'numberOfBranches'])),
    addressType: String(firstValue(profile, ['address_type', 'addressType'])),
    pincode: String(firstValue(profile, ['pincode', 'pin_code', 'postal_code'])),
    address: String(firstValue(profile, ['unit_gala_name_and_number', 'address', 'address_line_1'])),
    addressLine2: String(firstValue(profile, ['street_road', 'address_line_2', 'address2'])),
    landmark: String(firstValue(profile, ['landmark', 'landmark_details'])),
    city: String(firstValue(profile, ['city'])),
    state: String(firstValue(profile, ['state', 'state_name'])),
    accounts,
    approvalAuthority: String(firstValue(profile, ['approval_authority', 'approvalAuthority'])),
    singlePartyLimit: String(firstValue(profile, ['single_party_limit', 'singlePartyLimit'])),
    groupExposureLimit: String(firstValue(profile, ['group_exposure_limit', 'groupExposureLimit'])),
    sanctionMargin: String(firstValue(profile, ['sanction_margin', 'sanction_margin_percent', 'sanctionMargin'])),
    penaltyCharge: String(firstValue(profile, ['penalty_charge', 'penaltyCharge'])),
    penaltyRate: String(firstValue(profile, ['penalty_rate', 'penaltyRate']))
  };
}

function validateStep(stepIndex, values) {
  const errors = {};
  const add = (field, message) => { errors[field] = message; };
  const required = (field, label, minLength = 1) => {
    const value = String(values[field] || '').trim();
    if (value.length < minLength) add(field, `${label} must be at least ${minLength} characters.`);
  };
  const validAmount = (field, label, max = Number.MAX_SAFE_INTEGER) => {
    const value = String(values[field] || '').trim();
    if (value && (!/^\d+(\.\d{1,2})?$/.test(value) || Number(value) > max)) {
      add(field, `${label} must be a non-negative amount${max < Number.MAX_SAFE_INTEGER ? ` not over ${max}` : ''}.`);
    }
  };

  if (stepIndex === 0) {
    required('bankCode', 'Bank code', 2);
    if (values.bankCode.trim() && !/^[A-Z0-9][A-Z0-9-]{1,19}$/i.test(values.bankCode.trim())) {
      add('bankCode', 'Use 2–20 letters, numbers, or hyphens.');
    }
    required('bankName', 'Bank name', 2);
    if (values.bankName.trim().length > 120) add('bankName', 'Bank name cannot exceed 120 characters.');
    required('bankType', 'Bank type', 2);
    if (values.licenseNumber.trim() && !/^[A-Z0-9/-]{3,30}$/i.test(values.licenseNumber.trim())) {
      add('licenseNumber', 'Use 3–30 letters, numbers, /, or hyphens.');
    }
    if (values.pan.trim() && !/^[A-Z]{5}[0-9]{4}[A-Z]$/i.test(values.pan.trim())) add('pan', 'Enter a valid 10-character PAN.');
    if (values.gstNumber.trim() && !/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/i.test(values.gstNumber.trim())) {
      add('gstNumber', 'Enter a valid 15-character GSTIN.');
    }
    if (values.branchCount && (!/^\d+$/.test(values.branchCount) || Number(values.branchCount) < 1 || Number(values.branchCount) > 100000)) {
      add('branchCount', 'Enter a whole number between 1 and 100,000.');
    }
  }

  if (stepIndex === 2) {
    values.accounts.forEach((account, index) => {
      Object.assign(errors, validateAccount(account, `account-${index}-`));
    });
  }

  if (stepIndex === 3) {
    validAmount('singlePartyLimit', 'Single party limit');
    validAmount('groupExposureLimit', 'Group exposure limit');
    validAmount('penaltyCharge', 'Penalty charge');
    for (const field of ['sanctionMargin', 'penaltyRate']) {
      const value = String(values[field] || '').trim();
      if (value && (!/^\d+(\.\d{1,2})?$/.test(value) || Number(value) > 100)) {
        add(field, `${field === 'sanctionMargin' ? 'Sanction margin' : 'Penalty rate'} must be between 0 and 100.`);
      }
    }
  }
  return errors;
}

function TextField({ label, field, value, onChange, error, hint, required = false, type = 'text', ...props }) {
  const errorId = `bank-master-${field}-error`;
  return (
    <label className="bank-master-field">
      <span>{label}{required && <em aria-hidden="true"> *</em>}</span>
      <input
        id={`bank-master-${field}`}
        name={field}
        type={type}
        value={value}
        onChange={onChange}
        aria-required={required}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? errorId : undefined}
        {...props}
      />
      {hint && <small className="bank-master-field-hint">{hint}</small>}
      {error && <small className="bank-master-field-error" id={errorId}>{error}</small>}
    </label>
  );
}

export default function BankMaster() {
  const [form, setForm] = useState(emptyForm);
  const [originalForm, setOriginalForm] = useState(null);
  const [activeStep, setActiveStep] = useState(0);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [accountDraft, setAccountDraft] = useState(emptyAccount);
  const [editingAccountIndex, setEditingAccountIndex] = useState(null);
  const [pageError, setPageError] = useState('');
  const [notice, setNotice] = useState('');
  const [particularOptions, setParticularOptions] = useState([]);
  const [particularsLoading, setParticularsLoading] = useState(true);
  const [particularsError, setParticularsError] = useState('');
  const [particularsRetry, setParticularsRetry] = useState(0);

  async function loadBank() {
    setLoading(true);
    setPageError('');
    try {
      const response = await getBankMaster();
      const loadedForm = toForm(response?.data || response || {});
      setForm(loadedForm);
      setOriginalForm(loadedForm);
      setAccountDraft(emptyAccount());
      setEditingAccountIndex(null);
    } catch (error) {
      setPageError(error.message || 'Unable to load bank details.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadBank();
  }, []);

  useEffect(() => {
    const controller = new AbortController();

    async function loadParticularOptions() {
      setParticularsLoading(true);
      setParticularsError('');
      setParticularOptions([]);
      try {
        const lookupTypes = await getLookupTypes(controller.signal);
        const normalize = (value) => String(value || '').toLowerCase().replace(/[^a-z0-9]/g, '');
        const candidates = lookupTypes
          .filter((lookup) => lookup.status === 'Active' && normalize(`${lookup.code} ${lookup.name}`).includes('particular'))
          .sort((first, second) => {
            const firstExact = ['particular', 'particulars'].includes(normalize(first.code)) || ['particular', 'particulars'].includes(normalize(first.name));
            const secondExact = ['particular', 'particulars'].includes(normalize(second.code)) || ['particular', 'particulars'].includes(normalize(second.name));
            return Number(secondExact) - Number(firstExact);
          });
        if (!candidates.length) {
          throw new Error('Create an active “Particulars” lookup type in Lookup Management to populate this dropdown.');
        }

        const options = await getLookupOptions(candidates[0].code, controller.signal);
        if (!controller.signal.aborted) {
          const activeOptions = options.filter((option) => option.status === 'Active');
          if (activeOptions.length === 0) {
            throw new Error('The active “Particulars” lookup has no options. Add active options in Lookup Management and retry.');
          }
          setParticularOptions(activeOptions);
        }
      } catch (error) {
        if (!controller.signal.aborted) {
          setParticularOptions([]);
          setParticularsError(error.message || 'Unable to load Particulars options from the backend.');
        }
      } finally {
        if (!controller.signal.aborted) setParticularsLoading(false);
      }
    }

    loadParticularOptions();
    return () => controller.abort();
  }, [particularsRetry]);

  function updateField(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: '' }));
    setNotice('');
  }

  function updateAccountDraft(field, value) {
    setAccountDraft((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, accountDraft: '', [`account-draft-${field}`]: '' }));
    setNotice('');
  }

  function retryParticulars() {
    setParticularsRetry((current) => current + 1);
  }

  function addAccount() {
    const accountErrors = validateAccount(accountDraft);
    setErrors(accountErrors);
    const firstInvalidField = Object.keys(accountErrors)[0];
    if (firstInvalidField) {
      document.getElementById(`bank-master-${firstInvalidField}`)?.focus();
      return;
    }
    const account = {
      ...accountDraft,
      particulars: accountDraft.particulars.trim(),
      bankName: accountDraft.bankName.trim(),
      accountType: accountDraft.accountType.trim(),
      accountNumber: accountDraft.accountNumber.trim(),
      micrCode: accountDraft.micrCode.trim(),
      ifscCode: accountDraft.ifscCode.trim().toUpperCase()
    };
    setForm((current) => ({
      ...current,
      accounts: editingAccountIndex === null
        ? [...current.accounts, account]
        : current.accounts.map((savedAccount, index) => index === editingAccountIndex ? account : savedAccount)
    }));
    setAccountDraft(emptyAccount());
    setEditingAccountIndex(null);
    setErrors({});
    setNotice('');
  }

  function editAccount(index) {
    setAccountDraft({ ...form.accounts[index] });
    setEditingAccountIndex(index);
    setErrors({});
    setNotice('');
  }

  function removeAccount(index) {
    setForm((current) => ({ ...current, accounts: current.accounts.filter((_, accountIndex) => accountIndex !== index) }));
    if (editingAccountIndex === index) {
      setAccountDraft(emptyAccount());
      setEditingAccountIndex(null);
    } else if (editingAccountIndex !== null && editingAccountIndex > index) {
      setEditingAccountIndex((current) => current - 1);
    }
    setErrors({});
    setNotice('');
  }

  function validateCurrentStep() {
    if (activeStep === 2 && (editingAccountIndex !== null || Object.values(accountDraft).some((value) => String(value).trim()))) {
      setErrors({ accountDraft: 'Add or update this account, or cancel the edit before continuing.' });
      return false;
    }
    const nextErrors = validateStep(activeStep, form);
    setErrors(nextErrors);
    const firstInvalidField = Object.keys(nextErrors)[0];
    if (firstInvalidField) {
      const invalidAccount = firstInvalidField.match(/^account-(\d+)-(.+)$/);
      if (invalidAccount) {
        const index = Number(invalidAccount[1]);
        editAccount(index);
        window.setTimeout(() => document.getElementById(`bank-master-account-draft-${invalidAccount[2]}`)?.focus(), 0);
        return false;
      }
      const input = document.getElementById(`bank-master-${firstInvalidField}`);
      input?.focus();
      return false;
    }
    return true;
  }

  function goNext() {
    if (!validateCurrentStep()) return;
    setActiveStep((current) => Math.min(current + 1, steps.length - 1));
    setErrors({});
  }

  async function saveAccountsAndNext() {
    if (saving || !validateCurrentStep()) return;

    setSaving(true);
    setPageError('');
    setNotice('');
    try {
      const response = await updateBankMaster(form);
      const savedForm = { ...form, accounts: form.accounts.map((account) => ({ ...account })) };
      setOriginalForm(savedForm);
      setNotice(response?.message || 'Bank account details saved successfully.');
      setErrors({});
      setActiveStep(3);
    } catch (error) {
      setPageError(error.message || 'Unable to save bank account details.');
    } finally {
      setSaving(false);
    }
  }

  function cancelChanges() {
    if (originalForm) setForm({ ...originalForm, accounts: originalForm.accounts.map((account) => ({ ...account })) });
    setAccountDraft(emptyAccount());
    setEditingAccountIndex(null);
    setErrors({});
    setActiveStep(0);
    setNotice('Changes discarded.');
  }

  async function submitForm(event) {
    event.preventDefault();
    const allErrors = steps.reduce((collected, _step, index) => ({ ...collected, ...validateStep(index, form) }), {});
    setErrors(allErrors);
    const firstInvalidField = Object.keys(allErrors)[0];
    if (firstInvalidField) {
      const stepIndex = firstInvalidField.startsWith('account-') ? 2 : ['singlePartyLimit', 'groupExposureLimit', 'sanctionMargin', 'penaltyCharge', 'penaltyRate'].includes(firstInvalidField) ? 3 : 0;
      setActiveStep(stepIndex);
      const invalidAccount = firstInvalidField.match(/^account-(\d+)-(.+)$/);
      if (invalidAccount) {
        const index = Number(invalidAccount[1]);
        setAccountDraft({ ...form.accounts[index] });
        setEditingAccountIndex(index);
        window.setTimeout(() => document.getElementById(`bank-master-account-draft-${invalidAccount[2]}`)?.focus(), 0);
      } else {
        window.setTimeout(() => document.getElementById(`bank-master-${firstInvalidField}`)?.focus(), 0);
      }
      return;
    }

    setSaving(true);
    setPageError('');
    setNotice('');
    try {
      const response = await updateBankMaster(form);
      console.log("Bank Master Submit payload:", form);
      setOriginalForm({ ...form, accounts: form.accounts.map((account) => ({ ...account })) });
      setNotice(response?.message || 'Bank details updated successfully.');
      setActiveStep(0);
    } catch (error) {
      setPageError(error.message || 'Unable to update bank details.');
    } finally {
      setSaving(false);
    }
  }

  const currentStep = steps[activeStep];
  const StepIcon = currentStep.icon;
  return (
    <AppShell title="">
      <div className="bank-master-page">
        <div style={{ marginTop: '-15px', marginBottom: '26px' }}>
          <h1 style={{ margin: 0, color: '#23474C', font: '700 23px Manrope' }}>
            Bank Master
          </h1>
          <div className="page-header-marquee" role="note" aria-label="Set effective-dated interest tiers by loan product and tenure.">
            <div className="page-header-marquee-window" aria-hidden="true">
              <div className="page-header-marquee-track">
                <span>Set effective-dated interest tiers by loan product and tenure.</span>
              </div>
            </div>
          </div>
        </div>

        {pageError && (
          <div className="bank-master-alert" role="alert">
            <span>{pageError}</span>
            {!loading && !originalForm && <button type="button" onClick={loadBank}>Try again</button>}
          </div>
        )}
        {notice && <p className="bank-master-success" role="status"><Check size={16} />{notice}</p>}

        <section className="bank-master-card" aria-label="Bank master editor">
          {loading ? (
            <div className="bank-master-loading"><LoaderCircle size={22} /> Loading bank details...</div>
          ) : !originalForm ? (
            <div className="bank-master-empty">Bank details could not be loaded. Try again to continue.</div>
          ) : (
            <form onSubmit={submitForm} noValidate>
              <div className="bank-master-layout">
                <nav className="bank-master-steps" aria-label="Bank details sections">
                  {steps.map(({ id, label, icon: Icon }, index) => (
                    <button
                      className={`bank-master-step${activeStep === index ? ' active' : ''}${activeStep > index ? ' visited' : ''}`}
                      type="button"
                      key={id}
                      aria-current={activeStep === index ? 'step' : undefined}
                      onClick={() => index < activeStep && setActiveStep(index)}
                      disabled={index > activeStep}
                    >
                      <span className="bank-master-step-icon"><Icon size={17} /></span>
                      <span>{label}</span>
                      {activeStep > index && <Check className="bank-master-step-check" size={15} />}
                    </button>
                  ))}
                </nav>

                <div className="bank-master-panel" key={currentStep.id}>
                  <header className="bank-master-panel-heading">
                    <span className="bank-master-panel-icon"><StepIcon size={19} /></span>
                    <div>
                      <span>STEP {activeStep + 1} OF {steps.length}</span>
                      <h2>{currentStep.label}</h2>
                    </div>
                  </header>

                  {activeStep === 0 && (
                    <div className="bank-master-readonly-grid" aria-readonly="true">
                      <p className="bank-master-readonly-note"><Landmark size={16} /> Bank information is managed by your organization and cannot be edited here.</p>
                      {[
                        ['Bank Code', form.bankCode],
                        ['Bank Name', form.bankName],
                        ['Bank Type', form.bankType],
                        ['Registration License No.', form.licenseNumber],
                        ['PAN No.', form.pan],
                        ['G.S.T. No.', form.gstNumber],
                        ['No. of Branches', form.branchCount]
                      ].map(([label, value]) => (
                        <div className="bank-master-readonly-field" key={label}>
                          <span>{label} <em aria-label="required">*</em></span>
                          <strong>{value || 'Not provided by backend'}</strong>
                        </div>
                      ))}
                    </div>
                  )}

                  {activeStep === 1 && (
                    <div className="bank-master-readonly-grid" aria-readonly="true">
                      <p className="bank-master-readonly-note"><MapPin size={16} /> Address details are managed by your organization and cannot be edited here.</p>
                      {[
                        ['Address Type', form.addressType],
                        ['Pincode', form.pincode],
                        ['Address', form.address],
                        ['Address 2', form.addressLine2],
                        ['Landmark', form.landmark],
                        ['City', form.city],
                        ['State / Union Territory', form.state]
                      ].map(([label, value]) => (
                        <div className="bank-master-readonly-field" key={label}>
                          <span>{label}</span>
                          <strong>{value || 'Not provided by backend'}</strong>
                        </div>
                      ))}
                    </div>
                  )}

                  {activeStep === 2 && (
                    <div className="bank-master-accounts">
                      <div className="bank-master-table-heading">
                        <div><h3>Bank Account Details</h3><p>Add accounts one at a time. Saved accounts appear in the list below.</p></div>
                      </div>
                                      <section className="bank-master-account-entry" aria-label="Add bank account">
                                        <h4>{editingAccountIndex === null ? 'New account' : `Edit account ${editingAccountIndex + 1}`}</h4>
                                        {particularsError && (
                                          <p className="bank-master-particulars-error" role="alert">
                                            <span>{particularsError}</span>
                                            <button type="button" onClick={retryParticulars} disabled={particularsLoading}>Retry</button>
                                          </p>
                                        )}
                                        <div className="bank-master-account-fields">
                                          <label className="bank-master-field">
                                            <span>Particulars</span>
                                            <select
                                              id="bank-master-account-draft-particulars"
                                              value={accountDraft.particulars}
                                              disabled={particularsLoading || particularOptions.length === 0}
                                              onChange={(event) => updateAccountDraft('particulars', event.target.value)}
                                            >
                                              <option value="">{particularsLoading ? 'Loading particulars...' : 'Select particulars'}</option>
                                              {particularOptions.map((option) => <option value={option.name} key={String(option.id)}>{option.name}</option>)}
                                            </select>
                                          </label>
                                          {[
                                            ['bankName', 'Bank Name', 120],
                                            ['accountNumber', 'Account Number', 34],
                            ['micrCode', 'MICR Code', 9],
                            ['ifscCode', 'IFSC Code', 11]
                          ].map(([field, label, maxLength]) => {
                            const errorKey = `account-draft-${field}`;
                            return (
                              <TextField
                                key={field}
                                label={label}
                                field={errorKey}
                                value={accountDraft[field]}
                                maxLength={maxLength}
                                required
                                inputMode={field === 'micrCode' ? 'numeric' : undefined}
                                autoCapitalize={field === 'ifscCode' || field === 'micrCode' ? 'characters' : undefined}
                                error={errors[errorKey]}
                                onChange={(event) => updateAccountDraft(field, ['ifscCode', 'micrCode'].includes(field) ? event.target.value.toUpperCase() : event.target.value)}
                              />
                            );
                          })}
                          <label className="bank-master-field">
                            <span>Account Type<em aria-hidden="true"> *</em></span>
                            <select
                              id="bank-master-account-draft-accountType"
                              value={accountDraft.accountType}
                              aria-required="true"
                              aria-invalid={Boolean(errors['account-draft-accountType'])}
                              aria-describedby={errors['account-draft-accountType'] ? 'bank-master-account-draft-accountType-error' : undefined}
                              onChange={(event) => updateAccountDraft('accountType', event.target.value)}
                            >
                              <option value="">Select account type</option>
                              {['Current', 'Savings', 'Cash Credit', 'Overdraft', 'Fixed Deposit', 'Other'].map((type) => <option value={type} key={type}>{type}</option>)}
                            </select>
                            {errors['account-draft-accountType'] && <small className="bank-master-field-error" id="bank-master-account-draft-accountType-error">{errors['account-draft-accountType']}</small>}
                          </label>
                        </div>
                        <div className="bank-master-account-entry-actions">
                    <button
                    className="bank-master-add-row"
                 type="button"
              onClick={addAccount}
>
  {editingAccountIndex === null ? 'Save' : 'Update account'}
</button>
                          {editingAccountIndex !== null && (
                            <button className="bank-master-account-cancel-edit" type="button" onClick={() => {
                              setAccountDraft(emptyAccount());
                              setEditingAccountIndex(null);
                              setErrors({});
                            }}>Cancel edit</button>
                          )}
                        </div>
                        {errors.accountDraft && <small className="bank-master-field-error" role="alert">{errors.accountDraft}</small>}
                      </section>
                      {form.accounts.length ? (
                        <div className="bank-master-account-table-wrap">
                          <table className="bank-master-account-table">
                            <thead><tr><th>Particulars</th><th>Bank Name</th><th>Account Type</th><th>Account No.</th><th>MICR Code</th><th>IFSC Code</th><th>Actions</th></tr></thead>
                            <tbody>
                              {form.accounts.map((account, index) => (
                                <tr key={`${account.accountNumber}-${index}`}>
                                  <td>{account.particulars || '—'}</td>
                                  <td>{account.bankName}</td>
                                  <td>{account.accountType}</td>
                                  <td>{account.accountNumber}</td>
                                  <td>{account.micrCode}</td>
                                  <td>{account.ifscCode}</td>
                                  <td className="bank-master-account-actions">
                                    <button type="button" onClick={() => editAccount(index)}>Edit</button>
                                    <button type="button" onClick={() => removeAccount(index)}>Remove</button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <div className="bank-master-account-empty">
                          <Landmark size={22} />
                          <strong>No bank accounts added</strong>
                          <span>Complete the account details above and select “Save”.</span>
                        </div>
                      )}
                    </div>
                  )}

                  {activeStep === 3 && (
                    <div className="bank-master-fields">
                      <label className="bank-master-field">
                        <span>Loan Approval Authority</span>
                        <select
                          id="bank-master-approvalAuthority"
                          value={form.approvalAuthority}
                          onChange={(event) => updateField('approvalAuthority', event.target.value)}
                        >
                          <option value="">Select approval authority</option>
                          {['Branch Manager', 'Branch Credit Committee', 'Regional Credit Committee', 'Zonal Credit Committee', 'Head Office Credit Committee', 'Board Credit Committee'].map((authority) => <option value={authority} key={authority}>{authority}</option>)}
                        </select>
                        <small className="bank-master-field-hint">Choose the approval level authorized to sanction loans under this delegation.</small>
                      </label>
                      <TextField label="Single Party Limit" field="singlePartyLimit" value={form.singlePartyLimit} onChange={(event) => updateField('singlePartyLimit', event.target.value)} error={errors.singlePartyLimit} type="number" min="0" step="0.01" inputMode="decimal" />
                      <TextField label="Group Exposure Limit" field="groupExposureLimit" value={form.groupExposureLimit} onChange={(event) => updateField('groupExposureLimit', event.target.value)} error={errors.groupExposureLimit} type="number" min="0" step="0.01" inputMode="decimal" />
                      <TextField label="Sanction Margin %" field="sanctionMargin" value={form.sanctionMargin} onChange={(event) => updateField('sanctionMargin', event.target.value)} error={errors.sanctionMargin} type="number" min="0" max="100" step="0.01" inputMode="decimal" />
                      <TextField label="Penalty Charge" field="penaltyCharge" value={form.penaltyCharge} onChange={(event) => updateField('penaltyCharge', event.target.value)} error={errors.penaltyCharge} type="number" min="0" step="0.01" inputMode="decimal" />
                      <TextField label="Penalty Rate %" field="penaltyRate" value={form.penaltyRate} onChange={(event) => updateField('penaltyRate', event.target.value)} error={errors.penaltyRate} type="number" min="0" max="100" step="0.01" inputMode="decimal" />
                    </div>
                  )}

                  <footer className="bank-master-actions">
                    <button className="bank-master-cancel" type="button" onClick={cancelChanges}><RotateCcw size={16} /> Cancel</button>
                    <div>
                      {activeStep > 0 && <button className="bank-master-previous" type="button" onClick={() => { setActiveStep((step) => step - 1); setErrors({}); }}><ChevronLeft size={17} /> Previous</button>}
                      {activeStep < steps.length - 1 ? (
                        <button className="bank-master-next" type="button" onClick={activeStep === 2 ? saveAccountsAndNext : goNext} disabled={saving}>
                          {activeStep === 2 && saving ? <LoaderCircle className="bank-master-spinner" size={16} /> : null}
                          {activeStep === 2 ? saving ? 'Saving...' : 'Next' : 'Next'}
                          {!saving && <ChevronRight size={17} />}
                        </button>
                      ) : (
                        <button className="bank-master-next" type="submit" disabled={saving}>{saving ? <LoaderCircle className="bank-master-spinner" size={16} /> : <Save size={16} />}{saving ? 'Saving...' : 'Submit'}</button>
                      )}
                    </div>
                  </footer>
                </div>
              </div>
            </form>
          )}
        </section>
      </div>
      <style>{`
        .bank-master-account-entry{margin-bottom:20px;padding:18px;border:1px solid #dce7e3;border-radius:9px;background:#fbfdfc}
        .bank-master-account-entry h4{margin:0 0 16px;color:#315250;font-size:12px;font-weight:800}
        .bank-master-account-entry-actions{display:flex;align-items:center;gap:12px;margin-top:16px}
        .bank-master-account-entry>.bank-master-field-error{display:block;margin-top:8px}
        .bank-master-particulars-error{display:flex;align-items:center;justify-content:space-between;gap:12px;margin:0 0 14px;padding:10px 12px;border:1px solid #e8cbcb;border-radius:5px;background:#fff7f7;color:#a43838;font-size:11px;line-height:1.5}
        .bank-master-particulars-error button{flex:none;color:#176d67;font-size:11px;font-weight:700;text-decoration:underline}
        .bank-master-account-cancel-edit,.bank-master-account-actions button{color:#176d67;font-size:11px;font-weight:700;text-decoration:underline}
        .bank-master-account-table-wrap{overflow:auto;border:1px solid #dce7e3;border-radius:8px}
        .bank-master-account-table{width:100%;min-width:800px;border-collapse:collapse;background:#fff}
        .bank-master-account-table th,.bank-master-account-table td{padding:11px 12px;border-bottom:1px solid #e8efed;text-align:left;font-size:11px}
        .bank-master-account-table th{background:#f3f7f6;color:#52696b;font-size:10px;font-weight:800}
        .bank-master-account-table tbody tr:last-child td{border-bottom:0}
        .bank-master-account-actions{display:flex;gap:12px}
        .bank-master-readonly-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px 22px;max-width:900px}
        .bank-master-readonly-note{grid-column:1/-1;display:flex;align-items:center;gap:8px;margin:0 0 4px;padding:11px 13px;border:1px solid #cfe3df;border-radius:5px;background:#f2f8f6;color:#406864;font-size:12px;line-height:1.5}
        .bank-master-readonly-note svg{flex:none;color:#177e7a}
        .bank-master-readonly-field{display:grid;gap:7px;min-width:0;padding:11px 12px;border:1px solid #dce6e5;border-radius:5px;background:#f8faf9}
        .bank-master-readonly-field span{color:#355157;font-size:12px;font-weight:600}
        .bank-master-readonly-field em{color:#bd4545;font-style:normal}
        .bank-master-readonly-field strong{min-height:19px;overflow-wrap:anywhere;color:#203c42;font-size:13px;font-weight:600}
        .bank-master-table th:last-child,.bank-master-table td:last-child{width:48px}
        .bank-master-table-empty{text-align:center!important;color:#76898c!important}
        .bank-master-table th:first-child,.bank-master-table td:first-child{width:170px}
        .bank-master-table td select{width:100%;min-width:130px;height:32px;padding:0 6px;border:1px solid #d3dfdf;border-radius:4px;background:#f4f7f6;color:#687a7c;font-size:10px}
        .bank-master-api-note{margin:9px 0 0;color:#718689;font-size:11px;line-height:1.5}
        @media(max-width:600px){.bank-master-readonly-grid{grid-template-columns:1fr}}
      `}</style>
    </AppShell>
  );
}