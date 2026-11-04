'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Banknote,
  CheckCircle2,
  FilePlus2,
  Search,
  ArrowLeft,
  ArrowRight,
  Check,
  Plus,
  Trash2,
  Eye,
  Pencil,
  X,
} from 'lucide-react';
import AppShell from '../../components/AppShell';
import Card from '../../components/Card';
import PageHeader from '../../components/PageHeader';
import { api } from '../../services/api';
import { getLoanProducts } from '../../services/loanProducts';

const currencyFormatter = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 2,
});
const GOLD_LOAN_STORAGE_KEY = 'los.goldLoanApplications';

function isGoldLoanApplication(application) {
  return String(application.product || application.loanType || '').trim().toLowerCase() === 'gold loan';
}

function readSavedGoldLoanApplications() {
  const savedApplications = window.localStorage.getItem(GOLD_LOAN_STORAGE_KEY);
  if (!savedApplications) return [];

  const parsedApplications = JSON.parse(savedApplications);
  if (!Array.isArray(parsedApplications)) {
    throw new Error('Saved Gold Loan applications have an invalid format.');
  }

  return parsedApplications;
}

function createApplicationForm(application) {
  const savedForm = application.goldLoanForm
    && typeof application.goldLoanForm === 'object'
    && !Array.isArray(application.goldLoanForm)
    ? application.goldLoanForm
    : {};
  const initialForm = createInitialForm();
  const borrowerName = getCustomerName(application);
  const nameParts = borrowerName === 'Not available' ? [] : borrowerName.trim().split(/\s+/);
  const savedSecurity = savedForm.security && typeof savedForm.security === 'object'
    ? savedForm.security
    : {};
  const savedCharges = savedForm.charges && typeof savedForm.charges === 'object'
    ? savedForm.charges
    : {};
  const savedBasicDetails = savedForm.basicDetails && typeof savedForm.basicDetails === 'object'
    ? savedForm.basicDetails
    : {};
  const savedDisbursement = savedForm.disbursement && typeof savedForm.disbursement === 'object'
    ? savedForm.disbursement
    : {};
  const relatedParties = Array.isArray(savedForm.relatedParties)
    ? savedForm.relatedParties.map((party, index) => ({
      ...initialForm.relatedParties[index],
      ...(party && typeof party === 'object' ? party : {}),
      id: party?.id || `party-${index + 1}`,
    }))
    : initialForm.relatedParties;
  const inventoryItems = Array.isArray(savedSecurity.inventoryItems)
    ? savedSecurity.inventoryItems.map((item, index) => ({
      ...initialForm.security.inventoryItems[index],
      ...(item && typeof item === 'object' ? item : {}),
      id: item?.id || `inventory-${index + 1}`,
    }))
    : initialForm.security.inventoryItems;

  return {
    ...initialForm,
    ...savedForm,
    customerId: savedForm.customerId || application.customerId || '',
    firstName: savedForm.firstName || nameParts[0] || '',
    lastName: savedForm.lastName || (nameParts.length > 1 ? nameParts.slice(1).join(' ') : ''),
    sanctionLimit: savedForm.sanctionLimit
      || String(application.amount || '').replace(/[^\d.]/g, ''),
    relatedParties,
    charges: { ...initialForm.charges, ...savedCharges },
    basicDetails: { ...initialForm.basicDetails, ...savedBasicDetails },
    security: {
      ...initialForm.security,
      ...savedSecurity,
      inventoryItems,
    },
    disbursement: { ...initialForm.disbursement, ...savedDisbursement },
  };
}

function getApplicationId(application) {
  return application.id || application.applicationId || 'Not available';
}

function getCustomerName(application) {
  const borrower = application.borrower || application.customerDetails || {};
  return (
    application.customer ||
    application.customerName ||
    borrower.fullName ||
    borrower.name ||
    [borrower.firstName, borrower.lastName].filter(Boolean).join(' ') ||
    'Not available'
  );
}

function getCustomerCategory(application, customers) {
  const customer = customers.find(
    (record) => record.id === application.customerId,
  );
  const category =
    application.customerCategory ||
    application.category ||
    customer?.type ||
    '';
  const normalizedCategory = String(category).trim().toLowerCase();

  if (
    ['retail', 'individual', 'person'].some((value) =>
      normalizedCategory.includes(value),
    )
  ) {
    return 'Retail';
  }

  if (
    ['corporate', 'company', 'business', 'proprietorship', 'partnership'].some(
      (value) => normalizedCategory.includes(value),
    )
  ) {
    return 'Corporate';
  }

  return 'Not specified';
}

function getStatusLabel(status) {
  const normalizedStatus = String(status || '').trim().toLowerCase();
  const knownStatuses = {
    approved: 'Approved',
    disbursed: 'Disbursed',
    rejected: 'Rejected',
    pending: 'Pending',
    draft: 'Pending',
    'in review': 'Under Review',
    'under review': 'Under Review',
    'awaiting kyc': 'Awaiting KYC',
    returned: 'Returned',
  };

  return knownStatuses[normalizedStatus] || status || 'Not available';
}

function formatAmount(amount) {
  if (typeof amount === 'number' && Number.isFinite(amount)) {
    return currencyFormatter.format(amount);
  }

  if (typeof amount !== 'string') return 'Not available';

  const numericAmount = Number(amount.replace(/[^\d.-]/g, ''));
  return Number.isFinite(numericAmount) && amount.trim()
    ? currencyFormatter.format(numericAmount)
    : 'Not available';
}

function formatApplicationDate(date) {
  if (!date) return 'Not available';

  const parsedDate = new Date(date);
  if (Number.isNaN(parsedDate.getTime())) return 'Not available';

  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(parsedDate);
}

