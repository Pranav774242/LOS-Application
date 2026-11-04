"use client";

import { useEffect, useState } from "react";
import {
  Building2,
  ChevronRight,
  ExternalLink,
  FileText,
  Fingerprint,
  Globe2,
  Home,
  Landmark,
  Mail,
  MapPin,
  Network,
  Phone,
  Plus,
  ShieldCheck,
  X,
} from "lucide-react";
import AppShell from "../../components/AppShell";
import { PermissionGate } from "../../components/AccessControl";
import { createBankBranch, getBankProfile } from "../../services/bankProfile";

const fieldLabels = {
  name: "Bank Name",
  type: "Type",
  id: "Bank ID",
  bank_code: "Bank Code",
  bank_name: "Bank Name",
  legal_name: "Legal Name",
  bank_type: "Bank Type",
  license_number: "License Number",
  PAN: "PAN",
  gst_number: "GST Number",
  direct_clearing_number: "Direct Clearing Number",
  direct_clearing_member: "Direct Clearing Member",
  direct_member_iftas: "Direct IFTAS Member",
  micr_details: "MICR Details",
  ifsc_code: "IFSC Code",
  number_of_branches: "Number of Branches",
  sponsor_bank_of_clearing: "Clearing Sponsor Bank",
  sponsor_bank_of_iftas: "IFTAS Sponsor Bank",
  address_type: "Address Type",
  unit_gala_name_and_number: "Unit / Building",
  street_road: "Street / Road",
  landmark: "Landmark",
  city: "City",
  state: "State",
  pincode: "PIN Code",
  website: "Website",
  regulatory_authority_id: "Regulatory Authority ID",
  regulatory_status: "Regulatory Status",
  country: "Country",
  status: "Status",
  contact_email: "Contact Email",
  contact_phone: "Contact Phone",
};

const hiddenFields = new Set([
  "pkid",
  "registration_number",
  "CIN",
  "micr_city_code",
  "micr_bank_code",
  "micr_branch_code",
  "logo",
  "status",
  "regulatory_status",
]);

const sectionDefinitions = [
  {
    id: "organization",
    title: "Organization & Address",
    description: "Bank identity, classification and registered address",
    icon: Building2,
  },
  {
    id: "regulatory",
    title: "Regulatory & Clearing",
    description: "Licensing, compliance and clearing network details",
    icon: ShieldCheck,
  },
  {
    id: "contact",
    title: "Contact Information",
    description: "Bank contact channels",
    icon: Phone,
  },
  {
    id: "additional",
    title: "Additional Details",
    description: "Other information returned by the organization API",
    icon: Building2,
  },
];

function getSectionId(key) {
  if (
    /^(name|type|id|pkid|bank_code|bank_name|legal_name|bank_type|number_of_branches|address_type|unit_gala_name_and_number|street_road|landmark|city|state|pincode|country|website|logo)$/i.test(
      key,
    )
  ) {
    return "organization";
  }
  if (
    /(license|registration|pan|gst|cin|regulatory|clearing|iftas|micr|ifsc|sponsor_bank|^status$)/i.test(
      key,
    )
  ) {
    return "regulatory";
  }
  if (/(contact|email|phone)/i.test(key)) return "contact";
  if (/(^db_|created_at|updated_at)/i.test(key)) return "system";
  return "additional";
}

function getFieldLabel(key) {
  return (
    fieldLabels[key] ||
    key.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase())
  );
}

function formatValue(key, value) {
  if (value === null || value === undefined || value === "") return "—";

  if (key === "website" || key === "logo") {
    const url = String(value);
    try {
      if (["http:", "https:"].includes(new URL(url).protocol)) {
        return (
          <a
            className="bank-profile-link"
            href={url}
            target="_blank"
            rel="noreferrer"
          >
            {url}
            <ExternalLink size={15} />
          </a>
        );
      }
    } catch {
      return url;
    }
    return url;
  }

  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "object") return JSON.stringify(value);

  return String(value);
}

