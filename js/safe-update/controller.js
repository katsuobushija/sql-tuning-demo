/**
 * safe-update Controller — イベント接続・フロー制御（MVCのC）
 * 「①SELECT確認 → ②UPDATE実行 → ③SELECT事後確認」の順序を強制し、
 * 本番運用での安全なUPDATE手順を体験させるデモ。
 */
import { createDatabase } from '../shared/db.js';
import { $ } from '../shared/tableRenderer.js';
import * as model from './model.js';
import * as view from './view.js';

var db = null;
// UPDATE前のデータを保存し、③のBefore/After比較に使用
var beforeSnapshot = [];

// --- 初期化 ---
createDatabase().then(function(database) {
  db = database;
  view.showStatus('⏳ サンプルデータを生成中...');
  setTimeout(function() {
    model.initDB(db);
    var count = model.getCount(db);
    view.showStatus('✓ 準備完了 ─ corporation テーブルに <b>' + count + ' 件</b>のデータを生成しました。①から順に押してください。');
    view.enableButton('btnSelect');
    view.enableButton('btnReset');
  }, 50);
}).catch(function(e) {
  view.showStatus('✗ 初期化エラー: ' + e.message);
});

// --- ① SELECT: UPDATE対象を事前確認 ---
$('btnSelect').onclick = function() {
  var result = model.selectTargets(db);
  var count = view.showSelectResult(result);
  // slice()で値をディープコピー。UPDATE後に元データが失われないようにする。
  beforeSnapshot = result.length ? result[0].values.map(function(r) { return r.slice(); }) : [];
  view.showStatus('✓ <b>' + count + ' 件</b>が対象です。この行の corp_name が更新されます。内容を確認したら②へ進んでください。');
  view.enableButton('btnUpdate');
};

// --- ② UPDATE ---
$('btnUpdate').onclick = function() {
  var changes = model.updateTargets(db);
  view.showUpdateMessage(changes);
  view.showStatus('✓ UPDATE完了 ─ <b>' + changes + ' 件</b>の corp_name を更新しました。③で Before/After を確認してください。');
  view.enableButton('btnVerify');
  view.disableButton('btnUpdate');
};

// --- ③ VERIFY ---
$('btnVerify').onclick = function() {
  var beforeResult = [{
    columns: ['id', 'business_id', 'corp_name', 'rep_name'],
    values: beforeSnapshot
  }];
  var afterResult = model.verifyTargets(db);
  view.showCompare(beforeResult, afterResult);
  view.showStatus('✓ Before/After の比較を表示しました。corp_name 列（緑色）が更新された箇所です。');
  view.disableButton('btnVerify');
};

// --- リセット ---
$('btnReset').onclick = function() {
  model.resetDB(db);
  beforeSnapshot = [];
  view.resetUI();
  view.showStatus('✓ リセットしました。①から再度お試しください。');
};
