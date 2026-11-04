'use client';

import { useState } from 'react';
import { Pencil, X } from 'lucide-react';

import { Copy, Check } from "lucide-react";

const leadDetailsStyles = `
.lead-detail-backdrop{padding:clamp(12px,3vw,32px);background:rgba(12,31,34,.62);backdrop-filter:blur(4px)}
.lead-detail-modal{width:min(1280px,96vw);max-height:min(92dvh,1000px);border:1px solid #dce8e5;border-radius:16px;background:#f5f8f7;box-shadow:0 28px 90px rgba(8,31,34,.34)}
.lead-detail-header{display:flex;align-items:center;justify-content:space-between;gap:16px;padding:20px 26px;border-bottom:1px solid #e5eeeb;background:#fff}
.lead-detail-header>div:first-child{min-width:0}
.lead-detail-eyebrow{color:#66817e;font-size:10px;font-weight:800;letter-spacing:.13em}
.lead-detail-header h2{display:flex;align-items:center;flex-wrap:wrap;gap:9px;margin:5px 0 0;color:#193f42;font-size:21px;font-weight:750}
.lead-detail-header h2 span{padding:4px 8px;border:1px solid #d9e8e3;border-radius:5px;background:#f2f8f5;color:#32766e;font-size:11px;font-weight:700}
.lead-detail-actions{display:flex;align-items:center;gap:8px;flex-shrink:0}
.lead-detail-actions button{min-height:36px;padding:0 12px;border-radius:6px;font-size:11px;font-weight:700}
.lead-detail-edit{border:1px solid #177e7a;background:#177e7a;color:#fff}
.lead-detail-back{display:inline-flex;align-items:center;justify-content:center;gap:5px;border:1px solid #d4e1de;background:#fff;color:#496463}
.lead-detail-hero{display:flex;align-items:center;gap:16px;margin:18px 22px 0;padding:19px 21px;border:1px solid #dce9e4;border-radius:12px;background:linear-gradient(115deg,#eaf5f1 0%,#fff 72%);box-shadow:0 5px 18px rgba(30,77,70,.05)}
.lead-detail-avatar{display:grid;width:54px;height:54px;flex:0 0 54px;place-items:center;border:1px solid #bdd9d0;border-radius:15px;background:#d7ece4;color:#28776d;font-size:18px;font-weight:800}
.lead-detail-identity{min-width:0;flex:1}
.lead-detail-identity h3{overflow:hidden;margin:0 0 7px;color:#193f42;font-size:17px;font-weight:750;text-overflow:ellipsis;white-space:nowrap}
.lead-detail-contact{display:flex;flex-wrap:wrap;gap:7px 16px;color:#66807e;font-size:11px}
.lead-detail-contact span{display:inline-flex;align-items:center;gap:6px}
.lead-detail-contact strong{color:#3d5b59;font-weight:650}
.lead-detail-hero .lead-status{flex-shrink:0}
.lead-detail-body{display:grid;grid-template-columns:minmax(235px,.72fr) minmax(0,2fr);align-items:start;gap:16px;padding:18px 22px 22px;overflow:auto}
.lead-detail-modal .detail-panel{overflow:hidden;border:1px solid #e0e9e6;border-radius:10px;background:#fff;box-shadow:0 3px 12px rgba(31,68,64,.035)}
.lead-detail-modal .detail-panel>h3{margin:0;padding:15px 16px;border-bottom:1px solid #e8efed;color:#254b4b;font-size:12px;font-weight:800}
.lead-detail-modal .detail-grid{display:grid;grid-template-columns:1fr;gap:0;padding:3px 15px}
.lead-detail-modal .detail-row{grid-template-columns:minmax(0,1fr) 8px minmax(0,1fr);gap:5px;padding:11px 0;border-bottom:1px solid #edf2f0}
.lead-detail-modal .detail-row:last-child{border-bottom:0}
.lead-detail-modal .detail-row>span{color:#748987;font-size:10px}
.lead-detail-modal .detail-row>em{overflow-wrap:anywhere;color:#294849;font-size:10px;font-style:normal;font-weight:650}
.lead-detail-modal .detail-panel-secondary{min-width:0}
.lead-detail-modal .detail-tabs{gap:5px;padding:10px 14px;border-bottom:1px solid #e8efed;background:#fbfdfc}
.lead-detail-modal .detail-tab{padding:9px 11px;border-radius:6px;color:#657d7b;font-size:11px;font-weight:700}
.lead-detail-modal .detail-tab.active{background:#eaf5f1;color:#1d7168}
.lead-detail-modal .lead-detail-section{margin:14px 14px 0;padding:14px;border:1px solid #e8efed;border-radius:8px;background:#fff}
.lead-detail-modal .lead-detail-section:last-child{margin-bottom:14px}
.lead-detail-modal .lead-detail-section h3{margin:0 0 7px;color:#28504f;font-size:11px;font-weight:800}
.lead-detail-modal .detail-grid-secondary{grid-template-columns:repeat(2,minmax(0,1fr));gap:0 20px;padding:0}
.lead-detail-modal .detail-empty-state{min-height:180px;display:grid;place-items:center;padding:24px;color:#718583;font-size:12px}
@media(max-width:760px){.lead-detail-header{padding:16px}.lead-detail-hero{margin:12px 14px 0;padding:15px}.lead-detail-body{grid-template-columns:1fr;gap:12px;padding:12px 14px 16px}.lead-detail-modal .detail-grid{grid-template-columns:repeat(2,minmax(0,1fr));gap:0 14px}.lead-detail-modal .detail-grid-secondary{grid-template-columns:1fr}.lead-detail-modal .detail-tabs{overflow-x:auto}.lead-detail-modal .detail-tab{white-space:nowrap}}
@media(max-width:480px){.lead-detail-header{align-items:flex-start;flex-direction:column}.lead-detail-actions{width:100%;justify-content:flex-end}.lead-detail-header h2{font-size:18px}.lead-detail-hero{align-items:flex-start;flex-wrap:wrap}.lead-detail-hero .lead-status{margin-left:70px}.lead-detail-modal .detail-grid{grid-template-columns:1fr}.lead-detail-modal .detail-row{grid-template-columns:minmax(90px,.8fr) 8px minmax(0,1.2fr)}}
`;