function getStatusClass(status) {
  return getStatusLabel(status).toLowerCase().replace(/\s+/g, '-');
}

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
  const [categorySelectorOpen, setCategorySelectorOpen] = useState(false);
  const [corporateUnavailable, setCorporateUnavailable] = useState(false);
  const [showRetailForm, setShowRetailForm] = useState(false);
  const [loanTypeSelectorOpen, setLoanTypeSelectorOpen] = useState(false);
  const [selectedLoanType, setSelectedLoanType] = useState('');
  const applicationsAvailable = Array.isArray(api.applications);
  const applications = applicationsAvailable ? dashboardApplications : [];
  const customers = Array.isArray(api.customers) ? api.customers : [];

  useEffect(() => {
    try {
      const savedApplications = readSavedGoldLoanApplications();
      setDashboardApplications((currentApplications) => currentApplications.map((application) => {
        const savedApplication = savedApplications.find(
          (saved) => getApplicationId(saved) === getApplicationId(application),
        );
        return savedApplication ? { ...application, ...savedApplication } : application;
      }));
    } catch {
      setPersistenceError('Saved Gold Loan changes could not be loaded from this browser.');
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

  useEffect(() => {
    if (!categorySelectorOpen) return undefined;

    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        setCategorySelectorOpen(false);
        setLoanTypeSelectorOpen(false);
        setCorporateUnavailable(false);
      }
    };

    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [categorySelectorOpen]);

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

  const openCategorySelector = () => {
    setCorporateUnavailable(false);
    setCategorySelectorOpen(true);
  };

  const closeCategorySelector = () => {
    setCategorySelectorOpen(false);
    setCorporateUnavailable(false);
  };

  const openApplicationDialog = (application, index, mode) => {
    setSelectedApplication({ application, index, mode });
    setApplicationEdit({
      customer: getCustomerName(application) === 'Not available' ? '' : getCustomerName(application),
      product: application.product || application.loanType || '',
      amount: String(application.amount || '').replace(/[^\d.]/g, ''),
      status: application.status || '',
    });
    setApplicationEditErrors({});
  };

  const openApplication = (application, index, mode) => {
    if (!isGoldLoanApplication(application)) {
      openApplicationDialog(application, index, mode);
      return;
    }

    const id = getApplicationId(application);
    if (id === 'Not available') {
      setPersistenceError('This Gold Loan application does not have an application ID and cannot be opened.');
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

  const saveGoldLoanApplication = (updatedApplication) => {
    const savedApplications = readSavedGoldLoanApplications().filter(
      (application) => getApplicationId(application) !== getApplicationId(updatedApplication),
    );
    const nextSavedApplications = [...savedApplications, updatedApplication];
    window.localStorage.setItem(GOLD_LOAN_STORAGE_KEY, JSON.stringify(nextSavedApplications));
    setDashboardApplications((currentApplications) => currentApplications.map((application) => (
      getApplicationId(application) === getApplicationId(updatedApplication)
        ? { ...application, ...updatedApplication }
        : application
    )));
    setApplicationSaveNotice(`${getApplicationId(updatedApplication)} was saved in this browser.`);
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

    if (!application || !isGoldLoanApplication(application)) {
      return (
        <AppShell title="Application Not Found">
          <PageHeader
            title="Gold Loan Application Not Found"
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
              {application
                ? 'This application is not a Gold Loan application.'
                : 'The requested application could not be found.'}
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
        <GoldLoanApplicationView
          application={application}
          onBack={returnToLoanDashboard}
        />
      );
    }

    return (
      <LoanApplicationFormPage
        key={applicationRoute.id}
        application={application}
        onBack={returnToLoanDashboard}
        onSave={saveGoldLoanApplication}
      />
    );
  }

  if (showRetailForm) {
    return <LoanApplicationFormPage onBack={() => setShowRetailForm(false)} />;
  }

  return (
    <AppShell title="Loan Dashboard">
      <div className="loan-dashboard">
        {persistenceError && (
          <div className="bank-master-alert" role="alert">{persistenceError}</div>
        )}
        {applicationSaveNotice && (
          <div className="bank-master-alert" role="status">{applicationSaveNotice}</div>
        )}
        <PageHeader
          // eyebrow="LOAN ORIGINATION"
          title=" Loan Dashboard "
          // description="Track loan applications, approvals, and disbursements in one place."
          action={
            <button
              className="primary-button apply-button"
              type="button"
              onClick={() => {
                setSelectedLoanType('');
                setLoanTypeSelectorOpen(true);
              }}
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
            <span className="sample-data-label">Development sample data</span>
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

          {applicationsAvailable && applications.length > 0 && (
            <p className="data-note">
              These records are existing in-project development  fixtures; no
              live loan-application API is configured.
            </p>
          )}
        </Card>

        {categorySelectorOpen && (
          <div
            className="category-overlay"
            onClick={(event) => {
              if (event.target === event.currentTarget) closeCategorySelector();
            }}
          >
            <section
              className="category-dialog"
              role="dialog"
              aria-modal="true"
              aria-labelledby="category-dialog-title"
            >
              <button
                className="category-close"
                type="button"
                onClick={closeCategorySelector}
                autoFocus
                aria-label="Close customer category selection"
              >
                <X size={19} />
              </button>
              <div className="category-dialog-icon">
                <FilePlus2 size={21} aria-hidden="true" />
              </div>
              <h2 id="category-dialog-title">Select Customer Category</h2>
              <p className="category-dialog-description">
                Choose the type of customer applying for a loan.
              </p>

              <div className="category-options">
                <button
                  className="category-option"
                  type="button"
                  onClick={() => {
                    closeCategorySelector();
                    setSelectedLoanType('');
                    setLoanTypeSelectorOpen(true);
                  }}
                >
                  <span className="category-option-icon retail">
                    <UserRound size={19} aria-hidden="true" />
                  </span>
                  <span className="category-option-copy">
                    <strong>Retail</strong>
                    <span>Apply for an individual customer.</span>
                  </span>
                  <span className="category-option-arrow" aria-hidden="true">→</span>
                </button>
                <button
                  className={`category-option ${corporateUnavailable ? 'selected' : ''}`}
                  type="button"
                  onClick={() => setCorporateUnavailable(true)}
                >
                  <span className="category-option-icon corporate">
                    <Building2 size={19} aria-hidden="true" />
                  </span>
                  <span className="category-option-copy">
                    <strong>Corporate</strong>
                    <span>Apply for a business or corporate customer.</span>
                  </span>
                  <span className="category-option-arrow" aria-hidden="true">→</span>
                </button>
              </div>

              {corporateUnavailable && (
                <div className="corporate-notice" role="status">
                  <Building2 size={18} aria-hidden="true" />
                  <div>
                    <strong>
                      Corporate loan application is not yet available
                    </strong>
                    <span>
                      No dedicated Corporate loan application form is configured
                      in this project yet.
                    </span>
                  </div>
                </div>
              )}

              <button
                className="category-back"
                type="button"
                onClick={closeCategorySelector}
              >
                Return to Loan Dashboard
              </button>
            </section>
          </div>
        )}

        {loanTypeSelectorOpen && (
          <div
            className="category-overlay"
            onClick={(event) => {
              if (event.target === event.currentTarget) setLoanTypeSelectorOpen(false);
            }}
          >
            <section
              className="category-dialog"
              role="dialog"
              aria-modal="true"
              aria-labelledby="loan-type-dialog-title"
            >
              <button
                className="category-close"
                type="button"
                onClick={() => setLoanTypeSelectorOpen(false)}
                aria-label="Close loan type selection"
              >
                <X size={19} />
              </button>
              <div className="category-dialog-icon">
                <Banknote size={21} aria-hidden="true" />
              </div>
              <h2 id="loan-type-dialog-title">Select Loan Type</h2>
              <p className="category-dialog-description">
                Choose the type of retail loan you want to apply for.
              </p>
              <div className="category-options">
                {[
                  { name: 'Gold Loan', description: 'Apply for a loan against gold ornaments.' },
                  { name: 'Personal Loan', description: 'Apply for an unsecured personal loan.' },
                  { name: 'Home Loan', description: 'Apply for a home purchase or construction loan.' },
                  { name: 'Vehicle Loan', description: 'Apply for a vehicle purchase loan.' },
                ].map((loanType) => (
                  <button
                    className={`category-option ${selectedLoanType === loanType.name ? 'selected' : ''}`}
                    type="button"
                    key={loanType.name}
                    onClick={() => {
                      setSelectedLoanType(loanType.name);
                      if (loanType.name === 'Gold Loan') {
                        setLoanTypeSelectorOpen(false);
                        setShowRetailForm(true);
                      }
                    }}
                  >
                    <span className="category-option-icon retail">
                      <Banknote size={19} aria-hidden="true" />
                    </span>
                    <span className="category-option-copy">
                      <strong>{loanType.name}</strong>
                      <span>{loanType.description}</span>
                    </span>
                    <span className="category-option-arrow" aria-hidden="true">→</span>
                  </button>
                ))}
              </div>
              {selectedLoanType && selectedLoanType !== 'Gold Loan' && (
                <div className="corporate-notice" role="status">
                  <Banknote size={18} aria-hidden="true" />
                  <div>
                    <strong>{selectedLoanType} is not yet available</strong>
                    <span>The existing loan application form is currently configured for Gold Loan.</span>
                  </div>
                </div>
              )}
            </section>
          </div>
        )}

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

const steps = [
  'Borrower Details',
  'Security Details',
  'Loan Details',
  'Charges & Fees',
  'Basic Details',
  'Related Party',
  'Disbursement',
];

const borrowerNamePattern = /^[\p{L}\p{M}]+(?:[ '-][\p{L}\p{M}]+)*$/u;
const nameInputPattern = /^[\p{L}\p{M} '-]*$/u;
const codeInputPattern = /^[A-Za-z0-9_-]*$/;
const nameError = 'Use letters only. Spaces, apostrophes, and hyphens are allowed.';
const MIN_TEXT_LENGTH = 3;
const MAX_TEXT_LENGTH = 125;

const createInitialForm = () => ({
  loanAccountNumber: '',
  effectiveDate: '',
  customerId: '',
  title: '',
  firstName: '',
  middleName: '',
  lastName: '',
  accountStatus: '',
  productCode: '',
  productName: '',
  schemeCode: '',
  schemeDescription: '',
  modeOfOperation: '',
  lastTransactionDate: '',
  relatedParties: Array.from({ length: 5 }, (_, index) => ({
    id: `party-${index + 1}`,
    nameType: '',
    customerNo: '',
    salutation: '',
    firstName: '',
    middleName: '',
    lastName: '',
  })),
  sanctionLimit: '',
  interestRate: '',
  instalments: '',
  emi: '',
  expiryDate: '',
  customerSourced: '',
  interestPayment: '',
  instalmentAmount: '',
  tenureMonths: '',
  sanctionAuthority: '',
  sanctionedDate: '',
  repaymentType: '',
  repaymentStartDate: '',
  accountClosure: '',
  charges: {
    sanctionLimit: '',
    processingFees: '',
    penalInterestPercent: '',
    tenureMonths: '',
    valuationCharges: '',
  },
  basicDetails: {
    purposeLoan: '',
    sectorCode: '',
    womenSector: '',
    termCode: '',
    subSectorCode: '',
  },
  security: {
    securityId: '',
    securityType: '',
    valuerCode: '',
    valuerDescription: '',
    marginPercent: '',
    limitAvailable: '',
    inventoryItems: Array.from({ length: 5 }, (_, index) => ({
      id: `inventory-${index + 1}`,
      itemId: '',
      ornamentDescription: '',
      grossWeight: '',
      netWeight: '',
      appraisalDate: '',
      purity: '',
      rate: '',
      amount: '',
      limit: '',
    })),
  },
  disbursement: {
    accountNumber: '',
    accountType: '',
    bankName: '',
    ifscCode: '',
    mode: '',
    type: '',
    amount: '',
    mobileNumber: '',
  },
});

const isValidDate = (value) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value || '')) return false;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return date.getFullYear() === year
    && date.getMonth() === month - 1
    && date.getDate() === day;
};

function validateTextLength(key, value, label, errors, required = true) {
  const text = String(value ?? '').trim();
  if (!text) {
    if (required) errors[key] = `${label} is required.`;
    return;
  }
  if (text.length < MIN_TEXT_LENGTH || text.length > MAX_TEXT_LENGTH) {
    errors[key] = `${label} must be between ${MIN_TEXT_LENGTH} and ${MAX_TEXT_LENGTH} characters.`;
  }
}

function validateName(key, value, label, errors, required = true) {
  const text = String(value ?? '').trim();
  if (!text) {
    if (required) errors[key] = `${label} is required.`;
    return;
  }
  if (text.length < MIN_TEXT_LENGTH || text.length > MAX_TEXT_LENGTH) {
    errors[key] = `${label} must be between ${MIN_TEXT_LENGTH} and ${MAX_TEXT_LENGTH} characters.`;
    return;
  }
  if (!borrowerNamePattern.test(text)) {
    errors[key] = nameError;
  }
}

function validateDate(key, value, label, errors, required = false) {
  if (!String(value ?? '').trim()) {
    if (required) errors[key] = `${label} is required.`;
  } else if (!isValidDate(value)) {
    errors[key] = `Enter a valid ${label.toLowerCase()}.`;
  }
}

function validateNumber(key, value, label, errors, { required = false, positive = false } = {}) {
  if (!String(value ?? '').trim()) {
    if (required) errors[key] = `${label} is required.`;
    return;
  }
  const number = Number(value);
  if (!Number.isFinite(number) || number < 0 || (positive && number === 0)) {
    errors[key] = `${label} must be a ${positive ? 'positive' : 'non-negative'} number.`;
  }
}

function validateCode(key, value, label, errors, required = false) {
  const text = String(value ?? '').trim();
  if (!text) {
    if (required) errors[key] = `${label} is required.`;
    return;
  }
  if (text.length < MIN_TEXT_LENGTH || text.length > 30 || !/^[A-Za-z0-9_-]+$/.test(text)) {
    errors[key] = `${label} must be 3–30 characters and contain only letters, numbers, hyphens, or underscores.`;
  }
}

function validateIdentifier(key, value, label, errors, required = true) {
  const text = String(value ?? '').trim();
  if (!text) {
    if (required) errors[key] = `${label} is required.`;
    return;
  }
  if (text.length < MIN_TEXT_LENGTH || text.length > MAX_TEXT_LENGTH) {
    errors[key] = `${label} must be between ${MIN_TEXT_LENGTH} and ${MAX_TEXT_LENGTH} characters.`;
    return;
  }
  if (!/^[A-Za-z0-9_-]+$/.test(text)) {
    errors[key] = `${label} can contain only letters, numbers, hyphens, and underscores.`;
  }
}

function validatePercentage(key, value, label, errors, required = false) {
  validateNumber(key, value, label, errors, { required });
  if (String(value ?? '').trim()) {
    const number = Number(value);
    if (Number.isFinite(number) && (number < 0 || number > 100)) {
      errors[key] = `${label} must be between 0 and 100%.`;
    }
  }
}

function validateWholeNumber(key, value, label, errors, { required = false, min = 0, max = Number.MAX_SAFE_INTEGER } = {}) {
  if (!String(value ?? '').trim()) {
    if (required) errors[key] = `${label} is required.`;
    return;
  }
  const text = String(value).trim();
  const number = Number(text);
  if (!/^\d+$/.test(text) || !Number.isSafeInteger(number) || number < min || number > max) {
    errors[key] = `${label} must be a whole number between ${min} and ${max}.`;
  }
}

function validateSecurity(values) {
  const errors = {};
  const security = values.security;
  const key = (field) => `security.${field}`;

  validateCode(key('securityId'), security.securityId, 'Security ID', errors, true);
  validateTextLength(key('securityType'), security.securityType, 'Security type', errors);
  validateCode(key('valuerCode'), security.valuerCode, 'Valuer code', errors, true);
  validateTextLength(key('valuerDescription'), security.valuerDescription, 'Valuer description', errors);
  validatePercentage(key('marginPercent'), security.marginPercent, 'Margin', errors, true);
  validateNumber(key('limitAvailable'), security.limitAvailable, 'Limit available for sanction', errors, {
    required: true,
    positive: true,
  });

  const filledItems = security.inventoryItems
    .map((item, index) => ({ item, index }))
    .filter(({ item }) => Object.entries(item)
      .some(([field, value]) => field !== 'id' && String(value ?? '').trim()));

  if (filledItems.length === 0) {
    errors['security.inventoryItems'] = 'Enter at least one gold item.';
  }

  filledItems.forEach(({ item, index }) => {
    const prefix = `security.inventoryItems.${index}.`;
    validateIdentifier(`${prefix}itemId`, item.itemId, 'Inventory item ID', errors);
    validateTextLength(`${prefix}ornamentDescription`, item.ornamentDescription, 'Ornament description', errors);
    validateNumber(`${prefix}grossWeight`, item.grossWeight, 'Gross weight', errors, { required: true, positive: true });
    validateNumber(`${prefix}netWeight`, item.netWeight, 'Net weight', errors, { required: true, positive: true });
    validateDate(`${prefix}appraisalDate`, item.appraisalDate, 'Appraisal date', errors, true);
    if (!['18K', '22K', '24K'].includes(item.purity)) {
      errors[`${prefix}purity`] = 'Select 18K, 22K, or 24K purity.';
    }
    validateNumber(`${prefix}rate`, item.rate, 'Rate', errors, { required: true, positive: true });
    validateNumber(`${prefix}amount`, item.amount, 'Amount', errors, { required: true, positive: true });
    validateNumber(`${prefix}limit`, item.limit, 'Item limit', errors, { required: true, positive: true });
    if (
      String(item.grossWeight ?? '').trim()
      && String(item.netWeight ?? '').trim()
      && Number(item.netWeight) > Number(item.grossWeight)
    ) {
      errors[`${prefix}netWeight`] = 'Net weight cannot exceed gross weight.';
    }
    if (
      String(item.amount ?? '').trim()
      && String(item.limit ?? '').trim()
      && Number(item.limit) > Number(item.amount)
    ) {
      errors[`${prefix}limit`] = 'Item limit cannot exceed the assessed amount.';
    }
  });

  return errors;
}

function validateStep(stepIndex, values) {
  const errors = {};

  if (stepIndex === 0) {
    validateIdentifier('loanAccountNumber', values.loanAccountNumber, 'Loan account number', errors);
    validateDate('effectiveDate', values.effectiveDate, 'Effective date', errors, true);
    validateIdentifier('customerId', values.customerId, 'Customer ID', errors);
    if (!String(values.title ?? '').trim()) errors.title = 'Title is required.';
    validateName('firstName', values.firstName, 'First name', errors);
    validateName('middleName', values.middleName, 'Middle name', errors, false);
    validateName('lastName', values.lastName, 'Last name', errors);
    validateIdentifier('productCode', values.productCode, 'Product code', errors);
    validateTextLength('productName', values.productName, 'Product description', errors);
    validateCode('schemeCode', values.schemeCode, 'Scheme code', errors, true);
    validateTextLength('schemeDescription', values.schemeDescription, 'Scheme description', errors);
    validateDate('lastTransactionDate', values.lastTransactionDate, 'Last transaction date', errors);
    if (values.lastTransactionDate && isValidDate(values.effectiveDate)
      && isValidDate(values.lastTransactionDate) && values.lastTransactionDate < values.effectiveDate) {
      errors.lastTransactionDate = 'Last transaction date cannot precede the effective date.';
    }
    if (!String(values.accountStatus ?? '').trim()) errors.accountStatus = 'Account status is required.';
    if (!String(values.modeOfOperation ?? '').trim()) {
      errors.modeOfOperation = 'Mode of operation is required.';
    }
  }

  if (stepIndex === 1) {
    Object.assign(errors, validateSecurity(values));
  }

  if (stepIndex === 2) {
    validateNumber('sanctionLimit', values.sanctionLimit, 'Sanction limit', errors, { required: true, positive: true });
    validatePercentage('interestRate', values.interestRate, 'Interest rate', errors, true);
    validateWholeNumber('instalments', values.instalments, 'Number of instalments', errors, { required: true, min: 1, max: 600 });
    if (!String(values.emi ?? '').trim()) errors.emi = 'Select Yes or No for EMI.';
    validateDate('sanctionedDate', values.sanctionedDate, 'Sanctioned date', errors, true);
    if (isValidDate(values.effectiveDate) && isValidDate(values.sanctionedDate)
      && values.sanctionedDate < values.effectiveDate) {
      errors.sanctionedDate = 'Sanctioned date cannot precede the effective date.';
    }
    validateWholeNumber('tenureMonths', values.tenureMonths, 'Tenure', errors, { required: true, min: 1, max: 600 });
    validateName('sanctionAuthority', values.sanctionAuthority, 'Sanction authority', errors);
    validateNumber('instalmentAmount', values.instalmentAmount, 'Instalment amount', errors, { required: true, positive: true });
    validateDate('expiryDate', values.expiryDate, 'Expiry date', errors, true);
    validateDate('repaymentStartDate', values.repaymentStartDate, 'Repayment start date', errors, true);
    if (!['Walkin', 'Lead by staff', 'Referred by Customer'].includes(values.customerSourced)) {
      errors.customerSourced = 'Select how the customer was sourced.';
    }
    if (!['Maturity', 'Monthly', 'Quarterly', 'Half Yearly'].includes(values.interestPayment)) {
      errors.interestPayment = 'Select an interest payment frequency.';
    }
    if (!['EMI', 'Bullet', 'Partial'].includes(values.repaymentType)) {
      errors.repaymentType = 'Select a repayment type.';
    }
    if (!['Yes', 'No'].includes(values.accountClosure)) {
      errors.accountClosure = 'Select Yes or No for account closure.';
    }
    if (isValidDate(values.sanctionedDate) && isValidDate(values.expiryDate)
      && values.expiryDate <= values.sanctionedDate) {
      errors.expiryDate = 'Expiry date must be after the sanctioned date.';
    }
    if (isValidDate(values.sanctionedDate) && isValidDate(values.repaymentStartDate)
      && values.repaymentStartDate < values.sanctionedDate) {
      errors.repaymentStartDate = 'Repayment start date cannot precede the sanctioned date.';
    }
    if (isValidDate(values.expiryDate) && isValidDate(values.repaymentStartDate)
      && values.repaymentStartDate > values.expiryDate) {
      errors.repaymentStartDate = 'Repayment start date cannot be after the expiry date.';
    }
  }

  if (stepIndex === 3) {
    const charges = values.charges;
    validateNumber('charges.sanctionLimit', charges.sanctionLimit, 'Sanction limit', errors, { required: true, positive: true });
    validateNumber('charges.processingFees', charges.processingFees, 'Processing fees', errors, { required: true });
    validatePercentage('charges.penalInterestPercent', charges.penalInterestPercent, 'Penal interest', errors, true);
    validateWholeNumber('charges.tenureMonths', charges.tenureMonths, 'Tenure', errors, { required: true, min: 1, max: 600 });
    validateNumber('charges.valuationCharges', charges.valuationCharges, 'Valuation charges', errors, { required: true });
  }

  if (stepIndex === 4) {
    const basic = values.basicDetails;
    for (const field of ['purposeLoan', 'sectorCode', 'termCode', 'subSectorCode']) {
      validateCode(`basicDetails.${field}`, basic[field], field.replace(/([A-Z])/g, ' $1').toLowerCase(), errors, true);
    }
    if (!['Yes', 'No'].includes(basic.womenSector)) {
      errors['basicDetails.womenSector'] = 'Select Yes or No for women sector.';
    }
  }

  if (stepIndex === 5) {
    values.relatedParties.forEach((party) => {
      const hasPartyData = Object.entries(party)
        .some(([field, value]) => field !== 'id' && String(value ?? '').trim());
      if (!hasPartyData) return;
      const prefix = `relatedParties.${party.id}.`;
      if (!String(party.nameType ?? '').trim()) errors[`${prefix}nameType`] = 'Name type is required.';
      validateIdentifier(`${prefix}customerNo`, party.customerNo, 'Customer number', errors);
      if (!String(party.salutation ?? '').trim()) errors[`${prefix}salutation`] = 'Salutation is required.';
      validateName(`${prefix}firstName`, party.firstName, 'First name', errors);
      validateName(`${prefix}middleName`, party.middleName, 'Middle name', errors, false);
      validateName(`${prefix}lastName`, party.lastName, 'Last name', errors);
    });
  }

  if (stepIndex === 6) {
    const disbursement = values.disbursement;
    validateIdentifier('disbursement.accountNumber', disbursement.accountNumber, 'Account number', errors);
    validateTextLength('disbursement.accountType', disbursement.accountType, 'Type of account', errors);
    validateTextLength('disbursement.bankName', disbursement.bankName, 'Bank name', errors);
    if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(String(disbursement.ifscCode ?? '').trim().toUpperCase())) {
      errors['disbursement.ifscCode'] = 'Enter a valid 11-character IFSC code.';
    }
    if (!['Internal Transfer', 'NEFT', 'RTGS', 'IMPS', 'Pay Check'].includes(disbursement.mode)) {
      errors['disbursement.mode'] = 'Select a mode of disbursement.';
    }
    if (!['Full', 'Partial'].includes(disbursement.type)) {
      errors['disbursement.type'] = 'Select Full or Partial disbursement.';
    }
    validateNumber('disbursement.amount', disbursement.amount, 'Disbursement amount', errors, { required: true, positive: true });
    if (!/^[6-9]\d{9}$/.test(String(disbursement.mobileNumber ?? '').trim())) {
      errors['disbursement.mobileNumber'] = 'Enter a valid 10-digit Indian mobile number.';
    }
    if (String(disbursement.amount ?? '').trim() && String(values.sanctionLimit ?? '').trim()
      && Number(disbursement.amount) > Number(values.sanctionLimit)) {
      errors['disbursement.amount'] = 'Disbursement amount cannot exceed the sanction limit.';
    }
    if (
      disbursement.type === 'Full'
      && String(disbursement.amount ?? '').trim()
      && String(values.sanctionLimit ?? '').trim()
      && Number(disbursement.amount) !== Number(values.sanctionLimit)
    ) {
      errors['disbursement.amount'] = 'Full disbursement amount must equal the sanction limit.';
    }
  }

  return errors;
}

function LoanField({
  id,
  label,
  value,
  onChange,
  error,
  type = 'text',
  required = false,
  options,
  placeholder,
  list,
  min,
  max,
  maxLength,
  step,
  readOnly = false,
  strictName = false,
  onInvalidNameInput,
  strictCode = false,
  onInvalidCodeInput,
}) {
  const handleChange = (event) => {
    const nextValue = event.target.value;
    if (strictName && !nameInputPattern.test(nextValue)) {
      onInvalidNameInput?.();
      return;
    }
    if (strictCode && (!codeInputPattern.test(nextValue) || (maxLength && nextValue.length > maxLength))) {
      onInvalidCodeInput?.();
      return;
    }
    if (maxLength && nextValue.length > maxLength) return;
    onChange(nextValue);
  };

  const handleBeforeInput = (event) => {
    if (
      (!strictName && !strictCode)
      || !event.nativeEvent.inputType?.startsWith('insert')
    ) return;
    const inserted = event.nativeEvent.data;
    if (inserted == null) return;
    const input = event.currentTarget;
    const nextValue = value.slice(0, input.selectionStart)
      + inserted
      + value.slice(input.selectionEnd);
    if (
      strictName
      && (!nameInputPattern.test(nextValue) || nextValue.length > MAX_TEXT_LENGTH)
    ) {
      event.preventDefault();
      onInvalidNameInput?.();
    }
    if (strictCode && (!codeInputPattern.test(nextValue) || (maxLength && nextValue.length > maxLength))) {
      event.preventDefault();
      onInvalidCodeInput?.();
    }
  };

  const handlePaste = (event) => {
    const pasted = event.clipboardData.getData('text');
    const input = event.currentTarget;
    const nextValue = value.slice(0, input.selectionStart)
      + pasted
      + value.slice(input.selectionEnd);
    if (
      strictName
      && (!nameInputPattern.test(nextValue) || nextValue.length > MAX_TEXT_LENGTH)
    ) {
      event.preventDefault();
      onInvalidNameInput?.();
    }
    if (strictCode && (!codeInputPattern.test(nextValue) || (maxLength && nextValue.length > maxLength))) {
      event.preventDefault();
      onInvalidCodeInput?.();
    }
  };

  return (
    <label className="loan-field" htmlFor={id}>
      <span>{label}{required ? ' *' : ''}</span>
      {options ? (
        <select
          id={id}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${id}-error` : undefined}
          required={required}
        >
          <option value="">{placeholder || `Select ${label.toLowerCase()}`}</option>
          {options.map((option) => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </select>
      ) : (
        <input
          id={id}
          type={type}
          value={value}
          onChange={handleChange}
          onBeforeInput={handleBeforeInput}
          onPaste={handlePaste}
          placeholder={placeholder}
          list={list}
          min={min}
          max={max}
          maxLength={maxLength}
          step={step}
          readOnly={readOnly}
          inputMode={type === 'number' ? 'decimal' : undefined}
          onKeyDown={type === 'number' ? (event) => {
            if (['e', 'E', '+', '-'].includes(event.key)) event.preventDefault();
          } : undefined}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${id}-error` : undefined}
          required={required}
        />
      )}
      {error && <span className="field-error" id={`${id}-error`} role="alert">{error}</span>}
    </label>
  );
}

const titles = ['Mr', 'Ms', 'Mrs', 'Dr', 'Other'].map((value) => ({ value, label: value }));
const nameTypes = ['Co-applicant', 'Guarantor', 'Reference', 'Other'].map((value) => ({ value, label: value }));
const modesOfOperation = [
  'Single',
  'Joint',
  'Either or Survivor',
  'Anyone or Survivor',
  'Former or Survivor',
  'Other',
].map((value) => ({ value, label: value }));
const yesNoOptions = ['Yes', 'No'].map((value) => ({ value, label: value }));

const goldLoanDetailLabels = {
  loanAccountNumber: 'Loan Account Number',
  effectiveDate: 'Effective Date',
  accountStatus: 'Account Status',
  lastTransactionDate: 'Last Transaction Date',
  customerId: 'Customer ID',
  title: 'Title',
  firstName: 'First Name',
  middleName: 'Middle Name',
  lastName: 'Last Name',
  productCode: 'Product Code',
  productName: 'Product Description',
  schemeCode: 'Scheme Code',
  schemeDescription: 'Scheme Description',
  modeOfOperation: 'Mode of Operation',
  sanctionLimit: 'Sanction Limit',
  tenureMonths: 'Tenure',
  interestRate: 'Interest Rate',
  sanctionAuthority: 'Sanction Authority',
  instalments: 'Number of Instalments',
  sanctionedDate: 'Sanctioned Date',
  emi: 'EMI',
  instalmentAmount: 'Instalment Amount',
  expiryDate: 'Expiry Date',
  repaymentType: 'Repayment Type',
  customerSourced: 'Customer Sourced',
  repaymentStartDate: 'Repayment Start Date',
  interestPayment: 'Interest Payment',
  accountClosure: 'Account Closure',
  securityId: 'Security ID',
  securityType: 'Security Type',
  valuerCode: 'Valuer Code',
  valuerDescription: 'Valuer Description',
  marginPercent: 'Margin',
  limitAvailable: 'Limit Available for Sanction',
  itemId: 'Inventory Item ID',
  ornamentDescription: 'Ornament Description',
  grossWeight: 'Gross Weight',
  netWeight: 'Net Weight',
  appraisalDate: 'Appraisal Date',
  purity: 'Assessed Purity',
  rate: 'Rate',
  amount: 'Amount',
  limit: 'Item Limit',
  processingFees: 'Processing Fees',
  penalInterestPercent: 'Penal Interest',
  valuationCharges: 'Valuation Charges',
  purposeLoan: 'Purpose of Loan',
  sectorCode: 'Sector Code',
  womenSector: 'Women Sector',
  termCode: 'Term Code',
  subSectorCode: 'Sub-Sector Code',
  accountNumber: 'Account Number',
  accountType: 'Type of Account',
  bankName: 'Bank Name',
  ifscCode: 'IFSC Code',
  mode: 'Mode of Disbursement',
  type: 'Disbursement Type',
  mobileNumber: 'Mobile Number',
};

function hasDetailValue(value) {
  if (typeof value === 'string') return value.trim() !== '';
  if (typeof value === 'number') return Number.isFinite(value);
  return typeof value === 'boolean';
}

function formatGoldLoanDetail(field, value) {
  if (field.toLowerCase().includes('date')) return formatApplicationDate(value);
  if (
    ['sanctionLimit', 'instalmentAmount', 'limitAvailable', 'processingFees', 'valuationCharges', 'rate', 'amount', 'limit']
      .includes(field)
  ) {
    return formatAmount(value);
  }
  if (['interestRate', 'marginPercent', 'penalInterestPercent'].includes(field)) {
    return `${value}%`;
  }
  if (['grossWeight', 'netWeight'].includes(field)) return `${value} g`;
  if (field === 'tenureMonths') return `${value} months`;
  return String(value);
}

function getGoldLoanDetailEntries(values, fields) {
  return fields
    .filter(([field]) => hasDetailValue(values[field]))
    .map(([field, label]) => ({
      label: label || goldLoanDetailLabels[field] || field,
      value: formatGoldLoanDetail(field, values[field]),
    }));
}

function GoldLoanDetailSection({ title, entries, children }) {
  if (!entries.length && !children) return null;

  return (
    <section className="gold-view-section">
      <h2>{title}</h2>
      {entries.length > 0 && (
        <dl className="gold-view-detail-grid">
          {entries.map(({ label, value }) => (
            <div key={label}>
              <dt>{label}</dt>
              <dd>{value}</dd>
            </div>
          ))}
        </dl>
      )}
      {children}
    </section>
  );
}

function GoldLoanApplicationView({ application, onBack }) {
  const [activeTab, setActiveTab] = useState('overview');
  const form = createApplicationForm(application);
  const applicationId = getApplicationId(application);
  const customerName = getCustomerName(application) === 'Not available'
    ? [form.firstName, form.middleName, form.lastName].filter(Boolean).join(' ')
    : getCustomerName(application);
  const loanType = application.product || application.loanType || 'Gold Loan';
  const loanAmount = formatAmount(application.amount || form.sanctionLimit);
  const populatedParties = form.relatedParties.filter((party) => (
    Object.entries(party).some(([field, value]) => field !== 'id' && hasDetailValue(value))
  ));
  const populatedInventory = form.security.inventoryItems.filter((item) => (
    Object.entries(item).some(([field, value]) => field !== 'id' && hasDetailValue(value))
  ));
  const applicationInfo = getGoldLoanDetailEntries({
    loanAccountNumber: form.loanAccountNumber,
    effectiveDate: form.effectiveDate,
    accountStatus: form.accountStatus,
    lastTransactionDate: form.lastTransactionDate,
  }, [
    ['loanAccountNumber'],
    ['effectiveDate'],
    ['accountStatus'],
    ['lastTransactionDate'],
  ]);
  const overviewDetails = [
    { label: 'Application ID', value: applicationId },
    { label: 'Customer', value: customerName },
    ...getGoldLoanDetailEntries(form, [['customerId']]),
    { label: 'Loan Amount', value: loanAmount },
    { label: 'Loan Type', value: loanType },
    ...applicationInfo.slice(0, 1),
    ...(hasDetailValue(application.branch) ? [{ label: 'Branch', value: application.branch }] : []),
    ...(hasDetailValue(application.status)
      ? [{ label: 'Current Status', value: getStatusLabel(application.status) }]
      : []),
    ...getGoldLoanDetailEntries(form, [
      ['productName'],
      ['schemeCode'],
      ['interestRate'],
      ['tenureMonths'],
    ]),
  ];
  const applicationInformation = [
    ...applicationInfo,
    ...(hasDetailValue(application.applicationDate || application.createdAt || application.date)
      ? [{
        label: 'Application Date',
        value: formatApplicationDate(application.applicationDate || application.createdAt || application.date),
      }]
      : []),
    ...(hasDetailValue(application.updated)
      ? [{ label: 'Last Updated', value: application.updated }]
      : []),
    ...(hasDetailValue(application.branch) ? [{ label: 'Branch', value: application.branch }] : []),
    ...(hasDetailValue(application.status)
      ? [{ label: 'Application Status', value: getStatusLabel(application.status) }]
      : []),
  ];
  const borrowerDetails = getGoldLoanDetailEntries(form, [
    ['customerId'],
    ['title'],
    ['firstName'],
    ['middleName'],
    ['lastName'],
  ]);
  const productDetails = getGoldLoanDetailEntries(form, [
    ['productCode'],
    ['productName'],
    ['schemeCode'],
    ['schemeDescription'],
    ['modeOfOperation'],
  ]);
  const securityDetails = getGoldLoanDetailEntries(form.security, [
    ['securityId'],
    ['securityType'],
    ['valuerCode'],
    ['valuerDescription'],
    ['marginPercent'],
    ['limitAvailable'],
  ]);
  const financialDetails = getGoldLoanDetailEntries(form, [
    ['sanctionLimit'],
    ['tenureMonths'],
    ['interestRate'],
    ['sanctionAuthority'],
    ['instalments'],
    ['sanctionedDate'],
    ['emi'],
    ['instalmentAmount'],
    ['expiryDate'],
    ['repaymentType'],
    ['customerSourced'],
    ['repaymentStartDate'],
    ['interestPayment'],
    ['accountClosure'],
  ]);
  const chargeDetails = getGoldLoanDetailEntries(form.charges, [
    ['sanctionLimit'],
    ['tenureMonths', 'Tenure'],
    ['processingFees'],
    ['valuationCharges'],
    ['penalInterestPercent'],
  ]);
  const basicDetails = getGoldLoanDetailEntries(form.basicDetails, [
    ['purposeLoan'],
    ['sectorCode'],
    ['womenSector'],
    ['termCode'],
    ['subSectorCode'],
  ]);
  const bankDetails = getGoldLoanDetailEntries(form.disbursement, [
    ['accountNumber'],
    ['accountType'],
    ['bankName'],
    ['ifscCode'],
    ['mode'],
    ['type'],
    ['amount', 'Disbursement Amount'],
    ['mobileNumber'],
  ]);
  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'borrower', label: 'Borrower Details' },
    { id: 'security', label: 'Security Details' },
    { id: 'loan', label: 'Loan Details' },
    { id: 'charges', label: 'Charges & Fees' },
    { id: 'basic', label: 'Basic Details' },
    { id: 'related', label: 'Related Party' },
    { id: 'disbursement', label: 'Disbursement' },
  ];
  useEffect(() => {
    setActiveTab('overview');
  }, [applicationId]);

  const handleTabKeyDown = (event) => {
    const currentIndex = tabs.findIndex((tab) => tab.id === activeTab);
    let targetIndex = currentIndex;
    if (event.key === 'ArrowRight') targetIndex = (currentIndex + 1) % tabs.length;
    else if (event.key === 'ArrowLeft') targetIndex = (currentIndex - 1 + tabs.length) % tabs.length;
    else if (event.key === 'Home') targetIndex = 0;
    else if (event.key === 'End') targetIndex = tabs.length - 1;
    else return;

    event.preventDefault();
    setActiveTab(tabs[targetIndex].id);
    event.currentTarget.parentElement
      ?.querySelectorAll('[role="tab"]')
      [targetIndex]?.focus();
  };

  return (
    <AppShell title={`View: ${getApplicationId(application)}`}>
      <div className="gold-view-page">
        <PageHeader
          title="View Gold Loan Application"
          description={`Application ID: ${getApplicationId(application)}`}
          action={(
            <button
              className="icon-button loan-dashboard-back"
              type="button"
              onClick={onBack}
              aria-label="Back to Loan Dashboard"
              title="Back to Loan Dashboard"
            >
              <ArrowLeft size={19} aria-hidden="true" />
            </button>
          )}
        />
        <Card className="gold-view-card">
          <div className="gold-view-summary" aria-label="Application summary">
            <div className="gold-view-summary-item gold-view-summary-customer">
              <span>Customer</span><strong>{customerName || 'Not provided'}</strong>
            </div>
            <div className="gold-view-summary-item gold-view-summary-amount">
              <span>Loan Amount</span><strong>{loanAmount}</strong>
            </div>
            <div className="gold-view-summary-item">
              <span>Loan Type</span><strong>{loanType}</strong>
            </div>
            <div className="gold-view-summary-item">
              <span>Branch</span><strong>{application.branch || 'Not provided'}</strong>
            </div>
            <div className="gold-view-summary-item">
              <span>Status</span>
              <strong>
                <span className={`gold-view-status ${getStatusClass(application.status)}`}>
                  {getStatusLabel(application.status)}
                </span>
              </strong>
            </div>
            <div className="gold-view-summary-item">
              <span>Loan Account</span>
              <strong>{form.loanAccountNumber || 'Not provided'}</strong>
            </div>
          </div>

          <nav className="gold-view-tabs" role="tablist" aria-label="Application details sections">
            {tabs.map((tab) => (
              <button
                className={`gold-view-tab ${activeTab === tab.id ? 'active' : ''}`}
                id={`gold-view-tab-${tab.id}`}
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={activeTab === tab.id}
                aria-controls="gold-view-tabpanel"
                tabIndex={activeTab === tab.id ? 0 : -1}
                onClick={() => setActiveTab(tab.id)}
                onKeyDown={handleTabKeyDown}
              >
                {tab.label}
              </button>
            ))}
          </nav>

          <div
            className="gold-view-tabpanel"
            id="gold-view-tabpanel"
            role="tabpanel"
            aria-labelledby={`gold-view-tab-${activeTab}`}
            tabIndex={0}
          >
            {activeTab === 'overview' && (
              <GoldLoanDetailSection title="Application Overview" entries={overviewDetails}>
                <div className="gold-view-overview-caption">
                  Select a section above to review the complete application details.
                </div>
              </GoldLoanDetailSection>
            )}
            {activeTab === 'borrower' && (
              <>
                <GoldLoanDetailSection title="Application Information" entries={applicationInformation} />
                <GoldLoanDetailSection title="Borrower Details" entries={borrowerDetails} />
              </>
            )}
            {activeTab === 'security' && (
              <GoldLoanDetailSection title="Security Details" entries={securityDetails}>
                {populatedInventory.length > 0 && (
                  <div className="gold-view-table-wrap">
                    <table className="gold-view-table">
                      <thead>
                        <tr>
                          <th scope="col">Item ID</th>
                          <th scope="col">Ornament</th>
                          <th scope="col">Gross Weight</th>
                          <th scope="col">Net Weight</th>
                          <th scope="col">Appraisal Date</th>
                          <th scope="col">Purity</th>
                          <th scope="col">Rate</th>
                          <th scope="col">Appraised Value</th>
                          <th scope="col">Eligible Value</th>
                        </tr>
                      </thead>
                      <tbody>
                        {populatedInventory.map((item, index) => (
                          <tr key={item.id || `inventory-${index}`}>
                            <td>{item.itemId || '—'}</td>
                            <td>{item.ornamentDescription || '—'}</td>
                            <td>{hasDetailValue(item.grossWeight) ? `${item.grossWeight} g` : '—'}</td>
                            <td>{hasDetailValue(item.netWeight) ? `${item.netWeight} g` : '—'}</td>
                            <td>{hasDetailValue(item.appraisalDate) ? formatApplicationDate(item.appraisalDate) : '—'}</td>
                            <td>{item.purity || '—'}</td>
                            <td>{hasDetailValue(item.rate) ? formatAmount(item.rate) : '—'}</td>
                            <td>{hasDetailValue(item.amount) ? formatAmount(item.amount) : '—'}</td>
                            <td>{hasDetailValue(item.limit) ? formatAmount(item.limit) : '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </GoldLoanDetailSection>
            )}
            {activeTab === 'loan' && (
              <>
                <GoldLoanDetailSection title="Product and Scheme Details" entries={productDetails} />
                <GoldLoanDetailSection title="Loan and Repayment Details" entries={financialDetails} />
              </>
            )}
            {activeTab === 'charges' && (
              <GoldLoanDetailSection title="Charges and Fees" entries={chargeDetails} />
            )}
            {activeTab === 'basic' && (
              <GoldLoanDetailSection title="Basic Details" entries={basicDetails} />
            )}
            {activeTab === 'related' && (
              <GoldLoanDetailSection title="Related Parties" entries={[]}>
                {populatedParties.length > 0 && (
                  <div className="gold-view-table-wrap">
                    <table className="gold-view-table">
                      <thead>
                        <tr>
                          <th scope="col">Party Type</th>
                          <th scope="col">Customer Number</th>
                          <th scope="col">Title</th>
                          <th scope="col">First Name</th>
                          <th scope="col">Middle Name</th>
                          <th scope="col">Last Name</th>
                        </tr>
                      </thead>
                      <tbody>
                        {populatedParties.map((party, index) => (
                          <tr key={party.id || `party-${index}`}>
                            <td>{party.nameType || '—'}</td>
                            <td>{party.customerNo || '—'}</td>
                            <td>{party.salutation || '—'}</td>
                            <td>{party.firstName || '—'}</td>
                            <td>{party.middleName || '—'}</td>
                            <td>{party.lastName || '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </GoldLoanDetailSection>
            )}
            {activeTab === 'disbursement' && (
              <GoldLoanDetailSection title="Disbursement and Bank Details" entries={bankDetails} />
            )}
          </div>
          {!application.goldLoanForm && (
            <p className="gold-view-readonly-note">
              This development record contains dashboard details only; no additional Gold Loan form data is saved yet.
            </p>
          )}
          <p className="gold-view-readonly-note">This application is read-only.</p>
        </Card>
        <style jsx>{`
          .gold-view-page { min-width: 0; }
          :global(.gold-view-card) {
            min-width: 0;
            padding: 22px;
          }
          :global(.loan-dashboard-back) {
            width: 40px;
            height: 40px;
            border: 1px solid #dfe8e8;
            border-radius: 8px;
            background: #fff;
            transition: background .16s ease, border-color .16s ease, color .16s ease;
          }
          :global(.loan-dashboard-back:hover) {
            border-color: #b8d4cf;
            color: #165f5c;
            background: #edf6f4;
          }
          .gold-view-page :global(.page-header) {
            align-items: flex-start;
            margin-bottom: 22px;
          }
          .gold-view-page :global(.page-header h1) {
            margin-bottom: 5px;
            color: #173e46;
            font-size: 25px;
          }
          .gold-view-page :global(.page-header p) {
            color: #718185;
            font-size: 12px;
          }
          .gold-view-summary {
            display: grid;
            grid-template-columns: repeat(3, minmax(0, 1fr));
            gap: 11px;
            padding-bottom: 18px;
            border-bottom: 1px solid #e8eeee;
          }
          .gold-view-summary-item {
            min-width: 0;
            display: flex;
            flex-direction: column;
            align-items: flex-start;
            justify-content: center;
            gap: 7px;
            min-height: 82px;
            padding: 13px 15px;
            border: 1px solid #e5ecec;
            border-radius: 8px;
            background: #fcfdfd;
            box-shadow: 0 2px 7px rgb(23 63 73 / 3%);
            transition: border-color .16s ease, box-shadow .16s ease, transform .16s ease;
          }
          .gold-view-summary-item:hover {
            border-color: #c9dedb;
            box-shadow: 0 4px 12px rgb(23 63 73 / 6%);
            transform: translateY(-1px);
          }
          .gold-view-summary-item > span {
            color: #718185;
            font-size: 11px;
            font-weight: 600;
            line-height: 1.35;
          }
          .gold-view-summary-item strong {
            max-width: 100%;
            overflow-wrap: anywhere;
            color: #34565b;
            font-size: 13px;
            font-weight: 700;
            line-height: 1.45;
          }
          .gold-view-summary-customer { border-left: 3px solid #5b9c91; }
          .gold-view-summary-amount { border-left: 3px solid #7195b4; }
          .gold-view-summary-amount strong { color: #173f49; font-size: 15px; }
          .gold-view-status {
            display: inline-flex;
            align-items: center;
            min-height: 24px;
            padding: 5px 9px;
            border-radius: 20px;
            color: #617377;
            background: #eef2f2;
            font-size: 11px;
            font-weight: 700;
            line-height: 1;
            white-space: normal;
          }
          .gold-view-status.approved, .gold-view-status.disbursed { color: #31815e; background: #e7f3eb; }
          .gold-view-status.pending, .gold-view-status.awaiting-kyc, .gold-view-status.returned { color: #a16f35; background: #fbf1e2; }
          .gold-view-status.under-review { color: #4d7c9f; background: #eaf1f7; }
          .gold-view-status.rejected { color: #a95757; background: #faeaea; }
          .gold-view-tabs {
            display: flex;
            gap: 5px;
            width: 100%;
            margin: 18px 0 14px;
            padding: 5px;
            overflow-x: auto;
            border: 1px solid #e3ebea;
            border-radius: 9px;
            background: #f7faf9;
            scrollbar-width: thin;
            scrollbar-color: #bdcfcc transparent;
          }
          .gold-view-tab {
            flex: 0 0 auto;
            min-height: 37px;
            padding: 8px 13px;
            border: 1px solid transparent;
            border-radius: 6px;
            color: #65777a;
            background: transparent;
            font-size: 11px;
            font-weight: 600;
            white-space: nowrap;
            transition: color .16s ease, background .16s ease, border-color .16s ease;
          }
          .gold-view-tab:hover {
            border-color: #d7e6e3;
            color: #165f5c;
            background: #edf6f4;
          }
          .gold-view-tab.active {
            border-color: #c5ddda;
            color: #145e5b;
            background: #e8f3f1;
            box-shadow: inset 0 -2px 0 #177e7a;
            font-weight: 700;
          }
          .gold-view-tab:focus-visible {
            outline: 3px solid rgb(23 126 122 / 22%);
            outline-offset: 1px;
          }
          .gold-view-tabpanel { min-width: 0; }
          .gold-view-tabpanel:focus-visible {
            outline: 2px solid rgb(23 126 122 / 28%);
            outline-offset: 3px;
          }
          .gold-view-tabpanel :global(.gold-view-section + .gold-view-section) { margin-top: 13px; }
          :global(.gold-view-section) {
            min-width: 0;
            padding: 17px;
            border: 1px solid #e2eaea;
            border-radius: 9px;
            background: #fff;
            box-shadow: 0 2px 8px rgb(23 63 73 / 3%);
          }
          :global(.gold-view-section h2) {
            margin: 0 0 13px;
            padding-bottom: 10px;
            border-bottom: 1px solid #edf2f1;
            color: #173e46;
            font: 700 14px Manrope, sans-serif;
          }
          :global(.gold-view-detail-grid) {
            display: grid;
            grid-template-columns: repeat(3, minmax(0, 1fr));
            gap: 9px;
            margin: 0;
          }
          :global(.gold-view-detail-grid > div) {
            min-width: 0;
            padding: 10px 11px;
            border: 1px solid #edf2f1;
            border-radius: 7px;
            background: #fbfdfd;
          }
          :global(.gold-view-detail-grid dt) {
            margin-bottom: 5px;
            color: #718185;
            font-size: 11px;
            line-height: 1.4;
          }
          :global(.gold-view-detail-grid dd) {
            margin: 0;
            overflow-wrap: anywhere;
            color: #34565b;
            font-size: 12px;
            font-weight: 650;
            line-height: 1.5;
          }
          .gold-view-overview-caption {
            margin-top: 13px;
            color: #718185;
            font-size: 11px;
          }
          .gold-view-table-wrap {
            width: 100%;
            margin-top: 15px;
            overflow-x: auto;
            border: 1px solid #e7eeed;
            border-radius: 7px;
          }
          .gold-view-table {
            width: 100%;
            min-width: 780px;
            border-collapse: collapse;
            color: #405d61;
            font-size: 11px;
            text-align: left;
          }
          .gold-view-table th {
            padding: 11px 12px;
            border: 0;
            border-bottom: 1px solid #e7eeed;
            color: #718185;
            background: #f7faf9;
            font-size: 9px;
            letter-spacing: .45px;
            text-transform: uppercase;
            white-space: nowrap;
          }
          .gold-view-table td {
            padding: 11px 12px;
            border-bottom: 1px solid #edf2f1;
            color: #34565b;
            line-height: 1.45;
            vertical-align: top;
          }
          .gold-view-table tbody tr:last-child td { border-bottom: 0; }
          .gold-view-table tbody tr:hover { background: #fbfdfd; }
          .gold-view-readonly-note {
            margin: 15px 0 0;
            color: #718185;
            font-size: 11px;
          }
          @media (max-width: 850px) {
            .gold-view-summary { grid-template-columns: repeat(2, minmax(0, 1fr)); }
            :global(.gold-view-detail-grid) { grid-template-columns: repeat(2, minmax(0, 1fr)); }
          }
          @media (max-width: 520px) {
            :global(.gold-view-card) { padding: 14px; }
            .gold-view-summary { grid-template-columns: 1fr; }
            .gold-view-page :global(.page-header) { align-items: center; gap: 12px; }
            .gold-view-page :global(.page-header h1) { font-size: 21px; }
            .gold-view-tabs { margin-top: 14px; }
            .gold-view-tab { min-height: 35px; padding: 7px 11px; }
            :global(.gold-view-detail-grid) { grid-template-columns: 1fr; }
            :global(.gold-view-section) { padding: 14px; }
          }
        `}</style>
      </div>
    </AppShell>
  );
}

function LoanApplicationFormPage({ onBack, application, onSave }) {
  const router = useRouter();
  const isEditMode = Boolean(application);
  const [form, setForm] = useState(() => (
    application ? createApplicationForm(application) : createInitialForm()
  ));
  const [currentStep, setCurrentStep] = useState(0);
  const [validationErrors, setValidationErrors] = useState({});
  const [products, setProducts] = useState([]);
  const [productsError, setProductsError] = useState('');
  const [partyToDelete, setPartyToDelete] = useState(null);
  const [showFrontendSuccess, setShowFrontendSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isFormDirty, setIsFormDirty] = useState(false);
  const [saveError, setSaveError] = useState('');
  const nextPartyId = useRef(5);
  const nextInventoryId = useRef(form.security.inventoryItems.length);
  const cancelDeleteButtonRef = useRef(null);
  const confirmDeleteButtonRef = useRef(null);

  useEffect(() => {
    const controller = new AbortController();

    async function loadProducts() {
      let accessToken;
      try {
        const authData = JSON.parse(window.localStorage.getItem('authData') || '{}');
        accessToken = authData.accessToken;
      } catch {
        setProductsError('Product suggestions could not be loaded. You can enter product details manually.');
        return;
      }

      try {
        const result = await getLoanProducts(controller.signal, accessToken);
        if (!controller.signal.aborted) setProducts(Array.isArray(result) ? result : []);
      } catch {
        if (!controller.signal.aborted) {
          setProductsError('Product suggestions could not be loaded. You can enter product details manually.');
        }
      }
    }

    loadProducts();
    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (!partyToDelete) return undefined;
    cancelDeleteButtonRef.current?.focus();
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') setPartyToDelete(null);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [partyToDelete]);

  const updateForm = (nextForm) => {
    setForm(nextForm);
    setIsFormDirty(true);
    setShowFrontendSuccess(false);
    if (Object.keys(validationErrors).length > 0) {
      setValidationErrors(validateStep(currentStep, nextForm));
    }
  };

  const updateField = (field, value) => {
    const nextForm = { ...form, [field]: value };
    updateForm(nextForm);
  };

  const updateParty = (partyId, field, value) => {
    updateForm({
      ...form,
      relatedParties: form.relatedParties.map((party) => (
        party.id === partyId ? { ...party, [field]: value } : party
      )),
    });
  };

  const addRelatedParty = () => {
    nextPartyId.current += 1;
    updateForm({
      ...form,
      relatedParties: [
        ...form.relatedParties,
        {
          id: `party-${nextPartyId.current}`,
          nameType: '',
          customerNo: '',
          salutation: '',
          firstName: '',
          middleName: '',
          lastName: '',
        },
      ],
    });
  };

  const removeRelatedParty = (partyId) => {
    updateForm({
      ...form,
      relatedParties: form.relatedParties.filter((party) => party.id !== partyId),
    });
  };

  const confirmRemoveRelatedParty = () => {
    if (!partyToDelete) return;
    removeRelatedParty(partyToDelete);
    setPartyToDelete(null);
  };

  const trapDeleteDialogFocus = (event) => {
    if (event.key !== 'Tab') return;
    if (event.shiftKey && document.activeElement === cancelDeleteButtonRef.current) {
      event.preventDefault();
      confirmDeleteButtonRef.current?.focus();
    } else if (!event.shiftKey && document.activeElement === confirmDeleteButtonRef.current) {
      event.preventDefault();
      cancelDeleteButtonRef.current?.focus();
    }
  };

  const goToNextStep = () => {
    const errors = validateStep(currentStep, form);
    setValidationErrors(errors);
    if (Object.keys(errors).length === 0) {
      setCurrentStep((step) => Math.min(step + 1, steps.length - 1));
      setShowFrontendSuccess(false);
    }
  };

  const goToPreviousStep = () => {
    setValidationErrors({});
    setCurrentStep((step) => Math.max(step - 1, 0));
    setShowFrontendSuccess(false);
  };

  const handleCancel = () => handleReturnToDashboard();

  const handleSubmit = (event) => {
    event.preventDefault();
    if (isSubmitting) return;

    const allErrors = steps.reduce((errors, _, index) => (
      { ...errors, ...validateStep(index, form) }
    ), {});
    setValidationErrors(allErrors);

    if (Object.keys(allErrors).length > 0) {
      const invalidStep = steps.findIndex((_, index) => (
        Object.keys(validateStep(index, form)).length > 0
      ));
      setCurrentStep(invalidStep >= 0 ? invalidStep : 0);
      return;
    }

    if (isEditMode) {
      if (typeof onSave !== 'function') {
        setSaveError('Changes could not be saved because the local save handler is unavailable.');
        return;
      }

      setIsSubmitting(true);
      setSaveError('');
      try {
        const customerName = [form.firstName, form.middleName, form.lastName]
          .filter(Boolean)
          .join(' ')
          .trim();
        onSave({
          ...application,
          ...(customerName ? { customer: customerName, customerName } : {}),
          ...(form.sanctionLimit ? { amount: String(form.sanctionLimit) } : {}),
          goldLoanForm: form,
        });
        setIsFormDirty(false);
        setShowFrontendSuccess(true);
      } catch (error) {
        setSaveError(
          `Changes could not be saved in this browser${error instanceof Error ? `: ${error.message}` : '.'}`,
        );
        setShowFrontendSuccess(false);
      } finally {
        setIsSubmitting(false);
      }
      return;
    }

    setShowFrontendSuccess(true);
    setIsSubmitting(false);
  };

  const selectProduct = (name) => {
    const matchedProduct = products.find(
      (product) => String(product.name ?? '').toLowerCase() === name.trim().toLowerCase(),
    );
    updateForm({
      ...form,
      productName: name,
      ...(matchedProduct ? { productCode: String(matchedProduct.id ?? '') } : {}),
    });
  };

  const relatedPartyError = (party, field) => (
    validationErrors[`relatedParties.${party.id}.${field}`]
  );

  const invalidNameInput = (field) => {
    setValidationErrors((errors) => ({ ...errors, [field]: nameError }));
  };

  const invalidCodeInput = (field) => {
    setValidationErrors((errors) => ({
      ...errors,
      [field]: 'Use letters, numbers, hyphens, and underscores only.',
    }));
  };

  const updateSectionField = (section, field, value) => {
    const nextForm = {
      ...form,
      [section]: { ...form[section], [field]: value },
    };
    setForm(nextForm);
    setIsFormDirty(true);
    setShowFrontendSuccess(false);
    if (Object.keys(validationErrors).length > 0) {
      setValidationErrors(validateStep(currentStep, nextForm));
    }
  };

  const updateInventoryItem = (index, field, value) => {
    updateSectionField(
      'security',
      'inventoryItems',
      form.security.inventoryItems.map((item, itemIndex) => (
        itemIndex === index ? { ...item, [field]: value } : item
      )),
    );
  };

  const addInventoryItem = () => {
    nextInventoryId.current += 1;
    const nextIndex = nextInventoryId.current;
    updateSectionField('security', 'inventoryItems', [
      ...form.security.inventoryItems,
      {
        id: `inventory-${nextIndex}`,
        itemId: '',
        ornamentDescription: '',
        grossWeight: '',
        netWeight: '',
        appraisalDate: '',
        purity: '',
        rate: '',
        amount: '',
        limit: '',
      },
    ]);
  };

  const removeInventoryItem = (itemId) => {
    updateSectionField(
      'security',
      'inventoryItems',
      form.security.inventoryItems.filter((item) => item.id !== itemId),
    );
  };

  const navigateToStep = (targetStep) => {
    if (targetStep <= currentStep) {
      setCurrentStep(targetStep);
      setValidationErrors({});
      setShowFrontendSuccess(false);
      return;
    }

    for (let stepIndex = currentStep; stepIndex < targetStep; stepIndex += 1) {
      const errors = validateStep(stepIndex, form);
      if (Object.keys(errors).length > 0) {
        setValidationErrors(errors);
        setCurrentStep(stepIndex);
        setShowFrontendSuccess(false);
        return;
      }
    }

    setCurrentStep(targetStep);
    setValidationErrors({});
    setShowFrontendSuccess(false);
  };

  const handleReturnToDashboard = () => {
    if (
      isFormDirty
      && !window.confirm(
        `Return to the Loan Dashboard and discard ${isEditMode ? 'unsaved changes' : 'this application'}?`,
      )
    ) {
      return;
    }

    if (typeof onBack === 'function') {
      onBack();
    } else {
      router.push('/loan_application');
    }
  };

  return (
    <AppShell>
      <div className="loan-application-shell">
        <PageHeader
          title={isEditMode ? 'Edit Gold Loan Application' : 'Gold Loan Application'}
          description={isEditMode ? `Application ID: ${getApplicationId(application)}` : undefined}
          action={
            <button
              className="icon-button loan-dashboard-back"
              type="button"
              onClick={handleReturnToDashboard}
              aria-label="Back to Loan Dashboard"
              title="Back to Loan Dashboard"
            >
              <ArrowLeft size={19} aria-hidden="true" />
            </button>
          }
        />

        <Card className="loan-application-card">
          <div className="loan-form-layout">
            <nav className="loan-form-nav" aria-label="Loan application sections">
              {steps.map((label, index) => {
                const isCurrent = index === currentStep;
                const isComplete = index < currentStep;
                return (
                  <button
                    className={`loan-form-nav-item ${isCurrent ? 'active' : ''} ${isComplete ? 'complete' : ''}`}
                    key={label}
                    type="button"
                    onClick={() => navigateToStep(index)}
                    aria-current={isCurrent ? 'step' : undefined}
                    aria-label={`Step ${index + 1}: ${label}${isComplete ? ', completed' : ''}`}
                  >
                    <span className="loan-form-nav-number">
                      {isComplete ? <Check size={13} aria-hidden="true" /> : index + 1}
                    </span>
                    <span>{label}</span>
                  </button>
                );
              })}
            </nav>

            <div className="loan-form-panel">

          {productsError && (
            <div className="bank-master-alert" role="status">
              <span>{productsError}</span>
            </div>
          )}
          {showFrontendSuccess && (
            <div className="bank-master-success" role="status">
              <Check size={17} aria-hidden="true" />
              <span>
                {isEditMode
                  ? 'Changes saved in this browser.'
                  : 'All fields are valid. This is a frontend preview; no data has been saved.'}
              </span>
            </div>
          )}
          {saveError && <div className="bank-master-alert" role="alert">{saveError}</div>}

          <form onSubmit={handleSubmit} noValidate>
            {currentStep === 0 && (
              <div className="loan-form-section">
                <h2>Borrower Details</h2>

                <div className="loan-form-section-inner">
                  <h3>Application information</h3>
                  <div className="loan-form-grid">
                    <LoanField
                      id="loanAccountNumber"
                      label="Loan Account Number"
                      value={form.loanAccountNumber}
                      onChange={(value) => updateField('loanAccountNumber', value)}
                      error={validationErrors.loanAccountNumber}
                      min={MIN_TEXT_LENGTH}
                      maxLength={MAX_TEXT_LENGTH}
                      strictCode
                      onInvalidCodeInput={() => invalidCodeInput('loanAccountNumber')}
                      required
                    />
                    <LoanField
                      id="effectiveDate"
                      label="Effective Date"
                      type="date"
                      value={form.effectiveDate}
                      onChange={(value) => updateField('effectiveDate', value)}
                      error={validationErrors.effectiveDate}
                      required
                    />
                    <LoanField
                      id="accountStatus"
                      label="Account Status"
                      value={form.accountStatus}
                      onChange={(value) => updateField('accountStatus', value)}
                      options={['Active', 'Pending', 'Closed'].map((value) => ({ value, label: value }))}
                      error={validationErrors.accountStatus}
                      required
                    />
                    <LoanField
                      id="lastTransactionDate"
                      label="Last Transaction Date"
                      type="date"
                      value={form.lastTransactionDate}
                      onChange={(value) => updateField('lastTransactionDate', value)}
                      error={validationErrors.lastTransactionDate}
                    />
                    <LoanField
                      id="customerId"
                      label="Customer ID"
                      value={form.customerId}
                      onChange={(value) => updateField('customerId', value)}
                      error={validationErrors.customerId}
                      min={MIN_TEXT_LENGTH}
                      maxLength={MAX_TEXT_LENGTH}
                      strictCode
                      onInvalidCodeInput={() => invalidCodeInput('customerId')}
                      required
                    />
                  </div>
                </div>

                <div className="loan-form-section-inner">
                  <h3 className="borrower-information-heading">Borrower Information</h3>
                  <div className="loan-form-grid borrower-information-grid">
                    <LoanField
                      id="title"
                      label="Title"
                      value={form.title}
                      onChange={(value) => updateField('title', value)}
                      options={titles}
                      error={validationErrors.title}
                      required
                    />
                    <LoanField
                      id="firstName"
                      label="First Name"
                      value={form.firstName}
                      onChange={(value) => updateField('firstName', value)}
                      error={validationErrors.firstName}
                      strictName
                      maxLength={MAX_TEXT_LENGTH}
                      onInvalidNameInput={() => invalidNameInput('firstName')}
                      required
                    />
                    <LoanField
                      id="middleName"
                      label="Middle Name"
                      value={form.middleName}
                      onChange={(value) => updateField('middleName', value)}
                      error={validationErrors.middleName}
                      strictName
                      maxLength={MAX_TEXT_LENGTH}
                      onInvalidNameInput={() => invalidNameInput('middleName')}
                    />
                    <LoanField
                      id="lastName"
                      label="Last Name"
                      value={form.lastName}
                      onChange={(value) => updateField('lastName', value)}
                      error={validationErrors.lastName}
                      strictName
                      maxLength={MAX_TEXT_LENGTH}
                      onInvalidNameInput={() => invalidNameInput('lastName')}
                      required
                    />
                  </div>
                </div>

                <div className="loan-form-section-inner">
                  <h3>Gold loan information</h3>
                  <div className="loan-form-grid">
                    <LoanField
                      id="productCode"
                      label="Product Code"
                      value={form.productCode}
                      onChange={(value) => updateField('productCode', value)}
                      error={validationErrors.productCode}
                      min={MIN_TEXT_LENGTH}
                      maxLength={MAX_TEXT_LENGTH}
                      strictCode
                      onInvalidCodeInput={() => invalidCodeInput('productCode')}
                      required
                    />
                    <LoanField
                      id="productName"
                      label="Product Description"
                      value={form.productName}
                      onChange={selectProduct}
                      error={validationErrors.productName}
                      list="loan-product-options"
                      maxLength={MAX_TEXT_LENGTH}
                      required
                    />
                    <LoanField
                      id="schemeCode"
                      label="Scheme Code"
                      value={form.schemeCode}
                      onChange={(value) => updateField('schemeCode', value)}
                      error={validationErrors.schemeCode}
                      maxLength={30}
                      strictCode
                      onInvalidCodeInput={() => invalidCodeInput('schemeCode')}
                      required
                    />
                    <LoanField
                      id="schemeDescription"
                      label="Scheme Description"
                      value={form.schemeDescription}
                      onChange={(value) => updateField('schemeDescription', value)}
                      error={validationErrors.schemeDescription}
                      maxLength={MAX_TEXT_LENGTH}
                      required
                    />
                    <LoanField
                      id="modeOfOperation"
                      label="Mode of Operation"
                      value={form.modeOfOperation}
                      onChange={(value) => updateField('modeOfOperation', value)}
                      options={modesOfOperation}
                      error={validationErrors.modeOfOperation}
                      required
                    />
                  </div>
                  <datalist id="loan-product-options">
                    {products.map((product) => (
                      <option key={String(product.id)} value={product.name} />
                    ))}
                  </datalist>
                </div>
              </div>
            )}

            {currentStep === 5 && (
              <div className="loan-form-section">
                <div className="panel-heading">
                  <div>
                    <h2>Related Party</h2>
                    <p>Add co-applicants, guarantors, or other parties associated with this application.</p>
                  </div>
                  <button className="secondary-button" type="button" onClick={addRelatedParty}>
                    <Plus size={16} aria-hidden="true" />
                    Add Related Party
                  </button>
                </div>

                {form.relatedParties.length === 0 ? (
                  <div className="bank-master-empty" style={{ minHeight: 180, flexDirection: 'column' }}>
                    <p>No related parties added.</p>
                    <span>Add a related party if one is associated with this application. This step can be left empty.</span>
                  </div>
                ) : (
                  <div className="loan-data-table-wrap" style={{ overflowX: 'auto' }}>
                    <table className="loan-data-table" style={{ minWidth: 1040 }}>
                      <thead>
                        <tr>
                          <th scope="col">Sr. No.</th>
                          <th scope="col">Name Type</th>
                          <th scope="col">Customer No.</th>
                          <th scope="col">Salutation</th>
                          <th scope="col">First Name</th>
                          <th scope="col">Middle Name</th>
                          <th scope="col">Last Name</th>
                          <th scope="col" aria-label="Actions">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {form.relatedParties.map((party, index) => (
                          <tr key={party.id}>
                            <td>{index + 1}</td>
                            <td>
                              <LoanField
                                id={`${party.id}-nameType`}
                                label="Name Type"
                                value={party.nameType}
                                onChange={(value) => updateParty(party.id, 'nameType', value)}
                                options={nameTypes}
                                error={relatedPartyError(party, 'nameType')}
                                required
                              />
                            </td>
                            <td>
                              <LoanField
                                id={`${party.id}-customerNo`}
                                label="Customer No."
                                value={party.customerNo}
                                onChange={(value) => updateParty(party.id, 'customerNo', value)}
                                error={relatedPartyError(party, 'customerNo')}
                                maxLength={MAX_TEXT_LENGTH}
                                strictCode
                                onInvalidCodeInput={() => invalidCodeInput(`relatedParties.${party.id}.customerNo`)}
                                required
                              />
                            </td>
                            <td>
                              <LoanField
                                id={`${party.id}-salutation`}
                                label="Salutation"
                                value={party.salutation}
                                onChange={(value) => updateParty(party.id, 'salutation', value)}
                                options={titles}
                                error={relatedPartyError(party, 'salutation')}
                                required
                              />
                            </td>
                            <td>
                              <LoanField
                                id={`${party.id}-firstName`}
                                label="First Name"
                                value={party.firstName}
                                onChange={(value) => updateParty(party.id, 'firstName', value)}
                                error={relatedPartyError(party, 'firstName')}
                                strictName
                                maxLength={MAX_TEXT_LENGTH}
                                onInvalidNameInput={() => invalidNameInput(`relatedParties.${party.id}.firstName`)}
                                required
                              />
                            </td>
                            <td>
                              <LoanField
                                id={`${party.id}-middleName`}
                                label="Middle Name"
                                value={party.middleName}
                                onChange={(value) => updateParty(party.id, 'middleName', value)}
                                error={relatedPartyError(party, 'middleName')}
                                strictName
                                maxLength={MAX_TEXT_LENGTH}
                                onInvalidNameInput={() => invalidNameInput(`relatedParties.${party.id}.middleName`)}
                              />
                            </td>
                            <td>
                              <LoanField
                                id={`${party.id}-lastName`}
                                label="Last Name"
                                value={party.lastName}
                                onChange={(value) => updateParty(party.id, 'lastName', value)}
                                error={relatedPartyError(party, 'lastName')}
                                strictName
                                maxLength={MAX_TEXT_LENGTH}
                                onInvalidNameInput={() => invalidNameInput(`relatedParties.${party.id}.lastName`)}
                                required
                              />
                            </td>
                            <td>
                              <button
                                className="icon-button"
                                type="button"
                                onClick={() => setPartyToDelete(party.id)}
                                aria-label={`Remove related party ${index + 1}`}
                                title="Remove related party"
                              >
                                <Trash2 size={16} aria-hidden="true" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {currentStep === 2 && (
              <div className="loan-form-section">
                <h2>Loan Details</h2>
                <div className="loan-form-section-inner">
                  <div className="loan-form-grid">
                    <LoanField id="sanctionLimit" label="Sanction Limit (Rs.)" type="number" min="0.01" step="any" value={form.sanctionLimit} onChange={(value) => updateField('sanctionLimit', value)} error={validationErrors.sanctionLimit} required />
                    <LoanField id="tenureMonths" label="Tenure (months)" type="number" min="1" max="600" step="1" value={form.tenureMonths} onChange={(value) => updateField('tenureMonths', value)} error={validationErrors.tenureMonths} required />
                    <LoanField id="interestRate" label="Interest Rate (%)" type="number" min="0" max="100" step="any" value={form.interestRate} onChange={(value) => updateField('interestRate', value)} error={validationErrors.interestRate} required />
                    <LoanField id="sanctionAuthority" label="Sanction Authority" value={form.sanctionAuthority} onChange={(value) => updateField('sanctionAuthority', value)} error={validationErrors.sanctionAuthority} maxLength={MAX_TEXT_LENGTH} required />
                    <LoanField id="instalments" label="No. of Instalments" type="number" min="1" max="600" step="1" value={form.instalments} onChange={(value) => updateField('instalments', value)} error={validationErrors.instalments} required />
                    <LoanField id="sanctionedDate" label="Sanctioned Date" type="date" value={form.sanctionedDate} onChange={(value) => updateField('sanctionedDate', value)} error={validationErrors.sanctionedDate} required />
                    <LoanField id="emi" label="EMI (Y/N)" value={form.emi} onChange={(value) => updateField('emi', value)} options={yesNoOptions} error={validationErrors.emi} required />
                    <LoanField id="instalmentAmount" label="Instalment Amount (Rs.)" type="number" min="0.01" step="any" value={form.instalmentAmount} onChange={(value) => updateField('instalmentAmount', value)} error={validationErrors.instalmentAmount} required />
                    <LoanField id="expiryDate" label="Expiry Date" type="date" value={form.expiryDate} onChange={(value) => updateField('expiryDate', value)} error={validationErrors.expiryDate} required />
                    <LoanField
                      id="repaymentType"
                      label="Re-Payment Type"
                      value={form.repaymentType}
                      onChange={(value) => updateField('repaymentType', value)}
                      options={['EMI', 'Bullet', 'Partial'].map((value) => ({ value, label: value }))}
                      error={validationErrors.repaymentType}
                      required
                    />
                    <LoanField
                      id="customerSourced"
                      label="Customer Sourced"
                      value={form.customerSourced}
                      onChange={(value) => updateField('customerSourced', value)}
                      options={['Walkin', 'Lead by staff', 'Referred by Customer'].map((value) => ({ value, label: value }))}
                      error={validationErrors.customerSourced}
                      required
                    />
                    <LoanField id="repaymentStartDate" label="Re-Payment Start Date" type="date" value={form.repaymentStartDate} onChange={(value) => updateField('repaymentStartDate', value)} error={validationErrors.repaymentStartDate} required />
                    <LoanField
                      id="interestPayment"
                      label="Interest Payment"
                      value={form.interestPayment}
                      onChange={(value) => updateField('interestPayment', value)}
                      options={['Maturity', 'Monthly', 'Quarterly', 'Half Yearly'].map((value) => ({ value, label: value }))}
                      error={validationErrors.interestPayment}
                      required
                    />
                    <LoanField id="accountClosure" label="Account Closure (Y/N)" value={form.accountClosure} onChange={(value) => updateField('accountClosure', value)} options={yesNoOptions} error={validationErrors.accountClosure} required />
                  </div>
                </div>
              </div>
            )}

            {currentStep === 3 && (
              <div className="loan-form-section">
                <h2>Charges &amp; Fees</h2>
                <div className="loan-form-section-inner">
                  <div className="loan-form-grid">
                    <LoanField id="chargesSanctionLimit" label="Sanction Limit (Rs.)" type="number" min="0.01" step="any" value={form.charges.sanctionLimit} onChange={(value) => updateSectionField('charges', 'sanctionLimit', value)} error={validationErrors['charges.sanctionLimit']} required />
                    <LoanField id="chargesTenure" label="Tenure (months)" type="number" min="1" max="600" step="1" value={form.charges.tenureMonths} onChange={(value) => updateSectionField('charges', 'tenureMonths', value)} error={validationErrors['charges.tenureMonths']} required />
                    <LoanField id="processingFees" label="Processing Fees (Rs.)" type="number" min="0" step="any" value={form.charges.processingFees} onChange={(value) => updateSectionField('charges', 'processingFees', value)} error={validationErrors['charges.processingFees']} required />
                    <LoanField id="valuationCharges" label="Valuation Charges (Rs.)" type="number" min="0" step="any" value={form.charges.valuationCharges} onChange={(value) => updateSectionField('charges', 'valuationCharges', value)} error={validationErrors['charges.valuationCharges']} required />
                    <LoanField id="penalInterestPercent" label="Penal Interest (%)" type="number" min="0" max="100" step="any" value={form.charges.penalInterestPercent} onChange={(value) => updateSectionField('charges', 'penalInterestPercent', value)} error={validationErrors['charges.penalInterestPercent']} required />
                  </div>
                </div>
              </div>
            )}

            {currentStep === 4 && (
              <div className="loan-form-section">
                <h2>Basic Details</h2>
                <div className="loan-form-section-inner">
                  <div className="loan-form-grid">
                    <LoanField
                      id="purposeLoan"
                      label="Purpose of Loan"
                      value={form.basicDetails.purposeLoan}
                      onChange={(value) => updateSectionField('basicDetails', 'purposeLoan', value)}
                      error={validationErrors['basicDetails.purposeLoan']}
                      maxLength={30}
                      strictCode
                      onInvalidCodeInput={() => invalidCodeInput('basicDetails.purposeLoan')}
                      required
                    />
                    <LoanField
                      id="sectorCode"
                      label="Sector Code"
                      value={form.basicDetails.sectorCode}
                      onChange={(value) => updateSectionField('basicDetails', 'sectorCode', value)}
                      error={validationErrors['basicDetails.sectorCode']}
                      maxLength={30}
                      strictCode
                      onInvalidCodeInput={() => invalidCodeInput('basicDetails.sectorCode')}
                      required
                    />
                    <LoanField
                      id="womenSector"
                      label="Women Sector"
                      value={form.basicDetails.womenSector}
                      onChange={(value) => updateSectionField('basicDetails', 'womenSector', value)}
                      options={yesNoOptions}
                      error={validationErrors['basicDetails.womenSector']}
                      required
                    />
                    <LoanField
                      id="termCode"
                      label="Term Code"
                      value={form.basicDetails.termCode}
                      onChange={(value) => updateSectionField('basicDetails', 'termCode', value)}
                      error={validationErrors['basicDetails.termCode']}
                      maxLength={30}
                      strictCode
                      onInvalidCodeInput={() => invalidCodeInput('basicDetails.termCode')}
                      required
                    />
                    <LoanField
                      id="subSectorCode"
                      label="Sub-Sector Code"
                      value={form.basicDetails.subSectorCode}
                      onChange={(value) => updateSectionField('basicDetails', 'subSectorCode', value)}
                      error={validationErrors['basicDetails.subSectorCode']}
                      maxLength={30}
                      strictCode
                      onInvalidCodeInput={() => invalidCodeInput('basicDetails.subSectorCode')}
                      required
                    />
                  </div>
                </div>
              </div>
            )}

            {currentStep === 1 && (
              <div className="loan-form-section">
                <h2>Security Details</h2>
                <div className="loan-form-section-inner">
                  <div className="loan-form-grid">
                    <LoanField id="securityId" label="Security ID" value={form.security.securityId} onChange={(value) => updateSectionField('security', 'securityId', value)} error={validationErrors['security.securityId']} maxLength={30} strictCode onInvalidCodeInput={() => invalidCodeInput('security.securityId')} required />
                    <LoanField id="securityType" label="Security Type" value={form.security.securityType} onChange={(value) => updateSectionField('security', 'securityType', value)} error={validationErrors['security.securityType']} maxLength={MAX_TEXT_LENGTH} required />
                    <LoanField id="valuerCode" label="Valuer Code" value={form.security.valuerCode} onChange={(value) => updateSectionField('security', 'valuerCode', value)} error={validationErrors['security.valuerCode']} maxLength={30} strictCode onInvalidCodeInput={() => invalidCodeInput('security.valuerCode')} required />
                    <LoanField id="valuerDescription" label="Valuer Description" value={form.security.valuerDescription} onChange={(value) => updateSectionField('security', 'valuerDescription', value)} error={validationErrors['security.valuerDescription']} maxLength={MAX_TEXT_LENGTH} required />
                  </div>
                </div>

                <div className="loan-form-section-inner">
                  <div className="loan-data-table-wrap">
                    <table className="loan-data-table" style={{ minWidth: 1050 }}>
                      <thead>
                        <tr>
                          <th scope="col">Sr.</th>
                          <th scope="col">Inventory Item ID</th>
                          <th scope="col">Ornament Description</th>
                          <th scope="col">Gross Weight</th>
                          <th scope="col">Net Weight</th>
                          <th scope="col">Appraisal Date</th>
                          <th scope="col">Assessed Purity Carat</th>
                          <th scope="col">Rate (Rs.)</th>
                          <th scope="col">Amount (Rs.)</th>
                          <th scope="col">Limit (Rs.)</th>
                          <th scope="col">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {form.security.inventoryItems.map((item, index) => {
                          const fieldError = (field) => validationErrors[`security.inventoryItems.${index}.${field}`];
                          return (
                            <tr key={item.id}>
                              <td>{index + 1}</td>
                              <td><LoanField id={`${item.id}-itemId`} label="Inventory Item ID" value={item.itemId} onChange={(value) => updateInventoryItem(index, 'itemId', value)} error={fieldError('itemId')} required /></td>
                              <td><LoanField id={`${item.id}-description`} label="Ornament Description" value={item.ornamentDescription} onChange={(value) => updateInventoryItem(index, 'ornamentDescription', value)} error={fieldError('ornamentDescription')} maxLength={MAX_TEXT_LENGTH} required /></td>
                              <td><LoanField id={`${item.id}-grossWeight`} label="Gross Weight" type="number" min="0.01" step="any" value={item.grossWeight} onChange={(value) => updateInventoryItem(index, 'grossWeight', value)} error={fieldError('grossWeight')} required /></td>
                              <td><LoanField id={`${item.id}-netWeight`} label="Net Weight" type="number" min="0.01" step="any" value={item.netWeight} onChange={(value) => updateInventoryItem(index, 'netWeight', value)} error={fieldError('netWeight')} required /></td>
                              <td><LoanField id={`${item.id}-appraisalDate`} label="Appraisal Date" type="date" value={item.appraisalDate} onChange={(value) => updateInventoryItem(index, 'appraisalDate', value)} error={fieldError('appraisalDate')} required /></td>
                              <td><LoanField id={`${item.id}-purity`} label="Purity" value={item.purity} onChange={(value) => updateInventoryItem(index, 'purity', value)} options={['18K', '22K', '24K'].map((value) => ({ value, label: value }))} error={fieldError('purity')} required /></td>
                              <td><LoanField id={`${item.id}-rate`} label="Rate" type="number" min="0.01" step="any" value={item.rate} onChange={(value) => updateInventoryItem(index, 'rate', value)} error={fieldError('rate')} required /></td>
                              <td><LoanField id={`${item.id}-amount`} label="Amount" type="number" min="0.01" step="any" value={item.amount} onChange={(value) => updateInventoryItem(index, 'amount', value)} error={fieldError('amount')} required /></td>
                              <td><LoanField id={`${item.id}-limit`} label="Limit" type="number" min="0.01" step="any" value={item.limit} onChange={(value) => updateInventoryItem(index, 'limit', value)} error={fieldError('limit')} required /></td>
                              <td>
                                <button
                                  className="icon-button"
                                  type="button"
                                  onClick={() => removeInventoryItem(item.id)}
                                  aria-label={`Delete gold item ${index + 1}`}
                                  title="Delete gold item"
                                >
                                  <Trash2 size={16} aria-hidden="true" />
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                  {validationErrors['security.inventoryItems'] && (
                    <span className="field-error" role="alert">{validationErrors['security.inventoryItems']}</span>
                  )}
                  <button className="secondary-button" type="button" onClick={addInventoryItem}>
                    <Plus size={16} aria-hidden="true" /> Add Gold Item
                  </button>
                </div>

                <div className="loan-form-section-inner">
                  <div className="loan-form-grid">
                    <LoanField id="marginPercent" label="Margin (%)" type="number" min="0" max="100" step="any" value={form.security.marginPercent} onChange={(value) => updateSectionField('security', 'marginPercent', value)} error={validationErrors['security.marginPercent']} required />
                    <LoanField id="limitAvailable" label="Limit Available for Sanction (Rs.)" type="number" min="0.01" step="any" value={form.security.limitAvailable} onChange={(value) => updateSectionField('security', 'limitAvailable', value)} error={validationErrors['security.limitAvailable']} required />
                  </div>
                </div>
              </div>
            )}

            {currentStep === 6 && (
              <div className="loan-form-section">
                <h2>Disbursement</h2>
                <div className="loan-form-section-inner">
                  <div className="loan-form-grid">
                    <LoanField id="disbursementAccountNumber" label="Account Number" value={form.disbursement.accountNumber} onChange={(value) => updateSectionField('disbursement', 'accountNumber', value)} error={validationErrors['disbursement.accountNumber']} maxLength={34} strictCode onInvalidCodeInput={() => invalidCodeInput('disbursement.accountNumber')} required />
                    <LoanField id="disbursementMode" label="Mode of Disbursement" value={form.disbursement.mode} onChange={(value) => updateSectionField('disbursement', 'mode', value)} options={['Internal Transfer', 'NEFT', 'RTGS', 'IMPS', 'Pay Check'].map((value) => ({ value, label: value }))} error={validationErrors['disbursement.mode']} required />
                    <LoanField id="disbursementAccountType" label="Type of Account" value={form.disbursement.accountType} onChange={(value) => updateSectionField('disbursement', 'accountType', value)} error={validationErrors['disbursement.accountType']} maxLength={MAX_TEXT_LENGTH} required />
                    <LoanField id="disbursementType" label="Disbursement Type" value={form.disbursement.type} onChange={(value) => updateSectionField('disbursement', 'type', value)} options={['Full', 'Partial'].map((value) => ({ value, label: value }))} error={validationErrors['disbursement.type']} required />
                    <LoanField id="disbursementBankName" label="Bank Name" value={form.disbursement.bankName} onChange={(value) => updateSectionField('disbursement', 'bankName', value)} error={validationErrors['disbursement.bankName']} maxLength={MAX_TEXT_LENGTH} required />
                    <LoanField id="disbursementAmount" label="Disbursement Amount (Rs.)" type="number" min="0.01" step="any" value={form.disbursement.amount} onChange={(value) => updateSectionField('disbursement', 'amount', value)} error={validationErrors['disbursement.amount']} required />
                    <LoanField id="disbursementIfsc" label="IFSC Code" value={form.disbursement.ifscCode} onChange={(value) => updateSectionField('disbursement', 'ifscCode', value.toUpperCase())} error={validationErrors['disbursement.ifscCode']} maxLength={11} strictCode onInvalidCodeInput={() => invalidCodeInput('disbursement.ifscCode')} required />
                    <LoanField id="disbursementMobile" label="Mobile Number" type="tel" value={form.disbursement.mobileNumber} onChange={(value) => updateSectionField('disbursement', 'mobileNumber', value.replace(/\D/g, '').slice(0, 10))} error={validationErrors['disbursement.mobileNumber']} maxLength={10} required />
                  </div>
                </div>
              </div>
            )}

            <div className="loan-step-actions">
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                <button className="loan-secondary-btn" type="button" onClick={handleCancel}>Cancel</button>
                {currentStep > 0 && (
                  <button className="loan-secondary-btn" type="button" onClick={goToPreviousStep}>
                    <ArrowLeft size={16} aria-hidden="true" />
                    Previous
                  </button>
                )}
              </div>
              {currentStep < steps.length - 1 ? (
                <button className="loan-primary-btn" type="button" onClick={goToNextStep}>
                  Next <ArrowRight size={16} aria-hidden="true" />
                </button>
              ) : (
                <button className="loan-primary-btn" type="submit" disabled={isSubmitting}>
                  {isSubmitting ? 'Saving...' : isEditMode ? 'Save Changes' : 'Submit'}
                  <Check size={16} aria-hidden="true" />
                </button>
              )}
            </div>
          </form>
            </div>
          </div>
        </Card>

        {partyToDelete && (
          <div className="loan-delete-overlay" role="presentation">
            <section
              className="loan-delete-dialog"
              role="alertdialog"
              aria-modal="true"
              aria-labelledby="loan-delete-title"
              aria-describedby="loan-delete-message"
              onKeyDown={trapDeleteDialogFocus}
            >
              <h2 id="loan-delete-title">Delete related party</h2>
              <p id="loan-delete-message">Are you sure you want to delete this related party?</p>
              <div className="loan-delete-actions">
                <button
                  ref={cancelDeleteButtonRef}
                  className="loan-delete-cancel"
                  type="button"
                  onClick={() => setPartyToDelete(null)}
                >
                  Cancel
                </button>
                <button
                  ref={confirmDeleteButtonRef}
                  className="loan-delete-confirm"
                  type="button"
                  onClick={confirmRemoveRelatedParty}
                >
                  Delete
                </button>
              </div>
            </section>
          </div>
        )}
        <style jsx>{`
          .loan-application-shell {
            min-width: 0;
          }

          :global(.loan-dashboard-back) {
            width: 40px;
            height: 40px;
            border: 1px solid #dfe8e8;
            background: #fff;
          }

          :global(.loan-dashboard-back:hover) {
            border-color: #b8d4cf;
          }

          :global(.loan-application-card) {
            padding: 20px;
          }

          .loan-form-layout {
            display: grid;
            grid-template-columns: minmax(0, 1fr);
            gap: 20px;
            min-height: 600px;
          }

          /* Keep all seven application sections in one horizontal navigation row. */
          .loan-form-nav {
            display: flex;
            flex-direction: row;
            align-items: center;
            gap: 7px;
            width: 100%;
            min-width: 0;
            overflow-x: auto;
            overflow-y: hidden;
            padding: 0 0 12px;
            border-right: 0;
            border-bottom: 1px solid #e5ecec;
            scrollbar-width: thin;
          }

          .loan-form-nav-item {
            min-height: 42px;
            display: inline-flex;
            flex: 0 0 auto;
            align-items: center;
            gap: 8px;
            white-space: nowrap;
            padding: 7px 10px;
            border: 1px solid transparent;
            border-radius: 7px;
            color: #60747a;
            font-size: 12px;
            font-weight: 600;
            text-align: left;
          }

          .loan-form-nav-item:hover {
            background: #f6faf9;
          }

          .loan-form-nav-item.active {
            border-color: #cfe1df;
            color: #165f5c;
            background: #edf6f4;
          }

          .loan-form-nav-item.complete {
            color: #247b67;
          }

          .loan-form-nav-number {
            width: 26px;
            height: 26px;
            display: grid;
            flex: 0 0 26px;
            place-items: center;
            border: 1px solid #d7e2e3;
            border-radius: 50%;
            color: #657b81;
            background: #fff;
            font-size: 11px;
          }

          .loan-form-nav-item.active .loan-form-nav-number {
            border-color: #177e7a;
            color: #fff;
            background: #177e7a;
          }

          .loan-form-nav-item.complete .loan-form-nav-number {
            border-color: #b8dfd3;
            color: #26795f;
            background: #e5f5ef;
          }

          .loan-form-panel {
            min-width: 0;
          }

          .borrower-information-grid {
            grid-template-columns: repeat(4, minmax(0, 1fr));
            align-items: start;
            gap: 14px;
          }

          .borrower-information-grid > * {
            min-width: 0;
          }

          .loan-data-table-wrap {
            width: 100%;
            max-width: 100%;
            overflow-x: auto;
          }

          .loan-data-table {
            width: 100%;
            border-collapse: collapse;
          }

          .repayment-assumption,
          .section-help {
            margin: 12px 0 0;
            color: #708087;
            font-size: 12px;
            line-height: 1.55;
          }

          .repayment-table-scroll {
            overflow-x: auto;
            margin-top: 18px;
            border: 1px solid #dfe8eb;
            border-radius: 7px;
          }

          .repayment-table {
            min-width: 850px;
          }

          .repayment-empty {
            min-height: 140px;
            margin-top: 18px;
          }

          .security-file-control {
            position: relative;
            width: 100%;
            min-height: 42px;
            display: flex;
            align-items: center;
            gap: 8px;
            overflow: hidden;
            padding: 0 11px;
            border: 1px solid #dfe8eb;
            border-radius: 8px;
            color: #35535d;
            background: #f7fafb;
            font-size: 12px;
            font-weight: 500;
          }

          .security-file-control > span {
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
          }

          .security-file-control input {
            position: absolute;
            inset: 0;
            width: 100%;
            height: 100%;
            cursor: pointer;
            opacity: 0;
          }

          .security-file-control:focus-within {
            border-color: #177e7a;
            box-shadow: 0 0 0 3px #177e7a1a;
          }

          .security-file-help {
            color: #7c8b8f;
            font-size: 10px;
            font-weight: 400;
            line-height: 1.4;
          }

          .security-message {
            margin-top: 14px;
            padding: 10px 12px;
            border: 1px solid #c9e6d6;
            border-radius: 7px;
            color: #25613d;
            background: #f1fbf5;
            font-size: 12px;
          }

          .security-actions {
            display: flex;
            justify-content: flex-end;
            gap: 10px;
            margin-top: 16px;
          }

          .workflow-unavailable {
            min-height: 180px;
            flex-direction: column;
            gap: 8px;
            padding: 24px;
            text-align: center;
          }

          .workflow-unavailable strong {
            color: #395b60;
          }

          .workflow-unavailable span {
            max-width: 460px;
            color: #708087;
            font-size: 12px;
            line-height: 1.5;
          }

          .loan-form-nav-item:focus-visible,
          :global(.loan-dashboard-back:focus-visible) {
            outline: 3px solid #177e7a55;
            outline-offset: 2px;
          }

          @media (max-width: 1000px) {
            .loan-form-layout {
              grid-template-columns: minmax(0, 1fr);
              gap: 18px;
            }

            /* Keep all four borrower-name fields on one row on desktop/tablet. */
            .borrower-information-grid {
              grid-template-columns: repeat(4, minmax(0, 1fr));
              gap: 12px;
            }
          }

          @media (max-width: 720px) {
            :global(.loan-application-card) {
              padding: 16px;
            }

            .loan-form-layout {
              grid-template-columns: 1fr;
              gap: 18px;
              min-height: 0;
            }

            .loan-form-nav {
              display: flex;
              flex-direction: row;
              flex-wrap: nowrap;
              gap: 5px;
              overflow-x: auto;
              padding: 0 0 12px;
              border-right: 0;
              border-bottom: 1px solid #e5ecec;
            }

            .loan-form-nav-item {
              flex: 0 0 auto;
              min-height: 40px;
              padding: 6px 8px;
              font-size: 10px;
              white-space: nowrap;
            }

            .loan-form-nav-number {
              width: 23px;
              height: 23px;
              flex-basis: 23px;
            }

            .borrower-information-grid {
              grid-template-columns: repeat(2, minmax(0, 1fr));
            }

            .security-actions {
              flex-direction: column-reverse;
            }

            .security-actions button {
              width: 100%;
            }
          }

          @media (max-width: 440px) {
            .borrower-information-grid {
              grid-template-columns: 1fr;
            }
          }
        `}</style>
      </div>
    </AppShell>
  );
}
