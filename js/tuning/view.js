/**
 * tuning View — DOM更新・テーブル描画・ボタン制御（MVCのV）
 * SQLやDB操作は一切行わない。Controllerから渡されたデータを描画するだけ。
 * STEP結果の表示、CSV プレビュー、インデックス計測のビジュアル比較を担当。
 */
import { $, renderTable } from '../shared/tableRenderer.js';

function idxFmt(ms) { return ms < 1 ? ms.toFixed(3) : ms.toFixed(2); }

// --- 日付表示 ---
export function setMonthDates(ms, me) {
  $('monthStart').textContent = ms;
  $('monthEnd').textContent = me;
}

// --- ステータス ---
export function showStatus(html) {
  $('status').innerHTML = html;
}

// --- STEP 1〜3 結果表示 ---
export function showStep1(result) {
  return renderTable('result1', result);
}

export function showStep2(result) {
  return renderTable('result2', result, { hlCols: [4, 5, 6] });
}

export function showStep3(summary, detail) {
  renderTable('result3', summary, { label: '支社ごとの端末台数（集計）' });
  renderTable('result3', detail, { label: '支社ごとの明細（並べ替え済）', append: true });
  return summary[0] ? summary[0].values.length : 0;
}

// --- STEP 4 CSV ---
export function showCSVPreview(csvText, totalRows) {
  var preview = csvText.split('\r\n').slice(0, 15).join('\n');
  if (totalRows > 14) preview += '\n... (全' + totalRows + '行)';
  $('result4').innerHTML =
    '<div style="font-family:var(--mono);font-size:12px;color:var(--accent2);margin-top:8px;letter-spacing:1px;">CSVプレビュー（先頭15行）</div>' +
    '<div class="csv-preview">' + preview.replace(/</g,'&lt;') + '</div>';
}

export function showVerdict() {
  var v = $('verdict');
  v.innerHTML =
    '<b>✓ 業務完了</b> ─ 退社職員の端末リストを支社ごとに整理し、CSVファイルとして出力しました。<br>' +
    'このファイルをExcelで開けば、各支社に連携できる状態です。<br><br>' +
    '<b>SELECT</b>で対象を抽出 → <b>3テーブルJOIN</b>（返却日 IS NULLで配布中のみ）→ <b>GROUP BY</b>で支社ごとに集計 → <b>CSV出力</b>。<br>' +
    'この一連の流れが、データ抽出・連携業務の基本パターンです。';
  v.classList.add('show');
}

// Blobからファイルダウンロードを起動する。
// 一時的な<a>要素を作成してclickし、直後に破棄する。
export function downloadFile(blob, filename) {
  var url = URL.createObjectURL(blob);
  var a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// --- インデックス計測表示 ---
export function showSlowTime(ms, rows, total) {
  $('idxTimeSlow').innerHTML = idxFmt(ms) + '<span style="font-size:16px;color:#888;"> ms</span>';
  $('idxRowsSlow').textContent = rows + ' 件ヒット / ' + total.toLocaleString() + ' 件を全件走査';
}

export function showFastTime(ms, rows) {
  $('idxTimeFast').innerHTML = idxFmt(ms) + '<span style="font-size:16px;color:#888;"> ms</span>';
  $('idxRowsFast').textContent = rows + ' 件ヒット / 索引で直接アクセス';
}

export function showIndexCreated(buildTime) {
  $('idxCreate').textContent = 'インデックス作成済 ✓ (' + idxFmt(buildTime) + 'ms)';
  $('idxCreate').style.background = 'var(--accent2)';
  $('idxCreate').style.color = '#fff';
}

// インデックスあり/なしの速度比を計算し、バーチャートで視覚的に比較表示
export function showIndexVerdict(slowTime, fastTime) {
  var ratio = slowTime / fastTime;
  var v = $('idxVerdict');
  v.innerHTML =
    '<div style="font-size:28px;font-weight:800;color:var(--gold);">約 ' + ratio.toFixed(0) + ' 倍 高速化 <span style="font-size:15px;color:var(--paper);font-weight:400;">(インデックスあり vs なし)</span></div>' +
    '<div>インデックスなし ' + idxFmt(slowTime) + 'ms → インデックスあり ' + idxFmt(fastTime) + 'ms。<br>検索条件のカラムにインデックスを1つ貼るだけで、これだけ差が出ます。上司のアドバイスのおかげで、以降は索引設計を意識するようになりました。</div>';
  v.classList.add('show');
  $('idxBarSlow').style.width = '100%';
  $('idxBarFast').style.width = Math.max(2, (fastTime / slowTime * 100)) + '%';
}

// --- ボタン制御 ---
export function enableButton(id)  { $(id).disabled = false; }
export function disableButton(id) { $(id).disabled = true; }

export function resetUI() {
  ['result1','result2','result3','result4'].forEach(function(id) { $(id).innerHTML = ''; });
  $('verdict').classList.remove('show');
  $('idxVerdict').classList.remove('show');
  $('btn2').disabled = true;
  $('btn3').disabled = true;
  $('btn4').disabled = true;
  $('btn1').disabled = false;
  $('idxRunSlow').disabled = false;
  $('idxCreate').disabled = true;
  $('idxRunFast').disabled = true;
  $('idxCreate').textContent = 'インデックスを作成';
  $('idxCreate').style.background = '';
  $('idxCreate').style.color = '';
  $('idxTimeSlow').innerHTML = '<span style="font-size:20px;color:#bbb;">未計測</span>';
  $('idxTimeFast').innerHTML = '<span style="font-size:20px;color:#bbb;">未計測</span>';
  $('idxRowsSlow').innerHTML = '&nbsp;';
  $('idxRowsFast').innerHTML = '&nbsp;';
  $('idxBarSlow').style.width = '0';
  $('idxBarFast').style.width = '0';
}
