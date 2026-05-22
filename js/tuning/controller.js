/**
 * tuning Controller — エントリポイント（MVCのC）
 * ボタンのイベント接続とSTEP 1〜4 + インデックス計測のフロー制御を担当。
 * HTML文字列の直接構築をしない。ModelとViewを仲介する。
 */
import { createDatabase } from '../shared/db.js';
import { $ } from '../shared/tableRenderer.js';
import * as model from './model.js';
import * as view from './view.js';

var db = null;
var idxReady = false;
var idxHasIndex = false;
var idxSlowTime = null;
var idxFastTime = null;

// --- 日付表示（ES Module は defer 扱いなので DOM は解析済み） ---
view.setMonthDates(model.MS, model.ME);

// --- 初期化: WASMロード → DB作成 → サンプルデータ投入 ---
// setTimeoutはWASMロード直後のUIブロックを避けるための措置
createDatabase().then(function(database) {
  db = database;
  view.showStatus('⏳ サンプルデータを生成中...');
  setTimeout(function() {
    model.initDB(db);
    var counts = model.getCounts(db);
    view.showStatus('✓ 準備完了 ─ 職員マスタ: <b>' + counts.employees + '件</b> / 端末マスタ: <b>' + counts.devices + '件</b> / 配布テーブル: <b>' + counts.distributions + '件</b>。①から順に実行してください。');
    view.enableButton('btn1');
    view.enableButton('btnReset');
    view.enableButton('idxRunSlow');
  }, 50);
}).catch(function(e) {
  view.showStatus('✗ 初期化エラー: ' + e.message);
});

// --- STEP 1 ---
$('btn1').onclick = function() {
  var result = model.step1(db);
  var count = view.showStep1(result);
  view.showStatus('✓ STEP 1 完了 ─ 今月退社する職員 <b>' + count + '名</b> を抽出しました。');
  view.enableButton('btn2');
};

// --- STEP 2 ---
$('btn2').onclick = function() {
  var result = model.step2(db);
  var count = view.showStep2(result);
  view.showStatus('✓ STEP 2 完了 ─ 配布中の端末情報を結合しました（<b>' + count + '行</b>: 返却日 IS NULL で現在配布中のみ）。');
  view.enableButton('btn3');
};

// --- STEP 3 ---
$('btn3').onclick = function() {
  var summary = model.step3Summary(db);
  var detail = model.step3Detail(db);
  var branches = view.showStep3(summary, detail);
  view.showStatus('✓ STEP 3 完了 ─ <b>' + branches + '支社</b>に分類し、台数順で整理しました。');
  view.enableButton('btn4');
};

// --- STEP 4: CSV出力 ---
// STEP3の明細データをCSV化してダウンロード。Excelで開くことを想定。
$('btn4').onclick = function() {
  var result = model.step3Detail(db);
  var csv = model.buildCSV(result);
  if (!csv) return;

  // BOM付きUTF-8: Excelがファイルを開いた際にUTF-8と認識させるために必要
  var bom = '\uFEFF';
  var blob = new Blob([bom + csv.text], { type: 'text/csv;charset=utf-8' });
  view.downloadFile(blob, model.csvFileName());
  view.showCSVPreview(csv.text, csv.rowCount);
  view.showVerdict();
  view.showStatus('✓ STEP 4 完了 ─ CSVファイルをダウンロードしました。Excelで開いて確認できます。');
  view.disableButton('btn4');
};

// ========== インデックス計測セクション ==========
// 初回クリック時にのみ10万件のテストデータを生成し、以降は再利用する
$('idxRunSlow').onclick = function() {
  if (!idxReady) {
    view.showStatus('⏳ 10万件のテストデータを生成中...');
    setTimeout(function() {
      model.genLargeData(db);
      idxReady = true;
      view.showStatus('✓ 職員マスタ_large テーブルに <b>' + model.getIdxN().toLocaleString() + ' 件</b>を生成しました。');
      runSlowMeasure();
    }, 50);
  } else {
    if (idxHasIndex) {
      model.dropIndex(db);
      idxHasIndex = false;
      $('idxCreate').textContent = 'インデックスを作成';
      $('idxCreate').style.background = '';
      $('idxCreate').style.color = '';
    }
    runSlowMeasure();
  }

  function runSlowMeasure() {
    var r = model.measureQuery(db);
    idxSlowTime = r.ms;
    view.showSlowTime(r.ms, r.rows, model.getIdxN());
    view.enableButton('idxCreate');
    if (idxSlowTime != null && idxFastTime != null) {
      view.showIndexVerdict(idxSlowTime, idxFastTime);
    }
  }
};

$('idxCreate').onclick = function() {
  if (!idxHasIndex) {
    var buildTime = model.createIndex(db);
    idxHasIndex = true;
    view.showIndexCreated(buildTime);
    view.enableButton('idxRunFast');
    view.showStatus('✓ インデックス <b>idx_busho</b> を作成しました。「インデックスありで検索」を押してください。');
  }
};

$('idxRunFast').onclick = function() {
  if (!idxHasIndex) return;
  var r = model.measureQuery(db);
  idxFastTime = r.ms;
  view.showFastTime(r.ms, r.rows);
  if (idxSlowTime != null && idxFastTime != null) {
    view.showIndexVerdict(idxSlowTime, idxFastTime);
  }
};

// --- リセット ---
$('btnReset').onclick = function() {
  model.resetDB(db);
  idxReady = false;
  idxHasIndex = false;
  idxSlowTime = null;
  idxFastTime = null;
  view.resetUI();
  var counts = model.getCounts(db);
  view.showStatus('✓ リセットしました。職員マスタ: <b>' + counts.employees + '件</b> / 端末マスタ: <b>' + counts.devices + '件</b> / 配布テーブル: <b>' + counts.distributions + '件</b>。①から再度お試しください。');
};
