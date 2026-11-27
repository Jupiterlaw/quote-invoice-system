/**
 * 報價及發票系統 — Google Sheet 後端（Apps Script Web App）
 *
 * 部署方法：
 * 1. 開啟 Google Sheet「報價及發票系統資料」
 * 2. 擴充功能 → Apps Script，將預設程式碼全部刪去，貼上本檔案內容
 * 3. 將下面 SECRET 改成自訂密鑰（前端設定入面要入返同一串；
 *    本 repo 入面呢份只留 placeholder，真正密鑰唔好 commit 入 repo）
 * 4. 部署 → 新增部署 → 類型「網頁應用程式」；執行身分「我」；存取權「任何人」
 * 5. 將部署後嘅 Web App URL 貼入前端 src/sheetsConfig.ts 嘅 WEB_APP_URL
 *
 * 資料格式：Sheet 分頁「報價／發票／收據／設定」，每張單一行，
 * 項目清單以 JSON 字串存入「項目(JSON)」欄。前端 AppData 形狀原封不動傳輸，
 * 本 script 負責 AppData <-> Sheet 行 嘅對照。
 */

var SECRET = '__REPLACE_WITH_YOUR_SECRET__';

var SHEET_Q = '報價';
var SHEET_I = '發票';
var SHEET_R = '收據';
var SHEET_S = '設定';

function jsonOut(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function doGet(e) {
  var p = (e && e.parameter) || {};
  if (p.secret !== SECRET) return jsonOut({ok: false, error: 'unauthorized'});
  if (p.action === 'getState') return jsonOut({ok: true, state: readState()});
  return jsonOut({ok: false, error: 'unknown action'});
}

function doPost(e) {
  var body = {};
  try { body = JSON.parse(e.postData.contents); } catch (err) {}
  if (body.secret !== SECRET) return jsonOut({ok: false, error: 'unauthorized'});
  if (body.action === 'saveState' && body.state) {
    writeState(body.state);
    return jsonOut({ok: true});
  }
  return jsonOut({ok: false, error: 'unknown action'});
}

function ss() { return SpreadsheetApp.getActiveSpreadsheet(); }

function rowsToObjects(sheetName) {
  var sh = ss().getSheetByName(sheetName);
  var values = sh.getDataRange().getValues();
  if (values.length < 2) return [];
  var headers = values[0];
  var out = [];
  for (var r = 1; r < values.length; r++) {
    var obj = {};
    var empty = true;
    for (var c = 0; c < headers.length; c++) {
      obj[headers[c]] = values[r][c];
      if (values[r][c] !== '') empty = false;
    }
    if (!empty) out.push(obj);
  }
  return out;
}

function fmtDate(v) {
  // Sheet 會將 'yyyy-mm-dd' 字串自動轉成日期值，讀回時要轉返 yyyy-mm-dd
  if (Object.prototype.toString.call(v) === '[object Date]') {
    return Utilities.formatDate(v, Session.getScriptTimeZone(), 'yyyy-MM-dd');
  }
  return String(v);
}

function parseItems(v) {  if (!v) return [];
  try {
    var arr = JSON.parse(String(v));
    return arr.map(function (it) {
      return {id: String(it.id || ''), name: String(it.name || ''), amount: Number(it.amount) || 0};
    });
  } catch (err) { return []; }
}

function totalOf(items) {
  return (items || []).reduce(function (s, it) { return s + (Number(it.amount) || 0); }, 0);
}

function readState() {
  var quotations = rowsToObjects(SHEET_Q).map(function (o) {
    return {
      id: String(o['id']),
      clientName: String(o['客戶']),
      phone: String(o['電話']),
      address: String(o['地址']),
      date: fmtDate(o['日期']),
      items: parseItems(o['項目(JSON)']),
      invoiceId: String(o['發票id'] || '') || null
    };
  });
  var invoices = rowsToObjects(SHEET_I).map(function (o) {
    return {
      id: String(o['id']),
      number: String(o['發票編號']),
      clientName: String(o['客戶']),
      phone: String(o['電話']),
      address: String(o['地址']),
      date: fmtDate(o['日期']),
      items: parseItems(o['項目(JSON)']),
      paid: String(o['已收']) === '是',
      quotationId: String(o['報價id'] || '') || null,
      receiptId: String(o['收據id'] || '') || null
    };
  });
  var receipts = rowsToObjects(SHEET_R).map(function (o) {
    return {
      id: String(o['id']),
      number: String(o['收據編號']),
      invoiceId: String(o['發票id']),
      invoiceNumber: String(o['發票編號']),
      clientName: String(o['客戶']),
      phone: String(o['電話']),
      address: String(o['地址']),
      date: fmtDate(o['日期']),
      items: parseItems(o['項目(JSON)'])
    };
  });
  var settings = {};
  rowsToObjects(SHEET_S).forEach(function (o) { settings[String(o['鍵'])] = o['值']; });
  return {
    quotations: quotations,
    invoices: invoices,
    receipts: receipts,
    counters: {
      invoice: Number(settings['nextInvoice']) || 60,
      receipt: Number(settings['nextReceipt']) || 1
    }
  };
}

function rewriteSheet(sheetName, headers, rows, dateCol) {
  var sh = ss().getSheetByName(sheetName);
  sh.clearContents();
  var all = [headers].concat(rows);
  // 日期欄預先設做純文字格式，阻止 Sheet 將 yyyy-mm-dd 自動轉成日期值
  if (dateCol) {
    sh.getRange(1, dateCol, all.length, 1).setNumberFormat('@');
  }
  sh.getRange(1, 1, all.length, headers.length).setValues(all);
}

function writeState(state) {
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    rewriteSheet(SHEET_Q,
      ['id', '日期', '客戶', '電話', '地址', '項目(JSON)', '總額', '發票id'],
      (state.quotations || []).map(function (q) {
        return [q.id, q.date, q.clientName, q.phone, q.address,
          JSON.stringify(q.items || []), totalOf(q.items), q.invoiceId || ''];
      }), 2);
    rewriteSheet(SHEET_I,
      ['id', '發票編號', '日期', '客戶', '電話', '地址', '項目(JSON)', '總額', '已收', '報價id', '收據id'],
      (state.invoices || []).map(function (i) {
        return [i.id, i.number, i.date, i.clientName, i.phone, i.address,
          JSON.stringify(i.items || []), totalOf(i.items), i.paid ? '是' : '否',
          i.quotationId || '', i.receiptId || ''];
      }), 2);
    rewriteSheet(SHEET_R,
      ['id', '收據編號', '日期', '發票id', '發票編號', '客戶', '電話', '地址', '項目(JSON)', '總額'],
      (state.receipts || []).map(function (r) {
        return [r.id, r.number, r.date, r.invoiceId, r.invoiceNumber, r.clientName,
          r.phone, r.address, JSON.stringify(r.items || []), totalOf(r.items)];
      }), 2);
    rewriteSheet(SHEET_S,
      ['鍵', '值'],
      [['nextInvoice', (state.counters && state.counters.invoice) || 60],
       ['nextReceipt', (state.counters && state.counters.receipt) || 1]]);
  } finally {
    lock.releaseLock();
  }
}