export default function LeadDetails({ lead, open, onClose, onEdit, loading = false, error = '', onRetry }) {
  const [tab, setTab] = useState('lead');

  
const [copied, setCopied] = useState(false);

  if (!open || !lead) return null;

  const tabs = [
    { id: 'lead', label: 'Lead Information' },
    { id: 'activity', label: 'Activity Log' },
  ];

  const detailSections = [
    {
      title: 'Customer Information',
      fields: [
        ['Customer Name', lead.customerName || lead.name],
        ['First Name', lead.firstName],
        ['Middle Name', lead.middleName],
        ['Last Name', lead.lastName],
        ['Date of Birth', lead.dateOfBirth],
        ['Age', lead.age],
        ['Customer Type', lead.customerType],
        ['Mobile Number', lead.mobileNumber || lead.mobile],
        ['Email ID', lead.email || lead.emailAddress],
        ['Residential Status', lead.residentialStatus],
        ['Gender', lead.gender],
        ['Marital Status', lead.maritalStatus],
        ['Dependents', lead.dependents ?? lead.numberOfDependents],
        ['PAN Card', lead.panCard || lead.panNumber],
        ['Aadhaar Card', lead.aadhaarCard || lead.aadhaarNumber],
        ['Passport Number', lead.passportNo || lead.passportNumber],
        ['Passport Expiry Date', lead.passportExpiryDate],
      ],
    },
    {
      title: 'Loan Details',
      fields: [
        ['Loan Product Type', lead.loanProductType || lead.product],
        ['Loan Amount', lead.loanAmount || lead.amount],
        ['Purpose of Loan', lead.loanPurpose || lead.purposeOfLoan],
        ['Down Payment / Collateral', lead.collateral ?? lead.downPaymentCollateral],
        ['Tenure', lead.tenure ? `${lead.tenure} ${lead.tenureUnit || 'month'}${Number(lead.tenure) === 1 ? '' : 's'}` : ''],
        ['Number of Instalments', lead.instalments ?? lead.numberOfInstalments],
        ['Interest Rate (% p.a.)', lead.interestRate ? `${lead.interestRate}%` : ''],
        ['Monthly EMI', lead.monthlyEmi ?? lead.emi],
        ['Total Interest', lead.totalInterest],
        ['Total Amount', lead.securityAmount],
      ],
    },
    {
      title: 'Income and Employment',
      fields: [
        ['Employment Type', lead.employmentType],
        ['Annual Income', lead.annualIncome],
        ['Designation', lead.designation],
        ['Employer / Business Name', lead.employerName],
        ['Location', lead.location],
        ['State', lead.state],
        ['Take Home Pay', lead.takeHomePay],
        ['Deductions', lead.deductions ?? lead.deductionsOrEmisPayable],
        ['Bank Name', lead.bankName],
        ['Primary Bank Account', lead.primaryBankAccount || lead.accountNumber],
      ],
    },
    {
      title: 'Referral and Assignment',
      fields: [
        ['Lead Acquisition Channel', lead.acquisitionChannel || lead.leadAcquisitionChannel || lead.source],
        ['Referral Date', lead.referralDate],
        ['Sourcing Agent / Partner ID', lead.partnerId || lead.sourcingAgentPartnerId],
        ['Agent / Partner Name', lead.partnerName || lead.agentPartnerName],
        ['Employee ID', lead.employeeId],
        ['Employee Name', lead.employeeName],
        ['Assigned Checker', lead.assignedCheckerName],
        ['Assigned Viewer', lead.assignedViewerName],
      ],
    },
    {
      title: 'Lead Tracking',
      fields: [
        ['Lead ID', lead.id],
        ['Lead Date', lead.date],
        ['Status', lead.status],
        ['Preferred Branch', lead.branch],
        ['Remarks', lead.remarks],
      ],
    },
  ];

  const renderDetailValue = (value) => {
    if (typeof value === 'boolean') return value ? 'Yes' : 'No';
    return value;
  };
  const customerName = lead.customerName || lead.name || 'Lead applicant';
  const initials = customerName.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase();

  return (
    <div className="lead-detail-backdrop" onMouseDown={onClose}>
      <style>{leadDetailsStyles}</style>
      <div
        className="lead-detail-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="lead-detail-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="lead-detail-header">
          <div>
            <span className="lead-detail-eyebrow">LEAD RECORD</span>
           <h2 id="lead-detail-title">
              Lead Details
              <span
                onClick={async () => {
                  await navigator.clipboard.writeText(String(lead.id));
                  setCopied(true);

                  setTimeout(() => setCopied(false), 2000);
                }}
                title="Click to copy Lead ID"
                style={{
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  marginLeft: "10px",
                  padding: "4px 8px",
                  borderRadius: "6px",
                  background: "#f3f4f6",
                  fontSize: "14px",
                  fontWeight: 500,
                  color: "#4b5563",
                  transition: "all 0.2s ease",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "#e5e7eb";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "#f3f4f6";
                }}
              >
                {lead.id}

                {copied ? (
                  <Check size={14} color="green" />
                ) : (
                  <Copy size={14} />
                )}
              </span>
            </h2>
          </div>
          <div className="lead-detail-actions">
            {onEdit && (
              <button
                type="button"
                className="lead-detail-edit"
                onClick={() => onEdit(lead)}
                disabled={loading}
              >
                <Pencil size={15} /> Edit Lead
              </button>
            )}
            <button
              type="button"
              className="lead-detail-back"
              aria-label="Close lead details"
              onClick={onClose}
            >
              <X size={18} /> Close
            </button>
          </div>
        </div>

        {loading || error ? (
          <div
            role={error ? "alert" : "status"}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "12px",
              padding: "12px 20px",
              borderBottom: "1px solid #e4ece9",
              color: error ? "#9d3030" : "#52696b",
              fontSize: "12px",
            }}
          >
            <span>{error || "Loading full lead details..."}</span>
            {error && onRetry ? (
              <button
                type="button"
                className="lead-detail-edit"
                onClick={onRetry}
              >
                Retry
              </button>
            ) : null}
          </div>
        ) : null}

        <section className="lead-detail-hero" aria-label="Lead summary">
          <div className="lead-detail-avatar" aria-hidden="true">
            {initials || "L"}
          </div>
          <div className="lead-detail-identity">
            <h3>{customerName}</h3>
            <div className="lead-detail-contact">
              <span>
                Mobile{" "}
                <strong>
                  {lead.mobileNumber || lead.mobile || "Not provided"}
                </strong>
              </span>
              <span>
                Email{" "}
                <strong>
                  {lead.email || lead.emailAddress || "Not provided"}
                </strong>
              </span>
            </div>
          </div>
          <span className={`lead-status status-${lead.statusKey || "new"}`}>
            {lead.status || "New"}
          </span>
        </section>

        <div className="lead-detail-body">
          <div className="detail-panel">
            <h3>Basic Information</h3>

            <div className="detail-grid">
              <div className="detail-row">
                <span>Lead ID</span>
                <strong>:</strong>
                <em>{lead.id}</em>
              </div>
              <div className="detail-row">
                <span>Customer Name</span>
                <strong>:</strong>
                <em>{lead.customerName || lead.name || "—"}</em>
              </div>
              <div className="detail-row">
                <span>Mobile Number</span>
                <strong>:</strong>
                <em>{lead.mobileNumber || lead.mobile || "—"}</em>
              </div>
              <div className="detail-row">
                <span>Acquisition Channel</span>
                <strong>:</strong>
                <em>{lead.acquisitionChannel || lead.source || "—"}</em>
              </div>
              <div className="detail-row">
                <span>Lead Date</span>
                <strong>:</strong>
                <em>{lead.date || "—"}</em>
              </div>
              <div className="detail-row">
                <span>Status</span>
                <strong>:</strong>
                <em>
                  <span className={`lead-status status-${lead.statusKey}`}>
                    {lead.status}
                  </span>
                </em>
              </div>
            </div>
          </div>

          <div className="detail-panel detail-panel-secondary">
            <div className="detail-tabs">
              {tabs.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className={
                    tab === item.id ? "detail-tab active" : "detail-tab"
                  }
                  onClick={() => setTab(item.id)}
                >
                  {item.label}
                </button>
              ))}
            </div>

            {tab === "lead" &&
              detailSections.map((section) => {
                const populatedFields = section.fields.filter(
                  ([, value]) =>
                    value !== null && value !== undefined && value !== "",
                );
                if (!populatedFields.length) return null;
                return (
                  <section className="lead-detail-section" key={section.title}>
                    <h3>{section.title}</h3>
                    <div className="detail-grid detail-grid-secondary">
                      {populatedFields.map(([label, value]) => (
                        <div className="detail-row" key={label}>
                          <span>{label}</span>
                          <strong>:</strong>
                          <em>{renderDetailValue(value)}</em>
                        </div>
                      ))}
                    </div>
                  </section>
                );
              })}

            {tab === "activity" && (
              <div className="detail-empty-state">
                No activity recorded yet.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
