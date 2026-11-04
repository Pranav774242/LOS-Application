'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Eye, FilePlus2, Mail, Pencil, Search, Trash2, UserRound, UsersRound, X } from 'lucide-react';
import AppShell from '../../components/AppShell';
import Card from '../../components/Card';
import Modal from '../../components/Modal';
import { api } from '../../services/api.js';

const getInitials = (name) => name.split(/\s+/).map((part) => part[0]).join('').slice(0, 2).toUpperCase();
const CUSTOMER_STORAGE_KEY = 'los_customer_management_records';

function readCustomers() {
  try {
    const stored = window.localStorage.getItem(CUSTOMER_STORAGE_KEY);
    const parsed = stored ? JSON.parse(stored) : null;
    return Array.isArray(parsed) ? parsed : api.customers;
  } catch {
    return api.customers;
  }
}

export default function CustomerManagementPage() {
  const [customers, setCustomers] = useState(api.customers);
  const [search, setSearch] = useState('');
  const [kycFilter, setKycFilter] = useState('All');
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [deleteCustomer, setDeleteCustomer] = useState(null);
  const [formError, setFormError] = useState('');
  const [editForm, setEditForm] = useState({ name: '', phone: '', email: '', type: 'Individual', kyc: 'Pending' });

  useEffect(() => setCustomers(readCustomers()), []);

  const storeCustomers = (nextCustomers) => {
    setCustomers(nextCustomers);
    try {
      window.localStorage.setItem(CUSTOMER_STORAGE_KEY, JSON.stringify(nextCustomers));
    } catch {
      setFormError('Changes could not be saved in this browser.');
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

  const openEditor = (customer) => {
    setEditForm({
      name: customer.name || '',
      phone: customer.phone || '',
      email: customer.email || '',
      type: customer.type || 'Individual',
      kyc: customer.kyc || 'Pending'
    });
    setFormError('');
    setEditingCustomer(customer);
  };

  const updateCustomer = (event) => {
    event.preventDefault();
    const name = editForm.name.trim();
    const phone = editForm.phone.trim();
    const email = editForm.email.trim();
    if (name.length < 2) {
      setFormError('Enter a customer name with at least 2 characters.');
      return;
    }
    if (!phone) {
      setFormError('Phone number is required.');
      return;
    }
    if (customers.some((customer) => customer.id !== editingCustomer.id && customer.phone === phone)) {
      setFormError('A customer with this phone number already exists.');
      return;
    }
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setFormError('Enter a valid email address.');
      return;
    }

    storeCustomers(customers.map((customer) => customer.id === editingCustomer.id
      ? { ...customer, ...editForm, name, phone, email, initials: getInitials(name) }
      : customer));
    setFormError('');
    setEditingCustomer(null);
  };

  const closeEditor = () => {
    setEditingCustomer(null);
    setFormError('');
  };

  const confirmDelete = () => {
    storeCustomers(customers.filter((customer) => customer.id !== deleteCustomer.id));
    if (selectedCustomer?.id === deleteCustomer.id) setSelectedCustomer(null);
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
                    <button className="icon-button" type="button" onClick={() => setSelectedCustomer(customer)} aria-label={`View ${customer.name}`} title="View customer"><Eye size={16} /></button>
                    <button className="icon-button" type="button" onClick={() => openEditor(customer)} aria-label={`Edit ${customer.name}`} title="Edit customer"><Pencil size={15} /></button>
                    <button className="icon-button customer-delete" type="button" onClick={() => setDeleteCustomer(customer)} aria-label={`Delete ${customer.name}`} title="Delete customer"><Trash2 size={15} /></button>
                  </div></td>
                </tr>
              ))}
              {filteredCustomers.length === 0 && <tr><td colSpan="6">No customers match these filters.</td></tr>}
            </tbody>
          </table>
        </div>
      </Card>

      {selectedCustomer && (
        <Modal onClose={() => setSelectedCustomer(null)}>
          <div className="modal-header">
            <div><div className="eyebrow">CUSTOMER PROFILE</div><h2>{selectedCustomer.name}</h2></div>
            <button className="icon-button" type="button" onClick={() => setSelectedCustomer(null)} aria-label="Close customer profile"><X size={18} /></button>
          </div>
          <div className="modal-body">
            <div className="review-summary">
              <span>Customer ID<strong>{selectedCustomer.id}</strong></span>
              <span>Customer type<strong>{selectedCustomer.type}</strong></span>
              <span>KYC status<strong>{selectedCustomer.kyc}</strong></span>
              <span>Active loans<strong>{selectedCustomer.activeLoans}</strong></span>
              <span>Phone<strong>{selectedCustomer.phone}</strong></span>
              <span>Email<strong>{selectedCustomer.email || 'Not provided'}</strong></span>
            </div>
          </div>
          <div className="modal-footer"><button className="secondary-button" type="button" onClick={() => setSelectedCustomer(null)}>Close</button></div>
        </Modal>
      )}

      {editingCustomer && (
        <Modal onClose={closeEditor}>
          <form onSubmit={updateCustomer}>
            <div className="modal-header">
              <div><div className="eyebrow">CUSTOMER PROFILE</div><h2>Edit customer</h2></div>
              <button className="icon-button" type="button" onClick={closeEditor} aria-label="Close edit customer form"><X size={18} /></button>
            </div>
            <div className="modal-body">
              <div className="form-grid">
                <label>Full name<input value={editForm.name} onChange={(event) => setEditForm((current) => ({ ...current, name: event.target.value }))} required minLength={2} maxLength={100} /></label>
                <label>Customer type<select value={editForm.type} onChange={(event) => setEditForm((current) => ({ ...current, type: event.target.value }))}><option>Individual</option><option>Proprietorship</option><option>Partnership</option><option>Company</option></select></label>
                <label>Phone number<input type="tel" value={editForm.phone} onChange={(event) => setEditForm((current) => ({ ...current, phone: event.target.value }))} required /></label>
                <label>Email address<input type="email" value={editForm.email} onChange={(event) => setEditForm((current) => ({ ...current, email: event.target.value }))} /></label>
                <label>KYC status<select value={editForm.kyc} onChange={(event) => setEditForm((current) => ({ ...current, kyc: event.target.value }))}><option>Pending</option><option>Verified</option><option>Rejected</option></select></label>
              </div>
              {formError && <p role="alert" className="form-error">{formError}</p>}
            </div>
            <div className="modal-footer"><button className="secondary-button" type="button" onClick={closeEditor}>Cancel</button><button className="primary-button" type="submit">Save changes</button></div>
          </form>
        </Modal>
      )}

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
        .customer-management-toolbar{align-items:center;margin-bottom:0}.customer-management-toolbar .input-wrap{height:34px;margin-top:0}
        .customer-row-actions{display:flex;align-items:center;justify-content:flex-end;gap:4px}.customer-row-actions .icon-button{width:34px;height:34px;border:1px solid transparent}.customer-row-actions .icon-button:hover{border-color:var(--line);background:#f2f8f6;color:var(--teal)}.customer-row-actions .customer-delete:hover,.customer-delete-confirm{border-color:#b83b3b;background:#b83b3b;color:#fff}.customer-row-actions .customer-delete:hover,.customer-delete-confirm:hover{background:#992d2d;color:#fff}
      `}</style>
    </AppShell>
  );
}