'use client';

import { useMemo, useState } from 'react';
import {
  ArrowLeft,
  BriefcaseBusiness,
  CalendarDays,
  CircleDollarSign,
  ClipboardList,
  UserRound,
} from 'lucide-react';
import AppShell from './AppShell';
import Card from './Card';
import PageHeader from './PageHeader';
import {
  formatAmount,
  formatApplicationDate,
  getApplicationId,
  getCustomerName,
  getStatusClass,
  getStatusLabel,
} from './GoldLoanApplication';
import { createInitialRetailLoanForm, getRepaymentRows } from './RetailLoanApplicationForm';

const TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'borrower', label: 'Borrower Details' },
  { id: 'related', label: 'Related Party' },
  { id: 'loan', label: 'Loan Details' },
  { id: 'repayment', label: 'Repayment Chart' },
  { id: 'basic', label: 'Basic Details' },
  { id: 'security', label: 'Security Details' },
  { id: 'insurance', label: 'Insurance Details' },
  { id: 'disbursement', label: 'Disbursement' },
];

function displayValue(value, label = '') {
  if (value === undefined || value === null || String(value).trim() === '') {
    return 'Not provided';
  }
  if (/date|expiry|issue|effective/i.test(label)) {
    return formatApplicationDate(value);
  }
  if (/amount|premium|assured|valuation|security value|balance|instalment|principal/i.test(label)) {
    return formatAmount(value);
  }
  if (/rate|margin/i.test(label) && !String(value).includes('%')) {
    return `${value}%`;
  }
  if (/tenure/i.test(label) && !String(value).toLowerCase().includes('month')) {
    return `${value} months`;
  }
  return String(value);
}

function DetailGrid({ values, fields }) {
  const entries = fields.map(([key, label]) => [label, values[key]]);

  return (
    <div className="retail-view-grid">
      {entries.map(([label, val]) => (
        <div className="retail-view-detail" key={label}>
          <span className="retail-view-detail-label">{label}</span>
          <strong className="retail-view-detail-value">{displayValue(val, label)}</strong>
        </div>
      ))}
    </div>
  );
}

