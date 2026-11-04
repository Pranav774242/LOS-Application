"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Layers3,
  Pencil,
  Plus,
  Search,
  Trash2,
  X,
} from "lucide-react";
import AppShell from "../../components/AppShell";
import {
  createLookupSubType,
  createLookupType,
  getLookupOptions,
  getLookupTypes,
  setLookupSubTypeActive,
  setLookupTypeActive,
} from "../../services/lookups";
import "./lookup-management.css";

const PAGE_SIZE = 10;

const emptyForm = {
  lookupId: "",
  code: "",
  name: "",
  status: "Active",
  description: "",
};

function getPageNumbers(current, total) {
  const start = Math.max(1, Math.min(current - 2, total - 4));
  return Array.from(
    { length: Math.min(5, total) },
    (_, index) => start + index,
  );
}

function StatusBadge({ status }) {
  return (
    <span className={`lookup-status ${status.toLowerCase()}`}>{status}</span>
  );
}

export default function LookupManagementPage() {
  const [lookups, setLookups] = useState([]);
  const [activeTab, setActiveTab] = useState("lookup");
  const [form, setForm] = useState(emptyForm);
  const [editing, setEditing] = useState(null);
  const [errors, setErrors] = useState({});
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [page, setPage] = useState(1);
  const [expanded, setExpanded] = useState([]);
  const [toast, setToast] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const [optionsLoading, setOptionsLoading] = useState({});
  const [optionsErrors, setOptionsErrors] = useState({});
  const loadedOptionCodes = useRef(new Set());
  const optionRequests = useRef(new Map());

  useEffect(() => {
    const controller = new AbortController();
    setIsLoading(true);
    setLoadError("");

    getLookupTypes(controller.signal)
      .then((lookupTypes) => {
        loadedOptionCodes.current.clear();
        optionRequests.current.clear();
        setOptionsLoading({});
        setOptionsErrors({});
        setLookups(lookupTypes);
        setExpanded([]);
      })
      .catch((error) => {
        if (!controller.signal.aborted) {
          setLoadError(error.message || "Unable to load lookups.");
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setIsLoading(false);
      });

    return () => controller.abort();
  }, [reloadKey]);

  useEffect(() => {
    if (!toast) return undefined;
    const timer = window.setTimeout(() => setToast(""), 3200);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const filteredLookups = useMemo(() => {
    const query = search.trim().toLowerCase();
    return lookups.filter((lookup) => {
      const matchesStatus =
        statusFilter === "All" || lookup.status === statusFilter;
      const matchesSearch =
        !query ||
        [
          lookup.code,
          lookup.name,
          lookup.description,
          ...lookup.subLookups.map((sub) => `${sub.code} ${sub.name}`),
        ]
          .join(" ")
          .toLowerCase()
          .includes(query);
      return matchesStatus && matchesSearch;
    });
  }, [lookups, search, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredLookups.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const startIndex = (currentPage - 1) * PAGE_SIZE;
  const visibleLookups = filteredLookups.slice(
    startIndex,
    startIndex + PAGE_SIZE,
  );

  function resetForm() {
    setForm(emptyForm);
    setEditing(null);
    setErrors({});
  }

  function switchTab(tab) {
    setActiveTab(tab);
    resetForm();
  }

  function startEditLookup(lookup) {
    setActiveTab("lookup");
    setEditing({ type: "lookup", id: lookup.id });
    setErrors({});
    setForm({
      lookupId: "",
      code: lookup.code,
      name: lookup.name,
      status: lookup.status,
      description: lookup.description,
    });
    document
      .getElementById("lookup-form")
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function startEditSubLookup(lookup, subLookup) {
    setActiveTab("sub");
    setEditing({ type: "sub", id: subLookup.id, parentId: lookup.id });
    setErrors({});
    setForm({
      lookupId: String(lookup.id),
      code: subLookup.code,
      name: subLookup.name,
      status: subLookup.status,
      description: subLookup.description,
    });
    document
      .getElementById("lookup-form")
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function startAddSubLookup(lookup) {
    setActiveTab("sub");
    setEditing(null);
    setErrors({});
    setForm({ ...emptyForm, lookupId: String(lookup.id) });
    document
      .getElementById("lookup-form")
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function validateForm() {
    const nextErrors = {};
    const code = form.code.trim().toUpperCase();
    if (activeTab === "sub" && !form.lookupId)
      nextErrors.lookupId = "Select a lookup.";
    if (!code) nextErrors.code = "Code is required.";
    else {
      const existingCodes = lookups.flatMap((lookup) => [
        { type: "lookup", id: lookup.id, code: lookup.code },
        ...lookup.subLookups.map((sub) => ({
          type: "sub",
          id: sub.id,
          code: sub.code,
        })),
      ]);
      const duplicate = existingCodes.some(
        (record) =>
          record.code.toLowerCase() === code.toLowerCase() &&
          !(record.type === editing?.type && record.id === editing?.id),
      );
      if (duplicate) nextErrors.code = "This code is already in use.";
    }
    if (!form.name.trim()) nextErrors.name = "Name is required.";
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (isSubmitting || !validateForm()) return;

    const values = {
      code: form.code.trim().toUpperCase(),
      name: form.name.trim(),
      status: form.status,
      description: form.description.trim(),
    };

    const nextId =
      lookups.reduce(
        (maxId, lookup) =>
          Math.max(maxId, lookup.id, ...lookup.subLookups.map((sub) => sub.id)),
        0,
      ) + 1;

    setIsSubmitting(true);
    try {
      if (activeTab === "lookup" && !editing) {
        await createLookupType({
          code: values.code,
          name: values.name,
          status: values.status.toUpperCase(),
          // isFixed: false,
          // permissions: ["VIEW", "CREATE", "EDIT", "DELETE"],
        });
        setToast("Lookup created successfully.");
        resetForm();
        setPage(1);
        try {
          const lookupTypes = await getLookupTypes();
          loadedOptionCodes.current.clear();
          setLookups(lookupTypes);
          setExpanded([]);
        } catch {
          setToast("Lookup created, but the list could not be refreshed.");
        }
        return;
      }

      if (activeTab === "sub" && !editing) {
        const parent = lookups.find(
          (lookup) => String(lookup.id) === form.lookupId,
        );
        if (!parent?.code) throw new Error("Select a valid lookup.");

        await createLookupSubType(parent.code, {
          code: values.code,
          name: values.name,
          status: values.status.toUpperCase(),
        });

        const createdSubLookup = {
          id: nextId,
          ...values,
        };
        setLookups((current) =>
          current.map((lookup) =>
            lookup.code === parent.code
              ? {
                  ...lookup,
                  subLookups: [...lookup.subLookups, createdSubLookup],
                }
              : lookup,
          ),
        );
        setExpanded((current) =>
          current.includes(parent.id) ? current : [...current, parent.id],
        );
        resetForm();
        setPage(1);

        try {
          const subLookups = await getLookupOptions(parent.code);
          loadedOptionCodes.current.add(parent.code);
          setLookups((current) =>
            current.map((lookup) =>
              lookup.code === parent.code ? { ...lookup, subLookups } : lookup,
            ),
          );
          setToast("Sub lookup created successfully.");
        } catch {
          setToast("Sub lookup created, but the list could not be refreshed.");
        }
        return;
      }

      if (activeTab === "lookup") {
        if (editing?.type === "lookup") {
          setLookups((current) =>
            current.map((lookup) =>
              lookup.id === editing.id ? { ...lookup, ...values } : lookup,
            ),
          );
          setToast("Lookup updated successfully.");
        } else {
          setLookups((current) => [
            ...current,
            { id: nextId, ...values, subLookups: [] },
          ]);
          setToast("Lookup created successfully.");
        }
      } else if (editing?.type === "sub") {
        setLookups((current) =>
          current.map((lookup) =>
            lookup.id === editing.parentId
              ? {
                  ...lookup,
                  subLookups: lookup.subLookups.map((sub) =>
                    sub.id === editing.id ? { ...sub, ...values } : sub,
                  ),
                }
              : lookup,
          ),
        );
        setToast("Sub lookup updated successfully.");
      } else {
        const parentId = Number(form.lookupId);
        setLookups((current) =>
          current.map((lookup) =>
            lookup.id === parentId
              ? {
                  ...lookup,
                  subLookups: [...lookup.subLookups, { id: nextId, ...values }],
                }
              : lookup,
          ),
        );
        setExpanded((current) =>
          current.includes(parentId) ? current : [...current, parentId],
        );
        setToast("Sub lookup created successfully.");
      }

      resetForm();
      setPage(1);
    } catch (error) {
      setToast(error.message || "Unable to create the lookup.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function toggleLookupStatus(lookup) {
    const nextStatus = lookup.status === "Active" ? "Inactive" : "Active";
    try {
      await setLookupTypeActive(lookup, nextStatus === "Active");
      setLookups((current) =>
        current.map((item) =>
          item.id === lookup.id ? { ...item, status: nextStatus } : item,
        ),
      );
      setToast(`${lookup.name} marked ${nextStatus.toLowerCase()}.`);
    } catch (error) {
      setToast(
        error.message || `Unable to ${nextStatus.toLowerCase()} lookup.`,
      );
    }
  }

  async function toggleSubStatus(parentId, subLookup) {
    const nextStatus = subLookup.status === "Active" ? "Inactive" : "Active";
    try {
      await setLookupSubTypeActive(subLookup.id, nextStatus === "Active");
      setLookups((current) =>
        current.map((lookup) =>
          lookup.id === parentId
            ? {
                ...lookup,
                subLookups: lookup.subLookups.map((sub) =>
                  sub.id === subLookup.id
                    ? { ...sub, status: nextStatus }
                    : sub,
                ),
              }
            : lookup,
        ),
      );
      setToast(`${subLookup.name} marked ${nextStatus.toLowerCase()}.`);
    } catch (error) {
      setToast(
        error.message || `Unable to ${nextStatus.toLowerCase()} sub lookup.`,
      );
    }
  }

  function deleteLookup(lookup) {
    if (
      !window.confirm(
        `Delete "${lookup.name}" and its ${lookup.subLookups.length} sub lookup(s)?`,
      )
    )
      return;
    setLookups((current) => current.filter((item) => item.id !== lookup.id));
    setExpanded((current) => current.filter((id) => id !== lookup.id));
    setToast("Lookup deleted.");
  }

  function deleteSubLookup(parent, subLookup) {
    if (!window.confirm(`Delete sub lookup "${subLookup.name}"?`)) return;
    setLookups((current) =>
      current.map((lookup) =>
        lookup.id === parent.id
          ? {
              ...lookup,
              subLookups: lookup.subLookups.filter(
                (sub) => sub.id !== subLookup.id,
              ),
            }
          : lookup,
      ),
    );
    setToast("Sub lookup deleted.");
  }

  async function toggleExpanded(lookup) {
    const isExpanded = expanded.includes(lookup.id);
    setExpanded((current) =>
      isExpanded
        ? current.filter((item) => item !== lookup.id)
        : [...current, lookup.id],
    );
    if (isExpanded) return;
    await loadLookupOptions(lookup);
  }

  async function loadLookupOptions(lookup) {
    if (loadedOptionCodes.current.has(lookup.code)) return;
    let request = optionRequests.current.get(lookup.code);
    if (!request) {
      setOptionsLoading((current) => ({ ...current, [lookup.code]: true }));
      setOptionsErrors((current) => ({ ...current, [lookup.code]: "" }));
      request = getLookupOptions(lookup.code);
      optionRequests.current.set(lookup.code, request);
    }

    try {
      const subLookups = await request;
      loadedOptionCodes.current.add(lookup.code);
      setLookups((current) =>
        current.map((item) =>
          item.code === lookup.code ? { ...item, subLookups } : item,
        ),
      );
    } catch (error) {
      setOptionsErrors((current) => ({
        ...current,
        [lookup.code]: error.message || "Unable to load sub-lookups.",
      }));
    } finally {
      optionRequests.current.delete(lookup.code);
      setOptionsLoading((current) => ({ ...current, [lookup.code]: false }));
    }
  }

  function updateField(field, value) {
    setForm((current) => ({
      ...current,
      [field]: field === "code" ? value.toUpperCase() : value,
    }));
    if (errors[field]) setErrors((current) => ({ ...current, [field]: "" }));
  }

  const isEditing = editing !== null;
  const isSubTab = activeTab === "sub";

  return (
    <AppShell>
      <main className="lookup-page">
        <header className="lookup-heading">
          <div style={{ marginTop: "-15px", marginBottom: "26px" }}>
            <h1
              style={{ margin: 0, color: "#23474C", font: "700 23px Manrope" }}
            >
              Lookup Management
            </h1>
          </div>
          <div className="lookup-summary">
            <Layers3 size={17} />
            <span>
              <strong>{lookups.length}</strong> lookups
            </span>
          </div>
        </header>

        <section className="lookup-card" id="lookup-form">
          <div className="lookup-card-heading">
            <div>
              <h2>
                {isEditing
                  ? `Edit ${isSubTab ? "sub lookup" : "lookup"}`
                  : `Create ${isSubTab ? "a sub lookup" : "a lookup"}`}
              </h2>
              <p>
                Add a lookup master or define a sub lookup under an existing
                master.
              </p>
            </div>
          </div>
          <div className="lookup-tabs" role="tablist" aria-label="Lookup type">
            <button
              type="button"
              role="tab"
              aria-selected={!isSubTab}
              className={!isSubTab ? "selected" : ""}
              onClick={() => switchTab("lookup")}
            >
              Lookup
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={isSubTab}
              className={isSubTab ? "selected" : ""}
              onClick={() => switchTab("sub")}
            >
              Sub lookup
            </button>
          </div>

          <form className="lookup-form" onSubmit={handleSubmit} noValidate>
            {isSubTab && (
              <div className="lookup-field">
                <label htmlFor="lookup-parent">
                  Select Lookup <span aria-hidden="true">*</span>
                </label>
                <select
                  id="lookup-parent"
                  value={form.lookupId}
                  onChange={(event) =>
                    updateField("lookupId", event.target.value)
                  }
                  aria-invalid={Boolean(errors.lookupId)}
                >
                  <option value="">Select a lookup</option>
                  {lookups.map((lookup) => (
                    <option key={lookup.id} value={lookup.id}>
                      {lookup.code} — {lookup.name}
                    </option>
                  ))}
                </select>
                {errors.lookupId && (
                  <span className="lookup-error">{errors.lookupId}</span>
                )}
              </div>
            )}
            <div className="lookup-field">
              <label htmlFor="lookup-code">
                {isSubTab ? "Sublookup Code" : "Lookup Code"}
                <span aria-hidden="true">*</span>
              </label>
              <input
                id="lookup-code"
                value={form.code}
                onChange={(event) => updateField("code", event.target.value)}
                placeholder="e.g. Value"
                autoComplete="off"
                readOnly={isEditing}
                aria-invalid={Boolean(errors.code)}
              />
              {errors.code && (
                <span className="lookup-error">{errors.code}</span>
              )}
              <span className="lookup-hint">
                {isEditing
                  ? "Code cannot be changed after creation."
                  : "Codes are unique and should be integers."}
              </span>
            </div>
            <div className="lookup-field">
              <label htmlFor="lookup-name">
                {isSubTab ? "Sublookup Name" : "Lookup Name"}
                <span aria-hidden="true">*</span>
              </label>
              <input
                id="lookup-name"
                value={form.name}
                onChange={(event) => updateField("name", event.target.value)}
                placeholder="Enter a display name"
                aria-invalid={Boolean(errors.name)}
              />
              {errors.name && (
                <span className="lookup-error">{errors.name}</span>
              )}
            </div>
            <div className="lookup-field">
              <label htmlFor="lookup-status">
                {isSubTab ? "Sublookup Status" : "Lookup Status"}
              </label>
              <select
                id="lookup-status"
                value={form.status}
                onChange={(event) => updateField("status", event.target.value)}
              >
                <option>Active</option>
                <option>Inactive</option>
              </select>
            </div>
            {/* <div className="lookup-field lookup-description">
              <label htmlFor="lookup-description">Description</label>
              <textarea
                id="lookup-description"
                rows="3"
                value={form.description}
                onChange={(event) =>
                  updateField("description", event.target.value)
                }
                placeholder="Add a brief description (optional)"
              />
            </div> */}
            <div className="lookup-form-actions">
              {isEditing && (
                <button
                  type="button"
                  className="lookup-button secondary"
                  onClick={resetForm}
                >
                  Cancel
                </button>
              )}
              <button
                type="submit"
                className="lookup-button primary"
                disabled={isSubmitting}
              >
                {/* <Plus size={16} /> */}
                {isSubmitting
                  ? "Creating..."
                  : isEditing
                    ? "Update"
                    : isSubTab
                      ? "Add sub lookup"
                      : "Create lookup"}
              </button>
            </div>
          </form>
        </section>

        <section className="lookup-list-section">
          <div className="lookup-list-heading">
            <div>
              <h2>Lookup list</h2>
              <p>Browse and manage lookup masters and their values.</p>
            </div>
            <span className="lookup-count">
              {isLoading
                ? "Loading"
                : `${filteredLookups.length} ${filteredLookups.length === 1 ? "record" : "records"}`}
            </span>
          </div>

          <div className="lookup-toolbar">
            <label className="lookup-search" htmlFor="lookup-search">
              <Search size={17} />
              <input
                id="lookup-search"
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  setPage(1);
                }}
                placeholder="Search code, name, or description"
              />
            </label>
            <label className="lookup-status-filter" htmlFor="lookup-filter">
              Status
              <select
                id="lookup-filter"
                value={statusFilter}
                onChange={(event) => {
                  setStatusFilter(event.target.value);
                  setPage(1);
                }}
              >
                <option>All</option>
                <option>Active</option>
                <option>Inactive</option>
              </select>
            </label>
          </div>

          <div className="lookup-table-wrap">
            <table className="lookup-table">
              <thead>
                <tr>
                  <th className="expand-column">
                    <span className="sr-only">Expand</span>
                  </th>
                  <th>Code</th>
                  <th>Name</th>
                  <th>Description</th>
                  <th>Status</th>
                  <th className="actions-column">Actions</th>
                </tr>
              </thead>
              <tbody>
                {isLoading && (
                  <tr>
                    <td className="lookup-empty" colSpan="6">
                      <strong>Loading lookup types...</strong>
                    </td>
                  </tr>
                )}
                {!isLoading && loadError && (
                  <tr>
                    <td className="lookup-empty" colSpan="6">
                      <strong>Unable to load lookups</strong>
                      <span>{loadError}</span>
                      <button
                        type="button"
                        onClick={() => setReloadKey((current) => current + 1)}
                      >
                        Retry
                      </button>
                    </td>
                  </tr>
                )}
                {!isLoading &&
                  !loadError &&
                  visibleLookups.map((lookup, index) => {
                    const isExpanded = expanded.includes(lookup.id);
                    return (
                      <LookupRow
                        key={lookup.id}
                        lookup={lookup}
                        rowNumber={startIndex + index + 1}
                        isExpanded={isExpanded}
                        onExpand={() => toggleExpanded(lookup)}
                        optionsLoading={Boolean(optionsLoading[lookup.code])}
                        optionsError={optionsErrors[lookup.code]}
                        onRetryOptions={() => void loadLookupOptions(lookup)}
                        onEdit={() => startEditLookup(lookup)}
                        onAddSub={() => startAddSubLookup(lookup)}
                        onDelete={() => deleteLookup(lookup)}
                        onToggle={() => toggleLookupStatus(lookup)}
                        onEditSub={startEditSubLookup}
                        onDeleteSub={deleteSubLookup}
                        onToggleSub={toggleSubStatus}
                      />
                    );
                  })}
                {!isLoading && !loadError && visibleLookups.length === 0 && (
                  <tr>
                    <td className="lookup-empty" colSpan="6">
                      <div className="lookup-empty-icon">
                        <Search size={20} />
                      </div>
                      <strong>
                        {lookups.length
                          ? "No matching lookups"
                          : "No lookups yet"}
                      </strong>
                      <span>
                        {lookups.length
                          ? "Try another search or status filter."
                          : "Create your first lookup using the form above."}
                      </span>
                      {lookups.length > 0 &&
                        (search || statusFilter !== "All") && (
                          <button
                            type="button"
                            onClick={() => {
                              setSearch("");
                              setStatusFilter("All");
                              setPage(1);
                            }}
                          >
                            Clear filters
                          </button>
                        )}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <footer className="lookup-pagination">
            <span>
              Showing {filteredLookups.length ? startIndex + 1 : 0}–
              {Math.min(startIndex + PAGE_SIZE, filteredLookups.length)} of{" "}
              {filteredLookups.length}
            </span>
            <div>
              <button
                type="button"
                aria-label="Previous page"
                disabled={currentPage === 1}
                onClick={() => setPage(currentPage - 1)}
              >
                <ChevronLeft size={16} />
              </button>
              {getPageNumbers(currentPage, totalPages).map((pageNumber) => (
                <button
                  type="button"
                  key={pageNumber}
                  aria-current={pageNumber === currentPage ? "page" : undefined}
                  className={pageNumber === currentPage ? "current" : ""}
                  onClick={() => setPage(pageNumber)}
                >
                  {pageNumber}
                </button>
              ))}
              <button
                type="button"
                aria-label="Next page"
                disabled={currentPage === totalPages}
                onClick={() => setPage(currentPage + 1)}
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </footer>
        </section>
      </main>
      {toast && (
        <div className="lookup-toast" role="status">
          <span>{toast}</span>
          <button
            type="button"
            aria-label="Dismiss notification"
            onClick={() => setToast("")}
          >
            <X size={16} />
          </button>
        </div>
      )}
    </AppShell>
  );
}

function LookupRow({
  lookup,
  rowNumber,
  isExpanded,
  onExpand,
  onEdit,
  onAddSub,
  onDelete,
  onToggle,
  onEditSub,
  onDeleteSub,
  onToggleSub,
  optionsLoading,
  optionsError,
  onRetryOptions,
}) {
  return (
    <>
      <tr className="lookup-row">
        <td>
          <button
            type="button"
            className="lookup-expand"
            aria-label={`${isExpanded ? "Collapse" : "Expand"} ${lookup.name}`}
            aria-expanded={isExpanded}
            onClick={onExpand}
          >
            {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
        </td>
        <td>
          <span className="lookup-code">{lookup.code}</span>
        </td>
        <td>
          <span className="lookup-name">{lookup.name}</span>
          <span className="lookup-row-number">#{rowNumber}</span>
        </td>
        <td className="lookup-description-cell">{lookup.description || "—"}</td>
        <td>
          <StatusBadge status={lookup.status} />
        </td>
        <td>
          <div className="lookup-row-actions">
            <button
              type="button"
              className={`lookup-toggle ${lookup.status === "Active" ? "on" : ""}`}
              role="switch"
              aria-checked={lookup.status === "Active"}
              aria-label={`Mark ${lookup.name} ${lookup.status === "Active" ? "inactive" : "active"}`}
              onClick={onToggle}
            >
              <span />
            </button>
            <button
              type="button"
              className="lookup-icon-action with-label"
              aria-label={`Edit ${lookup.name}`}
              onClick={onEdit}
            >
              <Pencil size={13} />
              {/* <span>Edit</span> */}
            </button>
            <button
              type="button"
              className="lookup-icon-action add with-label"
              aria-label={`Add sub lookup to ${lookup.name}`}
              onClick={onAddSub}
            >
              <Plus size={15} />
              {/* <span>Sub</span> */}
            </button>
            {/* <button
              type="button"
              className="lookup-icon-action danger with-label"
              aria-label={`Delete ${lookup.name}`}
              onClick={onDelete}
            >
              <Trash2 size={13} />
              <span>Delete</span>
            </button> */}
          </div>
        </td>
      </tr>
      {isExpanded && (
        <tr className="lookup-expanded-row">
          <td colSpan="6">
            <div className="lookup-sub-panel">
              <div className="lookup-sub-heading">
                <div>
                  <strong>Sub lookups</strong>
                </div>
                <button type="button" onClick={onAddSub}>
                  <Plus size={14} /> Add sub lookup
                </button>
              </div>
              {optionsLoading ? (
                <p className="lookup-sub-empty">Loading sub-lookups...</p>
              ) : optionsError ? (
                <p className="lookup-sub-empty" role="alert">
                  {optionsError}{" "}
                  <button type="button" onClick={onRetryOptions}>
                    Retry
                  </button>
                </p>
              ) : lookup.subLookups.length === 0 ? (
                <p className="lookup-sub-empty">
                  No sub lookups have been added to this master yet.
                </p>
              ) : (
                <div className="lookup-sub-list">
                  {lookup.subLookups.map((subLookup) => (
                    <div className="lookup-sub-row" key={subLookup.id}>
                      <span className="lookup-sub-code">{subLookup.code}</span>
                      <span className="lookup-sub-name">{subLookup.name}</span>
                      <span className="lookup-sub-description">
                        {subLookup.description || "—"}
                      </span>
                      <StatusBadge status={subLookup.status} />
                      <div className="lookup-row-actions">
                        <button
                          type="button"
                          className={`lookup-toggle small ${subLookup.status === "Active" ? "on" : ""}`}
                          role="switch"
                          aria-checked={subLookup.status === "Active"}
                          aria-label={`Mark ${subLookup.name} ${subLookup.status === "Active" ? "inactive" : "active"}`}
                          onClick={() => onToggleSub(lookup.id, subLookup)}
                        >
                          <span />
                        </button>
                        <button
                          type="button"
                          className="lookup-icon-action"
                          aria-label={`Edit ${subLookup.name}`}
                          title="Edit sub lookup"
                          onClick={() => onEditSub(lookup, subLookup)}
                        >
                          <Pencil size={14} />
                        </button>
                        {/* <button
                          type="button"
                          className="lookup-icon-action danger"
                          aria-label={`Delete ${subLookup.name}`}
                          title="Delete sub lookup"
                          onClick={() => onDeleteSub(lookup, subLookup)}
                        >
                          <Trash2 size={14} />
                        </button> */}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </td>
        </tr>
      )}
    </>
  );
}
