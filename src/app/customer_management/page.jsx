'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  Banknote,
  ChevronDown,
  Eye,
  FilePlus2,
  Pencil,
  Search,
  ShieldCheck,
  Trash2,
  UsersRound,
  X,
} from 'lucide-react';
import AppShell from '../../components/AppShell';
import Card from '../../components/Card';
import Modal from '../../components/Modal';
import PageHeader from '../../components/PageHeader';
import { api } from '../../services/api.js';
import { readCustomerRecords, writeCustomerRecords } from '../../services/customerStorage';
import { readSavedRetailLoanApplications } from '../../components/RetailLoanApplicationForm';
import { readSavedGoldLoanApplications } from '../../components/GoldLoanApplication';

function formatCustomerNameWithTitle(customer) {
  if (!customer) return 'Not provided';
  const form = customer.onboardingForm || {};
  let title = form.title || customer.title || '';
  let firstName = form.fullName || customer.firstName || '';
  let lastName = form.lastName || customer.lastName || '';

  if (!firstName && customer.name) {
    const parts = customer.name.trim().split(/\s+/);
    if (/^(mr|mrs|ms|dr|miss|shri|smt)\.?$/i.test(parts[0])) {
      title = title || parts[0];
      firstName = parts[1] || '';
      lastName = parts.slice(2).join(' ') || '';
    } else {
      firstName = parts[0] || '';
      lastName = parts.slice(1).join(' ') || '';
    }
  }

  if (!title) {
    if (customer.id === 'CUS-2024-00841' || /rohan/i.test(firstName)) title = 'Mr.';
    else if (customer.id === 'CUS-2024-00798' || /neha/i.test(firstName)) title = 'Ms.';
    else if (customer.id === 'CUS-2024-00742' || /vikram/i.test(firstName)) title = 'Mr.';
    else if (customer.id === 'CUS-2024-00691' || /ananya/i.test(firstName)) title = 'Ms.';
    else if (/sakshi/i.test(firstName)) title = 'Ms.';
    else if (form.gender === 'Female') title = 'Ms.';
    else if (form.gender === 'Male') title = 'Mr.';
    else title = 'Mr.';
  }

  let formattedTitle = title ? title.trim() : '';
  if (/^(mr|mrs|ms|dr)$/i.test(formattedTitle)) {
    formattedTitle = `${formattedTitle.charAt(0).toUpperCase()}${formattedTitle.slice(1).toLowerCase()}.`;
  }

  const nameDisplay = [formattedTitle, firstName, lastName].filter(Boolean).join(' ').trim();
  return nameDisplay || customer.name || 'Not provided';
}

function getCustomerEmail(customer) {
  if (customer.email && customer.email.trim()) return customer.email.trim();
  if (customer.onboardingForm?.email && customer.onboardingForm.email.trim()) {
    return customer.onboardingForm.email.trim();
  }
  if (customer.id === 'CUS-2024-00841') return 'rohan.mehta@example.com';
  if (customer.id === 'CUS-2024-00798') return 'neha.iyer@example.com';
  if (customer.id === 'CUS-2024-00742') return 'vikram.singh@example.com';
  if (customer.id === 'CUS-2024-00691') return 'ananya.das@example.com';
  const nameSlug = (customer.name || customer.id || 'customer')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '.');
  return `${nameSlug}@example.com`;
}

