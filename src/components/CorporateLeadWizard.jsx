'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Check, ChevronLeft, ChevronRight, Plus, Trash2, X } from 'lucide-react';
import LeadDatePicker from './LeadDatePicker';
import { createLead, updateLead } from '../services/lead_management';

const steps = ['Entity Info', 'Loan Details', 'Income Profile', 'Referral Details'];
const organizationTypes = ['Private Limited Company', 'Public Limited Company', 'Limited Liability Partnership', 'Partnership Firm', 'Sole Proprietorship', 'Trust', 'Society', 'Other'];
const entityCategories = ['Micro', 'Small', 'Medium', 'Large', 'Other'];
const loanProducts = ['Term Loan', 'Working Capital', 'Business Loan', 'Equipment Finance', 'Commercial Vehicle Loan', 'Loan Against Property', 'Other'];
const loanPurposes = ['Business expansion', 'Working capital', 'Equipment purchase', 'Commercial property', 'Debt consolidation', 'Other'];
const facilityLoanTypes = ['Term Loan', 'Working Capital', 'Overdraft', 'Cash Credit', 'Other'];
const acquisitionChannels = ['Website', 'Mobile App', 'Branch Office', 'Partner Network', 'Sales Team', 'Customer Referral'];
const today = () => {
  const date = new Date();
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
};
const emptyFacility = () => ({
  bankName: '',
  accountNumber: '',
  loanType: '',
  limit: '',
  emi: '',
  outstanding: '',
  statementRequested: false,
});
const initialForm = () => ({
  leadType: 'CORPORATE',
  organizationType: '',
  entityName: '',
  registrationNo: '',
  incorporationDate: '',
  panCard: '',
  udyamNumber: '',
  entityCategory: '',
  natureOfBusiness: '',
  subSector: '',
  location: '',
  loanProductType: '',
  loanAmount: '',
  loanPurpose: '',
  tenure: '',
  numberOfInstalments: '',
  interestRate: '',
  collateralValue: '',
  annualIncome: '',
  grossIncome: '',
  netIncome: '',
  creditFacilities: [emptyFacility(), emptyFacility()],
  acquisitionChannel: '',
  referralDate: today(),
  partnerId: '',
  partnerName: '',
  employeeId: '',
  employeeName: '',
});
const valueOrEmpty = (value) => value === null || value === undefined ? '' : String(value);

function getInitialForm(lead) {
  const form = initialForm();
  if (!lead) return form;
  return {
    ...form,
    ...lead,
    acquisitionChannel: lead.acquisitionChannel || lead.leadAcquisitionChannel || '',
    entityName: lead.entityName || lead.organizationName || lead.legalName || lead.customerName || lead.name || '',
    registrationNo: lead.registrationNo || lead.registrationNumber || lead.cin || lead.llpin || '',
    incorporationDate: lead.incorporationDate || '',
    panCard: lead.panCard || lead.panNumber || '',
    udyamNumber: lead.udyamNumber || lead.udyogAadhaar || '',
    loanAmount: valueOrEmpty(lead.loanAmount),
    tenure: valueOrEmpty(lead.tenure),
    numberOfInstalments: valueOrEmpty(lead.numberOfInstalments ?? lead.instalments),
    interestRate: valueOrEmpty(lead.interestRate),
    annualIncome: valueOrEmpty(lead.annualIncome),
    grossIncome: valueOrEmpty(lead.grossIncome),
    netIncome: valueOrEmpty(lead.netIncome),
    collateralValue: valueOrEmpty(lead.collateralValue),
    creditFacilities: Array.isArray(lead.creditFacilities) && lead.creditFacilities.length
      ? lead.creditFacilities.map((facility) => ({ ...emptyFacility(), ...facility }))
      : [emptyFacility(), emptyFacility()],
    referralDate: lead.referralDate || lead.date || today(),
  };
}

