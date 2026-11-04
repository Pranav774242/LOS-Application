 "use client";

import { useEffect, useState } from "react";
import {
  Building2, ContactRound, Check, KeyRound, Pencil, ShieldCheck, X, UserRound,
} from "lucide-react";
import { getUserProfile, updateUserProfile } from "../services/user_profile";

const profileSections = [
  {
    title: "Employee and Personal Information", icon: UserRound, className: "personal",
    fields: [
      { label: "Full Name", keys: ["fullName", "name"] },
      { label: "First Name", keys: ["first_name"] },
      { label: "Middle Name", keys: ["middle_name"] },
      { label: "Last Name", keys: ["last_name"] },
      { label: "Mobile Number", keys: ["mobile", "mobile_number", "phone", "phone_number"], editable: true },
      { label: "Date of Birth", keys: ["dob", "date_of_birth", "dateOfBirth"], date: true },
      { label: "Gender", keys: ["gender"] },
      // { label: "Designation", keys: ["designation"] },
    ],
  },
  {
    title: "Login Information", icon: KeyRound, className: "login",
    fields: [
      { label: "User Name", keys: ["username", "user_name"] },
      { label: "Email Address", keys: ["email", "email_address"], editable: true },
      { label: "Password", keys: ["password"], password: true },
      { label: "Account State", keys: ["status", "account_state", "account_status"] },
    ],
  },
  {
    title: "Role and Access Information", icon: ShieldCheck, className: "access",
    fields: [
      { label: "Designation", keys: ["designation_name"] },
      { label: "User Role", keys: ["user_role", "role", "role_name"] },
      { label: "System Role", keys: ["system_role"] },
      { label: "Login Branch", keys: ["login_branch", "login_branch_name", "branch", "branch_name"] },
      { label: "Branch ID", keys: ["login_branch_id", "branch_id"] },
      { label: "Allow MultiBranch", keys: ["allow_multibranch", "allow_multi_branch"], boolean: true },
      { label: "Allow Login On Holidays", keys: ["login_on_holidays", "holiday_login", "allow_login_in_holidays"], boolean: true },
    ],
  },
  {
    title: "Session and Login Settings", icon: ContactRound, className: "session",
    fields: [
      { label: "Permitted Login Time", keys: ["login_time", "permitted_login_time"] },
      { label: "Permitted Logout Time", keys: ["logout_time", "permitted_logout_time"] },
      { label: "Last Login Date", keys: ["last_login_date", "lastlogindate", "lastLoginDate"], date: true },
      { label: "Last Login Time", keys: ["last_login_time", "lastlogintime", "lastLoginTime"] },
      { label: "Session Timeout (Seconds)", keys: ["inactive_session_timeout", "session_timeout", "session_timeout_seconds", "idle_timeout_seconds"] },
    ],
  },
  {
    title: "Organization Information", icon: Building2, className: "organization",
    fields: [
      { label: "Organization Name", keys: ["organization_name"] },
      { label: "Organization Code", keys: ["organization_code"] },
      { label: "Employee Number", keys: ["employee_id", "emp_no", "employee_no", "employee_number"] },
    ],
  },
];

function getFieldValue(profile, keys) {
  const available = keys.filter((key) => Object.prototype.hasOwnProperty.call(profile || {}, key));
  const key = available.find((candidate) => profile[candidate] !== null && profile[candidate] !== undefined && profile[candidate] !== "") || available[0];
  return key ? { key, value: profile[key] } : null;
}

function formatDate(value) {
  if (!value) return "Not added";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString("en-CA");
}

