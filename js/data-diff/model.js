/**
 * data-diff Model — 在庫データ・差分検出SQL・同期処理（MVCのM）
 * 「既存DB」と「外部インポートデータ」を突き合わせて差分を検出し、
 * 整合性チェック後にDBを同期する業務を再現する。
 * DOM や document を一切使わない。db は引数で受け取る。
 */

// 現在DBに入っている在庫データ（15件）
var CURRENT_DATA = [
  ['PC-001', 'ノートPC Dell Latitude',   'PC',     25, '本社3F',   '2025-01-15'],
  ['PC-002', 'ノートPC Lenovo ThinkPad',  'PC',     18, '本社3F',   '2025-01-15'],
  ['MON-001','モニター 24inch EIZO',      'モニター', 30, '本社3F',   '2025-02-01'],
  ['MON-002','モニター 27inch Dell',      'モニター', 12, '支社1F',   '2025-02-01'],
  ['KB-001', 'キーボード 無線 Logicool',  '周辺機器', 45, '倉庫A',    '2025-01-20'],
  ['KB-002', 'キーボード 有線 ELECOM',    '周辺機器', 20, '倉庫A',    '2025-01-20'],
  ['MS-001', 'マウス 無線 Logicool',      '周辺機器', 50, '倉庫A',    '2025-01-20'],
  ['HUB-001','USBハブ 4ポート',           '周辺機器', 15, '倉庫A',    '2025-03-01'],
  ['LAN-001','LANケーブル 5m Cat6',       'ケーブル', 100, '倉庫B',    '2025-01-10'],
  ['LAN-002','LANケーブル 10m Cat6',      'ケーブル', 60,  '倉庫B',    '2025-01-10'],
  ['HDD-001','外付けHDD 2TB',             'ストレージ', 8,  '本社3F',   '2025-02-15'],
  ['SSD-001','外付けSSD 1TB',             'ストレージ', 10, '本社3F',   '2025-02-15'],
  ['PRN-001','プリンター Canon LBP',      'プリンター', 3,  '本社2F',   '2025-01-05'],
  ['PRN-002','プリンター HP LaserJet',    'プリンター', 2,  '支社1F',   '2025-01-05'],
  ['CAM-001','Webカメラ Logicool C920',   'カメラ',    20, '倉庫A',    '2025-03-10'],
];

// 外部からインポートされた最新在庫データ（16件）
// CURRENT_DATAとの差分: 追加3件、削除3件、変更4件、不正データ1件(ERR-001)
var IMPORTED_DATA = [
  ['PC-001', 'ノートPC Dell Latitude',   'PC',     22, '本社3F',   '2025-04-01'],
  ['PC-002', 'ノートPC Lenovo ThinkPad',  'PC',     18, '本社3F',   '2025-04-01'],
  ['MON-001','モニター 24inch EIZO',      'モニター', 30, '本社4F',   '2025-04-01'],
  ['MON-002','モニター 27inch Dell',      'モニター', 15, '支社1F',   '2025-04-01'],
  ['KB-001', 'キーボード 無線 Logicool',  '周辺機器', 45, '倉庫A',    '2025-04-01'],
  ['KB-002', 'キーボード 有線 ELECOM',    '周辺機器', 20, '倉庫A',    '2025-04-01'],
  ['MS-001', 'マウス 無線 Logicool',      '周辺機器', 48, '倉庫B',    '2025-04-01'],
  ['HUB-001','USBハブ 4ポート',           '周辺機器', 15, '倉庫A',    '2025-04-01'],
  ['LAN-001','LANケーブル 5m Cat6',       'ケーブル', 90,  '倉庫B',    '2025-04-01'],
  ['LAN-002','LANケーブル 10m Cat6',      'ケーブル', 60,  '倉庫B',    '2025-04-01'],
  ['HDD-001','外付けHDD 2TB',             'ストレージ', 8,  '本社3F',   '2025-04-01'],
  ['PRN-002','プリンター HP LaserJet',    'プリンター', 2,  '支社1F',   '2025-04-01'],
  ['TAB-001','タブレット iPad Air',       'タブレット', 10, '本社3F',   '2025-04-01'],
  ['TAB-002','タブレット Surface Go',     'タブレット', 5,  '支社1F',   '2025-04-01'],
  ['SPK-001','スピーカーフォン Jabra',    '会議機器',  6,  '本社4F',   '2025-04-01'],
  ['ERR-001', null,                        null,       -3,  '不明',     '2025-04-01'],
];

export function initDB(db) {
  db.run("CREATE TABLE IF NOT EXISTS inventory_current (item_code TEXT PRIMARY KEY, item_name TEXT NOT NULL, category TEXT NOT NULL, quantity INTEGER NOT NULL, location TEXT, last_updated TEXT)");
  db.run("CREATE TABLE IF NOT EXISTS inventory_imported (item_code TEXT PRIMARY KEY, item_name TEXT, category TEXT, quantity INTEGER, location TEXT, last_updated TEXT)");

  var stmt1 = db.prepare("INSERT INTO inventory_current VALUES (?,?,?,?,?,?)");
  db.run("BEGIN TRANSACTION;");
  CURRENT_DATA.forEach(function(r) { stmt1.bind(r); stmt1.step(); stmt1.reset(); });
  db.run("COMMIT;");
  stmt1.free();

  var stmt2 = db.prepare("INSERT INTO inventory_imported VALUES (?,?,?,?,?,?)");
  db.run("BEGIN TRANSACTION;");
  IMPORTED_DATA.forEach(function(r) { stmt2.bind(r); stmt2.step(); stmt2.reset(); });
  db.run("COMMIT;");
  stmt2.free();
}

