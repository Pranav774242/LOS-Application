'use client';

import { useCallback, useEffect, useState } from 'react';
import { CirclePlus, Eye, LoaderCircle, Pencil, Plus, Save, Search, Trash2, X } from 'lucide-react';
import AppShell from '../../components/AppShell';
import { deleteGoldRateMaster, getGoldRateMasters, saveGoldRateMaster, searchGoldProducts } from '../../services/goldRateMaster';

const emptyRate = (id) => ({ id, purityCarat: '', netWeight: '', rate: '', marginPercent: '' });
const initialForm = () => ({
  productName: '',
  productCode: '',
  effectiveDate: todayString(),
  rates: [emptyRate(1)]
});

function todayString() {
  const today = new Date();
  const offset = today.getTimezoneOffset();
  return new Date(today.getTime() - offset * 60_000).toISOString().slice(0, 10);
}

function validate(form, selectedProduct) {
  const errors = {};

  if (selectedProduct?.name !== form.productName.trim() || selectedProduct?.code !== form.productCode) {
    errors.productName = 'Select a product from the product list.';
  }
  if (!form.effectiveDate) {
    errors.effectiveDate = 'Select an effective date.';
  } else if (form.effectiveDate < todayString()) {
    errors.effectiveDate = 'Effective date cannot be in the past.';
  }

  const enteredRows = form.rates.filter((rate) => (
    [rate.purityCarat, rate.netWeight, rate.rate, rate.marginPercent].some((value) => value.trim())
  ));
  if (enteredRows.length === 0) {
    errors.rates = 'Enter at least one gold rate row.';
  }

  const purityValues = new Set();
  enteredRows.forEach((rate) => {
    const purity = rate.purityCarat.trim().toUpperCase();
    const purityError = `rate-${rate.id}-purityCarat`;
    const weightError = `rate-${rate.id}-netWeight`;
    const rateError = `rate-${rate.id}-rate`;
    const marginError = `rate-${rate.id}-marginPercent`;

    if (!/^(?:[1-9]|1\d|2[0-4])K$/.test(purity)) {
      errors[purityError] = 'Enter a carat value from 1K to 24K (for example, 22K).';
    } else if (purityValues.has(purity)) {
      errors[purityError] = 'Each purity carat must be unique.';
    } else {
      purityValues.add(purity);
    }

    if (!/^\d+(?:\.\d{1,3})?$/.test(rate.netWeight) || Number(rate.netWeight) <= 0) {
      errors[weightError] = 'Net weight must be greater than 0, with up to 3 decimal places.';
    }
    if (!/^\d+(?:\.\d{1,2})?$/.test(rate.rate) || Number(rate.rate) <= 0) {
      errors[rateError] = 'Rate must be greater than 0, with up to 2 decimal places.';
    }
    if (
      !/^\d+(?:\.\d{1,2})?$/.test(rate.marginPercent)
      || Number(rate.marginPercent) < 0
      || Number(rate.marginPercent) > 100
    ) {
      errors[marginError] = 'Margin must be between 0 and 100%, with up to 2 decimal places.';
    }
  });

  return errors;
}

