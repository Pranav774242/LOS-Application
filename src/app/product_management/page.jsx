'use client';

import { useEffect, useMemo, useState } from 'react';
import { Check, Eye, LoaderCircle, Package, Pencil, Plus, Search, Trash2, X } from 'lucide-react';
import AppShell from '../../components/AppShell';
import PageHeader from '../../components/PageHeader';
import { saveProductManagementProduct } from '../../services/productManagement';

const STORAGE_KEY = 'los_product_management_records';
const initialForm = {
  productCode: '', productName: '', emi: '', emiType: '', minTenure: '', minTenureUnit: 'Months', maxTenure: '', maxTenureUnit: 'Months',
  minAmount: '', maxAmount: '', penalty: '', penaltyPercent: '', daysInYear: '', intBaseMethod: '', interestFrequency: '', calculationMode: '',
  delegationPower: [{ id: 1, limit: '', power: '' }]
};

const fieldList = [
  ['productCode', 'Product Code'], ['productName', 'Product Name'], ['emi', 'E.M.I.'], ['emiType', 'E.M.I. Type'],
  ['minTenure', 'Min. Tenure'], ['maxTenure', 'Max. Tenure'], ['minAmount', 'Min. Amount'], ['maxAmount', 'Max. Amount'],
  ['penalty', 'Penalty'], ['penaltyPercent', 'Penalty %'], ['daysInYear', 'No. of Days in a Year'], ['intBaseMethod', 'Int Base Method'],
  ['interestFrequency', 'Interest Calculation Frequency'], ['calculationMode', 'Interest Calculation Mode']
];
const directoryFieldList = [
  ['productCode', 'Product Code'], ['productName', 'Product Name'], ['emi', 'E.M.I.'], ['minTenure', 'Tenure'],
  ['minAmount', 'Amount Range'], ['penalty', 'Penalty']
];

function tenureInMonths(value, unit) {
  return Number(value) * (unit === 'Years' ? 12 : 1);
}

function formatTenure(value, unit) {
  if (!value) return '';
  const normalizedUnit = unit || 'Months';
  return `${value} ${normalizedUnit.toLowerCase().replace(/s$/, '')}${Number(value) === 1 ? '' : 's'}`;
}

function normalizeYesNo(value) {
  if (value === true || value === 'true' || value === 'Yes') return 'Yes';
  if (value === false || value === 'false' || value === 'No' || value === '') return 'No';
  return Number(value) > 0 ? 'Yes' : 'No';
}

function normalizeEmiTiming(value) {
  return ['Arrears', 'Int in Advance'].includes(value) ? value : '';
}

function readProducts() {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    const parsed = stored ? JSON.parse(stored) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function persistProducts(products) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(products));
  } catch {
    return false;
  }
  return true;
}

function validate(form, products, editingId) {
  const errors = {};
  const required = ['productCode', 'productName', 'emi', 'emiType', 'minTenure', 'maxTenure', 'minAmount', 'maxAmount', 'penalty', 'daysInYear', 'intBaseMethod', 'interestFrequency', 'calculationMode'];
  if (form.penalty === 'Yes') required.push('penaltyPercent');
  required.forEach((field) => { if (!String(form[field]).trim()) errors[field] = 'This field is required.'; });
  if (form.productCode && !/^[A-Z0-9][A-Z0-9_-]{1,19}$/i.test(form.productCode.trim())) errors.productCode = 'Use 2–20 letters, numbers, hyphens, or underscores.';
  if (form.productName && (form.productName.trim().length < 2 || form.productName.trim().length > 100)) errors.productName = 'Enter a product name between 2 and 100 characters.';
  if (form.productCode && products.some((product) => product.id !== editingId && product.productCode.toLowerCase() === form.productCode.trim().toLowerCase())) errors.productCode = 'A product with this code already exists.';
  for (const field of ['minAmount', 'maxAmount']) {
    if (form[field] && (!/^\d+(\.\d{1,2})?$/.test(form[field]) || Number(form[field]) < 0)) errors[field] = 'Enter a valid non-negative amount with up to 2 decimal places.';
  }
  for (const field of ['minTenure', 'maxTenure']) {
    if (form[field] && (!/^\d+$/.test(form[field]) || Number(form[field]) < 1 || tenureInMonths(form[field], form[`${field}Unit`]) > 480)) errors[field] = 'Enter a whole number of months or years, up to 40 years.';
  }
  if (form.minTenure && form.maxTenure && tenureInMonths(form.minTenure, form.minTenureUnit) > tenureInMonths(form.maxTenure, form.maxTenureUnit)) errors.maxTenure = 'Maximum tenure must be at least the minimum tenure.';
  if (form.minAmount && form.maxAmount && Number(form.minAmount) >= Number(form.maxAmount)) errors.maxAmount = 'Maximum amount must be greater than minimum amount.';
  if (form.penaltyPercent && (!/^\d+(\.\d{1,2})?$/.test(form.penaltyPercent) || Number(form.penaltyPercent) > 100)) errors.penaltyPercent = 'Enter a percentage between 0 and 100.';
  if (form.daysInYear && (!/^\d+$/.test(form.daysInYear) || ![360, 365, 366].includes(Number(form.daysInYear)))) errors.daysInYear = 'Enter 360, 365, or 366 days.';

  if (!Array.isArray(form.delegationPower) || form.delegationPower.length === 0) {
    errors.delegationPower = 'Add at least one sanction authority.';
  } else {
    let previousLimit = 0;
    form.delegationPower.forEach((row, index) => {
      if (!/^\d+(\.\d{1,2})?$/.test(String(row.limit ?? '')) || Number(row.limit) <= 0) {
        errors[`delegation-${row.id}-limit`] = 'Enter a sanction limit greater than zero.';
      } else if (Number(row.limit) <= previousLimit) {
        errors[`delegation-${row.id}-limit`] = 'Sanction limits must increase in ascending order.';
      } else {
        previousLimit = Number(row.limit);
      }
      if (!String(row.power ?? '').trim()) errors[`delegation-${row.id}-power`] = 'Enter an approving designation or role.';
    });
  }
  return errors;
}