export function getCounts(db) {
  return {
    current:  db.exec("SELECT COUNT(*) FROM inventory_current")[0].values[0][0],
    imported: db.exec("SELECT COUNT(*) FROM inventory_imported")[0].values[0][0]
  };
}

export function getOverview(db) {
  return {
    current:  db.exec("SELECT item_code, item_name, quantity, location FROM inventory_current"),
    imported: db.exec("SELECT item_code, item_name, quantity, location FROM inventory_imported")
  };
}

// 新規追加: インポートにあってDBにないもの（LEFT JOINでNULL検出）
// item_name IS NOT NULLで不正データ(ERR-001)を除外
export function findAdded(db) {
  return db.exec(
    "SELECT i.item_code, i.item_name, i.category, i.quantity, i.location " +
    "FROM inventory_imported i " +
    "LEFT JOIN inventory_current c ON i.item_code = c.item_code " +
    "WHERE c.item_code IS NULL AND i.item_name IS NOT NULL"
  );
}

// 削除対象: DBにあってインポートにないもの（逆方向のLEFT JOIN）
export function findDeleted(db) {
  return db.exec(
    "SELECT c.item_code, c.item_name, c.category, c.quantity, c.location " +
    "FROM inventory_current c " +
    "LEFT JOIN inventory_imported i ON c.item_code = i.item_code " +
    "WHERE i.item_code IS NULL"
  );
}

// 変更検出: 同じitem_codeで数量または保管場所が異なるもの（INNER JOIN + WHERE不一致）
export function findChanged(db) {
  return db.exec(
    "SELECT c.item_code, c.item_name, " +
    "c.quantity AS current_qty, i.quantity AS imported_qty, " +
    "c.location AS current_loc, i.location AS imported_loc " +
    "FROM inventory_current c " +
    "JOIN inventory_imported i ON c.item_code = i.item_code " +
    "WHERE c.quantity != i.quantity OR c.location != i.location"
  );
}

// 整合性チェック: NULL値や負の数量など、同期前に除外すべき不正データを検出
export function checkIntegrity(db) {
  return db.exec(
    "SELECT item_code, item_name, category, quantity " +
    "FROM inventory_imported " +
    "WHERE item_name IS NULL OR category IS NULL OR quantity IS NULL OR quantity < 0"
  );
}

// 差分に基づいてDBを同期する。INSERT → UPDATE → DELETE の順で実行。
// 不正データ（NULL値・負数量）は全ステップで除外する。
export function syncData(db) {
  // 1. 新規データを追加（不正データは除外）
  var added = db.exec(
    "SELECT COUNT(*) FROM inventory_imported i " +
    "LEFT JOIN inventory_current c ON i.item_code = c.item_code " +
    "WHERE c.item_code IS NULL AND i.item_name IS NOT NULL AND i.category IS NOT NULL AND i.quantity >= 0"
  )[0].values[0][0];
  db.run(
    "INSERT INTO inventory_current " +
    "SELECT i.* FROM inventory_imported i " +
    "LEFT JOIN inventory_current c ON i.item_code = c.item_code " +
    "WHERE c.item_code IS NULL AND i.item_name IS NOT NULL AND i.category IS NOT NULL AND i.quantity >= 0"
  );

  // 2. 既存データの数量・場所を最新値に更新（相関サブクエリで対応行を特定）
  db.run(
    "UPDATE inventory_current SET " +
    "quantity = (SELECT i.quantity FROM inventory_imported i WHERE i.item_code = inventory_current.item_code), " +
    "location = (SELECT i.location FROM inventory_imported i WHERE i.item_code = inventory_current.item_code), " +
    "last_updated = (SELECT i.last_updated FROM inventory_imported i WHERE i.item_code = inventory_current.item_code) " +
    "WHERE item_code IN (SELECT i.item_code FROM inventory_imported i JOIN inventory_current c ON i.item_code = c.item_code WHERE c.quantity != i.quantity OR c.location != i.location)"
  );
  var changed = db.exec("SELECT changes()")[0].values[0][0];

  // 3. インポートに存在しないデータをDBから削除
  var deleted = db.exec(
    "SELECT COUNT(*) FROM inventory_current c " +
    "LEFT JOIN inventory_imported i ON c.item_code = i.item_code " +
    "WHERE i.item_code IS NULL"
  )[0].values[0][0];
  db.run(
    "DELETE FROM inventory_current WHERE item_code IN (" +
    "SELECT c.item_code FROM inventory_current c " +
    "LEFT JOIN inventory_imported i ON c.item_code = i.item_code " +
    "WHERE i.item_code IS NULL)"
  );

  // 4. 不正データとしてスキップされた件数を集計（結果表示用）
  var skipped = db.exec(
    "SELECT COUNT(*) FROM inventory_imported " +
    "WHERE item_name IS NULL OR category IS NULL OR quantity IS NULL OR quantity < 0"
  )[0].values[0][0];

  return { added: added, changed: changed, deleted: deleted, skipped: skipped };
}

export function getFinalCount(db) {
  return db.exec("SELECT COUNT(*) FROM inventory_current")[0].values[0][0];
}

export function resetDB(db) {
  db.run("DROP TABLE IF EXISTS inventory_current");
  db.run("DROP TABLE IF EXISTS inventory_imported");
  initDB(db);
}
