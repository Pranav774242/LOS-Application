'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Banknote,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Coins,
  Eye,
  FilePlus2,
  Pencil,
  Search,
} from 'lucide-react';
import AppShell from './AppShell';
import Card from './Card';
import PageHeader from './PageHeader';
import LoanDashboardStyles from './LoanDashboardStyles';
import { api } from '../services/api';
import {
  formatAmount,
  formatApplicationDate,
  getApplicationId,
  getCustomerName,
  getStatusClass,
  getStatusLabel,
  isGoldLoanApplication,
  persistGoldLoanApplication,
  readSavedGoldLoanApplications,
} from './GoldLoanApplication';

const PAGE_SIZE = 10;

function getApplicationRecords() {
  const savedApplications = readSavedGoldLoanApplications();
  const savedById = new Map(
    savedApplications.map((application) => [getApplicationId(application), application]),
  );
  const baseApplications = (Array.isArray(api.applications) ? api.applications : [])
    .map((application) => ({
      ...application,
      ...(savedById.get(getApplicationId(application)) || {}),
    }));
  const baseIds = new Set(baseApplications.map(getApplicationId));
  const newApplications = savedApplications.filter(
    (application) => !baseIds.has(getApplicationId(application)),
  );

  return [...baseApplications, ...newApplications].filter(isGoldLoanApplication);
}