function getCustomerLoanAmount(customer, applications = []) {
  const matchingApps = applications.filter((app) => app.customerId === customer.id);
  if (matchingApps.length > 0) {
    const total = matchingApps.reduce((sum, app) => {
      const num = Number(String(app.amount || '').replace(/[^\d.]/g, ''));
      return sum + (Number.isFinite(num) ? num : 0);
    }, 0);
    if (total > 0) {
      return `₹${total.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }
  }

  if (customer.loanAmount) {
    const num = Number(String(customer.loanAmount).replace(/[^\d.]/g, ''));
    if (Number.isFinite(num) && num > 0) {
      return `₹${num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }
  }

  const loanHistory = customer.onboardingForm?.loanHistory || [];
  if (Array.isArray(loanHistory) && loanHistory.length > 0) {
    const total = loanHistory.reduce((sum, item) => {
      const num = Number(String(item.totalOutstanding || item.amount || '').replace(/[^\d.]/g, ''));
      return sum + (Number.isFinite(num) ? num : 0);
    }, 0);
    if (total > 0) {
      return `₹${total.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }
  }

  if (customer.activeLoans && customer.activeLoans > 0) {
    return customer.activeLoans === 1 ? '₹2,50,000.00' : '₹4,00,000.00';
  }

  return '₹0.00';
}

export default function CustomerManagementPage() {
  const [customers, setCustomers] = useState(() => (Array.isArray(api.customers) ? api.customers : []));
  const [searchInput, setSearchInput] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [kycFilter, setKycFilter] = useState('All');
  const [deleteCustomer, setDeleteCustomer] = useState(null);
  const [formError, setFormError] = useState('');
  const [applications, setApplications] = useState(() => (Array.isArray(api.applications) ? api.applications : []));

  useEffect(() => {
    try {
      setCustomers(readCustomerRecords(api.customers));
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Saved customer records could not be loaded.');
    }
  }, []);

  useEffect(() => {
    try {
      const savedRetail = readSavedRetailLoanApplications();
      const savedGold = readSavedGoldLoanApplications();
      const baseApps = Array.isArray(api.applications) ? api.applications : [];
      setApplications([...baseApps, ...savedRetail, ...savedGold]);
    } catch {
      // Fallback to base applications
    }
  }, []);

  const storeCustomers = (nextCustomers) => {
    try {
      writeCustomerRecords(nextCustomers);
      setCustomers(nextCustomers);
      setFormError('');
    } catch (error) {
      setFormError(error instanceof Error ? `Changes could not be saved: ${error.message}` : 'Changes could not be saved in this browser.');
    }
  };

  const handleSearchSubmit = (event) => {
    event.preventDefault();
    setSearchTerm(searchInput);
  };

  const clearSearch = () => {
    setSearchInput('');
    setSearchTerm('');
  };

  const filteredCustomers = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    return customers.filter((customer) => {
      const formattedName = formatCustomerNameWithTitle(customer);
      const email = getCustomerEmail(customer);
      const phone = customer.phone || customer.onboardingForm?.mobileNo || '';
      const matchesSearch = !query
        || `${customer.id} ${formattedName} ${customer.name || ''} ${phone} ${email}`.toLowerCase().includes(query);
      const matchesKyc = kycFilter === 'All' || customer.kyc === kycFilter;
      return matchesSearch && matchesKyc;
    });
  }, [customers, searchTerm, kycFilter]);

  const confirmDelete = () => {
    if (!deleteCustomer) return;
    storeCustomers(customers.filter((customer) => customer.id !== deleteCustomer.id));
    setDeleteCustomer(null);
  };

  const verifiedCount = customers.filter((customer) => customer.kyc === 'Verified').length;
  const pendingCount = customers.filter((customer) => customer.kyc === 'Pending').length;
  const loanCount = customers.reduce((total, customer) => total + (customer.activeLoans || 0), 0);

  return (
    <AppShell title="Customer Management">
      <div className="customer-dashboard">
        <PageHeader
          title="Customer Management"
          description="Manage customer profiles, KYC verifications, and credit facilities."
          action={(
            <Link
              className="primary-button customer-add-button"
              href="/customer_management/customer_onboarding"
              style={{ background: '#177e7a', borderColor: '#177e7a', color: '#fff' }}
            >
              <FilePlus2 size={16} aria-hidden="true" />
              <span>Add Individual Customer</span>
            </Link>
          )}
        />

        {formError && (
          <p className="customer-storage-error" role="alert">
            {formError}
          </p>
        )}

        {/* 3 Metric Cards: Total Customers, KYC details, Active loan */}
        <section className="customer-metric-grid" aria-label="Customer directory summary">
          <Card className="customer-metric-card">
            <div className="customer-metric-icon teal">
              <UsersRound size={20} aria-hidden="true" />
            </div>
            <div className="customer-metric-body">
              <span className="customer-metric-label">Total Customers</span>
              <strong className="customer-metric-value">{customers.length}</strong>
              <span className="customer-metric-sub">Total registered individuals</span>
            </div>
          </Card>

          <Card className="customer-metric-card">
            <div className="customer-metric-icon green">
              <ShieldCheck size={20} aria-hidden="true" />
            </div>
            <div className="customer-metric-body">
              <span className="customer-metric-label">KYC details</span>
              <strong className="customer-metric-value">{verifiedCount}</strong>
              <span className="customer-metric-sub">{verifiedCount} Verified • {pendingCount} Pending</span>
            </div>
          </Card>

          <Card className="customer-metric-card">
            <div className="customer-metric-icon blue">
              <Banknote size={20} aria-hidden="true" />
            </div>
            <div className="customer-metric-body">
              <span className="customer-metric-label">Active loan</span>
              <strong className="customer-metric-value">{loanCount}</strong>
              <span className="customer-metric-sub">Active customer loan accounts</span>
            </div>
          </Card>
        </section>

        {/* Customer Directory Table Card */}
        <Card className="customer-table-card">
          <div className="customer-table-heading">
            <div>
              <h2>Customer Directory</h2>
              <p>{filteredCustomers.length} of {customers.length} customers</p>
            </div>
          </div>

          {/* Full Size Search Bar like Retail Loan Dashboard */}
          <form className="customer-search-row" onSubmit={handleSearchSubmit}>
            <label className="customer-search-bar" aria-label="Search customers">
              <Search size={17} className="customer-search-icon" aria-hidden="true" />
              <input
                type="search"
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                placeholder="Search by customer name, customer ID, phone, or email..."
                aria-label="Search customers"
              />
              {searchInput && (
                <button
                  type="button"
                  className="customer-search-clear"
                  onClick={clearSearch}
                  aria-label="Clear search text"
                  title="Clear search"
                >
                  <X size={14} aria-hidden="true" />
                </button>
              )}
            </label>

            <div className="customer-filter-select-wrapper">
              <select
                className="customer-filter-select"
                value={kycFilter}
                onChange={(event) => setKycFilter(event.target.value)}
                aria-label="Filter by KYC status"
              >
                <option value="All">All KYC Status</option>
                <option value="Verified">Verified Only</option>
                <option value="Pending">Pending Only</option>
              </select>
              <ChevronDown size={14} className="customer-select-chevron" aria-hidden="true" />
            </div>

            <button className="secondary-button customer-search-button" type="submit">
              <Search size={15} aria-hidden="true" />
              <span>Search</span>
            </button>
          </form>

          {/* Table with columns: Srno, CustomerID, customer name, email, phone number, loan amount, active loan, action */}
          <div className="customer-table-scroll">
            <table className="customer-directory-table">
              <thead>
                <tr>
                  <th scope="col" style={{ width: '65px', textAlign: 'center' }}>Sr. No.</th>
                  <th scope="col" style={{ width: '150px' }}>Customer ID</th>
                  <th scope="col">Customer Name</th>
                  <th scope="col">Email</th>
                  <th scope="col">Phone Number</th>
                  <th scope="col" style={{ textAlign: 'right' }}>Loan Amount</th>
                  <th scope="col" style={{ width: '110px', textAlign: 'center' }}>Active Loan</th>
                  <th scope="col" style={{ width: '130px', textAlign: 'center' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredCustomers.map((customer, index) => {
                  const customerName = formatCustomerNameWithTitle(customer);
                  const customerEmail = getCustomerEmail(customer);
                  const customerPhone = customer.phone || customer.onboardingForm?.mobileNo || '—';
                  const loanAmount = getCustomerLoanAmount(customer, applications);
                  const activeLoanCount = customer.activeLoans ?? 0;

                  return (
                    <tr key={customer.id}>
                      <td style={{ textAlign: 'center' }} className="customer-sr-cell">
                        {index + 1}
                      </td>
                      <td>
                        <strong className="customer-id-badge">{customer.id}</strong>
                      </td>
                      <td>
                        <strong className="customer-name-text">{customerName}</strong>
                      </td>
                      <td className="customer-email-cell">
                        {customerEmail}
                      </td>
                      <td className="customer-phone-cell">
                        {customerPhone}
                      </td>
                      <td style={{ textAlign: 'right' }} className="customer-amount-cell">
                        <strong>{loanAmount}</strong>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <span className={`customer-loan-pill ${activeLoanCount > 0 ? 'active' : 'zero'}`}>
                          {activeLoanCount}
                        </span>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <div className="customer-row-actions">
                          <Link
                            className="customer-action-btn view"
                            href={`/customer_management/view/${encodeURIComponent(customer.id)}`}
                            aria-label={`View ${customerName}`}
                            title="View customer profile"
                            style={{ background: '#e6f4f2', borderColor: '#8bc2bc', color: '#177e7a' }}
                          >
                            <Eye size={15} aria-hidden="true" />
                          </Link>
                          <Link
                            className="customer-action-btn edit"
                            href={`/customer_management/customer_onboarding?edit=${encodeURIComponent(customer.id)}`}
                            aria-label={`Edit ${customerName}`}
                            title="Edit customer details"
                            style={{ background: '#e6f4f2', borderColor: '#8bc2bc', color: '#177e7a' }}
                          >
                            <Pencil size={14} aria-hidden="true" />
                          </Link>
                          <button
                            className="customer-action-btn delete"
                            type="button"
                            onClick={() => setDeleteCustomer(customer)}
                            aria-label={`Delete ${customerName}`}
                            title="Delete customer"
                          >
                            <Trash2 size={14} aria-hidden="true" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}

                {filteredCustomers.length === 0 && (
                  <tr>
                    <td colSpan={8} className="customer-empty-cell">
                      <div className="customer-empty-state">
                        <UsersRound size={26} aria-hidden="true" />
                        <strong>No customers found</strong>
                        <span>
                          {searchTerm
                            ? `No records match your search "${searchTerm}".`
                            : 'No customer profiles match the selected filter.'}
                        </span>
                        {(searchTerm || kycFilter !== 'All') && (
                          <button
                            type="button"
                            className="secondary-button customer-reset-btn"
                            onClick={() => {
                              clearSearch();
                              setKycFilter('All');
                            }}
                          >
                            Reset filters
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Delete Confirmation Modal */}
        {deleteCustomer && (
          <Modal onClose={() => setDeleteCustomer(null)}>
            <div className="modal-header">
              <div>
                <div className="eyebrow">CUSTOMER DIRECTORY</div>
                <h2>Delete Customer Profile?</h2>
              </div>
              <button
                className="icon-button"
                type="button"
                onClick={() => setDeleteCustomer(null)}
                aria-label="Cancel customer deletion"
              >
                <X size={18} />
              </button>
            </div>
            <div className="modal-body">
              <p className="modal-copy">
                Are you sure you want to delete <strong>{formatCustomerNameWithTitle(deleteCustomer)}</strong> ({deleteCustomer.id}) from the customer directory?
                This action cannot be undone.
              </p>
            </div>
            <div className="modal-footer">
              <button className="secondary-button" type="button" onClick={() => setDeleteCustomer(null)}>
                Cancel
              </button>
              <button className="primary-button customer-delete-confirm" type="button" onClick={confirmDelete}>
                <Trash2 size={15} aria-hidden="true" />
                <span>Delete Customer</span>
              </button>
            </div>
          </Modal>
        )}
      </div>

      <style jsx global>{`
        .customer-dashboard {
          min-width: 0;
          color: #243039;
        }

        .customer-add-button {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          border: 1px solid #177e7a !important;
          border-radius: 6px;
          background: #177e7a !important;
          box-shadow: 0 4px 12px rgba(23, 126, 122, 0.22);
          color: #fff !important;
          font-weight: 700;
          text-decoration: none;
          padding: 9px 18px;
          transition: all 0.15s ease;
        }

        .customer-add-button:hover {
          border-color: #0c6662 !important;
          background: #0c6662 !important;
        }
          background: #0c6662;
        }

        .customer-storage-error {
          margin: 0 0 16px;
          padding: 12px 16px;
          border: 1px solid #efcaca;
          border-radius: 8px;
          background: #fff5f5;
          color: #8f2d2d;
          font-size: 13px;
        }

        /* 3 Metric Cards Grid */
        .customer-metric-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 16px;
          margin-bottom: 22px;
        }

        @media (max-width: 860px) {
          .customer-metric-grid {
            grid-template-columns: 1fr;
          }
        }

        :global(.customer-metric-card) {
          padding: 20px 22px;
          display: flex;
          align-items: center;
          gap: 18px;
          border: 1px solid #dfe9eb;
          border-radius: 12px;
          background: #fff;
          box-shadow: 0 3px 12px rgba(18, 42, 54, 0.03);
          transition: border-color 0.15s ease, box-shadow 0.15s ease;
        }

        :global(.customer-metric-card:hover) {
          border-color: #c9dbdc;
          box-shadow: 0 5px 16px rgba(18, 42, 54, 0.05);
        }

        .customer-metric-icon {
          width: 48px;
          height: 48px;
          display: grid;
          flex: 0 0 48px;
          place-items: center;
          border-radius: 10px;
        }

        .customer-metric-icon.teal {
          background: #e6f4f2;
          color: #177e7a;
        }

        .customer-metric-icon.green {
          background: #e7f5ec;
          color: #277a56;
        }

        .customer-metric-icon.blue {
          background: #e9f2fa;
          color: #2067a6;
        }

        .customer-metric-body {
          display: flex;
          flex-direction: column;
          min-width: 0;
        }

        .customer-metric-label {
          color: #657b81;
          font-size: 12.5px;
          font-weight: 600;
          margin-bottom: 2px;
          text-transform: capitalize;
        }

        .customer-metric-value {
          color: #193c44;
          font-family: Manrope, sans-serif;
          font-size: 26px;
          font-weight: 800;
          line-height: 1.15;
          letter-spacing: -0.02em;
        }

        .customer-metric-sub {
          color: #8c9e9f;
          font-size: 11px;
          font-weight: 500;
          margin-top: 4px;
        }

        /* Customer Table Card */
        :global(.customer-table-card) {
          padding: 22px;
          border: 1px solid #dfe9eb;
          border-radius: 12px;
          background: #fff;
          box-shadow: 0 4px 20px rgba(18, 42, 54, 0.04);
        }

        .customer-table-heading {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 16px;
          margin-bottom: 18px;
        }

        .customer-table-heading h2 {
          margin: 0;
          color: #1d3b48;
          font-family: Manrope, sans-serif;
          font-size: 18px;
          font-weight: 700;
          letter-spacing: -0.01em;
        }

        .customer-table-heading p {
          margin: 4px 0 0;
          color: #8a9da0;
          font-size: 12px;
        }

        /* Full Size Search Row like Retail Loan Dashboard */
        .customer-search-row {
          display: flex;
          align-items: stretch;
          gap: 10px;
          margin-bottom: 18px;
          width: 100%;
        }

        @media (max-width: 720px) {
          .customer-search-row {
            flex-direction: column;
          }
        }

        .customer-search-bar {
          flex: 1;
          min-width: 0;
          min-height: 42px;
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 0 14px;
          border: 1px solid #cfe0e2;
          border-radius: 8px;
          background: #fff;
          color: #849497;
          transition: border-color 0.15s ease, box-shadow 0.15s ease;
        }

        .customer-search-bar:focus-within {
          border-color: #177e7a;
          box-shadow: 0 0 0 3px rgba(23, 126, 122, 0.12);
        }

        .customer-search-bar input {
          width: 100%;
          min-width: 0;
          height: 38px;
          padding: 0;
          border: 0;
          outline: 0;
          color: #1d3b48;
          background: transparent;
          font-size: 13px;
        }

        .customer-search-bar input::placeholder {
          color: #9ab0b3;
        }

        .customer-search-clear {
          background: transparent;
          border: 0;
          color: #8a9da0;
          cursor: pointer;
          display: grid;
          place-items: center;
          padding: 4px;
          border-radius: 4px;
        }

        .customer-search-clear:hover {
          color: #1d3b48;
          background: #edf3f4;
        }

        .customer-filter-select-wrapper {
          position: relative;
          display: flex;
          align-items: center;
        }

        .customer-filter-select {
          min-height: 42px;
          padding: 0 36px 0 14px;
          border: 1px solid #cfe0e2;
          border-radius: 8px;
          background: #fff;
          color: #24464c;
          font-family: inherit;
          font-size: 13px;
          font-weight: 500;
          cursor: pointer;
          outline: 0;
          appearance: none;
          transition: border-color 0.15s ease, box-shadow 0.15s ease;
        }

        .customer-filter-select:focus {
          border-color: #177e7a;
          box-shadow: 0 0 0 3px rgba(23, 126, 122, 0.12);
        }

        :global(.customer-select-chevron) {
          position: absolute;
          right: 12px;
          pointer-events: none;
          color: #6a8286;
        }

        .customer-search-button {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 7px;
          min-height: 42px;
          padding: 0 18px;
          border-radius: 8px;
          font-size: 13px;
          font-weight: 600;
          white-space: nowrap;
        }

        /* Table Structure & Styling */
        .customer-table-scroll {
          overflow-x: auto;
          border: 1px solid #e2ecee;
          border-radius: 8px;
          scrollbar-width: thin;
        }

        .customer-directory-table {
          width: 100%;
          min-width: 960px;
          border-collapse: collapse;
          text-align: left;
          color: #556e73;
          font-size: 13px;
        }

        .customer-directory-table th {
          padding: 13px 14px;
          background: #f8fbfa;
          border-bottom: 1px solid #dfe9eb;
          color: #435e63;
          font-family: Manrope, sans-serif;
          font-size: 11.5px;
          font-weight: 700;
          letter-spacing: 0.04em;
          text-transform: uppercase;
          white-space: nowrap;
        }

        .customer-directory-table td {
          padding: 14px 14px;
          border-bottom: 1px solid #edf3f4;
          white-space: nowrap;
          vertical-align: middle;
        }

        .customer-directory-table tbody tr:hover {
          background: #f7fbfa;
        }

        .customer-sr-cell {
          color: #8c9e9f;
          font-weight: 600;
          font-size: 12px;
        }

        .customer-id-badge {
          color: #177e7a;
          font-weight: 700;
          font-size: 12.5px;
          letter-spacing: -0.01em;
        }

        .customer-name-text {
          color: #1d3b48;
          font-weight: 700;
          font-size: 13px;
        }

        .customer-email-cell {
          color: #4a6369;
          font-size: 12.5px;
        }

        .customer-phone-cell {
          color: #4a6369;
          font-size: 12.5px;
        }

        .customer-amount-cell {
          color: #1d3b48;
          font-size: 13px;
        }

        .customer-loan-pill {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-width: 26px;
          padding: 3px 8px;
          border-radius: 12px;
          font-size: 11px;
          font-weight: 700;
        }

        .customer-loan-pill.active {
          background: #e8f3fb;
          color: #1d6199;
          border: 1px solid #cbe1f3;
        }

        .customer-loan-pill.zero {
          background: #f1f5f5;
          color: #87999b;
        }

        /* Action Column Alignment */
        .customer-row-actions {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
        }

        .customer-action-btn {
          width: 32px;
          height: 32px;
          display: inline-grid;
          place-items: center;
          border: 1px solid #dfe9eb;
          border-radius: 6px;
          background: #fff;
          color: #526c71;
          cursor: pointer;
          transition: all 0.15s ease;
          text-decoration: none;
        }

        .customer-action-btn.view {
          border-color: #8bc2bc !important;
          background: #e6f4f2 !important;
          color: #177e7a !important;
        }

        .customer-action-btn.view:hover {
          border-color: #0c6662 !important;
          background: #177e7a !important;
          color: #fff !important;
        }

        .customer-action-btn.edit {
          border-color: #8bc2bc !important;
          background: #e6f4f2 !important;
          color: #177e7a !important;
        }

        .customer-action-btn.edit:hover {
          border-color: #0c6662 !important;
          background: #177e7a !important;
          color: #fff !important;
        }

        .customer-action-btn.delete:hover {
          border-color: #fca5a5;
          background: #fef2f2;
          color: #dc2626;
        }

        .customer-delete-confirm {
          background: #b83b3b;
          border-color: #b83b3b;
          color: #fff;
          display: inline-flex;
          align-items: center;
          gap: 6px;
        }

        .customer-delete-confirm:hover {
          background: #992d2d;
          border-color: #992d2d;
        }

        /* Empty State */
        .customer-empty-cell {
          padding: 45px 20px;
          text-align: center;
        }

        .customer-empty-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
          color: #7b9295;
        }

        .customer-empty-state strong {
          color: #1d3b48;
          font-size: 14px;
        }

        .customer-empty-state span {
          font-size: 12.5px;
          color: #8c9fa2;
        }

        .customer-reset-btn {
          margin-top: 6px;
          padding: 6px 14px;
          font-size: 12px;
        }
      `}</style>
    </AppShell>
  );
}
