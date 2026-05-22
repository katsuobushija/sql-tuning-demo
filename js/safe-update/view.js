/**
 * safe-update View — DOM更新・テーブル描画・ボタン制御（MVCのV）
 * SQLやDB操作は一切行わない。Controllerから渡されたデータを描画するだけ。
 * Before/After のテーブル比較表示が主な役割。
 */
import { $, renderTable } from '../shared/tableRenderer.js';

var NULL_HTML = '<em>NULL</em>';

export function showStatus(html) {
  $('status').innerHTML = html;
}

export function showSelectResult(result) {
  return renderTable('selectResult', result, { nullDisplay: NULL_HTML });
}

export function showUpdateMessage(changes) {
  $('updateResult').innerHTML =
    '<div style="background:var(--ink);color:#8fd9c4;font-family:var(--mono);font-size:13px;padding:10px 14px;border-radius:3px;margin-top:8px;">' +
    '✓ ' + changes + ' 件を更新しました。③で結果を確認してください。</div>';
}

// Before/Afterを左右に並べて表示。Afterのcorp_name列(index=2)をハイライト。
export function showCompare(beforeResult, afterResult) {
  renderTable('beforeTable', beforeResult, { nullDisplay: NULL_HTML });
  renderTable('afterTable', afterResult, { nullDisplay: NULL_HTML, highlightCol: 2 });

  $('compareArea').style.display = 'grid';
  $('compareArea').style.animation = 'pop 0.4s ease';

  var v = $('verdict');
  v.innerHTML =
    '<b>✓ 更新完了</b> ─ corp_name の先頭に「N」が付加されていることを確認できます。<br>' +
    'SELECTで事前確認 → UPDATEで実行 → SELECTで事後確認。この3ステップが本番運用の基本です。';
  v.classList.add('show');
}

export function enableButton(id)  { $(id).disabled = false; }
export function disableButton(id) { $(id).disabled = true; }

export function resetUI() {
  $('selectResult').innerHTML = '';
  $('updateResult').innerHTML = '';
  $('beforeTable').innerHTML = '';
  $('afterTable').innerHTML = '';
  $('compareArea').style.display = 'none';
  $('verdict').classList.remove('show');
  $('btnSelect').disabled = false;
  $('btnUpdate').disabled = true;
  $('btnVerify').disabled = true;
}