function formatValue(value, field) {
  if (value === null || value === undefined || value === "") return "Not added";
  if (field.boolean) {
    if (typeof value === "boolean") return value ? "Yes" : "No";
    if (value === 1 || value === "1" || String(value).toLowerCase() === "true") return "Yes";
    if (value === 0 || value === "0" || ["false", "no", "disabled"].includes(String(value).toLowerCase())) return "No";
    if (["true", "yes", "enabled"].includes(String(value).toLowerCase())) return "Yes";
  }
  if (field.date) return formatDate(value);
  if (field.password) return "••••••••••";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

function ProfileField({ field, profile, isEditing, draftProfile, onDraftChange }) {
  const result = getFieldValue(profile, field.keys) || (field.editable ? { key: field.keys[0], value: "" } : null);
  if (!result) return null;
  const draftValue = draftProfile[result.key] ?? (result.value == null ? "" : String(result.value));
  const shownValue = formatValue(isEditing && field.editable ? draftValue : result.value, field);
  return (
    <div className="profile-row">
      <span className="profile-label">{field.label}</span>
      {isEditing && field.editable ? (
        <input
          aria-label={field.label}
          className="profile-input"
          type={field.label.toLowerCase().includes("email") ? "email" : "text"}
          value={draftValue}
          onChange={(event) => onDraftChange(result.key, event.target.value)}
        />
      ) : (
        <strong className={`profile-value${field.boolean && shownValue === "No" ? " muted" : ""}`}>
          {shownValue}
        </strong>
      )}
    </div>
  );
}

export default function UserProfile() {
  const [profile, setProfile] = useState(null);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [draftProfile, setDraftProfile] = useState({});
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  useEffect(() => {
    let active = true;
    async function loadProfile() {
      try {
        const data = await getUserProfile();
        if (active) setProfile(data);
      } catch (err) {
        if (active) setError(err?.message || "Unable to load the user profile.");
      } finally {
        if (active) setIsLoading(false);
      }
    }
    loadProfile();
    return () => { active = false; };
  }, []);

  const name = profile?.fullName || profile?.full_name || profile?.name || profile?.username || profile?.user_name || "User Profile";
  const initials = name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase();
  const employee = getFieldValue(profile || {}, ["employee_id", "emp_no", "employee_no", "employee_number"]);

  function startEditing() {
    const draft = {};
    profileSections.flatMap((section) => section.fields).filter((field) => field.editable).forEach((field) => {
      const result = getFieldValue(profile || {}, field.keys);
      const key = result?.key || field.keys[0];
      draft[key] = result?.value == null ? "" : String(result.value);
    });
    setDraftProfile(draft);
    setSaveError("");
    setIsEditing(true);
  }

  function cancelEditing() {
    setDraftProfile({});
    setSaveError("");
    setIsEditing(false);
  }

  async function saveProfile() {
    setIsSaving(true);
    setSaveError("");
    try {
      const updated = await updateUserProfile(draftProfile);
      setProfile((current) => ({ ...current, ...draftProfile, ...(updated || {}) }));
      setDraftProfile({});
      setIsEditing(false);
    } catch (err) {
      setSaveError(err?.message || "Unable to update the user profile.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <main className="user-profile-page">
      <header className="profile-summary">
        <div className="profile-identity">
          <div className="profile-avatar" aria-hidden="true">{initials || "U"}</div>
          <div>
            <h1>{name}</h1>
            <p>{employee ? `Employee: ${employee.value}` : "User account details"}</p>
          </div>
        </div>
        <div className="profile-actions">
          {isEditing ? (
            <>
              <button className="profile-button cancel" type="button" onClick={cancelEditing} disabled={isSaving}><X size={15} /> Cancel</button>
              <button className="profile-button save" type="button" onClick={saveProfile} disabled={isSaving}><Check size={15} />{isSaving ? "Saving..." : "Save"}</button>
            </>
          ) : (
            <button className="profile-button edit" type="button" onClick={startEditing}><Pencil size={15} /> Edit Profile</button>
          )}
        </div>
      </header>

      {isLoading ? <div className="profile-message">Loading user profile...</div> :
        error ? <div className="profile-message error" role="alert">{error}</div> : (
          <>
            {saveError && <div className="profile-message error" role="alert">{saveError}</div>}
            <div className="profile-grid">
              <div className="profile-column">
                {profileSections.filter((section) => section.className === "personal").map((section) => {
                  const Icon = section.icon;
                  return (
                    <section className={`profile-card ${section.className}`} key={section.title}>
                      <h2><Icon size={18} aria-hidden="true" />{section.title}</h2>
                      <div className="profile-fields">
                        {section.fields.map((field) => (
                          <ProfileField
                            key={`${section.title}-${field.label}`}
                            field={field}
                            profile={profile || {}}
                            isEditing={isEditing}
                            draftProfile={draftProfile}
                            onDraftChange={(key, value) => setDraftProfile((current) => ({ ...current, [key]: value }))}
                          />
                        ))}
                      </div>
                    </section>
                  );
                })}
              </div>
              <div className="profile-column">
                {profileSections.filter((section) => section.className === "login" || section.className === "session").map((section) => {
                  const Icon = section.icon;
                  return (
                    <section className={`profile-card ${section.className}`} key={section.title}>
                      <h2><Icon size={18} aria-hidden="true" />{section.title}</h2>
                      <div className="profile-fields">
                        {section.fields.map((field) => (
                          <ProfileField
                            key={`${section.title}-${field.label}`}
                            field={field}
                            profile={profile || {}}
                            isEditing={isEditing}
                            draftProfile={draftProfile}
                            onDraftChange={(key, value) => setDraftProfile((current) => ({ ...current, [key]: value }))}
                          />
                        ))}
                      </div>
                    </section>
                  );
                })}
              </div>
              <div className="profile-column">
                {profileSections.filter((section) => section.className === "access" || section.className === "organization").map((section) => {
                  const Icon = section.icon;
                  return (
                    <section className={`profile-card ${section.className}`} key={section.title}>
                      <h2><Icon size={18} aria-hidden="true" />{section.title}</h2>
                      <div className="profile-fields">
                        {section.fields.map((field) => (
                          <ProfileField
                            key={`${section.title}-${field.label}`}
                            field={field}
                            profile={profile || {}}
                            isEditing={isEditing}
                            draftProfile={draftProfile}
                            onDraftChange={(key, value) => setDraftProfile((current) => ({ ...current, [key]: value }))}
                          />
                        ))}
                      </div>
                    </section>
                  );
                })}
              </div>
            </div>
          </>
        )}

      <style>{`
        .user-profile-page {
          --ink: #07344a;
          --muted: #66808d;
          --line: #e0e7e9;
          --teal: #008b8b;
          width: 100%;
          max-width: 1320px;
          margin: 0 auto;
          padding: 10px 12px 20px;
          color: var(--ink);
          font-family: Arial, Helvetica, sans-serif;
          box-sizing: border-box;
        }
        .user-profile-page * { box-sizing: border-box; }
        .profile-summary {
          display: flex; align-items: center; justify-content: space-between; gap: 18px;
          min-height: 64px; padding: 10px 16px; margin-bottom: 14px;
          border: 1px solid var(--line); border-radius: 11px; background: #fff;
          box-shadow: 0 2px 7px rgba(13, 48, 60, .035);
        }
        .profile-identity { display: flex; align-items: center; gap: 11px; min-width: 0; }
        .profile-avatar {
          display: grid; place-items: center; width: 42px; height: 42px; flex: 0 0 42px;
          border-radius: 50%; background: #dff1ee; color: #007e7e; font-size: 15px; font-weight: 700;
        }
        .profile-identity h1 { margin: 0 0 5px; font-size: 18px; line-height: 1.3; font-weight: 700; color: #07344a; }
        .profile-identity p { margin: 0; color: var(--muted); font-size: 12px; }
        .profile-actions { display: flex; gap: 8px; flex-shrink: 0; }
        .profile-button {
          display: inline-flex; align-items: center; justify-content: center; gap: 7px;
          min-height: 32px; padding: 6px 10px; border: 1px solid #d4e1e4; border-radius: 7px;
          background: #fff; color: #17616d; font-size: 13px; font-weight: 600; cursor: pointer;
        }
        .profile-button.edit { border-color: #c9e0e0; color: #007f83; }
        .profile-button.save { color: white; background: #008b8b; border-color: #008b8b; }
        .profile-button.cancel { color: #566b73; }
        .profile-button:disabled { opacity: .6; cursor: wait; }
        .profile-grid { display: grid; grid-template-columns: minmax(0, 1.1fr) minmax(0, 0.95fr) minmax(0, 1.1fr); gap: 12px; align-items: start; }
        .profile-column { display: flex; flex-direction: column; gap: 9px; min-width: 0; }
        /* Stack Session under Login, and Organization under Role, without large empty grid gaps. */
        .profile-card {
          min-width: 0; padding: 14px 15px 11px; background: #fff; border: 1px solid var(--line);
          border-radius: 9px; box-shadow: 0 1px 4px rgba(13, 48, 60, .03);
        }
        .profile-card h2 {
          display: flex; align-items: center; gap: 8px; margin: 0 0 8px; padding-bottom: 9px;
          border-bottom: 1px solid #edf1f2; color: #07344a; font-size: 13px; font-weight: 700; line-height: 1.35;
        }
        .profile-card h2 svg { flex: 0 0 auto; color: var(--teal); stroke-width: 1.8; }
        .profile-fields { display: flex; flex-direction: column; width: 100%; }
        .profile-row {
          display: flex; align-items: center; justify-content: space-between; gap: 7px;
          min-width: 0; min-height: 42px; padding: 9px 0; border-bottom: 1px solid #edf1f2;
        }
        .profile-row:last-child { border-bottom: 0; }
        .profile-label { flex: 1 1 45%; min-width: 0; color: #708893; font-size: 12px; line-height: 1.4; }
        .profile-value {
          flex: 0 1 55%; min-width: 0; overflow-wrap: anywhere; text-align: right;
          color: #07344a; font-size: 12px; font-weight: 700; line-height: 1.4;
        }
        .profile-value.muted { color: #708893; font-weight: 500; }
        .profile-input {
          flex: 0 1 60%; width: 60%; min-width: 0; padding: 5px 7px; border: 1px solid #b7d7d8;
          border-radius: 5px; outline: none; color: #07344a; font: inherit; font-size: 12px; text-align: right;
        }
        .profile-input:focus { border-color: var(--teal); box-shadow: 0 0 0 2px rgba(0,139,139,.1); }
        /* Grid placement is reset at smaller widths below. */
        /* Keep the avatar as a simple profile image/initials circle; no status dot or overlay. */
        .profile-avatar::before, .profile-avatar::after { content: none !important; display: none !important; }
        .profile-message { padding: 12px 14px; border: 1px solid var(--line); border-radius: 9px; background: white; color: var(--muted); }
        .profile-message.error { border-color: #f0c7c7; color: #a52e2e; }
        @media (max-width: 1050px) {
          .profile-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
          .profile-column { gap: 12px; }
          .profile-card { padding: 13px 14px 10px; }
          .profile-fields { display: flex; flex-direction: column; }
        }
        @media (max-width: 650px) {
          .user-profile-page { padding: 4px 0 18px; }
          .profile-summary { align-items: flex-start; padding: 14px; margin-bottom: 14px; }
          .profile-identity { gap: 9px; }
          .profile-avatar { width: 40px; height: 40px; flex-basis: 40px; }
          .profile-identity h1 { font-size: 16px; }
          .profile-actions { gap: 5px; }
          .profile-button { padding: 7px 9px; font-size: 12px; }
          .profile-grid { grid-template-columns: minmax(0, 1fr); gap: 9px; }
          .profile-column { gap: 12px; }
          .profile-card { padding: 12px 13px 9px; }
          .profile-fields { display: flex; flex-direction: column; }
        }
      `}</style>
    </main>
  );
}
