'use client';

import { useState } from 'react';
import {
  Building2,
  Check,
  ChevronLeft,
  ChevronRight,
  Landmark,
  MapPin,
  Plus,
  RotateCcw,
  Save,
  SlidersHorizontal
} from 'lucide-react';
import AppShell from '../../components/AppShell';

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
  const [sessionBaseline, setSessionBaseline] = useState(emptyForm);
  const [activeStep, setActiveStep] = useState(0);
  const [errors, setErrors] = useState({});
  const [accountDraft, setAccountDraft] = useState(emptyAccount);
  const [editingAccountIndex, setEditingAccountIndex] = useState(null);
  const [notice, setNotice] = useState('');

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

  function saveAccountsAndNext() {
    if (!validateCurrentStep()) return;
    setNotice('Account details are kept for this page session only.');
    setErrors({});
    setActiveStep(3);
  }

  function cancelChanges() {
    setForm({ ...sessionBaseline, accounts: sessionBaseline.accounts.map((account) => ({ ...account })) });
    setAccountDraft(emptyAccount());
    setEditingAccountIndex(null);
    setErrors({});
    setActiveStep(0);
    setNotice('Changes discarded.');
  }

  function submitForm(event) {
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

    const savedForm = { ...form, accounts: form.accounts.map((account) => ({ ...account })) };
    setSessionBaseline(savedForm);
    setNotice('Changes are kept for this page session only. Reloading clears them.');
    setActiveStep(0);
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
          <div className="page-header-marquee" role="note" aria-label="Manage bank information, accounts, and lending limits for this session.">
            <div className="page-header-marquee-window" aria-hidden="true">
              <div className="page-header-marquee-track">
                <span>Manage bank information, accounts, and lending limits for this session.</span>
              </div>
            </div>
          </div>
        </div>
        {notice && <p className="bank-master-success" role="status"><Check size={16} />{notice}</p>}

        <section className="bank-master-card" aria-label="Bank master editor">
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
                    <div className="bank-master-fields">
                      <TextField label="Bank Code" field="bankCode" value={form.bankCode} onChange={(event) => updateField('bankCode', event.target.value)} error={errors.bankCode} required maxLength={20} />
                      <TextField label="Bank Name" field="bankName" value={form.bankName} onChange={(event) => updateField('bankName', event.target.value)} error={errors.bankName} required maxLength={120} />
                      <TextField label="Bank Type" field="bankType" value={form.bankType} onChange={(event) => updateField('bankType', event.target.value)} error={errors.bankType} required maxLength={60} />
                      <TextField label="Registration License No." field="licenseNumber" value={form.licenseNumber} onChange={(event) => updateField('licenseNumber', event.target.value)} error={errors.licenseNumber} maxLength={30} />
                      <TextField label="PAN No." field="pan" value={form.pan} onChange={(event) => updateField('pan', event.target.value.toUpperCase())} error={errors.pan} maxLength={10} autoCapitalize="characters" />
                      <TextField label="G.S.T. No." field="gstNumber" value={form.gstNumber} onChange={(event) => updateField('gstNumber', event.target.value.toUpperCase())} error={errors.gstNumber} maxLength={15} autoCapitalize="characters" />
                      <TextField label="No. of Branches" field="branchCount" value={form.branchCount} onChange={(event) => updateField('branchCount', event.target.value)} error={errors.branchCount} type="number" min="1" step="1" inputMode="numeric" />
                    </div>
                  )}

                  {activeStep === 1 && (
                    <div className="bank-master-fields">
                      <TextField label="Address Type" field="addressType" value={form.addressType} onChange={(event) => updateField('addressType', event.target.value)} maxLength={60} />
                      <TextField label="Pincode" field="pincode" value={form.pincode} onChange={(event) => updateField('pincode', event.target.value)} maxLength={12} />
                      <TextField label="Address" field="address" value={form.address} onChange={(event) => updateField('address', event.target.value)} maxLength={160} />
                      <TextField label="Address 2" field="addressLine2" value={form.addressLine2} onChange={(event) => updateField('addressLine2', event.target.value)} maxLength={160} />
                      <TextField label="Landmark" field="landmark" value={form.landmark} onChange={(event) => updateField('landmark', event.target.value)} maxLength={120} />
                      <TextField label="City" field="city" value={form.city} onChange={(event) => updateField('city', event.target.value)} maxLength={100} />
                      <TextField label="State / Union Territory" field="state" value={form.state} onChange={(event) => updateField('state', event.target.value)} maxLength={100} />
                    </div>
                  )}

                  {activeStep === 2 && (
                    <div className="bank-master-accounts">
                      <div className="bank-master-table-heading">
                        <div><h3>Bank Account Details</h3><p>Add accounts one at a time. Saved accounts appear in the list below.</p></div>
                      </div>
                                      <section className="bank-master-account-entry" aria-label="Add bank account">
                                        <h4>{editingAccountIndex === null ? 'New account' : `Edit account ${editingAccountIndex + 1}`}</h4>
                                        <div className="bank-master-account-fields">
                                          <TextField label="Particulars" field="account-draft-particulars" value={accountDraft.particulars} onChange={(event) => updateAccountDraft('particulars', event.target.value)} maxLength={100} />
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
                          <span>Complete the account details above and select “Save account”.</span>
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
                        <button className="bank-master-next" type="button" onClick={activeStep === 2 ? saveAccountsAndNext : goNext}>
                          Next<ChevronRight size={17} />
                        </button>
                      ) : (
                        <button className="bank-master-next" type="submit"><Save size={16} />Save for this session</button>
                      )}
                    </div>
                  </footer>
                </div>
              </div>
            </form>
        </section>
      </div>
      <style>{`
        .bank-master-account-entry{margin-bottom:20px;padding:18px;border:1px solid #dce7e3;border-radius:9px;background:#fbfdfc}
        .bank-master-account-entry h4{margin:0 0 16px;color:#315250;font-size:12px;font-weight:800}
        .bank-master-account-entry-actions{display:flex;align-items:center;gap:12px;margin-top:16px}
        .bank-master-account-entry>.bank-master-field-error{display:block;margin-top:8px}
        .bank-master-account-cancel-edit,.bank-master-account-actions button{color:#176d67;font-size:11px;font-weight:700;text-decoration:underline}
        .bank-master-account-table-wrap{overflow:auto;border:1px solid #dce7e3;border-radius:8px}
        .bank-master-account-table{width:100%;min-width:800px;border-collapse:collapse;background:#fff}
        .bank-master-account-table th,.bank-master-account-table td{padding:11px 12px;border-bottom:1px solid #e8efed;text-align:left;font-size:11px}
        .bank-master-account-table th{background:#f3f7f6;color:#52696b;font-size:10px;font-weight:800}
        .bank-master-account-table tbody tr:last-child td{border-bottom:0}
        .bank-master-account-actions{display:flex;gap:12px}
        .bank-master-table th:last-child,.bank-master-table td:last-child{width:48px}
        .bank-master-table-empty{text-align:center!important;color:#76898c!important}
        .bank-master-table th:first-child,.bank-master-table td:first-child{width:170px}
        .bank-master-table td select{width:100%;min-width:130px;height:32px;padding:0 6px;border:1px solid #d3dfdf;border-radius:4px;background:#f4f7f6;color:#687a7c;font-size:10px}
      `}</style>
    </AppShell>
  );
}