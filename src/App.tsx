import {useEffect, useMemo, useState} from 'react';
import {Badge} from '@astryxdesign/core/Badge';
import {Button} from '@astryxdesign/core/Button';
import {Table, proportional} from '@astryxdesign/core/Table';
import type {TableColumn} from '@astryxdesign/core/Table';
import {TextInput} from '@astryxdesign/core/TextInput';
import ConfirmDialog from './components/ConfirmDialog';
import DocView from './components/DocView';
import {loadData, saveData} from './store';
import type {AppData, Invoice, LineItem, Quotation, Receipt} from './types';
import {totalOf} from './types';
import {addMonthsISO, formatDate, formatMoney, todayISO, uid} from './utils';

type View =
  | {kind: 'quotations'}
  | {kind: 'invoices'}
  | {kind: 'receipts'}
  | {kind: 'quote-form'; id: string | null}
  | {kind: 'quote-doc'; id: string}
  | {kind: 'invoice-doc'; id: string}
  | {kind: 'receipt-doc'; id: string};

type Dialog =
  | {kind: 'delete-quotation'; q: Quotation}
  | {kind: 'delete-invoice'; inv: Invoice}
  | {kind: 'delete-invoice-blocked'; inv: Invoice}
  | {kind: 'convert'; q: Quotation}
  | {kind: 'receipt'; inv: Invoice}
  | null;

const matchesSearch = (hay: (string | undefined)[], needle: string) =>
  hay.some(h => (h ?? '').toLowerCase().includes(needle.toLowerCase()));