function getFieldIcon(key) {
  if (/(address|street|road|landmark|city|state|pincode|country)/i.test(key))
    return MapPin;
  if (/website/i.test(key)) return Globe2;
  if (/email/i.test(key)) return Mail;
  if (/phone/i.test(key)) return Phone;
  if (/branch|clearing|iftas|micr|ifsc/i.test(key)) return Network;
  if (/bank|type/i.test(key)) return Landmark;
  if (/pan|gst|cin|license|registration|regulatory/i.test(key))
    return Fingerprint;
  return FileText;
}

function ProfileField({ field }) {
  const isStatus = field.key === "status" || field.key === "regulatory_status";
  const Icon = getFieldIcon(field.key);
  return (
    <div className="bank-profile-field">
      <span className="bank-profile-field-icon" aria-hidden="true">
        <Icon size={17} strokeWidth={1.9} />
      </span>
      <div className="bank-profile-field-copy">
        <span>{field.label || getFieldLabel(field.key)}</span>
        <strong className={isStatus ? "bank-profile-status-value" : ""}>
          {isStatus ? <i /> : null}
          {formatValue(field.key, field.value)}
        </strong>
      </div>
    </div>
  );
}

function ProfileSection({ id, title, description, icon: Icon, fields }) {
  if (!fields.length) return null;

  return (
    <section
      className={`bank-profile-section bank-profile-section-${id}`}
      id={id}
    >
      <header className="bank-profile-section-heading">
        <span className="bank-profile-section-icon">
          <Icon size={20} strokeWidth={2.2} />
        </span>
        <div>
          <h2>{title}</h2>
          <p>{description}</p>
        </div>
      </header>
      <div className="bank-profile-fields">
        {fields.map((field) => (
          <ProfileField field={field} key={field.key} />
        ))}
      </div>
    </section>
  );
}