function formatCurrencyCell(value) {
  if (!Number.isFinite(value)) return '—';
  return `₹${value.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function RetailLoanApplicationView({ application, onBack, backLabel = 'Loan Dashboard' }) {
  const [activeTab, setActiveTab] = useState('overview');
  const form = useMemo(() => createInitialRetailLoanForm(application), [application]);
  const applicationId = getApplicationId(application);
  const savedCustomerName = getCustomerName(application);
  const customerName = savedCustomerName === 'Not available'
    ? [form.firstName, form.middleName, form.lastName].filter(Boolean).join(' ') || 'Rohan Mehta'
    : savedCustomerName;
  const rawLoan = form.productName || application?.product; const loanType = (!rawLoan || /gold/i.test(rawLoan)) ? 'Retail Personal Loan' : rawLoan;
  const amount = application?.amount || form.loanAmount || '250000';
  const status = application?.status || form.accountStatus || 'In review';
  const repaymentRows = useMemo(() => getRepaymentRows(form), [form]);

  const populatedParties = form.relatedParties.filter((party) =>
    Object.entries(party).some(([key, value]) => key !== 'id' && String(value || '').trim()),
  );

  const handleTabKeyDown = (event) => {
    const currentIndex = TABS.findIndex((tab) => tab.id === activeTab);
    let targetIndex = currentIndex;
    if (event.key === 'ArrowRight') targetIndex = (currentIndex + 1) % TABS.length;
    else if (event.key === 'ArrowLeft') targetIndex = (currentIndex - 1 + TABS.length) % TABS.length;
    else if (event.key === 'Home') targetIndex = 0;
    else if (event.key === 'End') targetIndex = TABS.length - 1;
    else return;

    event.preventDefault();
    setActiveTab(TABS[targetIndex].id);
    event.currentTarget.querySelectorAll('[role="tab"]')[targetIndex]?.focus();
  };

  return (
    <AppShell title={`View Retail Loan: ${applicationId}`}>
      <div className="retail-view-page">
        <PageHeader
          title="View Retail Loan Application"
          description={`Application ID: ${applicationId}`}
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

        {/* Top Summary Card with 6 tiles */}
        <Card className="retail-view-card">
          <div className="retail-view-summary" aria-label="Retail loan application summary">
            <div className="retail-summary-item retail-summary-customer">
              <span><UserRound size={14} aria-hidden="true" /> Customer</span>
              <strong>{customerName}</strong>
            </div>
            <div className="retail-summary-item retail-summary-amount">
              <span><CircleDollarSign size={14} aria-hidden="true" /> Loan Amount</span>
              <strong>{formatAmount(amount)}</strong>
            </div>
            <div className="retail-summary-item">
              <span><BriefcaseBusiness size={14} aria-hidden="true" /> Loan Type</span>
              <strong>{loanType}</strong>
            </div>
            <div className="retail-summary-item">
              <span><CalendarDays size={14} aria-hidden="true" /> Branch</span>
              <strong>{application?.branch || form.branch || 'Not provided'}</strong>
            </div>
            <div className="retail-summary-item">
              <span><ClipboardList size={14} aria-hidden="true" /> Status</span>
              <strong>
                <span className={`retail-view-status ${getStatusClass(status)}`}>
                  {getStatusLabel(status)}
                </span>
              </strong>
            </div>
            <div className="retail-summary-item">
              <span><ClipboardList size={14} aria-hidden="true" /> Loan Account</span>
              <strong>{form.loanAccountNumber || 'Not provided'}</strong>
            </div>
          </div>

          {/* Section Navigation Tabs */}
          <nav
            className="retail-view-tabs"
            role="tablist"
            aria-label="Retail loan application sections"
            onKeyDown={handleTabKeyDown}
          >
            {TABS.map((tab) => (
              <button
                className={`retail-view-tab ${activeTab === tab.id ? 'active' : ''}`}
                id={`retail-view-tab-${tab.id}`}
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={activeTab === tab.id}
                aria-controls="retail-view-tabpanel"
                tabIndex={activeTab === tab.id ? 0 : -1}
                onClick={() => setActiveTab(tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </nav>

          {/* Tab Panel Content */}
          <section
            className="retail-view-tabpanel"
            id="retail-view-tabpanel"
            role="tabpanel"
            aria-labelledby={`retail-view-tab-${activeTab}`}
            tabIndex={0}
          >
            {/* Tab: Overview */}
            {activeTab === 'overview' && (
              <div className="retail-view-section">
                <div className="retail-view-section-heading">
                  <h2>Application Overview</h2>
                </div>
                <div className="retail-view-grid">
                  {[
                    ['Application ID', applicationId],
                    ['Customer', customerName],
                    ['Customer ID', application?.customerId || form.customerId],
                    ['Loan Amount', formatAmount(amount)],
                    ['Loan Type', loanType],
                    ['Loan Account Number', form.loanAccountNumber],
                    ['Current Status', getStatusLabel(status)],
                    ['Product Description', form.productName],
                    ['Scheme Code', form.schemeCode],
                    ['Interest Rate', `${form.interestRate}%`],
                    ['Tenure', `${form.tenureMonths} months`],
                    ['Branch', application?.branch || form.branch],
                  ].map(([label, val]) => (
                    <div className="retail-view-detail" key={label}>
                      <span className="retail-view-detail-label">{label}</span>
                      <strong className="retail-view-detail-value">{displayValue(val, label)}</strong>
                    </div>
                  ))}
                </div>
                <div className="retail-view-overview-caption">
                  Select a section above to review the complete application details.
                </div>
              </div>
            )}

            {/* Tab: Borrower Details */}
            {activeTab === 'borrower' && (
              <div className="retail-view-sections-stack">
                <div className="retail-view-section">
                  <div className="retail-view-section-heading">
                    <h2>Application Information</h2>
                  </div>
                  <DetailGrid
                    values={{
                      ...form,
                      branch: application?.branch || form.branch,
                    }}
                    fields={[
                      ['loanAccountNumber', 'Loan Account Number'],
                      ['effectiveDate', 'Effective Date'],
                      ['customerId', 'Customer ID'],
                      ['branch', 'Branch'],
                      ['accountStatus', 'Account Status'],
                      ['lastTransactionDate', 'Last Transaction Date'],
                    ]}
                  />
                </div>

                <div className="retail-view-section">
                  <div className="retail-view-section-heading">
                    <h2>Borrower Information</h2>
                  </div>
                  <DetailGrid
                    values={form}
                    fields={[
                      ['title', 'Title'],
                      ['firstName', 'First Name'],
                      ['middleName', 'Middle Name'],
                      ['lastName', 'Last Name'],
                    ]}
                  />
                </div>

                <div className="retail-view-section">
                  <div className="retail-view-section-heading">
                    <h2>Loan Product Information</h2>
                  </div>
                  <DetailGrid
                    values={form}
                    fields={[
                      ['productCode', 'Product Code'],
                      ['productName', 'Product Description'],
                      ['schemeCode', 'Scheme Code'],
                      ['schemeDescription', 'Scheme Description'],
                      ['modeOfOperation', 'Mode of Operation'],
                    ]}
                  />
                </div>
              </div>
            )}

            {/* Tab: Related Party */}
            {activeTab === 'related' && (
              <div className="retail-view-section">
                <div className="retail-view-section-heading">
                  <h2>Related Party Information</h2>
                  <p>Co-applicants, guarantors, and other parties associated with this application.</p>
                </div>
                {populatedParties.length > 0 ? (
                  <div className="retail-view-table-wrap">
                    <table className="retail-view-table">
                      <thead>
                        <tr>
                          <th style={{ width: 48 }}>Sr.</th>
                          <th>Name Type</th>
                          <th>Relation</th>
                          <th>Customer No</th>
                          <th>Sal</th>
                          <th>First Name</th>
                          <th>Middle Name</th>
                          <th>Last Name</th>
                        </tr>
                      </thead>
                      <tbody>
                        {populatedParties.map((party, index) => (
                          <tr key={party.id || index}>
                            <td className="row-number">{index + 1}</td>
                            <td>{party.nameType || '—'}</td>
                            <td>{party.relation || '—'}</td>
                            <td>{party.customerNo || '—'}</td>
                            <td>{party.salutation || '—'}</td>
                            <td><strong>{party.firstName || '—'}</strong></td>
                            <td>{party.middleName || '—'}</td>
                            <td><strong>{party.lastName || '—'}</strong></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="retail-view-empty">No related parties are associated with this application.</p>
                )}
              </div>
            )}

            {/* Tab: Loan Details */}
            {activeTab === 'loan' && (
              <div className="retail-view-section">
                <div className="retail-view-section-heading">
                  <h2>Loan Details & Terms</h2>
                </div>
                <DetailGrid
                  values={{ ...form, loanAmount: amount }}
                  fields={[
                    ['sanctionedDate', 'Sanctioned Date'],
                    ['sanctioningAuthority', 'Sanctioning Authority'],
                    ['loanAmount', 'Loan Amount'],
                    ['tenureMonths', 'Tenure (months)'],
                    ['interestRate', 'Interest Rate (%)'],
                    ['offsetRate', 'Offset Rate (%)'],
                    ['totalInterestRate', 'Total Interest Rate (%)'],
                    ['moratorium', 'Moratorium (months)'],
                    ['expiryDate', 'Expiry Date'],
                    ['instalmentAmount', 'Instalment Amount'],
                    ['instalmentStartDate', 'Instalment Start Date'],
                    ['emiType', 'EMI Frequency'],
                    ['bulletPayment', 'Bullet Payment'],
                    ['instalmentEndDate', 'Instalment End Date'],
                  ]}
                />
              </div>
            )}

            {/* Tab: Repayment Chart */}
            {activeTab === 'repayment' && (
              <div className="retail-view-section">
                <div className="retail-view-section-heading">
                  <h2>Amortisation Schedule Forecast</h2>
                  <p>Calculated monthly repayment breakdown for this application.</p>
                </div>
                <div className="retail-view-table-wrap">
                  <table className="retail-view-table">
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
                          <td>{formatCurrencyCell(index === 0 ? Number(form.loanAmount) : repaymentRows[index - 1].balance)}</td>
                          <td>{formatCurrencyCell(row.instalment)}</td>
                          <td>{formatCurrencyCell(row.interest)}</td>
                          <td>{formatCurrencyCell(row.principal)}</td>
                          <td><strong>{formatCurrencyCell(row.balance)}</strong></td>
                        </tr>
                      )) : (
                        <tr>
                          <td colSpan="6" className="table-empty-cell">
                            No repayment schedule is available for this application.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Tab: Basic Details */}
            {activeTab === 'basic' && (
              <div className="retail-view-section">
                <div className="retail-view-section-heading">
                  <h2>Classification & Priority Sector</h2>
                </div>
                <DetailGrid
                  values={form}
                  fields={[
                    ['purposeCode', 'Purpose Code'],
                    ['prioritySector', 'Priority Sector [Y/N]'],
                    ['prioritySectorCode', 'Priority Sector Code'],
                    ['industryType', 'Industry Type'],
                    ['industrySubType', 'Industry Sub Type'],
                    ['physicallyChallenged', 'Physically Challenged'],
                    ['termCode', 'Term Code'],
                  ]}
                />
              </div>
            )}

            {/* Tab: Security Details */}
            {activeTab === 'security' && (
              <div className="retail-view-sections-stack">
                <div className="retail-view-section">
                  <div className="retail-view-section-heading">
                    <h2>Security & Collateral Information</h2>
                  </div>
                  <DetailGrid
                    values={form}
                    fields={[
                      ['securityId', 'Security ID'],
                      ['securityType', 'Security Type'],
                      ['securityEffectiveDate', 'Effective Date'],
                      ['assetType', 'Asset Type'],
                      ['securityAmount', 'Security Amount'],
                      ['marginPercent', 'Margin %'],
                    ]}
                  />
                </div>

                <div className="retail-view-section">
                  <div className="retail-view-section-heading">
                    <h2>Asset Location & Valuation</h2>
                  </div>
                  <DetailGrid
                    values={form}
                    fields={[
                      ['assetAddress', 'Address'],
                      ['assetAddressLine2', 'Address Line 2'],
                      ['city', 'City'],
                      ['state', 'State'],
                      ['pincode', 'Pincode'],
                      ['valuationAmount', 'Valuation Amount'],
                      ['valuerName', 'Valuer Name'],
                      ['valuationDate', 'Valuation Done On'],
                      ['inspectionBy', 'Inspection By'],
                      ['inspectionDate', 'Inspection Done On'],
                      ['inspectionReportName', 'Inspection Report'],
                    ]}
                  />
                </div>
              </div>
            )}

            {/* Tab: Insurance Details */}
            {activeTab === 'insurance' && (
              <div className="retail-view-section">
                <div className="retail-view-section-heading">
                  <h2>Insurance Policy & Coverage</h2>
                </div>
                <DetailGrid
                  values={form}
                  fields={[
                    ['securityValue', 'Security Value'],
                    ['premiumAmount', 'Premium Amount'],
                    ['insuranceCompany', 'Insurance Company'],
                    ['sumAssured', 'Sum Assured'],
                    ['policyNumber', 'Policy Number'],
                    ['insuranceExpiryDate', 'Expiry Date'],
                    ['insuranceIssueDate', 'Issue Date'],
                  ]}
                />
              </div>
            )}

            {/* Tab: Disbursement */}
            {activeTab === 'disbursement' && (
              <div className="retail-view-section">
                <div className="retail-view-section-heading">
                  <h2>Disbursement Account & Mode</h2>
                </div>
                <DetailGrid
                  values={form}
                  fields={[
                    ['disbursementAccountNumber', 'Account Number'],
                    ['disbursementAccountType', 'Account Type'],
                    ['bankName', 'Bank Name'],
                    ['ifscCode', 'IFSC Code'],
                    ['disbursementMode', 'Disbursement Mode'],
                    ['disbursementAmount', 'Disbursement Amount'],
                  ]}
                />
              </div>
            )}
          </section>

          <footer className="retail-view-footer">
            <span>This application is read-only.</span>
          </footer>
        </Card>
      </div>

      <style jsx>{`
        .retail-view-page {
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

        :global(.retail-view-card) {
          padding: 24px;
          border: 1px solid #dfe9eb;
          border-radius: 12px;
          background: #fff;
          box-shadow: 0 4px 20px rgba(18, 42, 54, 0.04);
        }

        /* Top 6 Summary Tiles (matching Reference UI) */
        .retail-view-summary {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 14px;
          margin-bottom: 22px;
        }

        .retail-summary-item {
          min-width: 0;
          padding: 16px 18px;
          border: 1px solid #dfe9eb;
          border-radius: 10px;
          background: #fff;
          box-shadow: 0 1px 3px rgba(18, 42, 54, 0.02);
        }

        .retail-summary-amount {
          border-left: 3px solid #177e7a;
        }

        .retail-summary-item > span:first-child {
          display: flex;
          align-items: center;
          gap: 6px;
          margin-bottom: 8px;
          color: #718185;
          font-size: 11px;
          font-weight: 500;
        }

        .retail-summary-item > span:first-child :global(svg) {
          color: #177e7a;
        }

        .retail-summary-item strong {
          display: block;
          overflow-wrap: anywhere;
          color: #1d3b48;
          font-size: 15px;
          font-weight: 700;
          letter-spacing: -0.01em;
        }

        .retail-summary-amount strong {
          font-size: 18px;
          color: #177e7a;
        }

        .retail-view-status {
          display: inline-flex;
          align-items: center;
          padding: 4px 10px;
          border-radius: 14px;
          font-size: 11px;
          font-weight: 700;
        }

        .retail-view-status.approved,
        .retail-view-status.disbursed {
          color: #1d8b59;
          background: #dff6ef;
        }

        .retail-view-status.pending,
        .retail-view-status.in-review,
        .retail-view-status.awaiting-kyc {
          color: #c27c00;
          background: #fff4d6;
        }

        .retail-view-status.rejected,
        .retail-view-status.returned {
          color: #a52e35;
          background: #fff0f0;
        }

        /* Tabs Navigation (matching Reference UI) */
        .retail-view-tabs {
          display: flex;
          gap: 6px;
          overflow-x: auto;
          overflow-y: hidden;
          padding-bottom: 14px;
          border-bottom: 1px solid #e5ecec;
          scrollbar-width: thin;
        }

        .retail-view-tab {
          flex: 0 0 auto;
          padding: 8px 14px;
          border: 1px solid transparent;
          border-radius: 7px;
          background: transparent;
          color: #60747a;
          font-family: inherit;
          font-size: 12px;
          font-weight: 600;
          white-space: nowrap;
          cursor: pointer;
          transition: all .15s ease;
        }

        .retail-view-tab:hover {
          background: #f6faf9;
          color: #1d3b48;
        }

        .retail-view-tab.active {
          border-color: #cfe1df;
          background: #edf6f4;
          color: #165f5c;
        }

        /* Tabpanel */
        .retail-view-tabpanel {
          min-height: 280px;
          padding: 22px 2px 8px;
          outline: none;
        }

        .retail-view-sections-stack {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .retail-view-section {
          border: 1px solid #dfe9eb;
          border-radius: 10px;
          background: #fff;
          padding: 20px 22px 18px;
          box-shadow: 0 1px 4px rgba(18, 42, 54, 0.02);
        }

        .retail-view-section-heading {
          margin-bottom: 18px;
          padding-bottom: 10px;
          border-bottom: 1px solid #f0f4f5;
        }

        .retail-view-section-heading h2 {
          margin: 0;
          color: #1d3b48;
          font-size: 16px;
          font-weight: 700;
          letter-spacing: -0.01em;
        }

        .retail-view-section-heading p {
          margin: 4px 0 0;
          color: #708087;
          font-size: 12px;
        }

        /* 3-Column Detail Grid (matching Reference UI) */
        .retail-view-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 12px;
        }

        .retail-view-detail {
          min-width: 0;
          padding: 13px 15px;
          border: 1px solid #e8eeec;
          border-radius: 8px;
          background: #fff;
          display: flex;
          flex-direction: column;
          gap: 5px;
        }

        .retail-view-detail-label {
          color: #718185;
          font-size: 11px;
          font-weight: 500;
        }

        .retail-view-detail-value {
          overflow-wrap: break-word;
          color: #1d3b48;
          font-size: 13px;
          font-weight: 600;
        }

        .retail-view-overview-caption {
          margin-top: 18px;
          color: #708087;
          font-size: 12px;
          line-height: 1.5;
        }

        /* Tables for Related Party and Repayment */
        .retail-view-table-wrap {
          width: 100%;
          overflow-x: auto;
          border: 1px solid #dfe8eb;
          border-radius: 8px;
          background: #fff;
        }

        .retail-view-table {
          width: 100%;
          min-width: 860px;
          border-collapse: collapse;
          font-size: 12px;
          color: #2e4652;
          text-align: left;
        }

        .retail-view-table th {
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

        .retail-view-table td {
          padding: 10px 12px;
          border-bottom: 1px solid #edf2f3;
          vertical-align: middle;
        }

        .retail-view-table tbody tr:last-child td {
          border-bottom: none;
        }

        .retail-view-table tbody tr:hover {
          background: #fafcfd;
        }

        .row-number {
          color: #708087;
          font-weight: 600;
          text-align: center;
        }

        .retail-view-empty {
          margin: 0;
          padding: 24px 16px;
          color: #708087;
          font-size: 13px;
          text-align: center;
        }

        .table-empty-cell {
          padding: 30px 16px !important;
          text-align: center;
          color: #708087;
          font-size: 13px;
        }

        /* Footer */
        .retail-view-footer {
          margin-top: 24px;
          padding-top: 14px;
          border-top: 1px solid #edf2f3;
          color: #708087;
          font-size: 12px;
        }

        .retail-view-tab:focus-visible,
        :global(.loan-dashboard-back:focus-visible) {
          outline: 3px solid rgba(23, 126, 122, 0.35);
          outline-offset: 2px;
        }

        @media (max-width: 960px) {
          .retail-view-summary {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .retail-view-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }

        @media (max-width: 600px) {
          :global(.retail-view-card) {
            padding: 16px;
          }

          .retail-view-summary {
            grid-template-columns: 1fr;
          }

          .retail-view-grid {
            grid-template-columns: 1fr;
          }

          .retail-view-tab {
            padding: 6px 10px;
            font-size: 11px;
          }

          .retail-view-section {
            padding: 16px 14px;
          }
        }
      `}</style>
    </AppShell>
  );
}