export default function GoldLoanDashboard() {
  const router = useRouter();
  const [applications, setApplications] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [persistenceError, setPersistenceError] = useState('');
  const [saveNotice, setSaveNotice] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const applicationsAvailable = Array.isArray(api.applications);

  useEffect(() => {
    try {
      setApplications(getApplicationRecords());
    } catch (error) {
      setPersistenceError(
        error instanceof Error
          ? `Saved Gold Loan applications could not be loaded: ${error.message}`
          : 'Saved Gold Loan applications could not be loaded from this browser.',
      );
    } finally {
      setLoaded(true);
    }
  }, []);

  const counts = useMemo(() => ({
    total: applications.length,
    approved: applications.filter(
      (application) => String(application.status || '').trim().toLowerCase() === 'approved',
    ).length,
    disbursed: applications.filter(
      (application) => String(application.status || '').trim().toLowerCase() === 'disbursed',
    ).length,
  }), [applications]);

  const filteredApplications = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();
    if (!normalizedSearch) return applications;

    return applications.filter((application) => {
      const form = application.goldLoanForm || {};
      return [
        getApplicationId(application),
        getCustomerName(application),
        application.customerId,
        form.loanAccountNumber,
        application.branch || form.branch,
        getStatusLabel(application.status),
      ].some((value) => String(value || '').toLowerCase().includes(normalizedSearch));
    });
  }, [applications, searchTerm]);
  const pageCount = Math.max(1, Math.ceil(filteredApplications.length / PAGE_SIZE));
  const pageApplications = filteredApplications.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE,
  );

  const persistApplication = (application) => {
    persistGoldLoanApplication(application);
    setApplications((currentApplications) => {
      const existingIndex = currentApplications.findIndex(
        (saved) => getApplicationId(saved) === getApplicationId(application),
      );
      if (existingIndex < 0) return [application, ...currentApplications];

      return currentApplications.map((saved, index) => (
        index === existingIndex ? { ...saved, ...application } : saved
      ));
    });
    setPersistenceError('');
    setSaveNotice(`${getApplicationId(application)} was saved in this browser.`);
  };

  const createApplication = (form) => {
    const now = new Date();
    const identifier = window.crypto?.randomUUID?.().slice(0, 8)
      || Math.random().toString(36).slice(2, 10).toUpperCase();
    const customerName = [form.firstName, form.middleName, form.lastName]
      .filter(Boolean)
      .join(' ')
      .trim();
    const application = {
      id: `GL-${now.getTime()}-${identifier}`,
      customer: customerName,
      customerName,
      customerId: form.customerId,
      product: 'Gold Loan',
      amount: form.sanctionLimit,
      applicationDate: now.toISOString().slice(0, 10),
      branch: form.branch,
      status: 'Pending',
      goldLoanForm: form,
    };

    persistApplication(application);
  };

  const metrics = [
    { label: 'Total No. of Applications', value: counts.total, icon: FilePlus2, tone: 'teal' },
    { label: 'Approved Applications', value: counts.approved, icon: CheckCircle2, tone: 'green' },
    { label: 'Disbursed Applications', value: counts.disbursed, icon: Banknote, tone: 'blue' },
  ];

  return (
    <AppShell title="Gold Loan Dashboard">
      <div className="loan-dashboard">
        {persistenceError && (
          <div className="bank-master-alert" role="alert">{persistenceError}</div>
        )}
        {saveNotice && <div className="bank-master-alert" role="status">{saveNotice}</div>}
        <PageHeader
          title="Gold Loan Dashboard"
          action={(
            <button
              className="primary-button apply-button"
              type="button"
              onClick={() => router.push('/gold_loan_application/apply')}
            >
              <Coins size={16} aria-hidden="true" />
              Apply for Gold Loan
            </button>
          )}
        />

        <section className="loan-metrics" aria-label="Gold Loan application summary">
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
            <div><h2>Gold Loan Applications</h2></div>
            <span className="sample-data-label">Development sample data</span>
          </div>

          <form
            className="loan-search-row"
            onSubmit={(event) => {
              event.preventDefault();
              setSearchTerm(searchInput);
              setCurrentPage(1);
            }}
          >
            <label className="loan-search">
              <Search size={17} aria-hidden="true" />
              <input
                type="search"
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                placeholder="Search by application ID, customer, customer ID, or account number"
                aria-label="Search Gold Loan applications"
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
          ) : !loaded ? (
            <div className="loan-table-message" role="status">Loading Gold Loan applications...</div>
          ) : filteredApplications.length === 0 ? (
            <div className="loan-table-message">
              <FilePlus2 size={22} aria-hidden="true" />
              <strong>
                {applications.length === 0
                  ? 'No Gold Loan applications yet'
                  : 'No applications match your search'}
              </strong>
              <span>
                {applications.length === 0
                  ? 'Applications will appear here when they are available.'
                  : 'Try another application ID, customer name, customer ID, or account number.'}
              </span>
            </div>
          ) : (
            <>
              <div className="loan-table-scroll">
                <table className="loan-applications-table">
                  <thead>
                    <tr>
                      <th scope="col">Sr. No.</th>
                      <th scope="col">Application ID</th>
                      <th scope="col">Customer Name</th>
                      <th scope="col">Customer ID</th>
                      <th scope="col">Loan Account Number</th>
                      <th scope="col">Loan Amount</th>
                      <th scope="col">Application Date</th>
                      <th scope="col">Branch</th>
                      <th scope="col">Status</th>
                      <th scope="col">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pageApplications.map((application, index) => {
                      const id = getApplicationId(application);
                      return (
                        <tr key={id}>
                          <td>{(currentPage - 1) * PAGE_SIZE + index + 1}</td>
                          <td><strong className="application-id">{id}</strong></td>
                          <td>{getCustomerName(application)}</td>
                          <td>{application.customerId || application.goldLoanForm?.customerId || 'Not available'}</td>
                          <td>{application.goldLoanForm?.loanAccountNumber || 'Not available'}</td>
                          <td className="loan-amount">{formatAmount(application.amount)}</td>
                          <td>{formatApplicationDate(application.applicationDate || application.createdAt || application.date)}</td>
                          <td>{application.branch || application.goldLoanForm?.branch || 'Not available'}</td>
                          <td>
                            <span className={`loan-status ${getStatusClass(application.status)}`}>
                              {getStatusLabel(application.status)}
                            </span>
                          </td>
                          <td>
                            <div className="application-actions">
                              <button
                                className="application-action-button"
                                type="button"
                                onClick={() => router.push(`/gold_loan_application/view/${encodeURIComponent(id)}`)}
                                aria-label={`View Gold Loan application ${id}`}
                                title="View application"
                              >
                                <Eye size={16} aria-hidden="true" />
                              </button>
                              <button
                                className="application-action-button"
                                type="button"
                                onClick={() => router.push(`/gold_loan_application/edit/${encodeURIComponent(id)}`)}
                                aria-label={`Edit Gold Loan application ${id}`}
                                title="Edit application"
                              >
                                <Pencil size={15} aria-hidden="true" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="loan-pagination" aria-label="Gold Loan application pagination">
                <span>
                  Showing {(currentPage - 1) * PAGE_SIZE + 1}
                  {' - '}
                  {Math.min(currentPage * PAGE_SIZE, filteredApplications.length)}
                  {' of '}
                  {filteredApplications.length}
                </span>
                <div>
                  <button
                    className="secondary-button"
                    type="button"
                    onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                    disabled={currentPage === 1}
                    aria-label="Previous page"
                  >
                    <ChevronLeft size={15} aria-hidden="true" />
                    Previous
                  </button>
                  <span aria-live="polite">Page {currentPage} of {pageCount}</span>
                  <button
                    className="secondary-button"
                    type="button"
                    onClick={() => setCurrentPage((page) => Math.min(pageCount, page + 1))}
                    disabled={currentPage === pageCount}
                    aria-label="Next page"
                  >
                    Next
                    <ChevronRight size={15} aria-hidden="true" />
                  </button>
                </div>
              </div>
            </>
          )}

          {loaded && applications.length > 0 && (
            <p className="data-note">
              These records come from the existing in-project application data and saved browser changes.
            </p>
          )}
        </Card>
      </div>
      <LoanDashboardStyles />
      <style jsx>{`
        .loan-pagination {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          padding: 14px 0 0;
          color: #718185;
          font-size: 11px;
        }

        .loan-pagination > div {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .loan-pagination button {
          display: inline-flex;
          align-items: center;
          gap: 5px;
        }

        .loan-pagination button:disabled {
          cursor: not-allowed;
          opacity: .5;
        }

        @media (max-width: 640px) {
          .loan-pagination {
            align-items: flex-start;
            flex-direction: column;
          }

          .loan-pagination > div {
            width: 100%;
            justify-content: space-between;
          }
        }
      `}</style>
    </AppShell>
  );
}
