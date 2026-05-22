/**
 * data-diff View — DOM更新・色分けハイライト表示（MVCのV）
 * SQLやDB操作は一切行わない。Controllerから渡されたデータを描画するだけ。
 * 追加(緑)/削除(赤)/変更(橙)/不正(赤)の4種類の差分を色分けで表示する。
 */
import { $, renderTable } from '../shared/tableRenderer.js';

var NULL_HTML = '<em style="color:var(--accent);">NULL</em>';

export function showStatus(html) {
  $('status').innerHTML = html;
}

export function showOverview(overview) {
  renderTable('tblCurrent', overview.current, { nullDisplay: NULL_HTML });
  renderTable('tblImported', overview.imported, { nullDisplay: NULL_HTML });
  $('dataOverview').style.display = 'grid';
}

export function showAdded(result) {
  return renderTable('addedResult', result, { hlClass: 'hl-add', nullDisplay: NULL_HTML });
}

export function showDeleted(result) {
  return renderTable('deletedResult', result, { hlClass: 'hl-del', nullDisplay: NULL_HTML });
}

export function showChanged(result) {
  return renderTable('changedResult', result, { hlClass: 'hl-chg', hlCols: [2,3,4,5], nullDisplay: NULL_HTML });
}

export function showIntegrity(result) {
  return renderTable('checkResult', result, { hlClass: 'hl-err', nullDisplay: NULL_HTML });
}

export function showSyncResult(stats) {
  var html = '<div style="background:var(--ink);color:#8fd9c4;font-family:var(--mono);font-size:13px;padding:14px 16px;border-radius:3px;line-height:1.8;">';
  html += '✓ 同期完了<br>';
  html += '　追加: <b style="color:#98c379;">' + stats.added + ' 件</b><br>';
  html += '　更新: <b style="color:#f0a868;">' + stats.changed + ' 件</b><br>';
  html += '　削除: <b style="color:#e06c75;">' + stats.deleted + ' 件</b><br>';
  html += '　スキップ（不正データ）: <b style="color:#e06c75;">' + stats.skipped + ' 件</b>';
  html += '</div>';
  $('syncResult').innerHTML = html;
}

export function showVerdict(finalCount) {
  var v = $('verdict');
  v.innerHTML = '<b>✓ 同期完了</b> ─ inventory_current テーブルは <b>' + finalCount + ' 件</b>に更新されました。<br>' +
    '差分抽出 → 整合性チェック → 同期実行。外部データとの突合せはこの手順で安全に行います。';
  v.classList.add('show');
}

export function enableButton(id)  { $(id).disabled = false; }
export function disableButton(id) { $(id).disabled = true; }

export function enableInitialButtons() {
  $('btnAdded').disabled = false;
  $('btnDeleted').disabled = false;
  $('btnChanged').disabled = false;
  $('btnCheck').disabled = false;
  $('btnReset').disabled = false;
}

export function resetUI() {
  ['addedResult','deletedResult','changedResult','checkResult','syncResult'].forEach(function(id) {
    $(id).innerHTML = '';
  });
  $('verdict').classList.remove('show');
  $('btnSync').disabled = true;
}