const numberValue = (value) => Number(value || 0);
const currency = (value) => Number(value).toLocaleString('en-IN', { maximumFractionDigits: 2 });
const getEmi = (principal, annualRate, months) => {
  if (!principal || !months) return 0;
  const monthlyRate = annualRate / 1200;
  if (!monthlyRate) return principal / months;
  const factor = (1 + monthlyRate) ** months;
  return principal * monthlyRate * factor / (factor - 1);
};

const wizardStyles = `
.corp-wizard-backdrop{position:fixed;inset:0;z-index:60;display:grid;place-items:center;padding:18px;background:rgba(12,31,34,.56)}
.corp-wizard{display:grid;grid-template-rows:auto minmax(0,1fr) auto;width:min(1120px,100%);max-height:min(790px,calc(100vh - 36px));overflow:hidden;border:1px solid #dfe8e6;border-radius:10px;background:#fff;box-shadow:0 24px 70px #112c2a45;color:#20383a}
.corp-wizard-header{display:flex;align-items:flex-start;justify-content:space-between;gap:14px;padding:20px 24px;border-bottom:1px solid #e8efed}
.corp-wizard-kicker{margin:0 0 5px;color:#177e7a;font-size:10px;font-weight:800;letter-spacing:.11em;text-transform:uppercase}
.corp-wizard-header h2{margin:0;color:#193f42;font-size:20px}
.corp-wizard-header p{margin:5px 0 0;color:#748587;font-size:12px}
.corp-wizard-close{display:grid;place-items:center;width:34px;height:34px;border:1px solid #dfe8e6;border-radius:5px;color:#52696b}
.corp-wizard-body{display:grid;grid-template-columns:205px minmax(0,1fr);min-height:0;overflow:auto}
.corp-wizard-steps{display:grid;align-content:start;gap:6px;padding:22px 14px;border-right:1px solid #e8efed;background:#f8faf9}
.corp-wizard-step{display:flex;align-items:center;gap:10px;width:100%;padding:10px 9px;border-radius:5px;color:#647779;text-align:left;font-size:12px;font-weight:700}
.corp-wizard-step.active{background:#e5f1ed;color:#176d67}
.corp-wizard-step:disabled{cursor:default}
.corp-wizard-step-number{display:grid;place-items:center;width:24px;height:24px;flex:0 0 24px;border:1px solid #cbd9d7;border-radius:50%;background:#fff;font-size:10px}
.corp-wizard-step.active .corp-wizard-step-number{border-color:#177e7a;background:#177e7a;color:white}
.corp-wizard-content{min-width:0;padding:24px}
.corp-wizard-content h3{margin:0 0 5px;color:#193f42;font-size:17px}
.corp-wizard-hint{margin:0 0 19px;color:#748587;font-size:11px;line-height:1.55}
.corp-field-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:15px 18px}
.corp-field{display:grid;align-content:start;gap:6px;min-width:0;color:#52696b;font-size:11px;font-weight:700}
.corp-field.wide{grid-column:1/-1}
.corp-field input,.corp-field select{width:100%;min-width:0;height:39px;padding:0 10px;border:1px solid #cbd9d7;border-radius:5px;background:#fff;color:#203c42;font:inherit;font-size:12px;outline:none}
.corp-field input:focus,.corp-field select:focus{border-color:#568e88;box-shadow:0 0 0 3px #177e7a1a}
.corp-field input:invalid:not(:focus):not(:placeholder-shown){border-color:#c45c5c}
.corp-required{color:#b43b3b}
.corp-calculation{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;margin-top:18px}
.corp-calculation div{padding:12px;border:1px solid #e2ebe8;border-radius:5px;background:#f8faf9}
.corp-calculation span{display:block;color:#718284;font-size:10px}
.corp-calculation strong{display:block;margin-top:5px;color:#193f42;font-size:13px}
.corp-credit-wrap{margin-top:20px}
.corp-credit-heading{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:9px}
.corp-credit-heading h4{margin:0;color:#27484a;font-size:13px}
.corp-add-row{display:inline-flex;align-items:center;gap:5px;padding:7px 9px;border:1px solid #cbd9d7;border-radius:4px;color:#315b57;font-size:10px;font-weight:700}
.corp-credit-scroll{overflow:auto;border:1px solid #dfe8e6;border-radius:5px}
.corp-credit-table{width:100%;min-width:820px;border-collapse:collapse;font-size:10px}
.corp-credit-table th,.corp-credit-table td{padding:7px;border-bottom:1px solid #e7eeec;text-align:left}
.corp-credit-table th{background:#f3f7f6;color:#52696b;font-weight:700}
.corp-credit-table td input,.corp-credit-table td select{width:100%;min-width:80px;height:32px;padding:0 6px;border:1px solid #cbd9d7;border-radius:3px;background:#fff;font:inherit}
.corp-credit-request{display:grid;gap:4px;justify-items:start}
.corp-credit-request button,.corp-remove-row{color:#176d67;font-size:10px;font-weight:700;text-decoration:underline}
.corp-credit-request span{color:#267348;font-size:9px}
.corp-metrics{display:flex;flex-wrap:wrap;gap:7px;margin-top:16px}
.corp-metrics button{padding:8px 10px;border:1px solid #cbd9d7;border-radius:4px;background:#f2f6f5;color:#315b57;font-size:10px;font-weight:700}
.corp-metrics button:hover,.corp-add-row:hover{border-color:#83aaa3;background:#eaf4f1}
.corp-metric-result{margin:11px 0 0;padding:10px 12px;border:1px solid #c8dfd7;border-radius:5px;background:#f1f8f4;color:#315b57;font-size:11px;line-height:1.5}
.corp-form-error{margin:14px 0 0;color:#9d3030;font-size:11px;line-height:1.5}
.corp-wizard-footer{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:14px 24px;border-top:1px solid #e8efed;background:#fbfcfc}
.corp-footer-actions{display:flex;justify-content:flex-end;gap:8px}
.corp-footer-actions button{min-height:36px;padding:0 13px;border:1px solid #d2dfdc;border-radius:5px;background:#fff;color:#52696b;font-size:11px;font-weight:700}
.corp-footer-actions button.primary{border-color:#177e7a;background:#177e7a;color:#fff}
.corp-footer-actions button:disabled{cursor:not-allowed;opacity:.55}
@media(max-width:680px){.corp-wizard-backdrop{padding:0}.corp-wizard{max-height:100vh;height:100vh;border:0;border-radius:0}.corp-wizard-body{grid-template-columns:1fr}.corp-wizard-steps{grid-template-columns:repeat(4,minmax(0,1fr));gap:4px;padding:9px;border-right:0;border-bottom:1px solid #e8efed}.corp-wizard-step{justify-content:center;padding:7px 4px;font-size:9px}.corp-wizard-step-number{width:21px;height:21px;flex-basis:21px}.corp-wizard-content{padding:18px 14px}.corp-field-grid{grid-template-columns:1fr;gap:12px}.corp-field.wide{grid-column:auto}.corp-calculation{grid-template-columns:1fr}.corp-wizard-header,.corp-wizard-footer{padding-right:14px;padding-left:14px}}
`;