export default function App() {
  const [data, setData] = useState<AppData>(() => loadData());
  const [view, setView] = useState<View>({kind: 'quotations'});
  const [dialog, setDialog] = useState<Dialog>(null);
  const [receiptDate, setReceiptDate] = useState<string>(todayISO());
  const [quoteSearch, setQuoteSearch] = useState('');
  const [invoiceSearch, setInvoiceSearch] = useState('');
  const [receiptSearch, setReceiptSearch] = useState('');

  useEffect(() => {
    saveData(data);
  }, [data]);

  const invoiceById = (id: string | null) => data.invoices.find(i => i.id === id);
  const receiptById = (id: string | null) => data.receipts.find(r => r.id === id);

  // ---------- actions ----------

  const saveQuotation = (fields: Omit<Quotation, 'id' | 'invoiceId'>, id: string | null) => {
    setData(prev => {
      if (id) {
        return {
          ...prev,
          quotations: prev.quotations.map(q => (q.id === id ? {...q, ...fields} : q)),
        };
      }
      const q: Quotation = {id: uid(), invoiceId: null, ...fields};
      return {...prev, quotations: [q, ...prev.quotations]};
    });
    setView({kind: 'quotations'});
  };

  const convertQuotation = (q: Quotation) => {
    const seq = data.counters.invoice;
    const inv: Invoice = {
      id: uid(),
      number: `INV-2026-${String(seq).padStart(3, '0')}`,
      clientName: q.clientName,
      phone: q.phone,
      address: q.address,
      date: q.date,
      items: q.items.map(i => ({...i})),
      paid: false,
      quotationId: q.id,
      receiptId: null,
    };
    setData(prev => ({
      ...prev,
      invoices: [inv, ...prev.invoices],
      quotations: prev.quotations.map(x => (x.id === q.id ? {...x, invoiceId: inv.id} : x)),
      counters: {...prev.counters, invoice: seq + 1},
    }));
    setDialog(null);
    setView({kind: 'invoice-doc', id: inv.id});
  };

  const togglePaid = (inv: Invoice) => {
    setData(prev => ({
      ...prev,
      invoices: prev.invoices.map(i => (i.id === inv.id ? {...i, paid: !i.paid} : i)),
    }));
  };

  const issueReceipt = (inv: Invoice, date: string) => {
    const seq = data.counters.receipt;
    const r: Receipt = {
      id: uid(),
      number: `RCT-2026-${String(seq).padStart(3, '0')}`,
      invoiceId: inv.id,
      invoiceNumber: inv.number,
      clientName: inv.clientName,
      phone: inv.phone,
      address: inv.address,
      date,
      items: inv.items.map(i => ({...i})),
    };
    setData(prev => ({
      ...prev,
      receipts: [r, ...prev.receipts],
      invoices: prev.invoices.map(i => (i.id === inv.id ? {...i, receiptId: r.id} : i)),
      counters: {...prev.counters, receipt: seq + 1},
    }));
    setDialog(null);
    setView({kind: 'receipt-doc', id: r.id});
  };

  const deleteQuotation = (q: Quotation) => {
    setData(prev => ({
      ...prev,
      quotations: prev.quotations.filter(x => x.id !== q.id),
      // Deleting a converted quotation keeps its invoice; the invoice just stands alone.
      invoices: q.invoiceId
        ? prev.invoices.map(i => (i.id === q.invoiceId ? {...i, quotationId: null} : i))
        : prev.invoices,
    }));
    setDialog(null);
    setView({kind: 'quotations'});
  };

  const deleteInvoice = (inv: Invoice) => {
    setData(prev => ({
      ...prev,
      invoices: prev.invoices.filter(i => i.id !== inv.id),
      // Free the source quotation so it can be converted again.
      quotations: inv.quotationId
        ? prev.quotations.map(q => (q.id === inv.quotationId ? {...q, invoiceId: null} : q))
        : prev.quotations,
    }));
    setDialog(null);
    setView({kind: 'invoices'});
  };

  // ---------- filtered lists ----------

  const shownQuotations = useMemo(
    () =>
      data.quotations.filter(
        q =>
          !quoteSearch.trim() ||
          matchesSearch([q.clientName, q.phone, q.address], quoteSearch.trim()),
      ),
    [data.quotations, quoteSearch],
  );

  const shownInvoices = useMemo(
    () =>
      data.invoices.filter(
        i =>
          !invoiceSearch.trim() ||
          matchesSearch([i.clientName, i.phone, i.address, i.number], invoiceSearch.trim()),
      ),
    [data.invoices, invoiceSearch],
  );

  const shownReceipts = useMemo(
    () =>
      data.receipts.filter(
        r =>
          !receiptSearch.trim() ||
          matchesSearch([r.clientName, r.phone, r.number, r.invoiceNumber], receiptSearch.trim()),
      ),
    [data.receipts, receiptSearch],
  );

  const unpaid = data.invoices.filter(i => !i.paid);
  const unpaidTotal = unpaid.reduce((s, i) => s + totalOf(i.items), 0);

  // ---------- table columns ----------

  const quoteColumns: TableColumn<Quotation>[] = [
    {key: 'date', header: '日期', width: proportional(1), renderCell: q => formatDate(q.date)},
    {key: 'clientName', header: '客戶', width: proportional(2)},
    {key: 'phone', header: '電話', width: proportional(1)},
    {
      key: 'total',
      header: '總額',
      width: proportional(1),
      renderCell: q => formatMoney(totalOf(q.items)),
    },
    {
      key: 'status',
      header: '狀態',
      width: proportional(1),
      renderCell: q =>
        q.invoiceId ? (
          <Badge variant="success" label="已轉發票" />
        ) : (
          <Badge variant="neutral" label="未轉發票" />
        ),
    },
    {
      key: 'actions',
      header: '操作',
      width: proportional(2),
      renderCell: q => (
        <div className="cell-actions">
          <Button label="查看" size="sm" variant="secondary" onClick={() => setView({kind: 'quote-doc', id: q.id})} />
          {!q.invoiceId && (
            <>
              <Button label="修改" size="sm" variant="ghost" onClick={() => setView({kind: 'quote-form', id: q.id})} />
              <Button label="轉做發票" size="sm" variant="primary" onClick={() => setDialog({kind: 'convert', q})} />
            </>
          )}
          <Button label="刪除" size="sm" variant="destructive" onClick={() => setDialog({kind: 'delete-quotation', q})} />
        </div>
      ),
    },
  ];

  const invoiceColumns: TableColumn<Invoice>[] = [
    {key: 'number', header: '編號', width: proportional(1)},
    {key: 'date', header: '日期', width: proportional(1), renderCell: i => formatDate(i.date)},
    {key: 'clientName', header: '客戶', width: proportional(2)},
    {
      key: 'total',
      header: '總額',
      width: proportional(1),
      renderCell: i => formatMoney(totalOf(i.items)),
    },
    {
      key: 'status',
      header: '狀態',
      width: proportional(1),
      renderCell: i =>
        i.paid ? (
          <Badge variant="success" label="已收" />
        ) : (
          <Badge variant="warning" label="未收" />
        ),
    },
    {
      key: 'receipt',
      header: '收據',
      width: proportional(1),
      renderCell: i => receiptById(i.receiptId)?.number ?? '—',
    },
    {
      key: 'actions',
      header: '操作',
      width: proportional(2),
      renderCell: i => (
        <div className="cell-actions">
          <Button label="查看" size="sm" variant="secondary" onClick={() => setView({kind: 'invoice-doc', id: i.id})} />
          <Button
            label={i.paid ? '改返未收' : '標記已收'}
            size="sm"
            variant="ghost"
            onClick={() => togglePaid(i)}
          />
          {i.paid && !i.receiptId && (
            <Button
              label="開收據"
              size="sm"
              variant="primary"
              onClick={() => {
                setReceiptDate(todayISO());
                setDialog({kind: 'receipt', inv: i});
              }}
            />
          )}
          {i.receiptId && (
            <Button
              label="睇收據"
              size="sm"
              variant="ghost"
              onClick={() => setView({kind: 'receipt-doc', id: i.receiptId!})}
            />
          )}
          <Button
            label="刪除"
            size="sm"
            variant="destructive"
            onClick={() =>
              setDialog(
                i.receiptId
                  ? {kind: 'delete-invoice-blocked', inv: i}
                  : {kind: 'delete-invoice', inv: i},
              )
            }
          />
        </div>
      ),
    },
  ];

  const receiptColumns: TableColumn<Receipt>[] = [
    {key: 'number', header: '編號', width: proportional(1)},
    {key: 'date', header: '日期', width: proportional(1), renderCell: r => formatDate(r.date)},
    {key: 'clientName', header: '客戶', width: proportional(2)},
    {key: 'invoiceNumber', header: '對應發票', width: proportional(1)},
    {
      key: 'total',
      header: '已收金額',
      width: proportional(1),
      renderCell: r => formatMoney(totalOf(r.items)),
    },
    {
      key: 'actions',
      header: '操作',
      width: proportional(1),
      renderCell: r => (
        <div className="cell-actions">
          <Button label="查看" size="sm" variant="secondary" onClick={() => setView({kind: 'receipt-doc', id: r.id})} />
        </div>
      ),
    },
  ];

  // ---------- render ----------

  const tabButton = (kind: View['kind'], label: string) => (
    <Button
      label={label}
      variant={view.kind === kind ? 'primary' : 'secondary'}
      onClick={() => setView({kind} as View)}
    />
  );

  return (
    <div className="app-shell">
      <header className="app-header no-print">
        <h1>報價及發票系統</h1>
        <span className="company">Jupiter's Design Limited</span>
      </header>
      <div className="tiffany-rule no-print" />
      <nav className="tab-row no-print">
        {tabButton('quotations', '報價單')}
        {tabButton('invoices', '發票')}
        {tabButton('receipts', '收據')}
      </nav>

      {view.kind === 'quotations' && (
        <section>
          <div className="toolbar">
            <div className="search-box">
              <TextInput
                label="搜尋報價"
                isLabelHidden
                placeholder="搜尋客名、電話或地址"
                value={quoteSearch}
                onChange={setQuoteSearch}
              />
            </div>
            <Button label="新增報價" variant="primary" onClick={() => setView({kind: 'quote-form', id: null})} />
          </div>
          {shownQuotations.length === 0 ? (
            <p className="empty-note">未有報價單。㩒「新增報價」開第一張。</p>
          ) : (
            <Table data={shownQuotations} columns={quoteColumns} idKey="id" hasHover />
          )}
        </section>
      )}

      {view.kind === 'invoices' && (
        <section>
          <p className="summary-line">
            未收錢發票：<strong>{unpaid.length} 張</strong>，合共{' '}
            <strong>{formatMoney(unpaidTotal)}</strong>
          </p>
          <div className="toolbar">
            <div className="search-box">
              <TextInput
                label="搜尋發票"
                isLabelHidden
                placeholder="搜尋客名、電話、地址或編號"
                value={invoiceSearch}
                onChange={setInvoiceSearch}
              />
            </div>
          </div>
          {shownInvoices.length === 0 ? (
            <p className="empty-note">未有發票。喺報價單嗰度㩒「轉做發票」就會有。</p>
          ) : (
            <Table data={shownInvoices} columns={invoiceColumns} idKey="id" hasHover />
          )}
        </section>
      )}

      {view.kind === 'receipts' && (
        <section>
          <div className="toolbar">
            <div className="search-box">
              <TextInput
                label="搜尋收據"
                isLabelHidden
                placeholder="搜尋客名、收據編號或發票編號"
                value={receiptSearch}
                onChange={setReceiptSearch}
              />
            </div>
          </div>
          {shownReceipts.length === 0 ? (
            <p className="empty-note">未有收據。發票標記「已收」之後就可以開收據。</p>
          ) : (
            <Table data={shownReceipts} columns={receiptColumns} idKey="id" hasHover />
          )}
        </section>
      )}

      {view.kind === 'quote-form' && (
        <QuoteForm
          initial={view.id ? data.quotations.find(q => q.id === view.id) : undefined}
          onSave={saveQuotation}
          onCancel={() => setView({kind: 'quotations'})}
        />
      )}

      {view.kind === 'quote-doc' &&
        (() => {
          const q = data.quotations.find(x => x.id === view.id);
          if (!q) return <p className="empty-note">搵唔到呢張報價單。</p>;
          const inv = invoiceById(q.invoiceId);
          return (
            <section>
              <DocView
                title="報價單"
                dateISO={q.date}
                clientName={q.clientName}
                phone={q.phone}
                address={q.address}
                items={q.items}
                validityUntilISO={addMonthsISO(q.date, 6)}
              />
              <div className="doc-actions no-print">
                <Button label="返回清單" variant="secondary" onClick={() => setView({kind: 'quotations'})} />
                <Button label="列印／存 PDF" variant="secondary" onClick={() => window.print()} />
                {inv ? (
                  <Button label={`睇發票 ${inv.number}`} variant="primary" onClick={() => setView({kind: 'invoice-doc', id: inv.id})} />
                ) : (
                  <Button label="轉做發票" variant="primary" onClick={() => setDialog({kind: 'convert', q})} />
                )}
              </div>
            </section>
          );
        })()}

      {view.kind === 'invoice-doc' &&
        (() => {
          const inv = data.invoices.find(x => x.id === view.id);
          if (!inv) return <p className="empty-note">搵唔到呢張發票。</p>;
          const receipt = receiptById(inv.receiptId);
          return (
            <section>
              <DocView
                title="發票"
                numberLabel="發票編號"
                number={inv.number}
                dateISO={inv.date}
                clientName={inv.clientName}
                phone={inv.phone}
                address={inv.address}
                items={inv.items}
              />
              <div className="doc-actions no-print">
                <Button label="返回清單" variant="secondary" onClick={() => setView({kind: 'invoices'})} />
                <Button label="列印／存 PDF" variant="secondary" onClick={() => window.print()} />
                <Button
                  label={inv.paid ? '改返未收' : '標記已收'}
                  variant="secondary"
                  onClick={() => togglePaid(inv)}
                />
                {inv.paid && !receipt && (
                  <Button
                    label="開收據"
                    variant="primary"
                    onClick={() => {
                      setReceiptDate(todayISO());
                      setDialog({kind: 'receipt', inv});
                    }}
                  />
                )}
                {receipt && (
                  <Button label={`睇收據 ${receipt.number}`} variant="primary" onClick={() => setView({kind: 'receipt-doc', id: receipt.id})} />
                )}
              </div>
            </section>
          );
        })()}

      {view.kind === 'receipt-doc' &&
        (() => {
          const r = data.receipts.find(x => x.id === view.id);
          if (!r) return <p className="empty-note">搵唔到呢張收據。</p>;
          return (
            <section>
              <DocView
                title="收據"
                numberLabel="收據編號"
                number={r.number}
                dateISO={r.date}
                clientName={r.clientName}
                phone={r.phone}
                address={r.address}
                items={r.items}
                invoiceNumber={r.invoiceNumber}
              />
              <div className="doc-actions no-print">
                <Button label="返回清單" variant="secondary" onClick={() => setView({kind: 'receipts'})} />
                <Button label="列印／存 PDF" variant="secondary" onClick={() => window.print()} />
                <Button label="睇返發票" variant="secondary" onClick={() => setView({kind: 'invoice-doc', id: r.invoiceId})} />
              </div>
            </section>
          );
        })()}

      {/* ---------- dialogs ---------- */}

      {dialog?.kind === 'convert' && (
        <ConfirmDialog
          title="轉做發票"
          confirmLabel="轉做發票"
          onCancel={() => setDialog(null)}
          onConfirm={() => convertQuotation(dialog.q)}>
          <p>
            將呢張報價單轉做發票？<br />
            客戶：{dialog.q.clientName}
            <br />
            日期：{formatDate(dialog.q.date)}
            <br />
            總額：{formatMoney(totalOf(dialog.q.items))}
          </p>
          <p>轉咗之後，報價單唔可以再改，發票會自動攞下一個編號。</p>
        </ConfirmDialog>
      )}

      {dialog?.kind === 'delete-quotation' && (
        <ConfirmDialog
          title="刪除報價單"
          confirmLabel="確認刪除"
          isDestructive
          onCancel={() => setDialog(null)}
          onConfirm={() => deleteQuotation(dialog.q)}>
          <p>
            真係要刪呢張報價單？
            <br />
            客戶：{dialog.q.clientName}
            <br />
            日期：{formatDate(dialog.q.date)}
            <br />
            總額：{formatMoney(totalOf(dialog.q.items))}
          </p>
          {dialog.q.invoiceId && (
            <p>
              注意：呢張報價已經轉咗發票 {invoiceById(dialog.q.invoiceId)?.number}
              。刪報價唔會刪張發票，張發票會保留。
            </p>
          )}
        </ConfirmDialog>
      )}

      {dialog?.kind === 'delete-invoice' && (
        <ConfirmDialog
          title="刪除發票"
          confirmLabel="確認刪除"
          isDestructive
          onCancel={() => setDialog(null)}
          onConfirm={() => deleteInvoice(dialog.inv)}>
          <p>
            真係要刪呢張發票？
            <br />
            客戶：{dialog.inv.clientName}
            <br />
            編號：{dialog.inv.number}
            <br />
            總額：{formatMoney(totalOf(dialog.inv.items))}
          </p>
          <p>刪咗之後，呢個編號唔會再用返。</p>
        </ConfirmDialog>
      )}

      {dialog?.kind === 'delete-invoice-blocked' && (
        <ConfirmDialog
          title="刪唔到"
          confirmLabel="知道"
          onCancel={() => setDialog(null)}
          onConfirm={() => setDialog(null)}>
          <p>
            發票 {dialog.inv.number}（{dialog.inv.clientName}）已經開咗收據{' '}
            {receiptById(dialog.inv.receiptId)?.number}，唔可以刪除。
          </p>
        </ConfirmDialog>
      )}

      {dialog?.kind === 'receipt' && (
        <ConfirmDialog
          title="開收據"
          confirmLabel="開收據"
          onCancel={() => setDialog(null)}
          onConfirm={() => issueReceipt(dialog.inv, receiptDate)}>
          <p>
            幫呢張發票開收據？
            <br />
            客戶：{dialog.inv.clientName}
            <br />
            發票編號：{dialog.inv.number}
            <br />
            金額：{formatMoney(totalOf(dialog.inv.items))}
          </p>
          <div className="date-field">
            <label htmlFor="receipt-date">收款日期</label>
            <input
              id="receipt-date"
              type="date"
              value={receiptDate}
              onChange={e => setReceiptDate(e.target.value)}
            />
          </div>
        </ConfirmDialog>
      )}
    </div>
  );
}

