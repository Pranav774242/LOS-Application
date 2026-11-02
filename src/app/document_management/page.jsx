"use client";
import React, { useMemo, useState } from "react";
// Demo image stored at: src/assets/images.jpg
// This relative path assumes this component is at src/components/dms/DocumentManagementPage.jsx.
import demoDocumentImage from "../../assets/images.jpg";
import AppShell from "../../components/AppShell";

/**
 * Document Management System (DMS)
 * --------------------------------
 * Self-contained React page based on the LOS_DMS / Retail Loans checklist.
 * No external UI or icon library is required.
 *
 * Demo behavior:
 * - Search using a Lead ID (try LEAD-10025 or LEAD-10026).
 * - Shows required document types grouped by category.
 * - Shows whether each document is UPLOADED or PENDING.
 * - Uses src/assets/images.jpg as a shared preview image for every demo uploaded document.
 *
 * Backend integration:
 * Replace DEMO_LEADS and handleSearch() with your Spring Boot API.
 * Expected API shape is documented in the handleSearch() comment below.
 */

const DOCUMENT_CATEGORIES = [
  {
    id: "KYC",
    label: "KYC",
    documents: ["PAN Card", "Aadhaar Card", "Passport"],
  },
  {
    id: "BANK_STMT",
    label: "Bank Statement",
    documents: [
      "Loan A/c Statement",
      "Savings A/c Statement",
      "CIBIL",
      "CERSAI",
    ],
  },
  {
    id: "PROP_DOCS",
    label: "Property Documents",
    documents: [
      "Property Documents",
      "Valuation Report",
      "Legal Search",
      "Maintenance Bill",
      "Inspection Report",
    ],
  },
  {
    id: "EMPLOYMENT",
    label: "Employment",
    documents: ["Appointment Letter", "Experience Letter"],
  },
  {
    id: "INCOME_PROOF",
    label: "Income Proof",
    documents: ["Salary Slip", "ITR"],
  },
  {
    id: "LOAN_DOCS",
    label: "Loan Documents",
    documents: ["Loan Agreement", "CAM Report", "Eligibility Report"],
  },
];

// Demo data only. Replace this with data returned by your Spring Boot backend.
const DEMO_LEADS = {
  "LEAD-10025": {
    leadId: "LEAD-10025",
    customerName: "Rahul Sharma",
    loanType: "Retail Loans",
    applicationStatus: "In Progress",
    uploadedDocuments: [
      "PAN Card",
      "Aadhaar Card",
      "Savings A/c Statement",
      "CIBIL",
      "Appointment Letter",
      "Salary Slip",
      "ITR",
      "Property Documents",
      "Loan Agreement",
    ],
    lastUpdated: "31 Oct 2026, 10:25 AM",
  },
  "LEAD-10026": {
    leadId: "LEAD-10026",
    customerName: "Priya Mehta",
    loanType: "Retail Loans",
    applicationStatus: "Documents Pending",
    uploadedDocuments: [
      "PAN Card",
      "Passport",
      "Loan A/c Statement",
      "Salary Slip",
    ],
    lastUpdated: "30 Oct 2026, 04:40 PM",
  },
};

