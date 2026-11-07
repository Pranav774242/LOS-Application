"use client";

import { useState } from "react";
import { Check, RotateCcw, Save } from "lucide-react";
import AppShell from "../../components/AppShell";
import { createBankBranch } from "../../services/bankProfile";

const initialForm = {
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
  contactCode: "",
  contact: "",
  contact1Code: "",
  contact1: "",
  email: "",
  micrCode: "",
};

const fieldRules = [
  ["bankName", "Bank Name"],
  ["branchCode", "Branch Code"],
  ["branchName", "Branch Name"],
  ["registrationNo", "Registration No"],
  ["address", "Address"],
  ["address1", "Address1"],
  ["address2", "Address2"],
  ["city", "City"],
  ["state", "State"],
  ["country", "Country"],
  ["pinCode", "PinCode"],
  ["email", "Email ID"],
  ["micrCode", "MICR Code"],
];

function validate(form) {
  const errors = {};
  const value = (field) => String(form[field] || "").trim();
  const text = (field, label, pattern, message) => {
    if (value(field) && !pattern.test(value(field)))
      errors[field] = `${label} ${message}`;
  };
  fieldRules.forEach(([field, label]) => {
    if (!value(field)) errors[field] = `${label} is required.`;
  });
  if (value("bankName").length > 120)
    errors.bankName = "Bank Name cannot exceed 120 characters.";
  if (value("branchName").length > 120)
    errors.branchName = "Branch Name cannot exceed 120 characters.";
  text(
    "bankName",
    "Bank Name",
    /^[A-Za-z0-9][A-Za-z0-9 .&'()-]*$/,
    "can contain only letters, numbers, spaces, and . & ' ( ) -.",
  );
  text(
    "branchName",
    "Branch Name",
    /^[A-Za-z0-9][A-Za-z0-9 .&'()-]*$/,
    "can contain only letters, numbers, spaces, and . & ' ( ) -.",
  );
  text(
    "city",
    "City",
    /^[A-Za-z][A-Za-z .'-]*$/,
    "can contain only letters, spaces, apostrophes, periods, and hyphens.",
  );
  text(
    "state",
    "State",
    /^[A-Za-z][A-Za-z .'-]*$/,
    "can contain only letters, spaces, apostrophes, periods, and hyphens.",
  );
  text(
    "country",
    "Country",
    /^[A-Za-z][A-Za-z .'-]*$/,
    "can contain only letters, spaces, apostrophes, periods, and hyphens.",
  );
  ["address", "address1", "address2"].forEach((field) => {
    text(
      field,
      field === "address"
        ? "Address"
        : field === "address1"
          ? "Address1"
          : "Address2",
      /^[A-Za-z0-9][A-Za-z0-9\s,./#'()-]*$/,
      "contains invalid characters.",
    );
  });
  if (
    value("branchCode") &&
    !/^[A-Z0-9][A-Z0-9-]{1,19}$/i.test(value("branchCode"))
  )
    errors.branchCode = "Use 2–20 letters, numbers, or hyphens.";
  if (value("pinCode") && !/^\d{6}$/.test(value("pinCode")))
    errors.pinCode = "PinCode must contain 6 digits.";
  if (value("email") && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value("email")))
    errors.email = "Enter a valid email address.";
  if (value("micrCode") && !/^\d{9}$/.test(value("micrCode")))
    errors.micrCode = "MICR Code must contain 9 digits.";
  if (
    value("rbiLicenseNo") &&
    !/^[A-Z0-9/-]{3,30}$/i.test(value("rbiLicenseNo"))
  )
    errors.rbiLicenseNo = "Use 3–30 letters, numbers, /, or hyphens.";
  if (
    value("registrationNo") &&
    !/^[A-Z0-9/-]{3,30}$/i.test(value("registrationNo"))
  )
    errors.registrationNo = "Use 3–30 letters, numbers, /, or hyphens.";
  ["contactCode", "contact1Code"].forEach((field) => {
    if (value(field) && !/^\d{2,5}$/.test(value(field)))
      errors[field] = "Use numbers only, 2–5 digits.";
  });
  ["contact", "contact1"].forEach((field) => {
    if (value(field) && !/^\d{10}$/.test(value(field)))
      errors[field] = "Phone number must contain exactly 10 digits.";
  });
  if (
    value("incorporationDate") &&
    value("incorporationDate") > new Date().toISOString().slice(0, 10)
  )
    errors.incorporationDate = "Incorporation Date cannot be in the future.";
  if (
    value("workingFrom") &&
    value("workingTo") &&
    value("workingFrom") >= value("workingTo")
  )
    errors.workingTo = "End time must be later than start time.";
  return errors;
}

function Field({
  label,
  name,
  form,
  errors,
  onChange,
  required = false,
  type = "text",
  maxLength,
  inputMode,
}) {
  const errorId = `branch-${name}-error`;
  return (
    <label className="bank-branch-field" htmlFor={`branch-${name}`}>
      <span>
        {label}
        {required && <em aria-hidden="true"> *</em>}
      </span>
      <input
        id={`branch-${name}`}
        name={name}
        type={type}
        value={form[name]}
        onChange={onChange}
        maxLength={maxLength}
        inputMode={inputMode}
        aria-invalid={Boolean(errors[name])}
        aria-describedby={errors[name] ? errorId : undefined}
      />
      {errors[name] && <small id={errorId}>{errors[name]}</small>}
    </label>
  );
}

export default function BankBranchPage() {
  const [form, setForm] = useState(initialForm);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [notice, setNotice] = useState("");
  const [requestError, setRequestError] = useState("");

  function updateField(event) {
    const { name } = event.target;
    const value = [
      "pinCode",
      "micrCode",
      "contactCode",
      "contact",
      "contact1Code",
      "contact1",
    ].includes(name)
      ? event.target.value.replace(/\D/g, "")
      : event.target.value;
    setForm((current) => ({ ...current, [name]: value }));
    setErrors((current) => ({ ...current, [name]: "" }));
    setNotice("");
  }

  function resetForm() {
    setForm(initialForm);
    setErrors({});
    setNotice("");
    setRequestError("");
  }

  async function submitForm(event) {
    event.preventDefault();
    const nextErrors = validate(form);
    setErrors(nextErrors);
    setNotice("");
    setRequestError("");
    if (Object.keys(nextErrors).length) {
      document.getElementById(`branch-${Object.keys(nextErrors)[0]}`)?.focus();
      return;
    }
    setSubmitting(true);
    try {
      const result = await createBankBranch(form);
      console.log("[bank branch] submitted payload:", form);
      setNotice(
        result?.message ||
          "Branch submitted successfully. The payload was logged to the console.",
      );
    } catch (error) {
      setRequestError(error?.message || "Unable to submit the branch.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AppShell title="Bank Branch Master">
      <div className="bank-branch-page">
        <header className="bank-branch-heading">
          <div>
            <h1>Bank Branch Master</h1>
          </div>
        </header>
        {requestError && (
          <p className="bank-branch-alert" role="alert">
            {requestError}
          </p>
        )}
        {notice && (
          <p className="bank-branch-success" role="status">
            <Check size={17} />
            {notice}
          </p>
        )}
        <form className="bank-branch-card" onSubmit={submitForm} noValidate>
          <section className="bank-branch-section">
            <div className="bank-branch-section-title">
              <span>01</span>
              <div>
                <h2>Branch Information</h2>
                <p>Enter the branch identity and regulatory details.</p>
              </div>
            </div>
            <div className="bank-branch-grid">
              <Field
                label="Bank Name"
                name="bankName"
                form={form}
                errors={errors}
                onChange={updateField}
                required
                maxLength={120}
              />
              <Field
                label="Branch Code"
                name="branchCode"
                form={form}
                errors={errors}
                onChange={updateField}
                required
                maxLength={20}
              />
              <Field
                label="Branch Name"
                name="branchName"
                form={form}
                errors={errors}
                onChange={updateField}
                required
                maxLength={120}
              />
              <Field
                label="RBI License No"
                name="rbiLicenseNo"
                form={form}
                errors={errors}
                onChange={updateField}
                maxLength={30}
              />
              <Field
                label="Registration No"
                name="registrationNo"
                form={form}
                errors={errors}
                onChange={updateField}
                required
                maxLength={30}
              />
              <Field
                label="Incorporation Date"
                name="incorporationDate"
                type="date"
                form={form}
                errors={errors}
                onChange={updateField}
              />
              <Field
                label="MICR Code"
                name="micrCode"
                form={form}
                errors={errors}
                onChange={updateField}
                required
                maxLength={9}
                inputMode="numeric"
              />
              <div className="bank-branch-time-field">
                <span className="bank-branch-time-title">Working Timings</span>
                <div className="bank-branch-time-controls">
                  <label htmlFor="branch-workingFrom">
                    <span>From</span>
                    <input
                      id="branch-workingFrom"
                      name="workingFrom"
                      type="time"
                      value={form.workingFrom}
                      onChange={updateField}
                    />
                  </label>
                  <span className="bank-branch-time-separator">to</span>
                  <label htmlFor="branch-workingTo">
                    <span>To</span>
                    <input
                      id="branch-workingTo"
                      name="workingTo"
                      type="time"
                      value={form.workingTo}
                      onChange={updateField}
                    />
                  </label>
                </div>
                {errors.workingTo && (
                  <small className="bank-branch-time-error">
                    {errors.workingTo}
                  </small>
                )}
              </div>
            </div>
          </section>
          <section className="bank-branch-section">
            <div className="bank-branch-section-title">
              <span>02</span>
              <div>
                <h2>Branch Address</h2>
                <p>Use the registered address for this branch.</p>
              </div>
            </div>
            <div className="bank-branch-grid">
              <Field
                label="Address"
                name="address"
                form={form}
                errors={errors}
                onChange={updateField}
                required
                maxLength={160}
              />
              <Field
                label="Address1"
                name="address1"
                form={form}
                errors={errors}
                onChange={updateField}
                required
                maxLength={160}
              />
              <Field
                label="Address2"
                name="address2"
                form={form}
                errors={errors}
                onChange={updateField}
                required
                maxLength={160}
              />
              <Field
                label="City"
                name="city"
                form={form}
                errors={errors}
                onChange={updateField}
                required
                maxLength={80}
              />
              <Field
                label="State"
                name="state"
                form={form}
                errors={errors}
                onChange={updateField}
                required
                maxLength={80}
              />
              <Field
                label="Country"
                name="country"
                form={form}
                errors={errors}
                onChange={updateField}
                required
                maxLength={80}
              />
              <Field
                label="PinCode"
                name="pinCode"
                form={form}
                errors={errors}
                onChange={updateField}
                required
                maxLength={6}
                inputMode="numeric"
              />
            </div>
          </section>
          <section className="bank-branch-section">
            <div className="bank-branch-section-title">
              <span>03</span>
              <div>
                <h2>Contact Details</h2>
                <p>Provide the primary branch contact channels.</p>
              </div>
            </div>
            <div className="bank-branch-grid">
              <div className="bank-branch-field">
                <span>Primary Contact</span>
                <div className="bank-branch-contact">
                  <input
                    aria-label="Contact country or area code"
                    name="contactCode"
                    value={form.contactCode}
                    onChange={updateField}
                    maxLength={5}
                    type="tel"
                    inputMode="numeric"
                    placeholder="+91"
                  />
                  <input
                    aria-label="Contact number"
                    name="contact"
                    value={form.contact}
                    onChange={updateField}
                    maxLength={10}
                    inputMode="numeric"
                  />
                </div>
                {errors.contactCode || errors.contact ? (
                  <small>{errors.contactCode || errors.contact}</small>
                ) : null}
              </div>
              <div className="bank-branch-field">
                <span>Secondary Contact</span>
                <div className="bank-branch-contact">
                  <input
                    aria-label="Contact1 country or area code"
                    name="contact1Code"
                    value={form.contact1Code}
                    onChange={updateField}
                    maxLength={5}
                    type="tel"
                    inputMode="numeric"
                    placeholder="+91"
                    readOnly
                  />
                  <input
                    aria-label="Contact1 number"
                    name="contact1"
                    value={form.contact1}
                    onChange={updateField}
                    maxLength={10}
                    inputMode="numeric"
                  />
                </div>
                {errors.contact1Code || errors.contact1 ? (
                  <small>{errors.contact1Code || errors.contact1}</small>
                ) : null}
              </div>
              <Field
                label="Email ID"
                name="email"
                type="email"
                form={form}
                errors={errors}
                onChange={updateField}
                required
                maxLength={160}
              />
            </div>
          </section>
          <footer className="bank-branch-actions">
            <button
              className="bank-branch-reset"
              type="button"
              onClick={resetForm}
            >
              <RotateCcw size={16} />
              Cancel
            </button>
            <button
              className="bank-branch-submit"
              type="submit"
              disabled={submitting}
            >
              <Save size={16} />
              {submitting ? "Submitting..." : "Submit"}
            </button>
          </footer>
        </form>
      </div>
    </AppShell>
  );
}