const styles = `
.grm-wrap{max-width:1340px;margin:0 auto;color:#263b3d}
.grm-heading{display:flex;align-items:center;justify-content:space-between;gap:16px;margin-bottom:16px}
.grm-create{display:inline-flex;align-items:center;justify-content:center;gap:8px;min-height:42px;padding:0 15px;border:1px solid #177e7a;border-radius:5px;background:#177e7a;color:#fff;font-size:12px;font-weight:700}
.grm-create:hover{background:#0c6662}
.grm-message{display:flex;align-items:flex-start;gap:8px;margin:0 0 14px;padding:11px 13px;border:1px solid #c4dfd1;border-radius:5px;background:#f1faf5;color:#276b4f;font-size:12px;line-height:1.5}
.grm-message.error{border-color:#e7cccc;background:#fff7f7;color:#a43838}
.grm-directory{overflow:hidden;border:1px solid #dce6e3;border-radius:7px;background:#fff;box-shadow:0 5px 18px #193a620c}
.grm-directory-head{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:16px 18px;border-bottom:1px solid #e5ecea}
.grm-directory-head h2{margin:0;color:#1d4143;font-size:17px}
.grm-count{color:#758789;font-size:12px}
.grm-list-wrap{max-width:100%;overflow:auto}
.grm-list{width:100%;min-width:650px;border-collapse:collapse}
.grm-list th,.grm-list td{height:54px;padding:10px 15px;border-bottom:1px solid #edf1f0;text-align:left;color:#354d4f;font-size:12px}
.grm-list th{height:42px;background:#f6f9f8;color:#607577;font-size:10px;font-weight:800;text-transform:uppercase}
.grm-list tbody tr:hover{background:#fbfdfc}
.grm-list tbody tr:last-child td{border-bottom:0}
.grm-code{color:#176e67!important;font-weight:750}
.grm-actions{display:flex;justify-content:flex-end}
.grm-icon{display:grid;place-items:center;width:33px;height:33px;border:1px solid transparent;border-radius:4px;color:#4c686a}
.grm-icon:hover{border-color:#cfdfdc;background:#f2f8f6;color:#176e67}
.grm-empty{padding:48px 18px!important;text-align:center!important;color:#718284!important}
.grm-empty strong,.grm-empty span{display:block}
.grm-empty strong{color:#355356;font-size:13px}
.grm-empty span{margin-top:5px;font-size:11px}
.grm-overlay{position:fixed;inset:0;z-index:20;display:grid;place-items:center;padding:20px;background:#102d35a6}
.grm-dialog{display:flex;flex-direction:column;width:min(980px,100%);max-height:92vh;overflow:hidden;border:1px solid #dce6e3;border-radius:8px;background:#fff;box-shadow:0 24px 70px #0d262d40}
.grm-dialog-head{display:flex;align-items:center;justify-content:space-between;gap:14px;padding:18px 22px;border-bottom:1px solid #e5ecea;background:#f8fbfa}
.grm-dialog-head h2{margin:0;color:#1c4847;font-size:18px}
.grm-dialog-head p{margin:4px 0 0;color:#718486;font-size:12px}
.grm-close{display:grid;place-items:center;flex:0 0 34px;width:34px;height:34px;border:1px solid #dce6e3;border-radius:5px;color:#526a6c}
.grm-close:hover{background:#eef5f3}
.grm-form{overflow:auto;padding:22px}
.grm-fields{display:grid;grid-template-columns:minmax(220px,1fr) minmax(220px,1fr);gap:18px 26px;align-items:start;margin:0 auto 22px}
.grm-field{display:grid;gap:7px;min-width:0;color:#344d4f;font-size:12px;font-weight:700}
.grm-field input{width:100%;height:40px;padding:0 10px;border:1px solid #b9cbca;border-radius:4px;background:#fbfdfc;color:#263d3f;font:400 13px Arial,sans-serif;outline:none}
.grm-field input:focus,.grm-cell input:focus{border-color:#177e7a;box-shadow:0 0 0 3px #177e7a19}
.grm-field input[aria-invalid=true],.grm-cell input[aria-invalid=true]{border-color:#b83b3b;background:#fffafa}
.grm-error{color:#b33737;font-size:10px;font-weight:500;line-height:1.4}
.grm-table-wrap{max-width:100%;overflow-x:auto;border:1px solid #c1cdcb;border-radius:3px}
.grm-table{width:100%;min-width:780px;border-collapse:collapse;table-layout:fixed}
.grm-table th,.grm-table td{height:54px;padding:7px 10px;border-right:1px solid #cbd4d3;border-bottom:1px solid #cbd4d3;text-align:center;color:#30474a;font-size:11px}
.grm-table th{height:42px;background:#f1f5f4;font-weight:700}
.grm-table tbody tr:last-child td{border-bottom:0}
.grm-table th:last-child,.grm-table td:last-child{width:48px;border-right:0}
.grm-table th:first-child,.grm-table td:first-child{width:55px}
.grm-cell input{width:100%;height:34px;padding:0 8px;border:1px solid #c6d3d1;border-radius:3px;background:#fff;color:#2d4648;font-size:12px;text-align:center;outline:none}
.grm-cell .grm-error{display:block;margin-top:4px}
.grm-remove{display:grid;place-items:center;width:30px;height:30px;margin:auto;border-radius:4px;color:#865959}
.grm-remove:hover{background:#fbefef;color:#a02e2e}
.grm-tools{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-top:12px}
.grm-add{display:inline-flex;align-items:center;gap:6px;min-height:34px;padding:0 10px;border:1px solid #ccddda;border-radius:4px;background:#f8fbfa;color:#176e67;font-size:11px;font-weight:700}
.grm-add:hover{background:#eff7f5}
.grm-actions-footer{display:flex;justify-content:flex-end;gap:12px;margin-top:24px;padding-top:17px;border-top:1px solid #e7eeec}
.grm-btn{display:inline-flex;align-items:center;justify-content:center;gap:7px;min-height:39px;padding:0 16px;border:1px solid #d0ddda;border-radius:5px;background:#fff;color:#41585a;font-size:12px;font-weight:700}
.grm-btn:hover{background:#f4f8f7}
.grm-submit{border-color:#177e7a;background:#177e7a;color:#fff}
.grm-submit:hover{background:#0c6662}
.grm-tier-view{padding:18px 22px;overflow:auto}
.grm-tier-view h3{margin:0 0 12px;color:#355356;font-size:14px}
.grm-view-table{width:100%;min-width:600px;border-collapse:collapse}
.grm-view-table th,.grm-view-table td{padding:12px;border-bottom:1px solid #e9efed;text-align:left;color:#354d4f;font-size:12px}
.grm-view-table th{background:#f6f9f8;color:#607577;font-size:10px;text-transform:uppercase}
.grm-dialog-footer{display:flex;justify-content:flex-end;gap:10px;padding:13px 20px;border-top:1px solid #e7eeec}
@media(max-width:600px){.grm-heading{align-items:flex-start;flex-direction:column}.grm-create{width:100%}.grm-fields{grid-template-columns:1fr;gap:14px}.grm-form{padding:17px 14px}.grm-actions-footer{display:grid;grid-template-columns:1fr 1fr}.grm-btn{padding:0 10px}.grm-dialog-head{padding:15px}.grm-tier-view{padding:15px}}
`;