const styles = `
  * { box-sizing: border-box; }
  .dms-page { min-height: 100vh; background: #f5f7fb; color: #172033; padding: 32px 20px 48px; font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
  .dms-shell { width: 100%; max-width: 1180px; margin: 0 auto; }
  .dms-header { display:flex; align-items:flex-start; justify-content:space-between; gap:18px; margin-bottom:24px; }
  .dms-eyebrow { color:#64748b; font-size:12px; font-weight:700; letter-spacing:.11em; text-transform:uppercase; margin:0 0 8px; }
  .dms-title { font-size:clamp(25px, 3vw, 32px); line-height:1.15; letter-spacing:-.04em; margin:0; font-weight:750; color:#14213d; }
  .dms-subtitle { color:#64748b; font-size:14px; margin:9px 0 0; }
  .dms-header-tag { white-space:nowrap; display:inline-flex; align-items:center; gap:8px; padding:9px 12px; border:1px solid #dbe4f0; background:#fff; border-radius:999px; color:#42526b; font-size:12px; font-weight:650; }
  .dms-dot { width:8px; height:8px; border-radius:50%; background:#16a36a; }
  .dms-card { background:#fff; border:1px solid #e5eaf2; border-radius:16px; box-shadow:0 5px 20px rgba(20,35,65,.035); }
  .dms-search-card { padding:22px; margin-bottom:18px; }
  .dms-section-title { font-size:15px; font-weight:750; color:#1d2b45; margin:0; }
  .dms-section-help { color:#7b879b; font-size:12px; margin:5px 0 0; }
  .dms-search-row { display:flex; gap:10px; margin-top:17px; }
  .dms-input-wrap { position:relative; flex:1; }
  .dms-search-icon { position:absolute; left:14px; top:50%; transform:translateY(-50%); color:#8793a7; font-size:17px; pointer-events:none; }
  .dms-input { width:100%; height:46px; border:1px solid #dce3ed; border-radius:10px; outline:none; padding:0 14px 0 42px; color:#172033; background:#fff; font:inherit; font-size:14px; transition:border .15s, box-shadow .15s; }
  .dms-input:focus { border-color:#4169d8; box-shadow:0 0 0 3px rgba(65,105,216,.12); }
  .dms-button { border:0; border-radius:10px; padding:0 20px; height:46px; background:#2457c5; color:#fff; font-weight:700; font-size:14px; cursor:pointer; transition:background .15s, transform .15s; }
  .dms-button:hover { background:#1948ad; }
  .dms-button:active { transform:translateY(1px); }
  .dms-button:disabled { opacity:.55; cursor:not-allowed; }
  .dms-demo-hint { color:#8a95a8; font-size:11px; margin:10px 0 0; }
  .dms-error { color:#b42318; background:#fff2f0; border:1px solid #ffd5cf; padding:11px 13px; border-radius:9px; font-size:13px; margin-top:13px; }
  .dms-results { display:grid; gap:18px; }
  .dms-lead-card { padding:20px 22px; }
  .dms-lead-top { display:flex; justify-content:space-between; align-items:flex-start; gap:16px; padding-bottom:17px; border-bottom:1px solid #edf0f5; }
  .dms-lead-id { color:#2457c5; font-size:12px; font-weight:750; letter-spacing:.04em; margin:0 0 6px; }
  .dms-customer { margin:0; font-size:20px; font-weight:750; letter-spacing:-.025em; color:#17233d; }
  .dms-lead-meta { display:flex; flex-wrap:wrap; gap:18px; margin-top:10px; color:#64748b; font-size:12px; }
  .dms-meta-label { color:#98a2b3; margin-right:5px; }
  .dms-status-pill { display:inline-flex; align-items:center; gap:6px; border-radius:999px; padding:7px 10px; font-size:11px; font-weight:750; background:#fff6e5; color:#996300; white-space:nowrap; }
  .dms-summary-grid { display:grid; grid-template-columns:repeat(4,1fr); gap:12px; padding-top:17px; }
  .dms-stat { border:1px solid #edf0f5; border-radius:12px; padding:13px 14px; background:#fcfdff; }
  .dms-stat-label { font-size:11px; color:#7b879b; font-weight:650; margin:0; }
  .dms-stat-value { font-size:25px; line-height:1.2; font-weight:780; color:#1b2942; margin:6px 0 0; letter-spacing:-.04em; }
  .dms-stat-sub { color:#9aa4b4; font-size:10px; margin:4px 0 0; }
  .dms-progress-area { margin-top:17px; }
  .dms-progress-head { display:flex; justify-content:space-between; gap:12px; color:#68758a; font-size:11px; margin-bottom:8px; }
  .dms-progress-track { width:100%; height:8px; border-radius:99px; background:#edf1f7; overflow:hidden; }
  .dms-progress-fill { height:100%; background:linear-gradient(90deg,#1caa70,#45c58e); border-radius:99px; transition:width .25s; }
  .dms-docs-card { padding:20px 22px; }
  .dms-docs-header { display:flex; justify-content:space-between; align-items:center; gap:14px; margin-bottom:15px; }
  .dms-filter-row { display:flex; flex-wrap:wrap; gap:7px; }
  .dms-filter { border:1px solid #e1e7f0; background:#fff; color:#66748a; padding:7px 11px; border-radius:999px; font-size:11px; font-weight:700; cursor:pointer; }
  .dms-filter.active { color:#2457c5; background:#eef4ff; border-color:#cbdcff; }
  .dms-category-list { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:12px; }
  .dms-category { border:1px solid #e9edf4; border-radius:12px; overflow:hidden; min-width:0; }
  .dms-category-head { display:flex; justify-content:space-between; align-items:center; gap:10px; padding:12px 14px; background:#fafbfe; border-bottom:1px solid #edf0f5; }
  .dms-category-name { display:flex; align-items:center; gap:9px; font-size:13px; font-weight:750; color:#293750; }
  .dms-folder-icon { display:grid; place-items:center; width:29px; height:29px; border-radius:8px; background:#fff3d9; color:#bd8517; font-size:15px; }
  .dms-category-count { color:#8792a5; font-size:10px; font-weight:650; white-space:nowrap; }
  .dms-doc-row { display:flex; justify-content:space-between; align-items:center; gap:12px; padding:11px 14px; border-bottom:1px solid #f0f2f6; }
  .dms-doc-row:last-child { border-bottom:0; }
  .dms-doc-main { display:flex; align-items:center; gap:10px; min-width:0; }
  .dms-file-icon { flex:0 0 auto; width:29px; height:29px; border-radius:8px; display:grid; place-items:center; background:#f0f4fb; color:#6680ad; font-size:13px; }
  .dms-doc-name { color:#344258; font-size:12px; font-weight:650; overflow-wrap:anywhere; }
  .dms-doc-note { color:#9aa4b4; font-size:10px; margin-top:3px; }
  .dms-badge { display:inline-flex; align-items:center; gap:5px; border-radius:999px; padding:5px 8px; font-size:10px; font-weight:750; white-space:nowrap; }
  .dms-badge.uploaded { color:#13764d; background:#e9f8f0; }
  .dms-badge.pending { color:#9a6500; background:#fff5df; }
  .dms-empty { text-align:center; padding:38px 20px; }
  .dms-empty-icon { font-size:34px; margin-bottom:10px; }
  .dms-empty-title { font-weight:750; color:#273650; margin:0; font-size:16px; }
  .dms-empty-copy { color:#8490a3; font-size:13px; margin:7px 0 0; }
  .dms-footer-note { color:#97a1b1; font-size:10px; line-height:1.5; margin:14px 2px 0; }
  .dms-doc-actions { display:flex; align-items:center; gap:7px; flex:0 0 auto; }
  .dms-action-btn { border:1px solid #dce4f0; background:#fff; color:#3157a4; border-radius:8px; padding:6px 9px; font-size:10px; font-weight:750; cursor:pointer; }
  .dms-action-btn:hover { background:#f1f5ff; }
  .dms-file-input { display:none; }
  .dms-modal-backdrop { position:fixed; inset:0; z-index:1000; background:rgba(15,23,42,.65); display:grid; place-items:center; padding:20px; }
  .dms-preview-modal { width:min(900px,100%); height:min(780px,90vh); background:#fff; border-radius:16px; overflow:hidden; display:flex; flex-direction:column; box-shadow:0 20px 70px rgba(0,0,0,.25); }
  .dms-preview-head { display:flex; align-items:center; justify-content:space-between; gap:12px; padding:14px 18px; border-bottom:1px solid #e8edf4; }
  .dms-preview-title { font-size:14px; font-weight:750; color:#1d2b45; overflow-wrap:anywhere; }
  .dms-preview-body { flex:1; min-height:0; background:#f1f4f8; }
  .dms-preview-body iframe { width:100%; height:100%; border:0; background:#fff; }
  .dms-preview-body img { display:block; max-width:100%; max-height:100%; object-fit:contain; margin:auto; }
  .dms-preview-fallback { padding:35px; text-align:center; color:#536176; }
  @media (max-width:760px) { .dms-page{padding:22px 13px 36px}.dms-header{flex-direction:column}.dms-search-card,.dms-lead-card,.dms-docs-card{padding:17px}.dms-summary-grid{grid-template-columns:repeat(2,1fr)}.dms-category-list{grid-template-columns:1fr}.dms-lead-top{flex-direction:column}.dms-docs-header{align-items:flex-start;flex-direction:column} }
  @media (max-width:430px) { .dms-search-row{flex-direction:column}.dms-button{width:100%}.dms-lead-meta{gap:9px;flex-direction:column}.dms-stat-value{font-size:22px} }
`;