// ---------- quotation form ----------

interface QuoteFormProps {
  initial?: Quotation;
  onSave: (fields: Omit<Quotation, 'id' | 'invoiceId'>, id: string | null) => void;
  onCancel: () => void;
}

function QuoteForm({initial, onSave, onCancel}: QuoteFormProps) {
  const [clientName, setClientName] = useState(initial?.clientName ?? '');
  const [phone, setPhone] = useState(initial?.phone ?? '');
  const [address, setAddress] = useState(initial?.address ?? '');
  const [date, setDate] = useState(initial?.date ?? todayISO());
  const [items, setItems] = useState<LineItem[]>(
    initial?.items.map(i => ({...i})) ?? [{id: uid(), name: '', amount: 0}],
  );
  const [error, setError] = useState('');

  const setItem = (id: string, patch: Partial<LineItem>) =>
    setItems(prev => prev.map(i => (i.id === id ? {...i, ...patch} : i)));

  const submit = () => {
    const cleanItems = items
      .map(i => ({...i, name: i.name.trim(), amount: Number(i.amount) || 0}))
      .filter(i => i.name);
    if (!clientName.trim()) {
      setError('請入客戶公司名。');
      return;
    }
    if (cleanItems.length === 0) {
      setError('請至少入一個工程項目。');
      return;
    }
    onSave(
      {
        clientName: clientName.trim(),
        phone: phone.trim(),
        address: address.trim(),
        date,
        items: cleanItems,
      },
      initial?.id ?? null,
    );
  };

  return (
    <section className="form-card">
      <h2 style={{marginTop: 0}}>{initial ? '修改報價' : '新增報價'}</h2>
      <div className="form-grid">
        <TextInput label="客戶公司名" value={clientName} onChange={setClientName} />
        <TextInput label="聯絡電話" value={phone} onChange={setPhone} />
        <div className="full">
          <TextInput label="地址" value={address} onChange={setAddress} />
        </div>
        <div className="date-field">
          <label htmlFor="quote-date">報價日期</label>
          <input id="quote-date" type="date" value={date} onChange={e => setDate(e.target.value)} />
        </div>
      </div>

      <h3>工程項目</h3>
      {items.map(item => (
        <div className="item-row" key={item.id}>
          <TextInput
            label="項目"
            isLabelHidden
            placeholder="項目名稱"
            value={item.name}
            onChange={v => setItem(item.id, {name: v})}
          />
          <TextInput
            label="金額"
            isLabelHidden
            placeholder="金額 HK$"
            inputMode="decimal"
            value={item.amount === 0 ? '' : String(item.amount)}
            onChange={v => setItem(item.id, {amount: Number(v.replace(/[^0-9.]/g, '')) || 0})}
          />
          <Button
            label="移除"
            variant="ghost"
            size="sm"
            onClick={() => setItems(prev => prev.filter(i => i.id !== item.id))}
          />
        </div>
      ))}
      <Button
        label="加多一行"
        variant="secondary"
        size="sm"
        onClick={() => setItems(prev => [...prev, {id: uid(), name: '', amount: 0}])}
      />

      <div className="form-total">總額：{formatMoney(totalOf(items))}</div>
      <div className="form-actions">
        <Button label="儲存" variant="primary" onClick={submit} />
        <Button label="取消" variant="secondary" onClick={onCancel} />
      </div>
      {error && <p className="form-error">{error}</p>}
    </section>
  );
}
