import type {LineItem} from '../types';
import {totalOf} from '../types';
import {formatDate, formatMoney} from '../utils';

interface DocViewProps {
  /** Document heading, e.g. 報價單 / 發票 / 收據 */
  title: string;
  numberLabel?: string;
  number?: string;
  dateISO: string;
  clientName: string;
  phone: string;
  address: string;
  items: LineItem[];
  /** Quotation only: validity-until ISO date; renders the 半年有效期 line */
  validityUntilISO?: string;
  /** Receipt only: the invoice this receipt belongs to */
  invoiceNumber?: string;
}

/**
 * The minimal document layout shared by quotations, invoices and receipts:
 * company name + Tiffany Blue line, number/date, client, address, items, total.
 * No bank details, no terms, no signature block.
 */
export default function DocView(props: DocViewProps) {
  const total = totalOf(props.items);
  const isReceipt = props.invoiceNumber != null;
  return (
    <div className="doc-sheet">
      <div className="doc-company-en">Jupiter's Design Limited</div>
      <div className="doc-company-tc">木星設計有限公司</div>
      <div className="doc-tiffany" />
      <h2 className="doc-title">{props.title}</h2>
      <dl className="doc-meta">
        {props.number ? (
          <>
            <dt>{props.numberLabel}</dt>
            <dd>{props.number}</dd>
          </>
        ) : null}
        <dt>日期</dt>
        <dd>{formatDate(props.dateISO)}</dd>
        <dt>客戶</dt>
        <dd>{props.clientName}</dd>
        <dt>聯絡電話</dt>
        <dd>{props.phone}</dd>
        <dt>地址</dt>
        <dd>{props.address}</dd>
        {isReceipt ? (
          <>
            <dt>對應發票</dt>
            <dd>{props.invoiceNumber}</dd>
          </>
        ) : null}
      </dl>
      <table className="doc-items">
        <thead>
          <tr>
            <th>工程項目</th>
            <th className="amount">金額</th>
          </tr>
        </thead>
        <tbody>
          {props.items.map(item => (
            <tr key={item.id}>
              <td>{item.name}</td>
              <td className="amount">{formatMoney(item.amount)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="doc-total-row">
        {isReceipt ? '已收金額' : '總額'}：{formatMoney(total)}
      </div>
      {props.validityUntilISO ? (
        <p className="doc-note">
          本報價單有效期為半年，由報價日期起計，有效至 {formatDate(props.validityUntilISO)}。
        </p>
      ) : null}
      {isReceipt ? <p className="doc-paid-line">已全數收訖</p> : null}
    </div>
  );
}