function getDocumentRows(lead) {
  const uploaded = new Set(lead.uploadedDocuments || []);
  return DOCUMENT_CATEGORIES.map((category) => ({
    ...category,
    documents: category.documents.map((name) => {
      const record = (lead.uploadedDocuments || []).find((item) =>
        typeof item === "string"
          ? item === name
          : item.documentType === name || item.name === name,
      );
      return {
        name,
        status: record ? "UPLOADED" : "PENDING",
        // For this UI demo, every document marked UPLOADED uses the same sample image.
        // Real API records can override these demo values with their own secure URLs.
        fileName:
          (typeof record === "object" && record.fileName) ||
          (record ? "images.jpg" : ""),
        previewUrl:
          (typeof record === "object" && record.previewUrl) ||
          (record ? demoDocumentImage.src : ""),
        downloadUrl:
          (typeof record === "object" && record.downloadUrl) ||
          (record ? demoDocumentImage.src : ""),
        mimeType:
          (typeof record === "object" && record.mimeType) ||
          (record ? "image/jpeg" : ""),
      };
    }),
  }));
}

export default function DocumentManagementPage() {
  const [leadInput, setLeadInput] = useState("LEAD-10025");
  const [lead, setLead] = useState(null);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("ALL");
  const [loading, setLoading] = useState(false);
  const [previewDocument, setPreviewDocument] = useState(null);

  const categories = useMemo(() => (lead ? getDocumentRows(lead) : []), [lead]);
  const allDocuments = categories.flatMap((category) => category.documents);
  const total = allDocuments.length;
  const uploadedCount = allDocuments.filter(
    (doc) => doc.status === "UPLOADED",
  ).length;
  const pendingCount = total - uploadedCount;
  const completion = total ? Math.round((uploadedCount / total) * 100) : 0;

  async function handleSearch(event) {
    event?.preventDefault();
    const normalizedLeadId = leadInput.trim().toUpperCase();
    if (!normalizedLeadId) {
      setLead(null);
      setError("Please enter a Lead ID to search.");
      return;
    }

    setLoading(true);
    setError("");
    setLead(null);
    setFilter("ALL");

    try {
      // BACKEND INTEGRATION:
      // Replace this demo lookup with your Spring Boot endpoint, for example:
      // const response = await fetch(`/api/v1/dms/leads/${encodeURIComponent(normalizedLeadId)}/documents`);
      // if (!response.ok) throw new Error(response.status === 404 ? "Lead ID not found." : "Unable to load documents.");
      // const result = await response.json();
      // setLead(result.data);
      // Expected result.data fields:
      // { leadId, customerName, loanType, applicationStatus, uploadedDocuments: [document type names] }
      await new Promise((resolve) => setTimeout(resolve, 250));
      const result = DEMO_LEADS[normalizedLeadId];
      if (!result)
        throw new Error(
          "No lead found. Try LEAD-10025 or LEAD-10026 in this demo.",
        );
      setLead(result);
    } catch (searchError) {
      setError(searchError.message || "Something went wrong while searching.");
    } finally {
      setLoading(false);
    }
  }

  function handleLocalFile(documentName, file) {
    if (!file) return;
    const allowedTypes = [
      "application/pdf",
      "image/png",
      "image/jpeg",
      "image/webp",
    ];
    if (!allowedTypes.includes(file.type)) {
      setError("Please select a PDF, PNG, JPG, or WEBP document.");
      return;
    }
    if (file.size > 15 * 1024 * 1024) {
      setError("File size must be 15 MB or less.");
      return;
    }
    const previewUrl = URL.createObjectURL(file);
    setError("");
    setLead((current) => {
      if (!current) return current;
      const previous = current.uploadedDocuments || [];
      const remaining = previous.filter(
        (item) =>
          (typeof item === "string" ? item : item.documentType || item.name) !==
          documentName,
      );
      return {
        ...current,
        uploadedDocuments: [
          ...remaining,
          {
            documentType: documentName,
            fileName: file.name,
            previewUrl,
            downloadUrl: previewUrl,
            mimeType: file.type,
            localOnly: true,
          },
        ],
        lastUpdated: "Just now",
      };
    });
  }

  const visibleCategories = categories
    .map((category) => ({
      ...category,
      documents: category.documents.filter(
        (doc) => filter === "ALL" || doc.status === filter,
      ),
    }))
    .filter((category) => category.documents.length > 0);

  return (
    <AppShell>
      <div className="dms-page">
        <style>{styles}</style>
        <main className="dms-shell">
          <header className="dms-header">
            <div>
              <p className="dms-eyebrow">LOS / Document Operations</p>
              <h1 className="dms-title">Document Management</h1>
              <p className="dms-subtitle">
                Search a lead and track all required retail loan documents in
                one place.
              </p>
            </div>
            <div className="dms-header-tag">
              <span className="dms-dot" /> Retail Loans DMS
            </div>
          </header>

          <section className="dms-card dms-search-card">
            <h2 className="dms-section-title">Search by Lead ID</h2>
            <p className="dms-section-help">
              Enter the lead reference to view its required, uploaded, and
              pending documents.
            </p>
            <form className="dms-search-row" onSubmit={handleSearch}>
              <div className="dms-input-wrap">
                <span className="dms-search-icon" aria-hidden="true">
                  ⌕
                </span>
                <input
                  className="dms-input"
                  value={leadInput}
                  onChange={(event) => setLeadInput(event.target.value)}
                  placeholder="e.g. LEAD-10025"
                  aria-label="Lead ID"
                />
              </div>
              <button className="dms-button" type="submit" disabled={loading}>
                {loading ? "Searching…" : "Search Lead"}
              </button>
            </form>
            <p className="dms-demo-hint">Demo IDs: LEAD-10025 · LEAD-10026</p>
            {error && (
              <div className="dms-error" role="alert">
                {error}
              </div>
            )}
          </section>

          {!lead ? (
            <section className="dms-card dms-empty">
              <div className="dms-empty-icon" aria-hidden="true">
                ▤
              </div>
              <h2 className="dms-empty-title">
                Search for a lead to get started
              </h2>
              <p className="dms-empty-copy">
                The document checklist and upload status will appear here.
              </p>
            </section>
          ) : (
            <div className="dms-results">
              <section className="dms-card dms-lead-card">
                <div className="dms-lead-top">
                  <div>
                    <p className="dms-lead-id">{lead.leadId}</p>
                    <h2 className="dms-customer">{lead.customerName}</h2>
                    <div className="dms-lead-meta">
                      <span>
                        <span className="dms-meta-label">Loan type</span>
                        {lead.loanType}
                      </span>
                      <span>
                        <span className="dms-meta-label">Last updated</span>
                        {lead.lastUpdated || "—"}
                      </span>
                    </div>
                  </div>
                  <span className="dms-status-pill">
                    ● {lead.applicationStatus || "In Progress"}
                  </span>
                </div>

                <div className="dms-summary-grid">
                  <div className="dms-stat">
                    <p className="dms-stat-label">Total required</p>
                    <p className="dms-stat-value">{total}</p>
                    <p className="dms-stat-sub">
                      Across {DOCUMENT_CATEGORIES.length} categories
                    </p>
                  </div>
                  <div className="dms-stat">
                    <p className="dms-stat-label">Uploaded</p>
                    <p className="dms-stat-value" style={{ color: "#168052" }}>
                      {uploadedCount}
                    </p>
                    <p className="dms-stat-sub">Files received</p>
                  </div>
                  <div className="dms-stat">
                    <p className="dms-stat-label">Pending</p>
                    <p className="dms-stat-value" style={{ color: "#b77912" }}>
                      {pendingCount}
                    </p>
                    <p className="dms-stat-sub">Still required</p>
                  </div>
                  <div className="dms-stat">
                    <p className="dms-stat-label">Completion</p>
                    <p className="dms-stat-value">{completion}%</p>
                    <p className="dms-stat-sub">Upload completion</p>
                  </div>
                </div>

                <div className="dms-progress-area">
                  <div className="dms-progress-head">
                    <span>Document collection progress</span>
                    <strong>
                      {uploadedCount} of {total} uploaded
                    </strong>
                  </div>
                  <div
                    className="dms-progress-track"
                    role="progressbar"
                    aria-valuenow={completion}
                    aria-valuemin="0"
                    aria-valuemax="100"
                    aria-label="Document upload completion"
                  >
                    <div
                      className="dms-progress-fill"
                      style={{ width: `${completion}%` }}
                    />
                  </div>
                </div>
              </section>

              <section className="dms-card dms-docs-card">
                <div className="dms-docs-header">
                  <div>
                    <h2 className="dms-section-title">
                      Required document checklist
                    </h2>
                    <p className="dms-section-help">
                      Status is based on the required document types configured
                      for Retail Loans.
                    </p>
                  </div>
                  <div
                    className="dms-filter-row"
                    role="group"
                    aria-label="Filter documents"
                  >
                    {[
                      { value: "ALL", label: "All" },
                      { value: "UPLOADED", label: "Uploaded" },
                      { value: "PENDING", label: "Pending" },
                    ].map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        className={`dms-filter ${filter === option.value ? "active" : ""}`}
                        onClick={() => setFilter(option.value)}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="dms-category-list">
                  {visibleCategories.map((category) => {
                    const categoryUploaded = category.documents.filter(
                      (doc) => doc.status === "UPLOADED",
                    ).length;
                    const categoryPending =
                      category.documents.length - categoryUploaded;
                    return (
                      <article className="dms-category" key={category.id}>
                        <div className="dms-category-head">
                          <div className="dms-category-name">
                            <span
                              className="dms-folder-icon"
                              aria-hidden="true"
                            >
                              ▰
                            </span>
                            {category.label}
                          </div>
                          <span className="dms-category-count">
                            {categoryUploaded} uploaded · {categoryPending}{" "}
                            pending
                          </span>
                        </div>
                        <div>
                          {category.documents.map((document) => (
                            <div className="dms-doc-row" key={document.name}>
                              <div className="dms-doc-main">
                                <span
                                  className="dms-file-icon"
                                  aria-hidden="true"
                                >
                                  ▤
                                </span>
                                <div>
                                  <div className="dms-doc-name">
                                    {document.name}
                                  </div>
                                  <div className="dms-doc-note">
                                    {document.status === "UPLOADED"
                                      ? document.fileName ||
                                        "Uploaded file · file reference not linked in demo data"
                                      : "Awaiting upload"}
                                  </div>
                                </div>
                              </div>
                              <div className="dms-doc-actions">
                                {document.status === "UPLOADED" &&
                                document.previewUrl ? (
                                  <button
                                    type="button"
                                    className="dms-action-btn"
                                    onClick={() => setPreviewDocument(document)}
                                  >
                                    View
                                  </button>
                                ) : null}
                                <label className="dms-action-btn">
                                  {document.status === "UPLOADED"
                                    ? document.previewUrl
                                      ? "Replace"
                                      : "Attach file"
                                    : "Upload"}
                                  <input
                                    className="dms-file-input"
                                    type="file"
                                    accept=".pdf,.png,.jpg,.jpeg,.webp,application/pdf,image/png,image/jpeg,image/webp"
                                    onChange={(event) => {
                                      handleLocalFile(
                                        document.name,
                                        event.target.files?.[0],
                                      );
                                      event.target.value = "";
                                    }}
                                  />
                                </label>
                                <span
                                  className={`dms-badge ${document.status === "UPLOADED" ? "uploaded" : "pending"}`}
                                >
                                  <span aria-hidden="true">
                                    {document.status === "UPLOADED" ? "✓" : "◷"}
                                  </span>
                                  {document.status === "UPLOADED"
                                    ? "Uploaded"
                                    : "Pending"}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </article>
                    );
                  })}
                </div>
              </section>
            </div>
          )}
        </main>
        {previewDocument && (
          <div
            className="dms-modal-backdrop"
            role="presentation"
            onClick={() => setPreviewDocument(null)}
          >
            <section
              className="dms-preview-modal"
              role="dialog"
              aria-modal="true"
              aria-label={`Preview ${previewDocument.name}`}
              onClick={(event) => event.stopPropagation()}
            >
              <div className="dms-preview-head">
                <div>
                  <div className="dms-preview-title">
                    {previewDocument.name}
                  </div>
                  <div className="dms-doc-note">
                    {previewDocument.fileName || "Uploaded document"}
                  </div>
                </div>
                <div className="dms-doc-actions">
                  <a
                    className="dms-action-btn"
                    href={
                      previewDocument.downloadUrl || previewDocument.previewUrl
                    }
                    download={previewDocument.fileName || true}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Download
                  </a>
                  <button
                    type="button"
                    className="dms-action-btn"
                    onClick={() => setPreviewDocument(null)}
                  >
                    Close ✕
                  </button>
                </div>
              </div>
              <div className="dms-preview-body">
                {previewDocument.mimeType?.startsWith("image/") ? (
                  <img
                    src={previewDocument.previewUrl}
                    alt={`${previewDocument.name} preview`}
                  />
                ) : previewDocument.mimeType === "application/pdf" ||
                  (previewDocument.fileName || "")
                    .toLowerCase()
                    .endsWith(".pdf") ? (
                  <iframe
                    title={`${previewDocument.name} PDF preview`}
                    src={previewDocument.previewUrl}
                  />
                ) : (
                  <div className="dms-preview-fallback">
                    Preview is not available for this file type. Use Download to
                    open the document.
                  </div>
                )}
              </div>
            </section>
          </div>
        )}
      </div>
    </AppShell>
  );
}
