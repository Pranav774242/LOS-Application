'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, BriefcaseBusiness, Mail, Phone, UserRound, UsersRound } from 'lucide-react';
import AppShell from './AppShell';
import Card from './Card';
import PageHeader from './PageHeader';
import { api } from '../services/api.js';
import { readCustomerRecords } from '../services/customerStorage';

const PROFILE_TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'personal', label: 'Personal Details' },
  { id: 'address', label: 'Address Details' },
  { id: 'employment', label: 'Employment' },
  { id: 'income', label: 'Income Details' },
  { id: 'documents', label: 'Documents' },
  { id: 'loan', label: 'Loan Details' },
];

const PERSONAL_FIELDS = [
  ['leadId', 'Lead ID'], ['panCard', 'PAN Card'], ['branch', 'Branch'],
  ['title', 'Title'], ['fullName', 'First Name'], ['middleName', 'Middle Name'],
  ['lastName', 'Last Name'], ['dob', 'Date of Birth'], ['age', 'Age'],
  ['fatherName', "Father's / Husband's Name"], ['motherName', "Mother's Name"],
  ['email', 'Email ID'], ['customerType', 'Customer Type'], ['kycStatus', 'KYC Status'],
  ['aadhaarNumber', 'Aadhaar Card Number'], ['gender', 'Gender'],
  ['kycRegn', 'CKYC Registration Number'], ['maritalStatus', 'Marital Status'],
  ['mobileNo', 'Mobile Number'], ['occupation', 'Occupation'],
  ['alternateContact', 'Alternate Contact'],
];

const ADDRESS_FIELDS = [
  ['residentialStatus', 'Residential Status'], ['residentialType', 'Residential Type'],
  ['flatBuildingName', 'Flat / Building Name'], ['streetRoad', 'Street / Road'],
  ['landMark', 'Landmark'], ['city', 'City'], ['state', 'State'], ['pinCode', 'PIN Code'],
];

const EMPLOYMENT_FIELDS = [
  ['employmentType', 'Employment Type'], ['loanCategory', 'Loan Category'],
  ['designation', 'Designation / Nature of Business'],
  ['employerName', 'Employer / Business Name'],
  ['dateOfJoining', 'Date of Joining / Business Start'], ['qualification', 'Qualification'],
  ['empEmailId', 'Employee / Business Email'], ['location', 'Employer / Business Location'],
  ['dateOfRetirement', 'Date of Retirement'], ['appointmentLetter', 'Appointment Letter'],
];

const INCOME_FIELDS = [
  ['annualIncome', 'Annual Income'], ['incomeTaxFilerStatus', 'Income Tax Filer Status'],
  ['bankName', 'Name of the Bank'], ['bankAccountNo', 'Bank Account Number'],
  ['riskCategory', 'Risk Category'], ['salaryCertificate', 'Salary Certificate'],
  ['formNo16', 'Form No. 16'],
];

function getCustomerForm(customer) {
  const savedForm = customer.onboardingForm && typeof customer.onboardingForm === 'object'
    ? customer.onboardingForm
    : {};
  const [firstName, ...lastNameParts] = String(customer.name || '').trim().split(/\s+/);

  return {
    ...savedForm,
    leadId: savedForm.leadId || customer.leadId,
    fullName: savedForm.fullName || firstName,
    lastName: savedForm.lastName || lastNameParts.join(' '),
    customerType: savedForm.customerType || customer.type,
    kycStatus: savedForm.kycStatus || customer.kyc,
    mobileNo: savedForm.mobileNo || customer.phone,
    email: savedForm.email || customer.email,
    documents: Array.isArray(savedForm.documents) ? savedForm.documents : [],
    taxReturns: Array.isArray(savedForm.taxReturns) ? savedForm.taxReturns : [],
    previousEmployment: Array.isArray(savedForm.previousEmployment) ? savedForm.previousEmployment : [],
    loanHistory: Array.isArray(savedForm.loanHistory) ? savedForm.loanHistory : [],
  };
}