const styles = `
.pm-wrap{max-width:1320px;margin:0 auto;color:#263b3d}.pm-toolbar{display:flex;align-items:center;justify-content:space-between;gap:16px;margin:4px 0 16px}.pm-search{display:flex;align-items:center;gap:9px;width:min(100%,390px);height:40px;padding:0 12px;border:1px solid #cad8d6;border-radius:5px;background:#fff;color:#718486}.pm-search:focus-within{border-color:#177e7a;box-shadow:0 0 0 3px #177e7a19}.pm-search input{width:100%;min-width:0;border:0;outline:0;background:transparent;color:#243c3e;font-size:12px}.pm-add{display:inline-flex;align-items:center;justify-content:center;gap:8px;min-height:40px;padding:0 14px;border:1px solid #177e7a;border-radius:5px;background:#177e7a;color:#fff;font-size:12px;font-weight:700;white-space:nowrap}.pm-add:hover{background:#0c6662}.pm-status{display:flex;align-items:flex-start;gap:8px;margin:0 0 14px;padding:11px 13px;border:1px solid #c0dfd1;border-radius:5px;background:#f0faf5;color:#286c50;font-size:12px;line-height:1.5}.pm-status.info{border-color:#d7e4e5;background:#f5f9f9;color:#47666a}.pm-status.error{border-color:#e8cbcb;background:#fff7f7;color:#a43838}.pm-list{overflow:hidden;border:1px solid #dce6e3;border-radius:7px;background:#fff;box-shadow:0 5px 18px #193a620c}.pm-list-head{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:15px 18px;border-bottom:1px solid #e5ecea}.pm-list-head h2{margin:0;color:#1d4143;font-size:15px;font-weight:750}.pm-count{color:#758789;font-size:11px}.pm-table-wrap{overflow:auto;max-width:100%}.pm-table{width:100%;border-collapse:collapse;table-layout:fixed}.pm-table th,.pm-table td{height:52px;padding:9px 16px;border-bottom:1px solid #edf1f0;text-align:left;font-size:12px}.pm-table th{height:40px;background:#f6f9f8;color:#607577;font-size:10px;font-weight:800;text-transform:uppercase}.pm-table tbody tr:hover{background:#fbfdfc}.pm-table tbody tr:last-child td{border-bottom:0}.pm-table td{color:#354d4f}.pm-table th:first-child,.pm-table td:first-child{width:27%}.pm-table th:last-child,.pm-table td:last-child{width:146px;text-align:right}.pm-code{color:#176e67!important;font-weight:750}.pm-actions{display:flex;justify-content:flex-end;gap:5px}.pm-icon{display:grid;place-items:center;width:32px;height:32px;border:1px solid transparent;border-radius:4px;color:#4c686a}.pm-icon:hover{border-color:#cfdfdc;background:#f2f8f6;color:#176e67}.pm-icon.danger:hover{border-color:#efd0d0;background:#fff5f5;color:#b33737}.pm-empty{padding:52px 18px!important;text-align:center!important;color:#718284!important}.pm-empty-icon{display:grid;place-items:center;width:42px;height:42px;margin:0 auto 12px;border-radius:50%;background:#edf5f3;color:#327b73}.pm-empty strong{display:block;color:#355356;font-size:13px}.pm-empty span{display:block;margin-top:5px;color:#7c8d8f;font-size:11px}.pm-overlay{position:fixed;inset:0;z-index:20;display:grid;place-items:center;padding:20px;background:#102d35a6}.pm-dialog{display:flex;flex-direction:column;width:min(900px,100%);max-height:min(92vh,900px);overflow:hidden;border:1px solid #dce6e3;border-radius:8px;background:#fff;box-shadow:0 24px 70px #0d262d40;animation:pm-enter .18s ease-out}.pm-dialog.narrow{width:min(560px,100%)}.pm-dialog-head{display:flex;align-items:center;justify-content:space-between;gap:14px;padding:17px 21px;border-bottom:1px solid #e5ecea;background:#f8fbfa}.pm-dialog-head h2{margin:0;color:#1c4847;font-size:17px}.pm-dialog-head p{margin:4px 0 0;color:#718486;font-size:11px}.pm-close{display:grid;place-items:center;flex:0 0 34px;width:34px;height:34px;border:1px solid #dce6e3;border-radius:5px;color:#526a6c}.pm-close:hover{background:#eef5f3}.pm-form{overflow:auto;padding:21px}.pm-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:16px 20px;align-items:start}.pm-field{display:grid;gap:7px;min-width:0;color:#30494b;font-size:11px;font-weight:700}.pm-field>span{line-height:1.35}.pm-field em{color:#b24545;font-style:normal}.pm-field input,.pm-field select{width:100%;height:40px;padding:0 10px;border:1px solid #b8caca;border-radius:4px;background:#fbfdfc;color:#243c3e;font-size:12px;outline:none}.pm-field input:focus,.pm-field select:focus{border-color:#177e7a;box-shadow:0 0 0 3px #177e7a19}.pm-field [aria-invalid=true]{border-color:#b83b3b;background:#fffafa}.pm-field-error{color:#b33737;font-size:10px;font-weight:500;line-height:1.4}.pm-wide{grid-column:span 2}.pm-name{grid-column:span 2}.pm-dialog-actions{display:flex;justify-content:flex-end;gap:9px;padding:14px 21px;border-top:1px solid #e7eeec}.pm-btn{display:inline-flex;align-items:center;justify-content:center;gap:7px;min-height:38px;padding:0 13px;border:1px solid #d0ddda;border-radius:5px;background:#fff;color:#41585a;font-size:11px;font-weight:700}.pm-btn:hover{background:#f4f8f7}.pm-submit{border-color:#177e7a;background:#177e7a;color:#fff}.pm-submit:hover{background:#0c6662}.pm-submit:disabled{opacity:.7;cursor:wait}.pm-detail{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:0;padding:5px 21px 18px}.pm-detail-item{padding:13px 8px;border-bottom:1px solid #edf1f0}.pm-detail-item span{display:block;margin-bottom:5px;color:#7a8b8d;font-size:10px}.pm-detail-item strong{color:#29474a;font-size:12px;overflow-wrap:anywhere}.pm-spin{animation:pm-rotate .9s linear infinite}@keyframes pm-rotate{to{transform:rotate(360deg)}}@keyframes pm-enter{from{opacity:0;transform:translateY(7px)}to{opacity:1;transform:translateY(0)}}
@media(max-width:760px){.pm-grid{grid-template-columns:repeat(2,minmax(0,1fr));gap:14px}.pm-detail{grid-template-columns:repeat(2,minmax(0,1fr))}.pm-table th,.pm-table td{padding:9px 12px}}
@media(max-width:540px){.pm-toolbar{align-items:stretch;flex-direction:column}.pm-search{width:100%}.pm-add{width:100%}.pm-list-head{align-items:flex-start;flex-direction:column}.pm-table thead{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap}.pm-table,.pm-table tbody,.pm-table tr,.pm-table td{display:block;width:100%}.pm-table tr{padding:7px 13px;border-bottom:1px solid #e8efed}.pm-table tr:last-child{border-bottom:0}.pm-table td{display:flex;align-items:center;justify-content:space-between;gap:14px;width:100%!important;height:auto;min-height:37px;padding:7px 0;border:0;text-align:right!important;white-space:normal}.pm-table td:before{content:attr(data-label);color:#7a8b8d;font-size:10px;font-weight:700;text-align:left}.pm-table td:last-child{padding-top:5px}.pm-actions{gap:7px}.pm-dialog{max-height:96vh}.pm-dialog-head{padding:14px 15px}.pm-form{padding:16px 15px}.pm-grid{grid-template-columns:1fr;gap:13px}.pm-name,.pm-wide{grid-column:auto}.pm-dialog-actions{padding:12px 15px}.pm-dialog-actions .pm-btn{flex:1}.pm-detail{grid-template-columns:1fr 1fr;padding:4px 15px 12px}.pm-detail-item{padding:11px 5px}}
@media(prefers-reduced-motion:reduce){.pm-dialog{animation:none}.pm-spin{animation-duration:2s}}
.pm-search-group{display:flex;align-items:center;gap:8px;flex:1;min-width:0}.pm-search-group .pm-search{width:min(100%,430px);height:44px}.pm-reset-search{display:inline-flex;align-items:center;justify-content:center;gap:6px;min-height:40px;padding:0 11px;border:1px solid #cad8d6;border-radius:5px;background:#fff;color:#50696b;font-size:11px;font-weight:700;white-space:nowrap}.pm-reset-search:hover:not(:disabled){background:#f2f8f6;color:#176e67}.pm-reset-search:disabled{opacity:.5;cursor:not-allowed}.pm-dialog{width:min(1040px,100%)}.pm-form{padding:26px}.pm-grid{gap:19px 24px}.pm-field input,.pm-field select{height:44px;font-size:13px}.pm-field{font-size:12px}.pm-dialog-head{padding:19px 23px}.pm-dialog-head h2{font-size:18px}.pm-table{min-width:1380px}.pm-table th:first-child,.pm-table td:first-child{width:145px}.pm-table th:nth-child(2),.pm-table td:nth-child(2){width:190px}.pm-table th:last-child,.pm-table td:last-child{width:132px}.pm-table th,.pm-table td{height:56px;padding:10px 13px;font-size:13px}.pm-table th{height:44px;font-size:11px}.pm-list-head{padding:17px 20px}.pm-list-head h2{font-size:17px}.pm-count{font-size:12px}
@media(max-width:760px){.pm-form{padding:22px}.pm-grid{gap:16px 20px}}
@media(max-width:540px){.pm-search-group{width:100%;flex-wrap:wrap}.pm-search-group .pm-search{flex:1;width:auto;min-width:180px}.pm-reset-search{height:44px}.pm-table{min-width:0}.pm-table th:first-child,.pm-table td:first-child,.pm-table th:nth-child(2),.pm-table td:nth-child(2){width:100%}.pm-table th,.pm-table td{font-size:13px}.pm-table td:before{font-size:11px}.pm-form{padding:18px 16px}}
.pm-wrap{color:var(--ink);font-family:inherit}.pm-list,.pm-dialog{border-color:var(--line)}.pm-list-head h2,.pm-dialog-head h2{color:var(--ink)}.pm-count,.pm-dialog-head p,.pm-detail-item span{color:var(--muted)}.pm-add,.pm-submit{border-color:var(--teal);background:var(--teal)}.pm-add:hover,.pm-submit:hover{background:var(--teal-dark)}.pm-field input,.pm-field select{font-family:inherit}.pm-search-group{width:min(100%,430px)}.pm-search-group .pm-search{width:100%;height:44px}.pm-table{min-width:1180px}.pm-grid{grid-template-columns:repeat(4,minmax(0,1fr));gap:17px 18px}.pm-dialog{width:min(980px,100%)}@media(max-width:900px){.pm-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}@media(max-width:540px){.pm-search-group{width:100%}.pm-table{min-width:0}.pm-grid{grid-template-columns:1fr}}
`;

