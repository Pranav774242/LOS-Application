'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Eye, FilePlus2, Mail, Pencil, Search, Trash2, UserRound, UsersRound, X } from 'lucide-react';
import AppShell from '../../components/AppShell';
import Card from '../../components/Card';
import Modal from '../../components/Modal';
import { api } from '../../services/api.js';
import { readCustomerRecords, writeCustomerRecords } from '../../services/customerStorage';

export default function CustomerManagementPage() {
  const [customers, setCustomers] = useState(api.customers);
  const [search, setSearch] = useState('');
  const [kycFilter, setKycFilter] = useState('All');
  const [deleteCustomer, setDeleteCustomer] = useState(null);
  const [formError, setFormError] = useState('');

  useEffect(() => {
    try {
      setCustomers(readCustomerRecords(api.customers));
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Saved customer records could not be loaded.');
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

  const filteredCustomers = useMemo(() => {
    const query = search.trim().toLowerCase();
    return customers.filter((customer) => {
      const matchesSearch = !query || `${customer.id} ${customer.name} ${customer.phone} ${customer.email || ''}`.toLowerCase().includes(query);
      const matchesKyc = kycFilter === 'All' || customer.kyc === kycFilter;
      return matchesSearch && matchesKyc;
    });
  }, [customers, search, kycFilter]);

  const confirmDelete = () => {
    storeCustomers(customers.filter((customer) => customer.id !== deleteCustomer.id));
    setDeleteCustomer(null);
  };

  const verifiedCount = customers.filter((customer) => customer.kyc === 'Verified').length;
  const pendingCount = customers.filter((customer) => customer.kyc === 'Pending').length;
  const loanCount = customers.reduce((total, customer) => total + customer.activeLoans, 0);
  return (
    <AppShell title="Customer Management">
      <div style={{ marginTop: '-15px', marginBottom: '26px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 style={{ margin: 0, color: '#23474C', font: '700 23px Manrope' }}>Customer Management</h1>
        <Link className="primary-button customer-add-button" href="/customer_management/customer_onboarding"><FilePlus2 size={16} /> Add Individual Customer</Link>
      </div>

      {formError && <p className="customer-storage-error" role="alert">{formError}</p>}

      <div className="metric-grid">
        <div className="metric-card"><div className="metric-icon teal"><UsersRound size={17} /></div><div className="metric-label">Total customers</div><div className="metric-value">{customers.length}</div></div>
        <div className="metric-card"><div className="metric-icon green"><UserRound size={17} /></div><div className="metric-label">KYC verified</div><div className="metric-value">{verifiedCount}</div></div>
        <div className="metric-card"><div className="metric-icon amber"><Eye size={17} /></div><div className="metric-label">KYC pending</div><div className="metric-value">{pendingCount}</div></div>
        <div className="metric-card"><div className="metric-icon blue"><Mail size={17} /></div><div className="metric-label">Active loans</div><div className="metric-value">{loanCount}</div></div>
      </div>

      <Card className="table-panel">
        <div className="panel-heading">
          <div><h2>Customer directory</h2><p>{filteredCustomers.length} of {customers.length} customers</p></div>
          <div className="workspace-toolbar customer-management-toolbar">
            <label className="input-wrap" aria-label="Search customers"><Search size={16} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search name, ID, or phone" /></label>
            <select className="filter-select" value={kycFilter} onChange={(event) => setKycFilter(event.target.value)} aria-label="Filter by KYC status">
              <option>All</option><option>Verified</option><option>Pending</option>
            </select>
          </div>
        </div>

        <div className="table-scroll">
          
          <table>
            <thead><tr><th>Customer</th><th>Type</th><th>Phone</th><th>KYC status</th><th>Active loans</th><th>Action</th></tr></thead>
            <tbody>
              {filteredCustomers.map((customer) => (
                <tr key={customer.id}>
                  <td><strong>{customer.name}</strong><span className="sub-text">{customer.id}</span></td>
                  <td>{customer.type}</td>
                  <td>{customer.phone}</td>
                  <td><span className={`status ${customer.kyc === 'Verified' ? 'status-green' : 'status-amber'}`}>{customer.kyc}</span></td>
                  <td>{customer.activeLoans}</td>
                  <td><div className="customer-row-actions">
                    <Link className="icon-button" href={`/customer_management/view/${encodeURIComponent(customer.id)}`} aria-label={`View ${customer.name}`} title="View customer"><Eye size={16} /></Link>
                    <Link className="icon-button" href={`/customer_management/customer_onboarding?edit=${encodeURIComponent(customer.id)}`} aria-label={`Edit ${customer.name}`} title="Edit customer"><Pencil size={15} /></Link>
                    <button className="icon-button customer-delete" type="button" onClick={() => setDeleteCustomer(customer)} aria-label={`Delete ${customer.name}`} title="Delete customer"><Trash2 size={15} /></button>
                  </div></td>
                </tr>
              ))}
              {filteredCustomers.length === 0 && <tr><td colSpan="6">No customers match these filters.</td></tr>}
            </tbody>
          </table>
        </div>
      </Card>

      {deleteCustomer && (
        <Modal onClose={() => setDeleteCustomer(null)}>
          <div className="modal-header">
            <div><div className="eyebrow">CUSTOMER DIRECTORY</div><h2>Delete customer?</h2></div>
            <button className="icon-button" type="button" onClick={() => setDeleteCustomer(null)} aria-label="Cancel customer deletion"><X size={18} /></button>
          </div>
          <div className="modal-body"><p className="modal-copy">Delete {deleteCustomer.name} ({deleteCustomer.id}) from the customer directory? This action cannot be undone.</p></div>
          <div className="modal-footer"><button className="secondary-button" type="button" onClick={() => setDeleteCustomer(null)}>Cancel</button><button className="primary-button customer-delete-confirm" type="button" onClick={confirmDelete}><Trash2 size={15} /> Delete customer</button></div>
        </Modal>
      )}

      <style>{`
        .customer-add-button{display:inline-flex;align-items:center;gap:8px;border:0;background:#368262;box-shadow:0 4px 12px #36826225;text-decoration:none}.customer-add-button:hover{background:#2c6d52}.customer-add-button:focus-visible{outline:2px solid #368262;outline-offset:2px}
        .customer-storage-error{margin:0 0 16px;padding:11px 14px;border:1px solid #efcaca;border-radius:8px;background:#fff5f5;color:#8f2d2d;font-size:13px}
        .customer-management-toolbar{align-items:center;margin-bottom:0}.customer-management-toolbar .input-wrap{height:34px;margin-top:0}
        .customer-row-actions{display:flex;align-items:center;justify-content:flex-end;gap:4px}.customer-row-actions .icon-button{width:34px;height:34px;border:1px solid transparent;text-decoration:none}.customer-row-actions .icon-button:hover{border-color:var(--line);background:#f2f8f6;color:var(--teal)}.customer-row-actions .customer-delete:hover,.customer-delete-confirm{border-color:#b83b3b;background:#b83b3b;color:#fff}.customer-row-actions .customer-delete:hover,.customer-delete-confirm:hover{background:#992d2d;color:#fff}
      `}</style>
    </AppShell>
  );
}