export default function GoldRateMasterPage() {
  const [masters, setMasters] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [errors, setErrors] = useState({});
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [products, setProducts] = useState([]);
  const [productsLoading, setProductsLoading] = useState(false);
  const [productSearchError, setProductSearchError] = useState('');
  const [dialog, setDialog] = useState(null);
  const [message, setMessage] = useState(null);
  const [mastersError, setMastersError] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const loadMasters = useCallback(async () => {
    setLoading(true);
    try {
      setMasters(await getGoldRateMasters());
      setMastersError('');
    } catch (error) {
      console.error('Unable to load gold rate masters.', error);
      setMastersError('Unable to load gold rate masters. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadMasters();
  }, [loadMasters]);

  useEffect(() => {
    const query = form.productName.trim();
    if (dialog?.type !== 'form' || !query || selectedProduct) {
      setProducts([]);
      setProductsLoading(false);
      setProductSearchError('');
      return undefined;
    }

    const controller = new AbortController();
    setProductsLoading(true);
    setProductSearchError('');
    const timer = window.setTimeout(async () => {
      try {
        const results = await searchGoldProducts(query, controller.signal);
        if (!controller.signal.aborted) setProducts(results);
      } catch (error) {
        if (!controller.signal.aborted) {
          console.error('Unable to search products for gold rate master.', error);
          setProductSearchError('Unable to search products. Please try again.');
        }
      } finally {
        if (!controller.signal.aborted) setProductsLoading(false);
      }
    }, 300);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [dialog?.type, form.productName, selectedProduct]);

  function openCreate() {
    setForm(initialForm());
    setSelectedProduct(null);
    setErrors({});
    setDialog({ type: 'form' });
    setMessage(null);
  }

  function openEdit(master) {
    const product = { name: master.productName, code: master.productCode };
    setForm({
      productName: product.name,
      productCode: product.code,
      effectiveDate: master.effectiveDate,
      rates: master.rates.length ? master.rates.map((rate, index) => ({ ...rate, id: index + 1 })) : [emptyRate(1)]
    });
    setSelectedProduct(product);
    setErrors({});
    setMessage(null);
    setDialog({ type: 'form', master });
  }

  function closeDialog() {
    setDialog(null);
    setForm(initialForm());
    setSelectedProduct(null);
    setProducts([]);
    setErrors({});
    setMessage(null);
  }

  function updateProductName(value) {
    setForm((current) => ({ ...current, productName: value, productCode: '' }));
    setSelectedProduct(null);
    setErrors((current) => ({ ...current, productName: '', productCode: '' }));
    setMessage(null);
  }

  function chooseProduct(product) {
    setSelectedProduct(product);
    setForm((current) => ({ ...current, productName: product.name, productCode: product.code }));
    setProducts([]);
    setProductSearchError('');
    setErrors((current) => ({ ...current, productName: '' }));
  }

  function updateEffectiveDate(value) {
    setForm((current) => ({ ...current, effectiveDate: value }));
    setErrors((current) => ({ ...current, effectiveDate: '' }));
    setMessage(null);
  }

  function updateRate(id, field, value) {
    setForm((current) => ({
      ...current,
      rates: current.rates.map((rate) => rate.id === id ? { ...rate, [field]: field === 'purityCarat' ? value.toUpperCase() : value } : rate)
    }));
    setErrors((current) => ({ ...current, [`rate-${id}-${field}`]: '', rates: '' }));
  }

  function addRate() {
    const nextId = Math.max(0, ...form.rates.map((rate) => rate.id)) + 1;
    setForm((current) => ({ ...current, rates: [...current.rates, emptyRate(nextId)] }));
  }

  function removeRate(id) {
    setForm((current) => ({ ...current, rates: current.rates.filter((rate) => rate.id !== id) }));
    setErrors((current) => Object.fromEntries(
      Object.entries(current).filter(([key]) => !key.startsWith(`rate-${id}-`))
    ));
  }

  async function submit(event) {
    event.preventDefault();
    const nextErrors = validate(form, selectedProduct);
    setErrors(nextErrors);
    const firstError = Object.keys(nextErrors)[0];
    if (firstError) {
      if (firstError === 'rates') {
        document.getElementById(`gr-rate-${form.rates[0]?.id}-purityCarat`)?.focus();
      } else {
        document.getElementById(`gr-${firstError}`)?.focus();
      }
      return;
    }

    if (masters.some((master) => master.id !== dialog.master?.id
      && master.productCode.toUpperCase() === form.productCode.toUpperCase()
      && master.effectiveDate === form.effectiveDate)) {
      setErrors((current) => ({ ...current, effectiveDate: 'A gold rate master already exists for this product and date.' }));
      document.getElementById('gr-effectiveDate')?.focus();
      return;
    }

    const payload = {
      product_code: form.productCode.trim(),
      product_name: form.productName.trim(),
      effective_date: form.effectiveDate,
      rates: form.rates
        .filter((rate) => [rate.purityCarat, rate.netWeight, rate.rate, rate.marginPercent].some((value) => value.trim()))
        .map((rate) => ({
          purity_carat: rate.purityCarat.trim().toUpperCase(),
          net_weight: Number(rate.netWeight),
          rate: Number(rate.rate),
          margin_percent: Number(rate.marginPercent)
        }))
    };

    setSaving(true);
    try {
      await saveGoldRateMaster(payload, dialog.master?.id);
      await loadMasters();
      closeDialog();
      setMessage(null);
    } catch (error) {
      console.error('Unable to save gold rate master.', error);
      setMessage({ type: 'error', text: 'Unable to save gold rate master. Please try again.' });
    } finally {
      setSaving(false);
    }
  }

  async function deleteMaster(master) {
    try {
      await deleteGoldRateMaster(master.id);
      await loadMasters();
      setDialog(null);
      setMessage(null);
    } catch (error) {
      console.error('Unable to delete gold rate master.', error);
      setDialog(null);
      setMessage({ type: 'error', text: 'Unable to delete gold rate master. Please try again.' });
    }
  }

  const filteredMasters = masters.filter((master) => (
    [master.productName, master.productCode, master.effectiveDate]
      .some((value) => value.toLowerCase().includes(search.trim().toLowerCase()))
  ));
  return (
    <AppShell title="">
      <style>{styles}</style>
      <style>{`
        .grm-dialog{width:min(1120px,100%)}
        .grm-fields{grid-template-columns:minmax(260px,1.3fr) minmax(190px,.8fr) minmax(220px,.9fr);max-width:1100px}
        .grm-product-search{position:relative}
        .grm-product-results{position:absolute;top:calc(100% + 4px);left:0;right:0;z-index:3;max-height:220px;overflow:auto;border:1px solid #b9cbca;border-radius:4px;background:#fff;box-shadow:0 6px 16px #193a621c}
        .grm-product-result{display:flex;width:100%;justify-content:space-between;gap:12px;padding:10px;border:0;border-bottom:1px solid #edf1f0;background:#fff;color:#344d4f;text-align:left;font-size:12px}
        .grm-product-result:last-child{border-bottom:0}
        .grm-product-result:hover,.grm-product-result:focus{background:#f1f8f6;outline:none}
        .grm-product-result-code{color:#176e67;font-weight:700}
        .grm-search-row{display:flex;justify-content:flex-end;padding:12px 16px;border-bottom:1px solid #edf1f0}
        .grm-search{display:flex;align-items:center;gap:8px;width:min(320px,100%);height:36px;padding:0 10px;border:1px solid #cbd9d7;border-radius:5px;color:#718486}
        .grm-search input{width:100%;border:0;outline:0;color:#263d3f;font-size:12px}
        .grm-list{min-width:1050px}
        .grm-actions{gap:4px}
        .grm-icon.danger:hover{border-color:#efd0d0;background:#fff5f5;color:#b33737}
        .grm-rate-summary{display:flex;flex-wrap:wrap;gap:5px}
        .grm-rate-chip{padding:4px 7px;border:1px solid #e1eae8;border-radius:4px;background:#f8fbfa;color:#4b6567;font-size:10px;white-space:nowrap}
        .grm-loading{display:flex;align-items:center;justify-content:center;gap:9px}
        .grm-spin{animation:grm-spin 1s linear infinite}
        @keyframes grm-spin{to{transform:rotate(360deg)}}
        .grm-icon:disabled,.grm-btn:disabled,.grm-close:disabled{opacity:.55;cursor:not-allowed}
        .grm-field input[readonly]{background:#f1f5f4;color:#607577;cursor:default}
        .grm-confirm{padding:22px;color:#52686a;font-size:13px;line-height:1.6}
        @media(max-width:700px){.grm-fields{grid-template-columns:1fr}.grm-search-row{padding:10px}.grm-search{width:100%}}
      `}</style>
      <main className="grm-wrap">
        <div className="grm-heading">
          <div style={{ marginTop: '-15px', marginBottom: '26px' }}>
            <h1 style={{ margin: 0, color: '#23474C', font: '700 23px Manrope' }}>Gold Rate Master</h1>
            <div className="page-header-marquee" role="note" aria-label="Manage effective-dated gold rates by product and purity.">
              <div className="page-header-marquee-window" aria-hidden="true">
                <div className="page-header-marquee-track">
                  <span>Manage effective-dated gold rates by product and purity.</span>
                </div>
              </div>
            </div>
          </div>
          <button className="grm-create" type="button" onClick={openCreate}><Plus size={16} /> Create gold rate master</button>
        </div>

        {message && !dialog && (
          <div className={`grm-message ${message.type}`} role={message.type === 'error' ? 'alert' : 'status'}>
            {message.text}
          </div>
        )}

        <section className="grm-directory" aria-labelledby="grm-directory-title">
          <div className="grm-directory-head">
            <h2 id="grm-directory-title">Gold rate masters</h2>
            <span className="grm-count">{loading ? 'Loading…' : `${filteredMasters.length} ${filteredMasters.length === 1 ? 'master' : 'masters'}`}</span>
          </div>
          <div className="grm-search-row">
            <label className="grm-search" htmlFor="grm-search"><Search size={16} aria-hidden="true" /><input id="grm-search" type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search product name, code, or date" /></label>
          </div>
          <div className="grm-list-wrap">
            <table className="grm-list">
              <thead>
                <tr><th scope="col">Product name</th><th scope="col">Product code</th><th scope="col">Effective date</th><th scope="col">Purity and rate details</th><th scope="col">Actions</th></tr>
              </thead>
              <tbody>
                {filteredMasters.map((master) => (
                  <tr key={master.id}>
                    <td>{master.productName}</td>
                    <td className="grm-code">{master.productCode}</td>
                    <td>{master.effectiveDate}</td>
                    <td><div className="grm-rate-summary">{master.rates.map((rate) => (
                      <span className="grm-rate-chip" key={rate.id}>{rate.purityCarat} · {rate.netWeight} g · {rate.rate} · {rate.marginPercent}%</span>
                    ))}</div></td>
                    <td>
                      <div className="grm-actions">
                        <button
                          className="grm-icon"
                          type="button"
                          onClick={() => setDialog({ type: 'view', master })}
                          aria-label={`View ${master.productCode}`}
                          title="View"
                        >
                          <Eye size={16} />
                        </button>
                        <button className="grm-icon" type="button" onClick={() => openEdit(master)} aria-label={`Edit ${master.productName}`} title="Edit"><Pencil size={15} /></button>
                        <button className="grm-icon danger" type="button" onClick={() => setDialog({ type: 'delete', master })} aria-label={`Delete ${master.productName}`} title="Delete"><Trash2 size={15} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
                {loading && <tr><td className="grm-empty" colSpan="5"><span className="grm-loading"><LoaderCircle className="grm-spin" size={18} />Loading gold rate masters…</span></td></tr>}
                {!loading && mastersError && <tr><td className="grm-empty" colSpan="5"><strong>{mastersError}</strong></td></tr>}
                {!loading && !mastersError && filteredMasters.length === 0 && (
                  <tr>
                    <td className="grm-empty" colSpan="5">
                      <strong>{search ? 'No matching gold rate masters' : 'No gold rate masters yet'}</strong>
                      {!search && <span>Create a master to manage effective-dated gold rates by purity.</span>}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </main>

      {dialog?.type === 'form' && (
        <div className="grm-overlay" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !saving) closeDialog(); }}>
          <section className="grm-dialog" role="dialog" aria-modal="true" aria-labelledby="grm-form-title">
            <header className="grm-dialog-head">
              <div><h2 id="grm-form-title">{dialog.master ? 'Edit gold rate master' : 'Create gold rate master'}</h2><p>Select a product, set the effective date, and define the rate details by purity.</p></div>
              <button className="grm-close" type="button" onClick={closeDialog} disabled={saving} aria-label="Close form"><X size={18} /></button>
            </header>
            {message?.type === 'error' && <div className="grm-message error" role="alert">{message.text}</div>}
            <form className="grm-form" onSubmit={submit} noValidate>
              <div className="grm-fields">
                <label className="grm-field" htmlFor="gr-productName">
                  Product Name *
                  <div className="grm-product-search">
                    <input
                      id="gr-productName"
                      value={form.productName}
                      onChange={(event) => updateProductName(event.target.value)}
                      maxLength={100}
                      autoComplete="off"
                      placeholder="Search product name"
                      aria-required="true"
                      aria-invalid={Boolean(errors.productName)}
                      aria-describedby={errors.productName ? 'gr-productName-error' : undefined}
                    />
                    {form.productName.trim() && !selectedProduct && (
                      <div className="grm-product-results" role="region" aria-label="Product search results">
                        {productsLoading && <div className="grm-product-result" role="status">Searching products…</div>}
                        {!productsLoading && productSearchError && <div className="grm-product-result grm-error" role="alert">{productSearchError}</div>}
                        {!productsLoading && !productSearchError && products.length === 0 && <div className="grm-product-result" role="status">No matching products found.</div>}
                        {!productsLoading && products.map((product) => (
                          <button className="grm-product-result" key={product.code} type="button" onClick={() => chooseProduct(product)}>
                            <span>{product.name}</span><span className="grm-product-result-code">{product.code}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  {errors.productName && <small className="grm-error" id="gr-productName-error">{errors.productName}</small>}
                </label>
                <label className="grm-field" htmlFor="gr-productCode">
                  Product Code *
                  <input id="gr-productCode" value={form.productCode} readOnly aria-readonly="true" placeholder="Selected product code" />
                </label>
                <label className="grm-field" htmlFor="gr-effectiveDate">
                  Effective Date *
                  <input
                    id="gr-effectiveDate"
                    value={form.effectiveDate}
                    onChange={(event) => updateEffectiveDate(event.target.value)}
                    type="date"
                    min={todayString()}
                    aria-required="true"
                    aria-invalid={Boolean(errors.effectiveDate)}
                    aria-describedby={errors.effectiveDate ? 'gr-effectiveDate-error' : undefined}
                  />
                  {errors.effectiveDate && <small className="grm-error" id="gr-effectiveDate-error">{errors.effectiveDate}</small>}
                </label>
              </div>

              <div className="grm-table-wrap">
                <table className="grm-table">
                  <thead>
                    <tr><th scope="col">Sr.</th><th scope="col">Assessed Purity Carat</th><th scope="col">Net Weight (g)</th><th scope="col">Rate</th><th scope="col">Margin %</th><th scope="col"><span className="sr-only">Actions</span></th></tr>
                  </thead>
                  <tbody>
                    {form.rates.map((rate, index) => (
                      <tr key={rate.id}>
                        <td>{index + 1}</td>
                        {[
                          ['purityCarat', 'Purity carat', 'text', '22K'],
                          ['netWeight', 'Net weight in grams', 'number', '0.001'],
                          ['rate', 'Rate', 'number', '0.01'],
                          ['marginPercent', 'Margin percentage', 'number', '0.01']
                        ].map(([field, label, type, placeholder]) => {
                          const errorKey = `rate-${rate.id}-${field}`;
                          return (
                            <td className="grm-cell" key={field}>
                              <input
                                id={`gr-${errorKey}`}
                                aria-label={`${label}, row ${index + 1}`}
                                type={type}
                                min={type === 'number' ? '0' : undefined}
                                max={field === 'marginPercent' ? '100' : undefined}
                                step={field === 'netWeight' ? '0.001' : field === 'purityCarat' ? undefined : '0.01'}
                                inputMode={type === 'number' ? 'decimal' : undefined}
                                placeholder={placeholder}
                                value={rate[field]}
                                onChange={(event) => updateRate(rate.id, field, event.target.value)}
                                aria-invalid={Boolean(errors[errorKey])}
                                aria-describedby={errors[errorKey] ? `gr-${errorKey}-error` : undefined}
                              />
                              {errors[errorKey] && <small className="grm-error" id={`gr-${errorKey}-error`}>{errors[errorKey]}</small>}
                            </td>
                          );
                        })}
                        <td>
                          {form.rates.length > 1 && (
                            <button className="grm-remove" type="button" onClick={() => removeRate(rate.id)} aria-label={`Remove rate row ${index + 1}`} title="Remove row">
                              <Trash2 size={15} />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {errors.rates && <p className="grm-error" role="alert">{errors.rates}</p>}
              <div className="grm-tools"><button className="grm-add" type="button" onClick={addRate}><CirclePlus size={15} /> Add purity rate</button></div>
              <div className="grm-actions-footer">
                <button className="grm-btn" type="button" onClick={closeDialog} disabled={saving}>Cancel</button>
                <button className="grm-btn grm-submit" type="submit" disabled={saving}>{saving ? <LoaderCircle className="grm-spin" size={15} /> : <Save size={15} />}{saving ? 'Saving…' : dialog.master ? 'Save changes' : 'Create master'}</button>
              </div>
            </form>
          </section>
        </div>
      )}

      {dialog?.type === 'view' && (
        <div className="grm-overlay" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setDialog(null); }}>
          <section className="grm-dialog" role="dialog" aria-modal="true" aria-labelledby="grm-view-title">
            <header className="grm-dialog-head">
              <div><h2 id="grm-view-title">{dialog.master.productName}</h2><p>{dialog.master.productCode} · Effective {dialog.master.effectiveDate}</p></div>
              <button className="grm-close" type="button" onClick={() => setDialog(null)} aria-label="Close details"><X size={18} /></button>
            </header>
            <div className="grm-tier-view">
              <h3>Gold rates by purity</h3>
              <table className="grm-view-table">
                <thead><tr><th>Purity carat</th><th>Net weight (g)</th><th>Rate</th><th>Margin %</th></tr></thead>
                <tbody>
                  {dialog.master.rates.map((rate) => (
                    <tr key={rate.id}>
                      <td>{rate.purityCarat}</td><td>{rate.netWeight}</td><td>{rate.rate}</td><td>{rate.marginPercent}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <footer className="grm-dialog-footer"><button className="grm-btn" type="button" onClick={() => setDialog(null)}>Close</button></footer>
          </section>
        </div>
      )}

      {dialog?.type === 'delete' && (
        <div className="grm-overlay" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setDialog(null); }}>
          <section className="grm-dialog" role="alertdialog" aria-modal="true" aria-labelledby="grm-delete-title">
            <header className="grm-dialog-head">
              <div><h2 id="grm-delete-title">Delete gold rate master?</h2><p>This action cannot be undone.</p></div>
              <button className="grm-close" type="button" onClick={() => setDialog(null)} aria-label="Close confirmation"><X size={18} /></button>
            </header>
            <div className="grm-confirm">{dialog.master.productName} ({dialog.master.productCode}) · Effective {dialog.master.effectiveDate}</div>
            <footer className="grm-dialog-footer">
              <button className="grm-btn" type="button" onClick={() => setDialog(null)}>Cancel</button>
              <button className="grm-btn grm-submit" type="button" onClick={() => deleteMaster(dialog.master)}>Delete master</button>
            </footer>
          </section>
        </div>
      )}
    </AppShell>
  );
}