function displayValue(value, label) {
  if (value === undefined || value === null || String(value).trim() === '') return 'Not Provided';
  if (typeof value === 'object' && typeof value.name === 'string') return value.name;
  if (/date/i.test(label)) {
    const date = new Date(`${value}T00:00:00`);
    if (!Number.isNaN(date.getTime())) {
      return new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }).format(date);
    }
  }
  if (/income|outstanding|emi/i.test(label) && Number.isFinite(Number(value))) {
    return `₹${Number(value).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
  return String(value);
}

function DetailGrid({ values, fields }) {
  return (
    <dl className="customer-view-grid">
      {fields.map(([key, label]) => (
        <div className="customer-view-detail" key={key}>
          <dt>{label}</dt>
          <dd>{displayValue(values[key], label)}</dd>
        </div>
      ))}
    </dl>
  );
}

function DetailTable({ title, columns, rows, emptyMessage }) {
  return (
    <section className="customer-view-section">
      <div className="customer-view-section-heading"><h2>{title}</h2></div>
      {rows.length ? (
        <div className="customer-view-table-wrap">
          <table className="customer-view-table">
            <thead><tr>{columns.map(([, label]) => <th key={label}>{label}</th>)}</tr></thead>
            <tbody>
              {rows.map((row, index) => (
                <tr key={row.id || `${title}-${index}`}>
                  {columns.map(([key, label]) => <td key={label}>{displayValue(row[key], label)}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : <p className="customer-view-empty">{emptyMessage}</p>}
    </section>
  );
}

function DetailSection({ title, values, fields }) {
  return (
    <section className="customer-view-section">
      <div className="customer-view-section-heading"><h2>{title}</h2></div>
      <DetailGrid values={values} fields={fields} />
    </section>
  );
}

export default function CustomerProfileView({ customerId }) {
  const [customer, setCustomer] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [loadError, setLoadError] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    try {
      const record = readCustomerRecords(api.customers).find((item) => item.id === customerId);
      if (!record) setLoadError('The selected customer could not be found.');
      else setCustomer(record);
    } catch (error) {
      setLoadError(error instanceof Error ? `Customer details could not be loaded: ${error.message}` : 'Customer details could not be loaded.');
    } finally {
      setIsLoading(false);
    }
  }, [customerId]);

  const handleTabKeyDown = (event) => {
    const index = PROFILE_TABS.findIndex((tab) => tab.id === activeTab);
    let target = index;
    if (event.key === 'ArrowRight') target = (index + 1) % PROFILE_TABS.length;
    else if (event.key === 'ArrowLeft') target = (index - 1 + PROFILE_TABS.length) % PROFILE_TABS.length;
    else if (event.key === 'Home') target = 0;
    else if (event.key === 'End') target = PROFILE_TABS.length - 1;
    else return;

    event.preventDefault();
    setActiveTab(PROFILE_TABS[target].id);
    event.currentTarget.querySelectorAll('[role="tab"]')[target]?.focus();
  };

  const form = customer ? getCustomerForm(customer) : null;
  const customerName = customer?.name || 'Customer Profile';

  return (
    <AppShell title={`View Customer: ${customerId}`}>
      <div className="customer-view-page">
        <PageHeader
          title="View Customer"
          description={`Customer ID: ${customerId}`}
          action={(
            <Link className="icon-button customer-view-back" href="/customer_management" aria-label="Back to Customer Management" title="Back to Customer Management">
              <ArrowLeft size={19} aria-hidden="true" />
            </Link>
          )}
        />
        {isLoading || loadError ? (
          <Card className="customer-view-card customer-view-state">
            {isLoading ? <p>Loading customer details...</p> : <p role="alert">{loadError}</p>}
          </Card>
        ) : (
          <Card className="customer-view-card">
            <div className="customer-view-summary" aria-label="Customer summary">
              <div className="customer-view-summary-item">
                <span><UserRound size={14} aria-hidden="true" /> Customer</span>
                <strong>{customerName}</strong>
              </div>
              <div className="customer-view-summary-item customer-view-summary-highlight">
                <span><Phone size={14} aria-hidden="true" /> Phone</span>
                <strong>{displayValue(customer.phone, 'Phone')}</strong>
              </div>
              <div className="customer-view-summary-item">
                <span><BriefcaseBusiness size={14} aria-hidden="true" /> Customer Type</span>
                <strong>{displayValue(customer.type, 'Customer Type')}</strong>
              </div>
              <div className="customer-view-summary-item">
                <span><Mail size={14} aria-hidden="true" /> Email</span>
                <strong>{displayValue(customer.email, 'Email')}</strong>
              </div>
              <div className="customer-view-summary-item">
                <span><UsersRound size={14} aria-hidden="true" /> KYC Status</span>
                <strong>{displayValue(customer.kyc, 'KYC Status')}</strong>
              </div>
              <div className="customer-view-summary-item">
                <span><BriefcaseBusiness size={14} aria-hidden="true" /> Active Loans</span>
                <strong>{displayValue(customer.activeLoans, 'Active Loans')}</strong>
              </div>
            </div>
            <nav className="customer-view-tabs" role="tablist" aria-label="Customer details sections" onKeyDown={handleTabKeyDown}>
              {PROFILE_TABS.map((tab) => (
                <button
                  className={`customer-view-tab ${activeTab === tab.id ? 'active' : ''}`}
                  id={`customer-view-tab-${tab.id}`}
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={activeTab === tab.id}
                  aria-controls="customer-view-tabpanel"
                  tabIndex={activeTab === tab.id ? 0 : -1}
                  onClick={() => setActiveTab(tab.id)}
                >
                  {tab.label}
                </button>
              ))}
            </nav>
            <section
              className="customer-view-tabpanel"
              id="customer-view-tabpanel"
              role="tabpanel"
              aria-labelledby={`customer-view-tab-${activeTab}`}
              tabIndex={0}
            >
              {activeTab === 'overview' && (
                <DetailSection
                  title="Customer Overview"
                  values={{ ...form, ...customer }}
                  fields={[
                    ['id', 'Customer ID'], ['name', 'Customer Name'], ['type', 'Customer Type'],
                    ['phone', 'Phone'], ['email', 'Email'], ['kyc', 'KYC Status'],
                    ['activeLoans', 'Active Loans'], ['panCard', 'PAN Card'], ['branch', 'Branch'],
                  ]}
                />
              )}
              {activeTab === 'personal' && <DetailSection title="Personal Details" values={form} fields={PERSONAL_FIELDS} />}
              {activeTab === 'address' && <DetailSection title="Address Details" values={form} fields={ADDRESS_FIELDS} />}
              {activeTab === 'employment' && (
                <div className="customer-view-sections">
                  <DetailSection title="Employment Information" values={form} fields={EMPLOYMENT_FIELDS} />
                  <DetailTable
                    title="Previous Employment"
                    columns={[
                      ['employmentType', 'Employment Type'], ['employerName', 'Employer Name'],
                      ['designation', 'Designation'], ['location', 'Location'],
                      ['dateOfJoining', 'Date of Joining'], ['dateOfRelieving', 'Date of Relieving'],
                    ]}
                    rows={form.previousEmployment}
                    emptyMessage="No previous employment records provided."
                  />
                </div>
              )}
              {activeTab === 'income' && (
                <div className="customer-view-sections">
                  <DetailSection title="Income and Banking Details" values={form} fields={INCOME_FIELDS} />
                  <DetailTable
                    title="Income Tax Filing Details"
                    columns={[
                      ['financialYear', 'Financial Year'], ['grossIncome', 'Gross Income'], ['tdsPaid', 'TDS Paid'],
                    ]}
                    rows={form.taxReturns}
                    emptyMessage="No income tax filing details provided."
                  />
                </div>
              )}
              {activeTab === 'documents' && (
                <DetailTable
                  title="Customer Documents"
                  columns={[
                    ['name', 'Document Name'], ['file', 'Uploaded File'],
                    ['expiryDate', 'Expiry Date'], ['remarks', 'Remarks'],
                  ]}
                  rows={form.documents}
                  emptyMessage="No documents provided."
                />
              )}
              {activeTab === 'loan' && (
                <DetailTable
                  title="Loan History"
                  columns={[
                    ['bankName', 'Bank Name'], ['accountNumber', 'Account Number'],
                    ['loanType', 'Type of Loan'], ['totalOutstanding', 'Total Outstanding'],
                    ['emi', 'EMI'], ['expiryDate', 'Expiry Date'],
                  ]}
                  rows={form.loanHistory}
                  emptyMessage="No loan history records provided."
                />
              )}
            </section>
          </Card>
        )}
      </div>
      <style>{`
        .customer-view-page{padding:10px 12px 28px}
        .customer-view-back{display:grid;place-items:center;width:40px;height:40px;border:1px solid #dfe9eb;border-radius:8px;background:#fff;color:#31505d;text-decoration:none}
        .customer-view-back:hover{border-color:#b8d5d0;background:#f3f9f8;color:#177e7a}
        .customer-view-card{padding:18px 22px 24px}
        .customer-view-state{min-height:120px;display:grid;place-items:center;color:#718185}
        .customer-view-state p{margin:0}
        .customer-view-summary{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}
        .customer-view-summary-item,.customer-view-detail{min-width:0;padding:12px 14px;border:1px solid #e3ebeb;border-radius:8px;background:#fbfdfd}
        .customer-view-summary-item{display:flex;flex-direction:column;gap:7px;min-height:72px}
        .customer-view-summary-item>span{display:flex;align-items:center;gap:6px;color:#718185;font-size:11px}
        .customer-view-summary-item>span svg{color:#177e7a}
        .customer-view-summary-item strong,.customer-view-detail dd{margin:0;color:#1d3b48;font-size:14px;font-weight:650;line-height:1.45;overflow-wrap:anywhere}
        .customer-view-summary-highlight{border-left:3px solid #177e7a}
        .customer-view-tabs{display:flex;gap:5px;margin:17px 0 14px;padding:5px;overflow-x:auto;border:1px solid #e3ebea;border-radius:9px;background:#f7faf9}
        .customer-view-tab{flex:0 0 auto;min-height:36px;padding:7px 12px;border:1px solid transparent;border-radius:6px;background:transparent;color:#60747a;font-family:inherit;font-size:12px;font-weight:600;white-space:nowrap;cursor:pointer}
        .customer-view-tab:hover{background:#edf6f4;color:#165f5c}
        .customer-view-tab.active{border-color:#c5ddda;background:#e8f3f1;color:#145e5b;box-shadow:inset 0 -2px 0 #177e7a}
        .customer-view-tab:focus-visible,.customer-view-tabpanel:focus-visible{outline:3px solid #177e7a38;outline-offset:2px}
        .customer-view-tabpanel{outline:none}
        .customer-view-sections{display:grid;gap:12px}
        .customer-view-section{padding:18px;border:1px solid #e2eaea;border-radius:9px;background:#fff;box-shadow:0 2px 8px #173f4908}
        .customer-view-section-heading{margin-bottom:13px;padding-bottom:10px;border-bottom:1px solid #edf2f1}
        .customer-view-section-heading h2{margin:0;color:#173e46;font-size:16px}
        .customer-view-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:9px;margin:0}
        .customer-view-detail dt{margin:0 0 5px;color:#718185;font-size:11px}
        .customer-view-detail dd{font-size:13px}
        .customer-view-table-wrap{overflow-x:auto;border:1px solid #e7eeed;border-radius:7px}
        .customer-view-table{width:100%;min-width:620px;border-collapse:collapse;text-align:left}
        .customer-view-table th{padding:10px 12px;background:#f7faf9;color:#718185;font-size:10px;letter-spacing:.04em;text-transform:uppercase;white-space:nowrap}
        .customer-view-table td{padding:10px 12px;border-top:1px solid #edf2f1;color:#34565b;font-size:12px;line-height:1.45;vertical-align:top}
        .customer-view-empty{margin:0;padding:18px;border:1px dashed #dce7e5;border-radius:7px;color:#718185;font-size:12px;text-align:center}
        @media(max-width:720px){.customer-view-page{padding:4px 2px 22px}.customer-view-card{padding:14px}.customer-view-summary,.customer-view-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}
        @media(max-width:460px){.customer-view-summary,.customer-view-grid{grid-template-columns:1fr}.customer-view-section{padding:13px}}
      `}</style>
    </AppShell>
  );
}