export default function BankProfilePage() {
  const [bank, setBank] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [addBranchOpen, setAddBranchOpen] = useState(false);
  const [branchForm, setBranchForm] = useState({
    bankName: "",
    branchCode: "",
    branchName: "",
    rbiLicenseNo: "",
    registrationNo: "",
    incorporationDate: "",
    address: "",
    workingFrom: "",
    workingTo: "",
    address1: "",
    address2: "",
    city: "",
    state: "",
    country: "",
    pinCode: "",
  });
  const [branchSubmitting, setBranchSubmitting] = useState(false);
  const [branchSuccess, setBranchSuccess] = useState("");
  const [branchError, setBranchError] = useState("");

  const sections = bank
    ? sectionDefinitions.map((section) => ({
        ...section,
        fields: Object.entries(bank)
          .filter(([key]) => {
            if (
              hiddenFields.has(key) ||
              /^(db_|system_|created_at$|updated_at$)/i.test(key)
            )
              return false;
            if (
              key === "gst_no" &&
              bank.gst_number !== null &&
              bank.gst_number !== undefined &&
              bank.gst_number !== ""
            )
              return false;
            return getSectionId(key) === section.id;
          })
          .map(([key, value]) => ({
            key,
            value,
            label: key === "gst_no" ? "GST Number" : undefined,
          })),
      }))
    : [];
  
  console.log("sections", sections);

  useEffect(() => {
    let mounted = true;

    async function loadBankProfile() {
      try {
        const response = await getBankProfile();
        if (!mounted) return;
        setBank(response?.data || response || null);
        setError("");
      } catch (err) {
        if (!mounted) return;
        setError(err.message || "Unable to load bank profile");
      } finally {
        if (mounted) setLoading(false);
      }
    }

    loadBankProfile();

    return () => {
      mounted = false;
    };
  }, []);

  
  async function submitBranch(event) {
    event.preventDefault();
    setBranchSubmitting(true);
    setBranchSuccess("");
    setBranchError("");

    try {
      const result = await createBankBranch(branchForm);
      console.log(
        "[bank profile] submitted branch:",
        result.data || branchForm,
      );
      setBranchSuccess(
        "Branch submitted successfully. The payload was logged to the console.",
      );
    } catch (submitError) {
      setBranchError(submitError.message || "Unable to submit the branch.");
    } finally {
      setBranchSubmitting(false);
    }
  }

  function closeBranchDialog() {
    setAddBranchOpen(false);
    setBranchForm({
      bankName: "",
      branchCode: "",
      branchName: "",
      rbiLicenseNo: "",
      registrationNo: "",
      incorporationDate: "",
      address: "",
      workingFrom: "",
      workingTo: "",
      address1: "",
      address2: "",
      city: "",
      state: "",
      country: "",
      pinCode: "",
    });
    setBranchSuccess("");
    setBranchError("");
  }

  return (
    <AppShell title="Bank Profile">
      <>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Google+Sans:ital,opsz,wght@0,17..18,400..700;1,17..18,400..700&display=swap"
          rel="stylesheet"
        />
        <div className="bank-profile-page">
          <div className="bank-profile-toolbar">
            <nav className="bank-profile-breadcrumb" aria-label="Breadcrumb">
              <Home size={15} />
              <ChevronRight size={14} />
              <span>Bank Profile</span>
            </nav>
            <PermissionGate module="bank-management" action="create">
              <button
                className="lm-add-button"
                type="button"
                onClick={() => setAddBranchOpen(true)}
              >
                <Plus size={18} />
                Add Branch
              </button>
            </PermissionGate>
          </div>
          {loading ? (
            <div className="bank-profile-message">Loading bank profile...</div>
          ) : error ? (
            <div
              className="bank-profile-message bank-profile-error"
              role="alert"
            >
              {error}
            </div>
          ) : bank ? (
            <>
              <section className="bank-profile-summary">
                <div className="bank-profile-identity">
                  <div className="bank-profile-avatar">
                    {String(bank.bank_name || bank.name || "B")
                      .slice(0, 2)
                      .toUpperCase()}
                  </div>
                  <div className="bank-profile-identity-copy">
                    <span className="bank-profile-overline">
                      {bank.legal_name ||
                        bank.bank_name ||
                        bank.name ||
                        "Bank details"}
                    </span>
                    <h1>{bank.bank_name || bank.name || "Bank Profile"}</h1>
                    <div className="bank-profile-tags">
                      {bank.status ? (
                        <span className="bank-profile-badge">
                          <i />
                          {String(bank.status).toLowerCase()}
                        </span>
                      ) : null}
                      {bank.bank_type || bank.type ? (
                        <span>
                          {fieldLabels.bank_type}: {bank.bank_type || bank.type}
                        </span>
                      ) : null}
                    </div>
                  </div>
                </div>
                <div className="bank-profile-summary-facts">
                  {[
                    { label: "Bank Code", value: bank.bank_code },
                    { label: "Country", value: bank.country },
                  ]
                    .filter(
                      (fact) =>
                        fact.value !== undefined &&
                        fact.value !== null &&
                        fact.value !== "",
                    )
                    .map((fact) => (
                      <div key={fact.label}>
                        <span>{fact.label}</span>
                        <strong>{formatValue(fact.label, fact.value)}</strong>
                      </div>
                    ))}
                </div>
              </section>

              <div className="bank-profile-grid">
                {sections.map((section) => (
                  <ProfileSection key={section.id} {...section} />
                ))}
              </div>
            </>
          ) : (
            <div className="bank-profile-message">
              No bank profile data was returned.
            </div>
          )}
        </div>
        {addBranchOpen && (
          <div
            className="bank-profile-modal-backdrop"
            onClick={closeBranchDialog}
          >
            <section
              className="bank-profile-modal bank-profile-branch-modal"
              role="dialog"
              aria-modal="true"
              aria-labelledby="add-branch-title"
              onClick={(event) => event.stopPropagation()}
            >
              <header className="bank-profile-modal-header">
                <div>
                  <h2 id="add-branch-title">Bank Branch Profile</h2>
                  <p>
                    Enter the bank and branch details to submit the profile.
                  </p>
                </div>
                <button
                  className="bank-profile-modal-close"
                  type="button"
                  onClick={closeBranchDialog}
                  aria-label="Close add branch dialog"
                >
                  <X size={20} />
                </button>
              </header>
              <form
                className="bank-profile-branch-form"
                onSubmit={submitBranch}
              >
                <div className="bank-profile-branch-fields">
                  {[
                    ["bankName", "Bank Name", "text", true],
                    ["branchCode", "Branch Code", "text", true],
                    ["branchName", "Branch Name", "text", true],
                    ["rbiLicenseNo", "RBI License No", "text", false],
                    ["registrationNo", "Registration No", "text", false],
                    ["incorporationDate", "Incorporation Date", "date", false],
                    ["address", "Address", "text", false],
                    ["address1", "Address 1", "text", false],
                    ["address2", "Address 2", "text", false],
                    ["city", "City", "text", false],
                    ["state", "State", "text", false],
                    ["country", "Country", "text", false],
                    ["pinCode", "PinCode", "text", false],
                  ].map(([key, label, type, required]) => (
                    <label
                      className={
                        key === "address" ? "bank-profile-field-wide" : ""
                      }
                      key={key}
                    >
                      {label}
                      <input
                        autoFocus={key === "bankName"}
                        required={required}
                        type={type}
                        value={branchForm[key]}
                        onChange={(event) => {
                          setBranchForm((current) => ({
                            ...current,
                            [key]: event.target.value,
                          }));
                          setBranchSuccess("");
                          setBranchError("");
                        }}
                        placeholder={`Enter ${label.toLowerCase()}`}
                      />
                    </label>
                  ))}
                  <div className="bank-profile-working-hours">
                    <span>Working Timings</span>
                    <label>
                      From
                      <input
                        required
                        type="time"
                        value={branchForm.workingFrom}
                        onChange={(event) =>
                          setBranchForm((current) => ({
                            ...current,
                            workingFrom: event.target.value,
                          }))
                        }
                      />
                    </label>
                    <label>
                      To
                      <input
                        required
                        type="time"
                        value={branchForm.workingTo}
                        onChange={(event) =>
                          setBranchForm((current) => ({
                            ...current,
                            workingTo: event.target.value,
                          }))
                        }
                      />
                    </label>
                  </div>
                </div>
                {branchError && (
                  <p className="bank-profile-branch-error" role="alert">
                    {branchError}
                  </p>
                )}
                {branchSuccess && (
                  <p className="bank-profile-branch-success" role="status">
                    {branchSuccess}
                  </p>
                )}
                <div className="bank-profile-modal-actions">
                  <button
                    className="bank-profile-cancel-button"
                    type="button"
                    onClick={closeBranchDialog}
                  >
                    Cancel
                  </button>
                  <button
                    className="lm-add-button"
                    type="submit"
                    disabled={branchSubmitting}
                  >
                    <Plus size={17} />{" "}
                    {branchSubmitting ? "Submitting..." : "Submit"}
                  </button>
                </div>
              </form>
            </section>
          </div>
        )}
        <style>{`
          .bank-profile-page {
            --bank-blue: #2165e8;
            --bank-ink: #162d4c;
            --bank-muted: #71819a;
            --bank-line: #e1e9f3;
            max-width: 1560px;
            margin: 0 auto;
            padding: 18px 20px 36px;
            color: var(--bank-ink);
            font-family: "Google Sans", Arial, sans-serif;
            font-size: 16px;
          }
          .bank-profile-toolbar { display: flex; align-items: center; justify-content: space-between; gap: 18px; margin: 0 0 18px; }
          .bank-profile-breadcrumb { display: flex; align-items: center; gap: 10px; margin: 0; color: #6782a4; font-size: 14px; }
          .bank-profile-breadcrumb svg:first-child { color: #607fa6; }
          .bank-profile-breadcrumb svg:nth-child(2) { color: #99acc3; }
          .lm-add-button { display: inline-flex; align-self: flex-start; align-items: center; justify-content: center; gap: 8px; width: fit-content; margin: 0; min-height: 42px; padding: 0 16px; border: 1px solid #2165e8; border-radius: 9px; background: #2165e8; color: #fff; font: inherit; font-size: 15px; font-weight: 600; cursor: pointer; transition: background .18s ease, transform .18s ease; }
          .lm-add-button:hover { background: #1855c8; transform: translateY(-1px); }
          .lm-add-button{display:inline-flex;align-items:center;justify-content:center;gap:8px;min-height:40px;padding:0 15px;border:1px solid #177e7a;border-radius:5px;background:#177e7a;color:#fff;font-size:12px;font-weight:700;white-space:nowrap;cursor:pointer}
          .lm-add-button:hover{border-color:#0c6662;background:#0c6662}
          .bank-profile-summary { display: grid; grid-template-columns: minmax(0, 1fr) minmax(240px, .55fr); align-items: center; gap: 28px; min-height: 112px; padding: 18px 24px; border: 1px solid var(--bank-line); border-radius: 12px; background: linear-gradient(115deg, #fff 0%, #fbfdff 100%); box-shadow: 0 3px 12px rgb(32 65 105 / 3%); }
          .bank-profile-identity { display: flex; align-items: center; gap: 20px; min-width: 0; }
          .bank-profile-avatar { display: grid; place-items: center; flex: 0 0 72px; width: 72px; height: 72px; border: 1px solid #edf0f6; border-radius: 14px; background: #fff; color: #a61e53; font-size: 24px; font-weight: 800; box-shadow: 0 3px 12px rgb(27 48 78 / 6%); }
          .bank-profile-identity-copy { min-width: 0; }
          .bank-profile-overline { display: block; margin-bottom: 3px; color: #203653; font-size: 21px; font-weight: 700; letter-spacing: -.02em; }
          .bank-profile-identity-copy h1 { margin: 0; color: #657993; font-size: 14px; line-height: 1.5; font-weight: 500; }
          .bank-profile-tags { display: flex; align-items: center; flex-wrap: wrap; gap: 12px; margin-top: 6px; color: var(--bank-muted); font-size: 13px; }
          .bank-profile-badge { display: inline-flex; align-items: center; gap: 7px; padding: 4px 10px; border: 1px solid #c8f0db; border-radius: 20px; background: #e7f9ef; color: #138553; font-size: 11px; font-weight: 700; text-transform: capitalize; }
          .bank-profile-badge i, .bank-profile-status-value i { width: 8px; height: 8px; flex: none; border-radius: 50%; background: #19b76d; }
          .bank-profile-summary-facts { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); min-width: 0; }
          .bank-profile-summary-facts > div { display: grid; align-content: center; gap: 6px; min-width: 0; min-height: 54px; padding: 0 18px; border-left: 1px solid #e6edf5; }
          .bank-profile-summary-facts span { color: var(--bank-muted); font-size: 12px; font-weight: 500; }
          .bank-profile-summary-facts strong { overflow-wrap: anywhere; color: #1a2e49; font-size: 14px; font-weight: 700; line-height: 1.45; }
          .bank-profile-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px; margin-top: 16px; }
          .bank-profile-section { min-width: 0; overflow: hidden; border: 1px solid var(--bank-line); border-radius: 12px; background: #fff; box-shadow: 0 3px 12px rgb(32 65 105 / 3%); }
          .bank-profile-section-organization, .bank-profile-section-additional { grid-column: 1 / -1; }
          .bank-profile-section-heading { display: flex; align-items: center; gap: 12px; min-height: 64px; padding: 12px 18px; border-bottom: 1px solid #edf1f6; background: #fff; }
          .bank-profile-section-icon { display: grid; place-items: center; flex: 0 0 36px; width: 36px; height: 36px; border: 1px solid #e6edf6; border-radius: 11px; background: #f5f8fc; color: #526a89; }
          .bank-profile-section-heading h2 { margin: 0 0 3px; color: #233a58; font-size: 15px; font-weight: 700; }
          .bank-profile-section-heading p { margin: 0; color: #8291a5; font-size: 12px; line-height: 1.45; }
          .bank-profile-fields { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; padding: 14px; }
          .bank-profile-section-organization .bank-profile-fields, .bank-profile-section-additional .bank-profile-fields { grid-template-columns: repeat(4, minmax(0, 1fr)); }
          .bank-profile-field { display: flex; align-items: flex-start; gap: 10px; min-width: 0; min-height: 64px; padding: 12px; border: 1px solid #e7edf5; border-radius: 9px; background: #fff; transition: border-color .18s ease, background .18s ease; }
          .bank-profile-field:hover { border-color: #cad9eb; background: #fbfdff; }
          .bank-profile-field-icon { display: grid; place-items: center; flex: 0 0 34px; width: 34px; height: 34px; border-radius: 50%; background: #f3f6fa; color: #304b6c; }
          .bank-profile-field-copy { display: grid; align-content: center; gap: 4px; min-width: 0; min-height: 34px; }
          .bank-profile-field-copy > span { color: #77879d; font-size: 11px; font-weight: 500; line-height: 1.35; }
          .bank-profile-field-copy > strong { overflow-wrap: anywhere; color: #1a2e49; font-size: 13px; font-weight: 600; line-height: 1.45; }
          .bank-profile-field-copy > strong.bank-profile-status-value { display: inline-flex; align-items: center; gap: 8px; width: max-content; max-width: 100%; padding: 5px 11px; border-radius: 16px; background: #def6eb; color: #16905d; font-size: 12px; text-transform: uppercase; }
          .bank-profile-field-copy > strong.bank-profile-status-value i { width: 7px; height: 7px; }
          .bank-profile-link { display: inline-flex; align-items: center; gap: 6px; color: #1d69d9; text-decoration: underline; overflow-wrap: anywhere; }
          .bank-profile-message { padding: 26px; border: 1px solid var(--bank-line); border-radius: 10px; background: #fff; color: #516b8c; font-size: 16px; }
          .bank-profile-error { border-color: #f2caca; background: #fff7f7; color: #ad3030; }
          .bank-profile-modal-backdrop { position: fixed; z-index: 1000; inset: 0; display: grid; place-items: center; padding: 20px; background: rgb(15 32 55 / 48%); }
          .bank-profile-modal { width: min(100%, 520px); overflow: hidden; border: 1px solid #d8e6fa; border-radius: 14px; background: #fff; box-shadow: 0 24px 70px rgb(15 32 55 / 24%); }
          .bank-profile-branch-modal { width: min(100%, 1120px); max-height: calc(100vh - 40px); overflow: auto; }
          .bank-profile-modal-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; padding: 22px 24px; border-bottom: 1px solid #e6edf7; }
          .bank-profile-modal-header h2 { margin: 0; color: #17345f; font-size: 22px; }
          .bank-profile-modal-header p { margin: 6px 0 0; color: #7189a8; font-size: 14px; }
          .bank-profile-modal-close { display: grid; place-items: center; width: 36px; height: 36px; border: 0; border-radius: 8px; background: #f1f5fb; color: #526b8c; cursor: pointer; }
          .bank-profile-branch-form { display: grid; gap: 17px; padding: 23px 24px 24px; }
          .bank-profile-branch-fields { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 17px 20px; }
          .bank-profile-branch-form label { display: grid; gap: 7px; color: #304b70; font-size: 14px; font-weight: 600; }
          .bank-profile-branch-form input { width: 100%; min-height: 44px; box-sizing: border-box; padding: 0 12px; border: 1px solid #cbd9eb; border-radius: 7px; outline: none; color: #17345f; font: inherit; font-size: 15px; }
          .bank-profile-branch-form input:focus { border-color: #2165e8; box-shadow: 0 0 0 3px rgb(33 101 232 / 13%); }
          .bank-profile-field-wide { grid-column: 1 / -1; }
          .bank-profile-working-hours { display: grid; grid-template-columns: minmax(150px, 1fr) repeat(2, minmax(180px, 1fr)); align-items: end; gap: 12px; grid-column: 1 / -1; }
          .bank-profile-working-hours > span { padding-bottom: 14px; color: #304b70; font-size: 14px; font-weight: 600; }
          .bank-profile-branch-form .bank-profile-working-hours label { gap: 7px; }
          .bank-profile-branch-error { margin: 0; padding: 11px 13px; border: 1px solid #f1c5c5; border-radius: 7px; background: #fff5f5; color: #ad3030; font-size: 14px; font-weight: 600; }
          .bank-profile-branch-success { margin: 0; padding: 11px 13px; border: 1px solid #b9e8ce; border-radius: 7px; background: #effbf4; color: #147346; font-size: 14px; font-weight: 600; }
          .bank-profile-modal-actions { display: flex; justify-content: flex-end; gap: 10px; margin-top: 3px; }
          .bank-profile-cancel-button { min-height: 42px; padding: 0 16px; border: 1px solid #cbd9eb; border-radius: 8px; background: #fff; color: #405775; font: inherit; font-size: 15px; font-weight: 600; cursor: pointer; }
          .lm-add-button:disabled { opacity: .65; cursor: wait; transform: none; }
          @media (max-width: 1050px) {
            .bank-profile-summary { grid-template-columns: minmax(0, 1fr) auto; gap: 16px; }
            .bank-profile-section-organization .bank-profile-fields, .bank-profile-section-additional .bank-profile-fields { grid-template-columns: repeat(2, minmax(0, 1fr)); }
            .bank-profile-summary-facts > div:first-child { border-left: 0; padding-left: 0; }
          }
          @media (max-width: 760px) {
            .bank-profile-page { padding: 14px 12px 26px; }
            .bank-profile-grid { grid-template-columns: 1fr; }
            .bank-profile-section-organization, .bank-profile-section-additional { grid-column: auto; }
            .bank-profile-summary { padding: 20px; }
            .bank-profile-modal-backdrop { padding: 0; }
            .bank-profile-branch-modal { width: 100%; max-height: 100vh; min-height: 100vh; border: 0; border-radius: 0; }
            .bank-profile-branch-fields { grid-template-columns: repeat(2, minmax(0, 1fr)); }
          }
          @media (max-width: 480px) {
            .bank-profile-toolbar { align-items: flex-start; flex-direction: column; gap: 12px; }
            .bank-profile-identity { align-items: flex-start; gap: 13px; }
            .bank-profile-avatar { flex-basis: 62px; width: 62px; height: 62px; font-size: 21px; }
            .bank-profile-identity-copy h1 { font-size: 22px; }
            .bank-profile-summary-facts { grid-template-columns: 1fr; gap: 14px; }
            .bank-profile-summary-facts > div { min-height: 0; padding: 0; border-left: 0; }
            .bank-profile-fields, .bank-profile-section-organization .bank-profile-fields, .bank-profile-section-additional .bank-profile-fields { grid-template-columns: 1fr; gap: 10px; padding: 12px; }
            .bank-profile-summary { grid-template-columns: 1fr; gap: 16px; }
            .bank-profile-summary-facts { grid-template-columns: repeat(2, minmax(0, 1fr)); }
            .bank-profile-summary-facts > div { padding: 0 10px; border-left: 1px solid #e6edf5; }
            .bank-profile-summary-facts > div:first-child { padding-left: 0; border-left: 0; }
            .bank-profile-section-heading { padding: 12px 16px; }
            .bank-profile-branch-form { padding: 18px 16px 20px; }
            .bank-profile-branch-fields, .bank-profile-working-hours { grid-template-columns: 1fr; }
            .bank-profile-working-hours > span { padding-bottom: 0; }
            .bank-profile-field-wide { grid-column: auto; }
            .bank-profile-modal-actions { flex-direction: column-reverse; }
            .bank-profile-modal-actions button { width: 100%; }
          }
        `}</style>
      </>
    </AppShell>
  );
}
