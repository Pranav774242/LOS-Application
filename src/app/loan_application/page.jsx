'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Banknote,
  CheckCircle2,
  FilePlus2,
  Search,
  ArrowLeft,
  Eye,
  Pencil,
  X,
  Check,
} from 'lucide-react';
import AppShell from '../../components/AppShell';
import Card from '../../components/Card';
import PageHeader from '../../components/PageHeader';
import { api } from '../../services/api';
import {
  isGoldLoanApplication,
  readSavedGoldLoanApplications,
  getApplicationId,
  getCustomerName,
  getCustomerCategory,
  getStatusLabel,
  formatAmount,
  formatApplicationDate,
  getStatusClass,
  GoldLoanApplicationView,
  LoanApplicationFormPage,
  persistGoldLoanApplication,
} from '../../components/GoldLoanApplication';
import RetailLoanApplicationForm, {
  persistRetailLoanApplication,
  readSavedRetailLoanApplications,
} from '../../components/RetailLoanApplicationForm';
import RetailLoanApplicationView from '../../components/RetailLoanApplicationView';

export default function LoanDashboardPage() {
  const router = useRouter();
  const [searchInput, setSearchInput] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [dashboardApplications, setDashboardApplications] = useState(
    () => Array.isArray(api.applications) ? api.applications : [],
  );
  const [selectedApplication, setSelectedApplication] = useState(null);
  const [applicationEdit, setApplicationEdit] = useState(null);
  const [applicationEditErrors, setApplicationEditErrors] = useState({});
  const [applicationRoute, setApplicationRoute] = useState(null);
  const [savedApplicationsLoaded, setSavedApplicationsLoaded] = useState(false);
  const [persistenceError, setPersistenceError] = useState('');
  const [applicationSaveNotice, setApplicationSaveNotice] = useState('');
  const [showRetailForm, setShowRetailForm] = useState(false);
  const applicationsAvailable = Array.isArray(api.applications);
  const applications = applicationsAvailable ? dashboardApplications : [];
  const customers = Array.isArray(api.customers) ? api.customers : [];

  useEffect(() => {
    try {
      const savedApplications = [
        ...readSavedGoldLoanApplications(),
        ...readSavedRetailLoanApplications(),
      ];
      const savedById = new Map(
        savedApplications.map((saved) => [getApplicationId(saved), saved]),
      );
      setDashboardApplications((currentApplications) => {
        const mergedApplications = currentApplications.map((application) => ({
          ...application,
          ...(savedById.get(getApplicationId(application)) || {}),
        }));
        const existingIds = new Set(mergedApplications.map(getApplicationId));
        return [
          ...mergedApplications,
          ...savedApplications.filter((saved) => !existingIds.has(getApplicationId(saved))),
        ];
      });
    } catch (error) {
      setPersistenceError(
        error instanceof Error
          ? `Saved loan applications could not be loaded: ${error.message}`
          : 'Saved loan applications could not be loaded from this browser.',
      );
    } finally {
      setSavedApplicationsLoaded(true);
    }
  }, []);

  useEffect(() => {
    const syncApplicationRoute = () => {
      const params = new URLSearchParams(window.location.search);
      const viewId = params.get('view');
      const editId = params.get('edit');
      if (viewId && !editId) {
        setApplicationRoute({ mode: 'view', id: viewId });
      } else if (editId && !viewId) {
        setApplicationRoute({ mode: 'edit', id: editId });
      } else {
        setApplicationRoute(null);
      }
    };

    syncApplicationRoute();
    window.addEventListener('popstate', syncApplicationRoute);
    return () => window.removeEventListener('popstate', syncApplicationRoute);
  }, []);

  const applicationRows = useMemo(
    () =>
      applications.map((application, index) => ({
        application,
        sourceIndex: index,
        id: getApplicationId(application),
        customerName: getCustomerName(application),
        category: getCustomerCategory(application, customers),
        loanType: application.product || application.loanType || 'Not specified',
      })),
    [applications, customers],
  );

  const applicationCounts = useMemo(
    () => ({
      total: applications.length,
      approved: applications.filter(
        (application) =>
          String(application.status || '').trim().toLowerCase() === 'approved',
      ).length,
      disbursed: applications.filter(
        (application) =>
          String(application.status || '').trim().toLowerCase() ===
          'disbursed',
      ).length,
    }),
    [applications],
  );

  const filteredRows = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();
    if (!normalizedSearch) return applicationRows;

    return applicationRows.filter(({ id, customerName, category, loanType }) =>
      [id, customerName, category, loanType].some((value) =>
        String(value).toLowerCase().includes(normalizedSearch),
      ),
    );
  }, [applicationRows, searchTerm]);

  const metrics = [
    {
      label: 'Total No. of Applications',
      value: applicationCounts.total,
      icon: FilePlus2,
      tone: 'teal',
    },
    {
      label: 'Approved Applications',
      value: applicationCounts.approved,
      icon: CheckCircle2,
      tone: 'green',
    },
    {
      label: 'Disbursed Applications',
      value: applicationCounts.disbursed,
      icon: Banknote,
      tone: 'blue',
    },
  ];

  const openApplication = (application, index, mode) => {
    const id = getApplicationId(application);
    if (id === 'Not available') {
      setPersistenceError('This loan application does not have an application ID and cannot be opened.');
      return;
    }

    setSelectedApplication(null);
    setApplicationRoute({ mode, id });
    router.push(`/loan_application?${mode}=${encodeURIComponent(id)}`);
  };

  const returnToLoanDashboard = () => {
    setApplicationRoute(null);
    router.push('/loan_application');
  };

  const saveRetailLoanApplication = (updatedApplication) => {
    persistRetailLoanApplication(updatedApplication);
    setDashboardApplications((currentApplications) => {
      const exists = currentApplications.some(
        (application) => getApplicationId(application) === getApplicationId(updatedApplication),
      );
      return exists
        ? currentApplications.map((application) => (
          getApplicationId(application) === getApplicationId(updatedApplication)
            ? { ...application, ...updatedApplication }
            : application
        ))
        : [updatedApplication, ...currentApplications];
    });
    setApplicationSaveNotice(`${getApplicationId(updatedApplication)} was saved in this browser.`);
    setPersistenceError('');
  };

  const saveGoldLoanApplication = (updatedApplication) => {
    persistGoldLoanApplication(updatedApplication);
    setDashboardApplications((currentApplications) => currentApplications.map((application) => (
      getApplicationId(application) === getApplicationId(updatedApplication)
        ? { ...application, ...updatedApplication }
        : application
    )));
    setApplicationSaveNotice(`${getApplicationId(updatedApplication)} was saved in this browser.`);
    setPersistenceError('');
  };

  const createRetailLoanApplication = (newApplication) => {
    persistRetailLoanApplication(newApplication);
    setDashboardApplications((currentApplications) => [newApplication, ...currentApplications]);
    setApplicationSaveNotice(`${getApplicationId(newApplication)} was saved in this browser.`);
    setPersistenceError('');
      };

  const saveApplicationEdit = (event) => {
    event.preventDefault();
    const errors = {};
    if (!applicationEdit.customer.trim()) errors.customer = 'Customer name is required.';
    if (!applicationEdit.product.trim()) errors.product = 'Loan type is required.';
    const amount = Number(applicationEdit.amount);
    if (!applicationEdit.amount.trim() || !Number.isFinite(amount) || amount <= 0) {
      errors.amount = 'Enter a valid loan amount greater than zero.';
    }
    if (!applicationEdit.status.trim()) errors.status = 'Application status is required.';
    setApplicationEditErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setDashboardApplications((previous) => previous.map((application, index) => (
      index === selectedApplication.index
        ? {
          ...application,
          customer: applicationEdit.customer.trim(),
          customerName: applicationEdit.customer.trim(),
          product: applicationEdit.product.trim(),
          amount: String(amount),
          status: applicationEdit.status,
        }
        : application
    )));
    setSelectedApplication(null);
  };

  if (applicationRoute) {
    const application = applications.find(
      (record) => getApplicationId(record) === applicationRoute.id,
    );

    if (!savedApplicationsLoaded) {
      return (
        <AppShell title="Loan Application">
          <Card className="gold-application-message">
            <p>Loading application details...</p>
          </Card>
        </AppShell>
      );
    }

    if (!application) {
      return (
        <AppShell title="Application Not Found">
          <PageHeader
            title="Loan Application Not Found"
            action={(
              <button
                className="icon-button loan-dashboard-back"
                type="button"
                onClick={returnToLoanDashboard}
                aria-label="Back to Loan Dashboard"
              >
                <ArrowLeft size={19} aria-hidden="true" />
              </button>
            )}
          />
          <Card className="gold-application-message">
            <p>
              The requested application could not be found.
            </p>
            <button className="loan-secondary-btn" type="button" onClick={returnToLoanDashboard}>
              <ArrowLeft size={16} aria-hidden="true" />
              Return to Loan Dashboard
            </button>
          </Card>
        </AppShell>
      );
    }

    if (applicationRoute.mode === 'view') {
      return (
        <RetailLoanApplicationView
          application={application}
          onBack={returnToLoanDashboard}
        />
      );
    }

    return (
      <RetailLoanApplicationForm
        key={applicationRoute.id}
        application={application}
        onBack={returnToLoanDashboard}
        onSave={saveRetailLoanApplication}
      />
    );
  }

  if (showRetailForm) {
    return (
      <RetailLoanApplicationForm
        onBack={() => setShowRetailForm(false)}
        onCreate={createRetailLoanApplication}
      />
    );
  }

  return (
    <AppShell title="Loan Dashboard">
      <div className="loan-dashboard">
        {persistenceError && (
          <div className="bank-master-alert" role="alert">{persistenceError}</div>
        )}
        {applicationSaveNotice && (
          <div className="bank-master-success" role="status">
            <Check size={16} aria-hidden="true" />
            <span>{applicationSaveNotice}</span>
          </div>
        )}
        <PageHeader
          // eyebrow="LOAN ORIGINATION"
          title=" Loan Dashboard "
          // description="Track loan applications, approvals, and disbursements in one place."
          action={
            <button
              className="primary-button apply-button"
              type="button"
              onClick={() => setShowRetailForm(true)}
            >
              <FilePlus2 size={16} />
              Apply for Loan
            </button>
          }
        />

        <section className="loan-metrics" aria-label="Loan application summary">
          {metrics.map(({ label, value, icon: Icon, tone }) => (
            <Card className="loan-metric-card" key={label}>
              <div className={`loan-metric-icon ${tone}`}>
                <Icon size={19} aria-hidden="true" />
              </div>
              <div>
                <p>{label}</p>
                <strong>{value}</strong>
              </div>
            </Card>
          ))}
        </section>

        <Card className="loan-table-card">
          <div className="loan-table-heading">
            <div>
              <h2>Loan Applications</h2>
              {/* <p>Review application details and current status.</p> */}
            </div>
            {/* <span className="sample-data-label">Development sample data</span> */}
          </div>

          <form
            className="loan-search-row"
            onSubmit={(event) => {
              event.preventDefault();
              setSearchTerm(searchInput);
            }}
          >
            <label className="loan-search">
              <Search size={17} aria-hidden="true" />
              <input
                type="search"
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                placeholder="Search by application ID, customer, category, or loan type"
                aria-label="Search loan applications"
              />
            </label>
            <button className="secondary-button loan-search-button" type="submit">
              <Search size={15} aria-hidden="true" />
              Search
            </button>
          </form>

          {!applicationsAvailable ? (
            <div className="loan-table-message error-message" role="alert">
              Application records are unavailable. Please try again later.
            </div>
          ) : filteredRows.length === 0 ? (
            <div className="loan-table-message">
              <FilePlus2 size={22} aria-hidden="true" />
              <strong>
                {applications.length === 0
                  ? 'No loan applications yet'
                  : 'No applications match your search'}
              </strong>
              <span>
                {applications.length === 0
                  ? 'Applications will appear here when they are available.'
                  : 'Try another application ID, customer name, category, or loan type.'}
              </span>
            </div>
          ) : (
            <div className="loan-table-scroll">
              <table className="loan-applications-table">
                <thead>
                  <tr>
                    <th scope="col">Sr. No.</th>
                    <th scope="col">Loan Application ID</th>
                    <th scope="col">Customer Name</th>
                    <th scope="col">Customer Category</th>
                    <th scope="col">Loan Type</th>
                    <th scope="col">Loan Amount</th>
                    <th scope="col">Application Date</th>
                    <th scope="col">Status</th>
                    <th scope="col">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRows.map(
                    ({ application, sourceIndex, id, customerName, category, loanType }, index) => (
                      <tr key={`${id}-${index}`}>
                        <td>{index + 1}</td>
                        <td>
                          <strong className="application-id">{id}</strong>
                        </td>
                        <td>{customerName}</td>
                        <td>{category}</td>
                        <td>{loanType}</td>
                        <td className="loan-amount">
                          {formatAmount(application.amount)}
                        </td>
                        <td>
                          {formatApplicationDate(
                            application.applicationDate ||
                              application.createdAt ||
                              application.date,
                          )}
                        </td>
                        <td>
                          <span
                            className={`loan-status ${getStatusClass(
                              application.status,
                            )}`}
                          >
                            {getStatusLabel(application.status)}
                          </span>
                        </td>
                        <td>
                          <div className="application-actions">
                            <button
                              className="application-action-button"
                              type="button"
                              onClick={() => openApplication(application, sourceIndex, 'view')}
                              aria-label={`View application ${id}`}
                              title="View application"
                            >
                              <Eye size={16} aria-hidden="true" />
                            </button>
                            <button
                              className="application-action-button"
                              type="button"
                              onClick={() => openApplication(application, sourceIndex, 'edit')}
                              aria-label={`Edit application ${id}`}
                              title="Edit application"
                            >
                              <Pencil size={15} aria-hidden="true" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ),
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* {applicationsAvailable && applications.length > 0 && (
            <p className="data-note">
              These records are existing in-project development  fixtures; no
              live loan-application API is configured.
            </p>
          )} */}
        </Card>

        {selectedApplication && (
          <div
            className="category-overlay"
            onClick={(event) => {
              if (event.target === event.currentTarget) setSelectedApplication(null);
            }}
          >
            <section
              className="category-dialog application-dialog"
              role="dialog"
              aria-modal="true"
              aria-labelledby="application-dialog-title"
            >
              <button
                className="category-close"
                type="button"
                onClick={() => setSelectedApplication(null)}
                aria-label="Close application details"
              >
                <X size={19} />
              </button>
              <div className="category-dialog-icon">
                {selectedApplication.mode === 'view'
                  ? <Eye size={20} aria-hidden="true" />
                  : <Pencil size={19} aria-hidden="true" />}
              </div>
              <h2 id="application-dialog-title">
                {selectedApplication.mode === 'view' ? 'Application Details' : 'Edit Application'}
              </h2>
              <p className="category-dialog-description">
                {selectedApplication.mode === 'view'
                  ? 'Review the selected loan application.'
                  : 'Update the displayed application record. Changes are kept in this session only.'}
              </p>

              {selectedApplication.mode === 'view' ? (
                <dl className="application-detail-list">
                  <div><dt>Application ID</dt><dd>{getApplicationId(selectedApplication.application)}</dd></div>
                  <div><dt>Customer</dt><dd>{getCustomerName(selectedApplication.application)}</dd></div>
                  <div><dt>Loan Type</dt><dd>{selectedApplication.application.product || selectedApplication.application.loanType || 'Not specified'}</dd></div>
                  <div><dt>Amount</dt><dd>{formatAmount(selectedApplication.application.amount)}</dd></div>
                  <div><dt>Status</dt><dd>{getStatusLabel(selectedApplication.application.status)}</dd></div>
                  <div><dt>Branch</dt><dd>{selectedApplication.application.branch || 'Not available'}</dd></div>
                </dl>
              ) : (
                <form className="application-edit-form" onSubmit={saveApplicationEdit} noValidate>
                  <LoanField
                    id="editApplicationCustomer"
                    label="Customer Name"
                    value={applicationEdit.customer}
                    onChange={(value) => setApplicationEdit((current) => ({ ...current, customer: value }))}
                    error={applicationEditErrors.customer}
                    maxLength={MAX_TEXT_LENGTH}
                    required
                  />
                  <LoanField
                    id="editApplicationLoanType"
                    label="Loan Type"
                    value={applicationEdit.product}
                    onChange={(value) => setApplicationEdit((current) => ({ ...current, product: value }))}
                    error={applicationEditErrors.product}
                    maxLength={MAX_TEXT_LENGTH}
                    required
                  />
                  <LoanField
                    id="editApplicationAmount"
                    label="Loan Amount (Rs.)"
                    type="number"
                    min="0.01"
                    step="any"
                    value={applicationEdit.amount}
                    onChange={(value) => setApplicationEdit((current) => ({ ...current, amount: value }))}
                    error={applicationEditErrors.amount}
                    required
                  />
                  <LoanField
                    id="editApplicationStatus"
                    label="Status"
                    value={applicationEdit.status}
                    onChange={(value) => setApplicationEdit((current) => ({ ...current, status: value }))}
                    options={['Draft', 'Pending', 'In review', 'Approved', 'Disbursed', 'Awaiting KYC', 'Returned', 'Rejected'].map((value) => ({ value, label: value }))}
                    error={applicationEditErrors.status}
                    required
                  />
                  <div className="application-dialog-actions">
                    <button className="loan-secondary-btn" type="button" onClick={() => setSelectedApplication(null)}>
                      Cancel
                    </button>
                    <button className="loan-primary-btn" type="submit">
                      Save Changes
                    </button>
                  </div>
                </form>
              )}
            </section>
          </div>
        )}

        <style jsx>{`
          .loan-dashboard {
            min-width: 0;
          }

          :global(.apply-button) {
            flex-shrink: 0;
            color: #ffffff !important;
            background: #198754 !important;
            border-color: #198754 !important;
          }

          :global(.apply-button:hover) {
            color: #ffffff !important;
            background: #146c43 !important;
            border-color: #13653f !important;
          }

          :global(.apply-button:focus-visible) {
            outline: 3px solid #19875455;
            outline-offset: 3px;
          }

          .loan-metrics {
            display: grid;
            grid-template-columns: repeat(3, minmax(0, 1fr));
            gap: 15px;
            margin-bottom: 19px;
          }

          .loan-metrics :global(.loan-metric-card) {
            min-height: 126px;
            display: flex;
            align-items: center;
            gap: 15px;
            padding: 20px;
          }

          .loan-metric-icon {
            width: 42px;
            height: 42px;
            display: grid;
            flex: 0 0 auto;
            place-items: center;
            border-radius: 9px;
          }

          .loan-metric-icon.teal {
            color: #177e7a;
            background: #e5f2f0;
          }

          .loan-metric-icon.green {
            color: #398365;
            background: #e7f3eb;
          }

          .loan-metric-icon.blue {
            color: #4e7da2;
            background: #e8f0f7;
          }

          .loan-metrics :global(.loan-metric-card p) {
            margin: 0 0 6px;
            color: #718185;
            font-size: 12px;
          }

          .loan-metrics :global(.loan-metric-card strong) {
            color: #1e3f45;
            font: 700 27px Manrope, sans-serif;
            line-height: 1.1;
          }

          :global(.loan-table-card) {
            min-width: 0;
          }

          .loan-table-heading {
            display: flex;
            align-items: flex-start;
            justify-content: space-between;
            gap: 16px;
            margin-bottom: 19px;
          }

          .loan-table-heading h2 {
            margin: 0;
            color: #23474c;
            font: 700 16px Manrope, sans-serif;
          }

          .loan-table-heading p {
            margin: 6px 0 0;
            color: #91a0a3;
            font-size: 11px;
          }

          .sample-data-label {
            flex-shrink: 0;
            padding: 6px 9px;
            border: 1px solid #e5ecec;
            border-radius: 20px;
            color: #718185;
            background: #f8fbfa;
            font-size: 10px;
            font-weight: 600;
          }

          .loan-search {
            min-height: 40px;
            display: flex;
            align-items: center;
            gap: 9px;
            margin-bottom: 17px;
            padding: 0 12px;
            border: 1px solid #dfe8e8;
            border-radius: 6px;
            color: #849497;
            background: #fff;
          }

          .loan-search-row {
            display: flex;
            align-items: stretch;
            gap: 10px;
            margin-bottom: 17px;
          }

          .loan-search-row .loan-search {
            flex: 1;
            min-width: 0;
            margin-bottom: 0;
          }

          .loan-search-button {
            flex: 0 0 auto;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            gap: 7px;
            min-height: 40px;
          }

          .loan-search:focus-within {
            border-color: #70aaa4;
            box-shadow: 0 0 0 3px #177e7a18;
          }

          .loan-search input {
            width: 100%;
            min-width: 0;
            height: 38px;
            padding: 0;
            border: 0;
            outline: 0;
            color: #33474c;
            background: transparent;
            font-size: 12px;
          }

          .loan-search input::placeholder {
            color: #9aa8aa;
          }

          .loan-table-scroll {
            overflow-x: auto;
            border: 1px solid #edf2f1;
            border-radius: 6px;
          }

          .loan-applications-table {
            width: 100%;
            min-width: 980px;
            border-collapse: collapse;
            text-align: left;
            color: #617377;
            font-size: 11px;
          }

          .loan-applications-table th {
            padding: 12px;
            border-top: 0;
            white-space: nowrap;
          }

          .loan-applications-table td {
            padding: 13px 12px;
            white-space: nowrap;
          }

          .application-id {
            color: #267a7a;
          }

          .loan-amount {
            color: #435f63;
            font-weight: 700;
          }

          .loan-status {
            display: inline-flex;
            align-items: center;
            padding: 5px 8px;
            border-radius: 20px;
            color: #617377;
            background: #eef2f2;
            font-size: 10px;
            font-weight: 700;
          }

          .loan-status.approved,
          .loan-status.disbursed {
            color: #31815e;
            background: #e7f3eb;
          }

          .loan-status.pending,
          .loan-status.awaiting-kyc,
          .loan-status.returned {
            color: #a16f35;
            background: #fbf1e2;
          }

          .loan-status.under-review {
            color: #4d7c9f;
            background: #eaf1f7;
          }

          .loan-status.rejected {
            color: #a95757;
            background: #faeaea;
          }

          .no-action {
            color: #a3afb0;
          }

          .application-actions {
            display: flex;
            align-items: center;
            gap: 6px;
          }

          .application-action-button {
            width: 30px;
            height: 30px;
            display: inline-grid;
            place-items: center;
            border: 1px solid #dfe8e8;
            border-radius: 6px;
            color: #267a7a;
            background: #fff;
          }

          .application-action-button:hover {
            border-color: #8bbab4;
            color: #165f5c;
            background: #edf6f4;
          }

          .application-dialog {
            width: min(100%, 560px);
          }

          .application-detail-list {
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 10px;
            margin: 0;
          }

          .application-detail-list > div {
            min-width: 0;
            padding: 11px;
            border: 1px solid #e5ecec;
            border-radius: 7px;
          }

          .application-detail-list dt {
            margin-bottom: 5px;
            color: #718185;
            font-size: 10px;
          }

          .application-detail-list dd {
            margin: 0;
            overflow-wrap: anywhere;
            color: #34565b;
            font-size: 12px;
            font-weight: 700;
          }

          .application-edit-form {
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 14px;
          }

          .application-dialog-actions {
            grid-column: 1 / -1;
            display: flex;
            justify-content: flex-end;
            gap: 10px;
            margin-top: 4px;
          }

          .application-actions {
            display: flex;
            align-items: center;
            gap: 6px;
          }

          .application-action-button {
            width: 30px;
            height: 30px;
            display: inline-grid;
            place-items: center;
            border: 1px solid #dfe8e8;
            border-radius: 6px;
            color: #267a7a;
            background: #fff;
          }

          .application-action-button:hover {
            border-color: #8bbab4;
            color: #165f5c;
            background: #edf6f4;
          }

          .category-overlay {
            position: fixed;
            z-index: 100;
            inset: 0;
            display: grid;
            place-items: center;
            padding: 20px;
            background: rgb(18 39 43 / 45%);
          }

          .category-dialog {
            position: relative;
            width: min(100%, 490px);
            padding: 30px;
            border: 1px solid #e5ecec;
            border-radius: 12px;
            background: #fff;
            box-shadow: 0 20px 60px rgb(23 63 73 / 20%);
          }

          .category-close {
            position: absolute;
            top: 14px;
            right: 14px;
            width: 34px;
            height: 34px;
            display: grid;
            place-items: center;
            border-radius: 6px;
            color: #718185;
          }

          .category-close:hover {
            color: #173e46;
            background: #f1f6f5;
          }

          .category-dialog-icon {
            width: 42px;
            height: 42px;
            display: grid;
            place-items: center;
            margin-bottom: 17px;
            border-radius: 9px;
            color: #177e7a;
            background: #e5f2f0;
          }

          .category-dialog h2 {
            margin: 0;
            color: #173e46;
            font: 700 20px Manrope, sans-serif;
            letter-spacing: -0.4px;
          }

          .category-dialog-description {
            margin: 8px 0 21px;
            color: #718185;
            font-size: 12px;
            line-height: 1.5;
          }

          .category-options {
            display: grid;
            gap: 10px;
          }

          .category-option {
            width: 100%;
            min-height: 76px;
            display: flex;
            align-items: center;
            gap: 13px;
            padding: 13px;
            border: 1px solid #e2eaea;
            border-radius: 8px;
            background: #fff;
            text-align: left;
            transition: border-color 0.16s ease, background-color 0.16s ease;
          }

          .category-option:hover,
          .category-option.selected {
            border-color: #8bbab4;
            background: #fbfefd;
          }

          .category-option-icon {
            width: 38px;
            height: 38px;
            display: grid;
            flex: 0 0 auto;
            place-items: center;
            border-radius: 8px;
          }

          .category-option-icon.retail {
            color: #177e7a;
            background: #e5f2f0;
          }

          .category-option-icon.corporate {
            color: #4e7da2;
            background: #e8f0f7;
          }

          .category-option-copy {
            display: grid;
            gap: 5px;
          }

          .category-option-copy strong {
            color: #34565b;
            font-size: 12px;
          }

          .category-option-copy span {
            color: #849497;
            font-size: 11px;
          }

          .category-option-arrow {
            margin-left: auto;
            color: #819396;
            font-size: 18px;
          }

          .corporate-notice {
            display: flex;
            align-items: flex-start;
            gap: 10px;
            margin-top: 14px;
            padding: 12px;
            border: 1px solid #f0dfc5;
            border-radius: 7px;
            color: #a16f35;
            background: #fffaf2;
          }

          .corporate-notice svg {
            flex: 0 0 auto;
            margin-top: 1px;
          }

          .corporate-notice div {
            display: grid;
            gap: 5px;
          }

          .corporate-notice strong {
            font-size: 11px;
          }

          .corporate-notice span {
            color: #8d795f;
            font-size: 10px;
            line-height: 1.5;
          }

          .category-back {
            margin-top: 19px;
            padding: 7px 0;
            color: #177e7a;
            font-size: 11px;
            font-weight: 700;
          }

          .category-back:hover {
            color: #0c5d5d;
            text-decoration: underline;
          }

          .apply-button:focus-visible,
          .category-option:focus-visible,
          .category-close:focus-visible,
          .category-back:focus-visible {
            outline: 3px solid #177e7a55;
            outline-offset: 2px;
          }

          @media (max-width: 900px) {
            .loan-metrics {
              gap: 11px;
            }

            .loan-metrics :global(.loan-metric-card) {
              padding: 16px;
            }

            .loan-metric-icon {
              width: 37px;
              height: 37px;
            }

            .loan-metrics :global(.loan-metric-card p) {
              font-size: 11px;
            }
          }

          @media (max-width: 640px) {
            .loan-metrics {
              grid-template-columns: 1fr;
            }

            .loan-metrics :global(.loan-metric-card) {
              min-height: 92px;
            }

            :global(.loan-table-card) {
              padding: 16px;
            }

            .loan-table-heading {
              flex-direction: column;
            }

            .category-dialog {
              padding: 24px 20px;
            }

            .application-edit-form,
            .application-detail-list {
              grid-template-columns: 1fr;
            }
          }
        `}</style>
      </div>
    </AppShell>
  );
}