export default function CorporateLeadWizard({ open, initialData, onClose, onSaved }) {
  const formRef = useRef(null);
  const [form, setForm] = useState(initialForm);
  const [activeStep, setActiveStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [metricMessage, setMetricMessage] = useState('');
  const isEditing = Boolean(initialData?.id || initialData?.leadId);

  useEffect(() => {
    if (!open) return;
    setForm(getInitialForm(initialData));
    setActiveStep(0);
    setFormError('');
    setMetricMessage('');
  }, [open, initialData]);

  const monthlyEmi = useMemo(
    () => getEmi(numberValue(form.loanAmount), numberValue(form.interestRate), numberValue(form.numberOfInstalments)),
    [form.loanAmount, form.interestRate, form.numberOfInstalments],
  );
  const totalAmount = monthlyEmi * numberValue(form.numberOfInstalments);
  const totalInterest = Math.max(0, totalAmount - numberValue(form.loanAmount));

  const setValue = (name, value) => {
    const normalizedValue = ['panCard', 'udyamNumber', 'registrationNo'].includes(name)
      ? value.toUpperCase()
      : value;
    setForm((current) => ({ ...current, [name]: normalizedValue }));
    setFormError('');
    setMetricMessage('');
  };
  const setFacilityValue = (index, name, value) => {
    setForm((current) => ({
      ...current,
      creditFacilities: current.creditFacilities.map((facility, facilityIndex) => (
        facilityIndex === index ? { ...facility, [name]: value } : facility
      )),
    }));
    setFormError('');
    setMetricMessage('');
  };
  const toggleStatementRequest = (index) => {
    const facility = form.creditFacilities[index];
    if (!facility.statementRequested && (!facility.bankName.trim() || !facility.accountNumber.trim())) {
      setFormError('Enter the bank name and account number before requesting a statement.');
      return;
    }
    setFacilityValue(index, 'statementRequested', !facility.statementRequested);
  };
  const validateStep = (step) => {
    const requiredDateField = step === 0
      ? ['incorporationDate', 'Date of Incorporation']
      : step === 3
        ? ['referralDate', 'Date']
        : null;
    if (requiredDateField && !form[requiredDateField[0]]) {
      setFormError(`${requiredDateField[1]} is required.`);
      formRef.current?.querySelector(`[data-date-picker-trigger="${requiredDateField[0]}"]`)?.focus();
      return false;
    }

    if (step === 1 && numberValue(form.numberOfInstalments) > numberValue(form.tenure)) {
      setFormError('The number of instalments cannot exceed the loan tenure in months.');
      return false;
    }
    if (step === 2) {
      if (numberValue(form.netIncome) > numberValue(form.grossIncome)) {
        setFormError('Net income cannot exceed gross income.');
        return false;
      }
      if (numberValue(form.grossIncome) > numberValue(form.annualIncome)) {
        setFormError('Gross income cannot exceed annual income.');
        return false;
      }
      for (const [index, facility] of form.creditFacilities.entries()) {
        const values = [facility.bankName, facility.accountNumber, facility.loanType, facility.limit, facility.emi, facility.outstanding];
        if (values.some(Boolean) && values.some((value) => !String(value).trim())) {
          setFormError(`Complete all fields in credit facility ${index + 1}, or clear the row.`);
          return false;
        }
        if (facility.limit && numberValue(facility.outstanding) > numberValue(facility.limit)) {
          setFormError(`Outstanding amount cannot exceed the limit in credit facility ${index + 1}.`);
          return false;
        }
      }
    }
    if (step === 3) {
      if (Boolean(form.partnerId) !== Boolean(form.partnerName)) {
        setFormError('Enter both the partner ID and partner name, or leave both empty.');
        return false;
      }
      if (Boolean(form.employeeId) !== Boolean(form.employeeName)) {
        setFormError('Enter both the employee ID and employee name, or leave both empty.');
        return false;
      }
    }
    setFormError('');
    return true;
  };
  const handleStepSubmit = async (event) => {
    event.preventDefault();
    setFormError('');
    if (!formRef.current?.reportValidity() || !validateStep(activeStep)) return;
    if (activeStep < steps.length - 1) {
      setActiveStep((current) => current + 1);
      return;
    }

    const payload = {
      ...form,
      leadType: 'CORPORATE',
      customerType: 'CORPORATE',
      customerName: form.entityName.trim(),
      name: form.entityName.trim(),
      registrationNo: form.registrationNo.trim().toUpperCase(),
      panNumber: form.panCard.trim().toUpperCase(),
      udyamNumber: form.udyamNumber.trim().toUpperCase() || null,
      loanAmount: numberValue(form.loanAmount),
      tenure: numberValue(form.tenure),
      numberOfInstalments: numberValue(form.numberOfInstalments),
      interestRate: numberValue(form.interestRate),
      emi: Number(monthlyEmi.toFixed(2)),
      totalInterest: Number(totalInterest.toFixed(2)),
      totalAmount: Number(totalAmount.toFixed(2)),
      collateralValue: form.collateralValue ? numberValue(form.collateralValue) : null,
      annualIncome: numberValue(form.annualIncome),
      grossIncome: numberValue(form.grossIncome),
      netIncome: numberValue(form.netIncome),
      acquisitionChannel: form.acquisitionChannel,
      leadAcquisitionChannel: form.acquisitionChannel,
      date: form.referralDate,
    };

    setIsSubmitting(true);
    try {
      const response = isEditing
        ? await updateLead(initialData.id || initialData.leadId, payload)
        : await createLead(payload);
      onSaved({ ...payload, id: initialData?.id || initialData?.leadId || payload.id }, response);
      onClose();
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Unable to save the corporate lead.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const runMetric = (metric) => {
    const facilities = form.creditFacilities.filter((facility) => facility.bankName || facility.accountNumber || facility.limit);
    const existingEmi = form.creditFacilities.reduce((sum, facility) => sum + numberValue(facility.emi), 0);
    const monthlyGross = numberValue(form.grossIncome) / 12;
    const monthlyNet = numberValue(form.netIncome) / 12;
    const monthlyObligations = existingEmi + monthlyEmi;
    if (metric === 'CIBIL') {
      const liability = facilities.reduce((sum, facility) => sum + numberValue(facility.outstanding), 0);
      setMetricMessage(`Declared outstanding liability: ₹${currency(liability)} across ${facilities.length} facility/facilities. A bureau score requires a configured CIBIL integration; no bureau inquiry was made.`);
      return;
    }
    if (metric === 'DTI' && monthlyGross <= 0) {
      setMetricMessage('Enter gross annual income to calculate debt-to-income.');
      return;
    }
    if (metric === 'LTV' && numberValue(form.collateralValue) <= 0) {
      setMetricMessage('Enter collateral / asset value in Loan Details to calculate loan-to-value.');
      return;
    }
    if (metric === 'DSCR' && monthlyObligations <= 0) {
      setMetricMessage('Enter loan details and monthly facility EMIs to estimate debt service coverage.');
      return;
    }
    if (metric === 'NDI' && monthlyNet <= 0) {
      setMetricMessage('Enter net annual income to calculate net disposable income.');
      return;
    }
    const results = {
      DTI: `Estimated debt-to-income: ${((monthlyObligations / monthlyGross) * 100).toFixed(1)}% (declared existing EMIs plus proposed EMI ÷ gross monthly income).`,
      LTV: `Estimated loan-to-value: ${((numberValue(form.loanAmount) / numberValue(form.collateralValue)) * 100).toFixed(1)}%.`,
      DSCR: `Estimated DSCR: ${(numberValue(form.grossIncome) / (monthlyObligations * 12)).toFixed(2)}x (stated gross annual income ÷ annual debt service).`,
      NDI: `Estimated monthly net disposable income: ₹${currency(monthlyNet - monthlyObligations)} (monthly net income less declared existing EMIs and proposed EMI).`,
    };
    setMetricMessage(results[metric]);
  };

  if (!open) return null;

  const field = (name, label, options = {}) => (
    <label className={`corp-field${options.wide ? ' wide' : ''}`} key={name}>
      <span>{label}{options.required ? <em className="corp-required"> *</em> : null}</span>
      {options.type === 'date' ? (
        <LeadDatePicker
          id={`corporate-${name}`}
          name={name}
          label={label}
          value={form[name] || ''}
          onChange={(value) => setValue(name, value)}
          min={options.min}
          max={options.max}
          required={options.required}
        />
      ) : options.options ? (
        <select
          name={name}
          value={form[name]}
          onChange={(event) => setValue(name, event.target.value)}
          required={options.required}
          aria-label={label}
        >
          <option value="">Select {label.toLowerCase()}</option>
          {options.options.map((option) => <option value={option} key={option}>{option}</option>)}
        </select>
      ) : (
        <input
          name={name}
          type={options.type || 'text'}
          value={form[name]}
          onChange={(event) => setValue(name, event.target.value)}
          required={options.required}
          min={options.min}
          max={options.max}
          step={options.step}
          maxLength={options.maxLength}
          minLength={options.minLength}
          pattern={options.pattern}
          title={options.title}
          placeholder={options.placeholder || ' '}
          autoComplete={options.autoComplete || 'off'}
          inputMode={options.inputMode}
        />
      )}
    </label>
  );

  return (
    <div className="corp-wizard-backdrop" onMouseDown={(event) => {
      if (event.target === event.currentTarget && !isSubmitting) onClose();
    }}>
      <style>{wizardStyles}</style>
      <section className="corp-wizard" role="dialog" aria-modal="true" aria-labelledby="corp-wizard-title">
        <header className="corp-wizard-header">
          <div>
            <p className="corp-wizard-kicker">Lead Management / Corporate</p>
            <h2 id="corp-wizard-title">{isEditing ? 'Edit Corporate Lead' : 'Corporate Lead Management'}</h2>
            <p>Complete each section to capture and validate the corporate lead.</p>
          </div>
          <button type="button" className="corp-wizard-close" onClick={onClose} disabled={isSubmitting} aria-label="Close form"><X size={18} /></button>
        </header>
        <div className="corp-wizard-body">
          <nav className="corp-wizard-steps" aria-label="Corporate lead form steps">
            {steps.map((step, index) => (
              <button
                type="button"
                key={step}
                className={`corp-wizard-step${activeStep === index ? ' active' : ''}`}
                onClick={() => {
                  if (index <= activeStep) {
                    setFormError('');
                    setActiveStep(index);
                  }
                }}
                disabled={index > activeStep || isSubmitting}
                aria-current={activeStep === index ? 'step' : undefined}
              >
                <span className="corp-wizard-step-number">{index < activeStep ? <Check size={13} /> : index + 1}</span>
                {step}
              </button>
            ))}
          </nav>
          <form ref={formRef} id="corporate-lead-form" className="corp-wizard-content" onSubmit={handleStepSubmit}>
            <h3>{steps[activeStep]}</h3>
            <p className="corp-wizard-hint">
              {activeStep === 0 && 'Enter the legal entity and registration details. PAN is validated against the standard Indian entity PAN format.'}
              {activeStep === 1 && 'Specify the requested facility. EMI, total interest, and total amount are calculated from the entered rate and instalments.'}
              {activeStep === 2 && 'Provide annual income and current credit facilities. Partially completed facility rows must be completed or cleared.'}
              {activeStep === 3 && 'Record how the lead was acquired and the employee or partner who referred it.'}
            </p>
            {activeStep === 0 ? (
              <div className="corp-field-grid">
                {field('entityName', 'Name of the Entity', { required: true, maxLength: 150, pattern: '[A-Za-z0-9 &.,()\\-]{2,150}', title: 'Enter 2 to 150 letters, numbers, spaces, or common business-name punctuation.' })}
                {field('organizationType', 'Organisation Type', { required: true, options: organizationTypes })}
                {field('registrationNo', 'Registration No. / CIN / LLPIN', { required: true, minLength: 6, maxLength: 30, pattern: '[A-Za-z0-9\\-/]{6,30}', title: 'Enter 6 to 30 letters, numbers, hyphens, or slashes.' })}
                {field('incorporationDate', 'Date of Incorporation', { type: 'date', required: true, max: today() })}
                {field('panCard', 'PAN Card', { required: true, maxLength: 10, pattern: '[A-Za-z]{5}[0-9]{4}[A-Za-z]', title: 'Enter a valid 10-character PAN, for example ABCDE1234F.' })}
                {field('udyamNumber', 'Udyog Aadhaar / Udyam No.', { maxLength: 19, pattern: 'UDYAM-[A-Za-z]{2}-[0-9]{2}-[0-9]{7}', title: 'Use UDYAM-XX-00-0000000 format, if available.' })}
                {field('entityCategory', 'Entity Category', { required: true, options: entityCategories })}
                {field('natureOfBusiness', 'Nature of Business', { required: true, maxLength: 120, pattern: '[A-Za-z0-9 &.,()\\-/]{2,120}', title: 'Enter 2 to 120 characters describing the business activity.' })}
                {field('subSector', 'Sub Sector', { required: true, maxLength: 120, pattern: '[A-Za-z0-9 &.,()\\-/]{2,120}', title: 'Enter 2 to 120 characters describing the sub-sector.' })}
                {field('location', 'Location', { required: true, maxLength: 120, pattern: '[A-Za-z0-9 &.,()\\-/]{2,120}', title: 'Enter a valid city, region, or address.' })}
              </div>
            ) : null}
            {activeStep === 1 ? (
              <>
                <div className="corp-field-grid">
                  {field('loanProductType', 'Loan Product Type', { required: true, options: loanProducts })}
                  {field('loanAmount', 'Loan Amount (₹)', { type: 'number', required: true, min: 1, max: 10000000000, step: '0.01' })}
                  {field('loanPurpose', 'Purpose of Loan', { required: true, options: loanPurposes })}
                  {field('tenure', 'Tenure (months)', { type: 'number', required: true, min: 1, max: 360, step: 1 })}
                  {field('numberOfInstalments', 'No. of Instalments', { type: 'number', required: true, min: 1, max: 360, step: 1 })}
                  {field('interestRate', 'Interest Rate (% p.a.)', { type: 'number', required: true, min: 0.01, max: 100, step: '0.01' })}
                  {field('collateralValue', 'Collateral / Asset Value (₹)', { type: 'number', min: 0, max: 10000000000, step: '0.01', wide: true })}
                </div>
                <div className="corp-calculation" aria-live="polite">
                  <div><span>Equated Monthly Instalment</span><strong>₹{currency(monthlyEmi)}</strong></div>
                  <div><span>Total Interest</span><strong>₹{currency(totalInterest)}</strong></div>
                  <div><span>Total Amount</span><strong>₹{currency(totalAmount)}</strong></div>
                </div>
              </>
            ) : null}
            {activeStep === 2 ? (
              <>
                <div className="corp-field-grid">
                  {field('annualIncome', 'Annual Income (₹)', { type: 'number', required: true, min: 1, max: 10000000000, step: '0.01' })}
                  {field('grossIncome', 'Gross Income (₹ / year)', { type: 'number', required: true, min: 1, max: 10000000000, step: '0.01' })}
                  {field('netIncome', 'Net Income (₹ / year)', { type: 'number', required: true, min: 1, max: 10000000000, step: '0.01' })}
                </div>
                <div className="corp-credit-wrap">
                  <div className="corp-credit-heading">
                    <h4>Current Credit Facility</h4>
                    <button type="button" className="corp-add-row" onClick={() => setForm((current) => ({ ...current, creditFacilities: [...current.creditFacilities, emptyFacility()] }))}><Plus size={13} /> Add facility</button>
                  </div>
                  <div className="corp-credit-scroll">
                    <table className="corp-credit-table">
                      <thead><tr><th>Sr.</th><th>Bank Name</th><th>A/c No.</th><th>Loan Type</th><th>Limit (₹)</th><th>EMI (₹/mo.)</th><th>Outstanding (₹)</th><th>Stmt Request</th><th /></tr></thead>
                      <tbody>
                        {form.creditFacilities.map((facility, index) => (
                          <tr key={index}>
                            <td>{index + 1}</td>
                            <td><input aria-label={`Facility ${index + 1} bank name`} value={facility.bankName} maxLength={100} onChange={(event) => setFacilityValue(index, 'bankName', event.target.value)} /></td>
                            <td><input aria-label={`Facility ${index + 1} account number`} value={facility.accountNumber} maxLength={34} pattern="[A-Za-z0-9\\-]{6,34}" title="Enter 6 to 34 letters, numbers, or hyphens." onChange={(event) => setFacilityValue(index, 'accountNumber', event.target.value)} /></td>
                            <td><select aria-label={`Facility ${index + 1} loan type`} value={facility.loanType} onChange={(event) => setFacilityValue(index, 'loanType', event.target.value)}><option value="">Select</option>{facilityLoanTypes.map((loanType) => <option key={loanType}>{loanType}</option>)}</select></td>
                            <td><input aria-label={`Facility ${index + 1} limit`} type="number" min="0" step="0.01" value={facility.limit} onChange={(event) => setFacilityValue(index, 'limit', event.target.value)} /></td>
                            <td><input aria-label={`Facility ${index + 1} EMI`} type="number" min="0" step="0.01" value={facility.emi} onChange={(event) => setFacilityValue(index, 'emi', event.target.value)} /></td>
                            <td><input aria-label={`Facility ${index + 1} outstanding`} type="number" min="0" step="0.01" value={facility.outstanding} onChange={(event) => setFacilityValue(index, 'outstanding', event.target.value)} /></td>
                            <td><div className="corp-credit-request"><button type="button" onClick={() => toggleStatementRequest(index)}>{facility.statementRequested ? 'Cancel request' : 'Request'}</button>{facility.statementRequested ? <span>Requested</span> : null}</div></td>
                            <td><button type="button" className="corp-remove-row" onClick={() => setForm((current) => ({ ...current, creditFacilities: current.creditFacilities.filter((_, facilityIndex) => facilityIndex !== index) }))} aria-label={`Remove credit facility ${index + 1}`}><Trash2 size={13} /></button></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
                <div className="corp-metrics" aria-label="Financial checks">
                  <button type="button" onClick={() => runMetric('CIBIL')}>CIBIL Liability Check</button>
                  <button type="button" onClick={() => runMetric('DTI')}>Debt-to-Income (DTI)</button>
                  <button type="button" onClick={() => runMetric('LTV')}>Loan-to-Value (LTV)</button>
                  <button type="button" onClick={() => runMetric('DSCR')}>Debt Service Coverage (DSCR)</button>
                  <button type="button" onClick={() => runMetric('NDI')}>Net Disposable Income (NDI)</button>
                </div>
                {metricMessage ? <p className="corp-metric-result" role="status">{metricMessage}</p> : null}
              </>
            ) : null}
            {activeStep === 3 ? (
              <div className="corp-field-grid">
                {field('acquisitionChannel', 'Lead Acquisition Channel', { required: true, options: acquisitionChannels })}
                {field('referralDate', 'Date', { type: 'date', required: true, max: today() })}
                {field('partnerId', 'Sourcing Agent / Partner ID', { maxLength: 40, pattern: '[A-Za-z0-9\\-/]{2,40}', title: 'Enter 2 to 40 letters, numbers, hyphens, or slashes.' })}
                {field('partnerName', 'Agent / Partner Name', { maxLength: 100, pattern: "[A-Za-z][A-Za-z .,'&()\\-]{1,99}", title: 'Enter a valid name.' })}
                {field('employeeId', 'Employee ID', { maxLength: 30, pattern: '[A-Za-z0-9\\-/]{2,30}', title: 'Enter 2 to 30 letters, numbers, hyphens, or slashes.' })}
                {field('employeeName', 'Employee Name', { maxLength: 100, pattern: "[A-Za-z][A-Za-z .,'&()\\-]{1,99}", title: 'Enter a valid name.' })}
              </div>
            ) : null}
            {formError ? <p className="corp-form-error" role="alert">{formError}</p> : null}
          </form>
        </div>
        <footer className="corp-wizard-footer">
          <span style={{ color: '#748587', fontSize: 10 }}>Step {activeStep + 1} of {steps.length}</span>
          <div className="corp-footer-actions">
            <button type="button" onClick={onClose} disabled={isSubmitting}>Cancel</button>
            {activeStep > 0 ? <button type="button" onClick={() => { setFormError(''); setActiveStep((current) => current - 1); }} disabled={isSubmitting}><ChevronLeft size={14} /> Previous</button> : null}
            <button type="button" className="primary" disabled={isSubmitting} onClick={() => {
              formRef.current?.requestSubmit();
            }}>
              {isSubmitting ? 'Saving...' : activeStep === steps.length - 1 ? 'Submit' : 'Next'}{activeStep < steps.length - 1 ? <ChevronRight size={14} /> : null}
            </button>
          </div>
        </footer>
      </section>
    </div>
  );
}
