/**
 * data-diff Controller — イベント接続・5ステップ＋同期（MVCのC）
 * 差分検出(STEP1〜3) → 整合性チェック(STEP4) → 同期実行(STEP5) のフローを制御。
 * STEP1〜4は順不同で実行可能。STEP5はいずれかのSTEPを実行後に有効化される。
 */
import { createDatabase } from '../shared/db.js';
import { $ } from '../shared/tableRenderer.js';
import * as model from './model.js';
import * as view from './view.js';

var db = null;
var syncDone = false; // 同期は一度だけ実行可能（二重実行防止）

// --- 初期化 ---
createDatabase().then(function(database) {
  db = database;
  view.showStatus('⏳ サンプルデータを生成中...');
  setTimeout(function() {
    model.initDB(db);
    var counts = model.getCounts(db);
    view.showStatus('✓ 準備完了 ─ 現在DB: <b>' + counts.current + '件</b> / インポートデータ: <b>' + counts.imported + '件</b>');
    view.showOverview(model.getOverview(db));
    view.enableInitialButtons();
  }, 50);
}).catch(function(e) {
  view.showStatus('✗ 初期化エラー: ' + e.message);
});

// --- STEP 1: 新規追加 ---
$('btnAdded').onclick = function() {
  var result = model.findAdded(db);
  var count = view.showAdded(result);
  view.showStatus('✓ STEP 1 完了 ─ <b>' + count + ' 件</b>の新規データを検出しました（インポートにあってDBにないもの）。');
  view.enableButton('btnSync');
};

// --- STEP 2: 削除 ---
$('btnDeleted').onclick = function() {
  var result = model.findDeleted(db);
  var count = view.showDeleted(result);
  view.showStatus('✓ STEP 2 完了 ─ <b>' + count + ' 件</b>の削除データを検出しました（DBにあってインポートにないもの）。');
  view.enableButton('btnSync');
};

// --- STEP 3: 変更 ---
$('btnChanged').onclick = function() {
  var result = model.findChanged(db);
  var count = view.showChanged(result);
  view.showStatus('✓ STEP 3 完了 ─ <b>' + count + ' 件</b>の変更データを検出しました（同じコードで内容が異なるもの）。');
  view.enableButton('btnSync');
};

// --- STEP 4: 整合性チェック ---
$('btnCheck').onclick = function() {
  var result = model.checkIntegrity(db);
  var count = view.showIntegrity(result);
  if (count > 0) {
    view.showStatus('⚠ STEP 4 完了 ─ <b>' + count + ' 件</b>の不正データを検出しました。これらは同期対象から除外します。');
  } else {
    view.showStatus('✓ STEP 4 完了 ─ 不正データはありませんでした。');
  }
  view.enableButton('btnSync');
};

// --- STEP 5: 同期 ---
$('btnSync').onclick = function() {
  if (syncDone) return;

  var stats = model.syncData(db);
  view.showSyncResult(stats);

  var finalCount = model.getFinalCount(db);
  view.showVerdict(finalCount);

  view.showStatus('✓ 同期完了 ─ 追加 ' + stats.added + ' 件 / 更新 ' + stats.changed + ' 件 / 削除 ' + stats.deleted + ' 件 / スキップ ' + stats.skipped + ' 件');
  view.disableButton('btnSync');
  syncDone = true;
};

// --- リセット ---
$('btnReset').onclick = function() {
  model.resetDB(db);
  syncDone = false;
  view.resetUI();
  var counts = model.getCounts(db);
  view.showOverview(model.getOverview(db));
  view.showStatus('✓ リセットしました。現在DB: <b>' + counts.current + '件</b> / インポートデータ: <b>' + counts.imported + '件</b>');
};