export default function ProductManagementPage() {
  const [products, setProducts] = useState([]);
  const [search, setSearch] = useState('');
  const [form, setForm] = useState(initialForm);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState(null);
  const [dialog, setDialog] = useState(null);

  useEffect(() => setProducts(readProducts()), []);

  const filteredProducts = useMemo(() => {
    const query = search.trim().toLowerCase();
    return products.filter((product) => `${product.productCode} ${product.productName}`.toLowerCase().includes(query));
  }, [products, search]);

  function storeProducts(nextProducts) {
    setProducts(nextProducts);
    if (!persistProducts(nextProducts)) setStatus({ type: 'info', text: 'Changes are available for this session but could not be saved to browser storage.' });
  }

  function openCreate() {
    setForm(initialForm);
    setErrors({});
    setStatus(null);
    setDialog({ type: 'form' });
  }

  function openEdit(product) {
    setForm({
      ...initialForm,
      ...Object.fromEntries(Object.keys(initialForm).map((field) => [field, String(product[field] ?? initialForm[field])])),
      emi: normalizeEmiTiming(product.emi),
      emiType: normalizeEmiTiming(product.emiType),
      delegationPower: Array.isArray(product.delegationPower) && product.delegationPower.length
        ? product.delegationPower.map((row, index) => ({ ...row, id: index + 1, limit: String(row.limit ?? '') }))
        : initialForm.delegationPower,
      penalty: normalizeYesNo(product.penalty)
    });
    setErrors({});
    setStatus(null);
    setDialog({ type: 'form', product });
  }

  function change(field, value) {
    setForm((current) => ({
      ...current,
      [field]: field === 'productCode' ? value.toUpperCase() : value,
      ...(field === 'penalty' && value === 'No' ? { penaltyPercent: '' } : {})
    }));
    setErrors((current) => ({ ...current, [field]: '', ...(field === 'penalty' ? { penaltyPercent: '' } : {}) }));
    setStatus(null);
  }

  function changeDelegationPower(id, field, value) {
    setForm((current) => ({
      ...current,
      delegationPower: current.delegationPower.map((row) => row.id === id ? { ...row, [field]: value } : row)
    }));
    setErrors((current) => ({ ...current, [`delegation-${id}-${field}`]: '', delegationPower: '' }));
    setStatus(null);
  }

  function addDelegationPower() {
    setForm((current) => ({
      ...current,
      delegationPower: [...current.delegationPower, {
        id: Math.max(0, ...current.delegationPower.map((row) => row.id)) + 1,
        limit: '',
        power: ''
      }]
    }));
  }

  function removeDelegationPower(id) {
    setForm((current) => ({
      ...current,
      delegationPower: current.delegationPower.filter((row) => row.id !== id)
    }));
    setErrors((current) => Object.fromEntries(
      Object.entries(current).filter(([key]) => !key.startsWith(`delegation-${id}-`) && key !== 'delegationPower')
    ));
  }

  async function submit(event) {
    event.preventDefault();
    const editingProduct = dialog?.product;
    const nextErrors = validate(form, products, editingProduct?.id);
    setErrors(nextErrors);
    const invalid = Object.keys(nextErrors)[0];
    if (invalid) {
      document.getElementById(invalid === 'delegationPower' ? 'pm-addDelegationPower' : `pm-${invalid}`)?.focus();
      return;
    }

    const record = {
      ...form,
      productCode: form.productCode.trim(),
      productName: form.productName.trim(),
      id: editingProduct?.id || (globalThis.crypto?.randomUUID?.() ?? `product-${Date.now()}`),
      updatedAt: new Date().toISOString()
    };

    if (editingProduct) {
      storeProducts(products.map((product) => product.id === editingProduct.id ? record : product));
      setStatus({ type: 'success', text: 'Product updated.' });
      setDialog(null);
      return;
    }

    setSaving(true);
    try {
      const result = await saveProductManagementProduct({
        product_code: record.productCode, product_name: record.productName, emi: form.emi, emi_type: form.emiType,
        min_tenure_months: tenureInMonths(form.minTenure, form.minTenureUnit), max_tenure_months: tenureInMonths(form.maxTenure, form.maxTenureUnit), min_amount: Number(form.minAmount),
        max_amount: Number(form.maxAmount), penalty: form.penalty === 'Yes', penalty_percent: form.penalty === 'Yes' ? Number(form.penaltyPercent) : null,
        no_of_days_in_year: Number(form.daysInYear), int_base_method: form.intBaseMethod,
        interest_calculation_frequency: form.interestFrequency, interest_calculation_mode: form.calculationMode,
        delegation_of_power: form.delegationPower.map(({ limit, power }) => ({ limit: Number(limit), power: power.trim() }))
      });
      storeProducts([record, ...products]);
      setSearch('');
      setDialog(null);
      setStatus({
        type: result.configured ? 'success' : 'info',
        text: result.configured ? result.result?.message || 'Product saved successfully.' : 'Product saved in this browser. The product API endpoint is not configured.'
      });
    } catch (error) {
      setStatus({ type: 'error', text: error.message || 'Unable to save product.' });
    } finally {
      setSaving(false);
    }
  }

  function deleteProduct(product) {
    storeProducts(products.filter((item) => item.id !== product.id));
    setDialog(null);
    setStatus({ type: 'success', text: `${product.productName} deleted.` });
  }

  return (
    <AppShell title="Product Management">
      <style>{styles}</style>
      <style>{`
        .pm-dialog{width:min(1160px,calc(100vw - 40px));max-height:calc(100vh - 48px);display:flex;flex-direction:column}
        .pm-dialog-head{flex:none}
        .pm-form{min-height:0;overflow-y:auto;padding:30px}
        .pm-grid{grid-template-columns:repeat(3,minmax(0,1fr));gap:22px 24px}
        .pm-name,.pm-wide{grid-column:span 2}
        .pm-grid .pm-long-field{grid-column:span 1}
        .pm-field{min-width:0}
        .pm-field label{display:flex;min-height:32px;align-items:flex-end;line-height:1.35;overflow-wrap:anywhere}
        .pm-field label span{display:block}
        .pm-field input,.pm-field select{box-sizing:border-box;width:100%;min-width:0}
        .pm-tenure-control{display:grid;grid-template-columns:minmax(0,1fr) 112px;gap:8px}
        .pm-dop{margin-top:24px;padding:18px;border:1px solid #dce6e3;border-radius:7px;background:#fff}
        .pm-dop-heading{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:14px}
        .pm-dop-heading h3,.pm-dop-view h3{margin:0;color:#1d4143;font-size:14px}
        .pm-dop-heading p{margin:5px 0 0;color:#718486;font-size:11px}
        .pm-dop-add{display:inline-flex;align-items:center;justify-content:center;gap:6px;min-height:34px;padding:0 10px;border:1px solid #ccddda;border-radius:4px;background:#f8fbfa;color:#176e67;font-size:11px;font-weight:700;white-space:nowrap}
        .pm-dop-add:hover{background:#eff7f5}
        .pm-dop-table-wrap{max-width:100%;overflow-x:auto;border:1px solid #dce6e3;border-radius:5px}
        .pm-dop-table{width:100%;min-width:620px;border-collapse:collapse}
        .pm-dop-table th,.pm-dop-table td{padding:9px 11px;border-bottom:1px solid #edf1f0;text-align:left;color:#354d4f;font-size:12px}
        .pm-dop-table th{background:#f6f9f8;color:#607577;font-size:10px;font-weight:800;text-transform:uppercase}
        .pm-dop-table tr:last-child td{border-bottom:0}
        .pm-dop-table th:first-child,.pm-dop-table td:first-child{width:60px;text-align:center}
        .pm-dop-table th:last-child,.pm-dop-table td:last-child{width:56px;text-align:center}
        .pm-dop-table input{width:100%;min-width:120px;height:36px;padding:0 9px;border:1px solid #b8caca;border-radius:4px;background:#fbfdfc;color:#243c3e;font-size:12px;outline:none}
        .pm-dop-table input:focus{border-color:#177e7a;box-shadow:0 0 0 3px #177e7a19}
        .pm-dop-table input[aria-invalid=true]{border-color:#b83b3b;background:#fffafa}
        .pm-dop-remove{display:inline-grid;place-items:center;width:30px;height:30px;border-radius:4px;color:#865959}
        .pm-dop-remove:hover{background:#fbefef;color:#a02e2e}
        .pm-dop-view{margin:0 21px 18px}
        .pm-dop-view h3{margin-bottom:12px}
        .pm-dop-view .pm-dop-table{min-width:0}
        .pm-sr-only{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}
        .pm-dialog-actions{flex:none}
        .pm-table{min-width:940px}
        @media(max-width:700px){.pm-dialog{width:calc(100vw - 24px);max-height:calc(100dvh - 24px)}.pm-form{padding:20px}.pm-grid{grid-template-columns:repeat(2,minmax(0,1fr));gap:16px}.pm-name,.pm-wide,.pm-grid .pm-long-field{grid-column:span 2}.pm-dop{padding:14px}.pm-dop-view{margin:0 14px 14px}}
        @media(max-width:480px){.pm-form{padding:17px}.pm-grid{grid-template-columns:1fr;gap:15px}.pm-name,.pm-wide,.pm-grid .pm-long-field{grid-column:auto}.pm-tenure-control{grid-template-columns:minmax(0,1fr) 104px}.pm-dop-heading{align-items:flex-start;flex-direction:column}.pm-dop-add{width:100%}}
      `}</style>
      <main className="pm-wrap">
        <PageHeader title="Product  Master" description="Set effective-dated interest tiers by loan product and tenure." marquee />
        <div className="pm-toolbar">
          <div className="pm-search-group">
            <label className="pm-search" htmlFor="pm-search"><Search size={16} aria-hidden="true" /><input id="pm-search" type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search product code or name" /></label>
          </div>
          <button type="button" className="pm-add" onClick={openCreate}><Plus size={16} /> Add new product</button>
        </div>
        {status && !dialog && <div className={`pm-status ${status.type}`} role={status.type === 'error' ? 'alert' : 'status'}>{status.type === 'success' ? <Check size={16} /> : null}{status.text}</div>}

        <section className="pm-list" aria-labelledby="pm-list-heading">
          <div className="pm-list-head"><h2 id="pm-list-heading">Product directory</h2><span className="pm-count">{filteredProducts.length} of {products.length} products</span></div>
          <div className="pm-table-wrap">
            <table className="pm-table">
              <thead><tr>{directoryFieldList.map(([, label]) => <th scope="col" key={label}>{label}</th>)}<th scope="col">Actions</th></tr></thead>
              <tbody>
                {filteredProducts.map((product) => (
                  <tr key={product.id}>
                    {directoryFieldList.map(([field, label]) => {
                      const value = product[field];
                      const displayValue = field === 'minTenure'
                        ? `${formatTenure(product.minTenure, product.minTenureUnit) || '—'} – ${formatTenure(product.maxTenure, product.maxTenureUnit) || '—'}`
                        : field === 'minAmount'
                          ? `${product.minAmount ? `₹${Number(product.minAmount).toLocaleString('en-IN')}` : '—'} – ${product.maxAmount ? `₹${Number(product.maxAmount).toLocaleString('en-IN')}` : '—'}`
                          : field === 'penalty'
                            ? normalizeYesNo(value)
                            : field === 'emi'
                              ? normalizeEmiTiming(value) || '—'
                            : value || '—';
                      return <td className={field === 'productCode' ? 'pm-code' : undefined} data-label={label} key={field}>{displayValue}</td>;
                    })}
                    <td data-label="Actions"><div className="pm-actions">
                      <button type="button" className="pm-icon" onClick={() => setDialog({ type: 'view', product })} aria-label={`View ${product.productName}`} title="View"><Eye size={16} /></button>
                      <button type="button" className="pm-icon" onClick={() => openEdit(product)} aria-label={`Edit ${product.productName}`} title="Edit"><Pencil size={15} /></button>
                      <button type="button" className="pm-icon danger" onClick={() => setDialog({ type: 'delete', product })} aria-label={`Delete ${product.productName}`} title="Delete"><Trash2 size={15} /></button>
                    </div></td>
                  </tr>
                ))}
                {filteredProducts.length === 0 && <tr><td className="pm-empty" colSpan={directoryFieldList.length + 1}><div className="pm-empty-icon"><Package size={20} /></div><strong>{search ? 'No matching products' : 'No products yet'}</strong><span>{search ? 'Try a different product code or name.' : 'Add your first loan product to start building the directory.'}</span></td></tr>}
              </tbody>
            </table>
          </div>
        </section>
      </main>

      {dialog?.type === 'form' && (
        <div className="pm-overlay" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !saving) setDialog(null); }}>
          <section className="pm-dialog" role="dialog" aria-modal="true" aria-labelledby="pm-dialog-title">
            <header className="pm-dialog-head"><div><h2 id="pm-dialog-title">{dialog.product ? 'Edit product' : 'Add new product'}</h2><p>Set the product details and repayment terms.</p></div><button type="button" className="pm-close" onClick={() => setDialog(null)} disabled={saving} aria-label="Close form"><X size={18} /></button></header>
            {status?.type === 'error' && <div className="pm-status error" role="alert">{status.text}</div>}
            <form className="pm-form" onSubmit={submit} noValidate>
              <div className="pm-grid">
                {fieldList.map(([field, label]) => {
                  if (field === 'penaltyPercent' && form.penalty !== 'Yes') return null;
                  const choices = ['emi', 'emiType'].includes(field)
                    ? [['Arrears', 'Arrears'], ['Int in Advance', 'Int in Advance']]
                    : field === 'penalty'
                    ? [['Yes', 'Yes'], ['No', 'No']]
                    : field === 'interestFrequency'
                      ? [['Monthly', 'Monthly'], ['Quarterly', 'Quarterly'], ['Half-yearly', 'Half-yearly'], ['Yearly', 'Yearly']]
                      : field === 'intBaseMethod'
                        ? [['Actual/365', 'Actual/365'], ['Actual/360', 'Actual/360'], ['30/360', '30/360'], ['Actual/Actual', 'Actual/Actual']]
                      : field === 'calculationMode'
                        ? [['Principal Outstanding', 'Principal Outstanding'], ['Principal Total', 'Principal Total']]
                        : null;
                  const numeric = ['minTenure', 'maxTenure', 'minAmount', 'maxAmount', 'penaltyPercent', 'daysInYear'].includes(field);
                  const wide = field === 'productName';
                  const longLabel = ['intBaseMethod', 'interestFrequency', 'calculationMode'].includes(field);
                  return (
                    <div className={`pm-field${wide ? ' pm-wide pm-name' : ''}${longLabel ? ' pm-long-field' : ''}`} key={field}>
                      <label htmlFor={`pm-${field}`}><span>{label} <em aria-hidden="true">*</em></span></label>
                      {choices ? (
                        <select id={`pm-${field}`} aria-label={label} value={form[field]} onChange={(event) => change(field, event.target.value)} aria-required="true" aria-invalid={Boolean(errors[field])} aria-describedby={errors[field] ? `pm-${field}-error` : undefined}>
                          <option value="">Select {label.toLowerCase()}</option>
                          {choices.map(([value, text]) => <option key={value} value={value}>{text}</option>)}
                        </select>
                      ) : ['minTenure', 'maxTenure'].includes(field) ? (
                        <div className="pm-tenure-control">
                          <input id={`pm-${field}`} name={field} aria-label={label} value={form[field]} onChange={(event) => change(field, event.target.value)} type="number" min="1" max={form[`${field}Unit`] === 'Years' ? '40' : '480'} step="1" inputMode="numeric" autoComplete="off" aria-required="true" aria-invalid={Boolean(errors[field])} aria-describedby={errors[field] ? `pm-${field}-error` : undefined} />
                          <select id={`pm-${field}Unit`} aria-label={`${label} unit`} value={form[`${field}Unit`]} onChange={(event) => change(`${field}Unit`, event.target.value)}>
                            <option value="Months">Months</option><option value="Years">Years</option>
                          </select>
                        </div>
                      ) : (
                        <input id={`pm-${field}`} name={field} value={form[field]} onChange={(event) => change(field, event.target.value)} type={numeric ? 'number' : 'text'} min={field === 'daysInYear' ? '360' : numeric ? '0' : undefined} max={field === 'penaltyPercent' ? '100' : field === 'daysInYear' ? '366' : undefined} step={field === 'daysInYear' || ['minTenure', 'maxTenure'].includes(field) ? '1' : '0.01'} maxLength={!numeric ? (field === 'productCode' ? 20 : 100) : undefined} inputMode={numeric ? 'decimal' : undefined} autoComplete="off" aria-required="true" aria-invalid={Boolean(errors[field])} aria-describedby={errors[field] ? `pm-${field}-error` : undefined} />
                      )}
                      {errors[field] && <small className="pm-field-error" id={`pm-${field}-error`}>{errors[field]}</small>}
                    </div>
                  );
                })}
              </div>
              <section className="pm-dop" aria-labelledby="pm-dop-title">
                <div className="pm-dop-heading">
                  <div><h3 id="pm-dop-title">Delegation of Power for Sanction</h3><p>Set increasing sanction limits and the approving authority for each limit.</p></div>
                  <button id="pm-addDelegationPower" className="pm-dop-add" type="button" onClick={addDelegationPower}><Plus size={15} /> Add authority</button>
                </div>
                <div className="pm-dop-table-wrap">
                  <table className="pm-dop-table">
                    <thead><tr><th scope="col">Sr.</th><th scope="col">Limit (₹)</th><th scope="col">Power / Approving Designation</th><th scope="col"><span className="pm-sr-only">Actions</span></th></tr></thead>
                    <tbody>
                      {form.delegationPower.map((row, index) => (
                        <tr key={row.id}>
                          <td data-label="Sr.">{index + 1}</td>
                          <td data-label="Limit (₹)">
                            <input id={`pm-delegation-${row.id}-limit`} aria-label={`Sanction limit, row ${index + 1}`} type="number" min="0.01" step="0.01" value={row.limit} onChange={(event) => changeDelegationPower(row.id, 'limit', event.target.value)} aria-invalid={Boolean(errors[`delegation-${row.id}-limit`])} aria-describedby={errors[`delegation-${row.id}-limit`] ? `pm-delegation-${row.id}-limit-error` : undefined} />
                            {errors[`delegation-${row.id}-limit`] && <small className="pm-field-error" id={`pm-delegation-${row.id}-limit-error`}>{errors[`delegation-${row.id}-limit`]}</small>}
                          </td>
                          <td data-label="Power / Approving Designation">
                            <input id={`pm-delegation-${row.id}-power`} aria-label={`Approving designation, row ${index + 1}`} type="text" maxLength="100" value={row.power} onChange={(event) => changeDelegationPower(row.id, 'power', event.target.value)} aria-invalid={Boolean(errors[`delegation-${row.id}-power`])} aria-describedby={errors[`delegation-${row.id}-power`] ? `pm-delegation-${row.id}-power-error` : undefined} />
                            {errors[`delegation-${row.id}-power`] && <small className="pm-field-error" id={`pm-delegation-${row.id}-power-error`}>{errors[`delegation-${row.id}-power`]}</small>}
                          </td>
                          <td data-label="Actions"><button type="button" className="pm-dop-remove" onClick={() => removeDelegationPower(row.id)} aria-label={`Remove sanction authority row ${index + 1}`} title="Remove authority"><Trash2 size={15} /></button></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {errors.delegationPower && <p className="pm-field-error" id="pm-delegationPower-error" role="alert">{errors.delegationPower}</p>}
              </section>
              <div className="pm-dialog-actions"><button className="pm-btn" type="button" onClick={() => setDialog(null)} disabled={saving}>Cancel</button><button className="pm-btn pm-submit" type="submit" disabled={saving}>{saving ? <LoaderCircle className="pm-spin" size={15} /> : null}{saving ? 'Saving...' : dialog.product ? 'Save changes' : 'Create product'}</button></div>
            </form>
          </section>
        </div>
      )}

      {dialog?.type === 'view' && (
        <div className="pm-overlay" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setDialog(null); }}>
          <section className="pm-dialog" role="dialog" aria-modal="true" aria-labelledby="pm-view-title">
            <header className="pm-dialog-head"><div><h2 id="pm-view-title">{dialog.product.productName}</h2><p>Product details</p></div><button type="button" className="pm-close" onClick={() => setDialog(null)} aria-label="Close product details"><X size={18} /></button></header>
            <div className="pm-detail">{fieldList.filter(([field]) => field !== 'penaltyPercent' || normalizeYesNo(dialog.product.penalty) === 'Yes').map(([field, label]) => {
              const value = field === 'penalty' ? normalizeYesNo(dialog.product[field])
                : field === 'emi' ? normalizeEmiTiming(dialog.product[field])
                : field === 'minTenure' ? formatTenure(dialog.product.minTenure, dialog.product.minTenureUnit)
                  : field === 'maxTenure' ? formatTenure(dialog.product.maxTenure, dialog.product.maxTenureUnit)
                    : field === 'penaltyPercent' ? `${dialog.product[field] || '—'}%`
                      : dialog.product[field] || '—';
              return <div className="pm-detail-item" key={field}><span>{label}</span><strong>{value || '—'}</strong></div>;
            })}</div>
            <section className="pm-dop pm-dop-view" aria-labelledby="pm-dop-view-title">
              <h3 id="pm-dop-view-title">Delegation of Power for Sanction</h3>
              <div className="pm-dop-table-wrap">
                <table className="pm-dop-table">
                  <thead><tr><th scope="col">Sr.</th><th scope="col">Limit (₹)</th><th scope="col">Power / Approving Designation</th></tr></thead>
                  <tbody>
                    {(Array.isArray(dialog.product.delegationPower) ? dialog.product.delegationPower : []).map((row, index) => (
                      <tr key={row.id ?? index}><td>{index + 1}</td><td>{row.limit === '' || row.limit == null ? '—' : `₹${Number(row.limit).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`}</td><td>{row.power || '—'}</td></tr>
                    ))}
                    {(!Array.isArray(dialog.product.delegationPower) || dialog.product.delegationPower.length === 0) && <tr><td colSpan="3">No sanction authority configured.</td></tr>}
                  </tbody>
                </table>
              </div>
            </section>
            <footer className="pm-dialog-actions"><button className="pm-btn" type="button" onClick={() => setDialog(null)}>Close</button></footer>
          </section>
        </div>
      )}

      {dialog?.type === 'delete' && (
        <div className="pm-overlay" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setDialog(null); }}>
          <section className="pm-dialog narrow" role="alertdialog" aria-modal="true" aria-labelledby="pm-delete-title" aria-describedby="pm-delete-copy">
            <header className="pm-dialog-head"><div><h2 id="pm-delete-title">Delete product?</h2><p id="pm-delete-copy">This will remove {dialog.product.productName} from this product directory.</p></div><button type="button" className="pm-close" onClick={() => setDialog(null)} aria-label="Cancel deletion"><X size={18} /></button></header>
            <footer className="pm-dialog-actions"><button className="pm-btn" type="button" onClick={() => setDialog(null)}>Cancel</button><button className="pm-btn pm-submit" type="button" onClick={() => deleteProduct(dialog.product)}><Trash2 size={15} /> Delete product</button></footer>
          </section>
        </div>
      )}
    </AppShell>
  );
}