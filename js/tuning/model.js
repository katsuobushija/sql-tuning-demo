/**
 * tuning Model — サンプルデータ生成・SQL文定義・CSV構築
 * 「退社する職員のPC情報を抽出し、支社ごとに整理してCSV連携する」業務を再現する。
 * DOM や document を一切使わない。db は引数で受け取る（MVCのM）。
 */

// --- 日付範囲（今月） ---
// デモを実行した月の1日〜末日を動的に生成。常に「今月退社」のデータが表示される。
var now = new Date();
var y = now.getFullYear();
var m = now.getMonth() + 1;
export var MS = y + '-' + String(m).padStart(2,'0') + '-01';
var lastDay = new Date(y, m, 0).getDate();
export var ME = y + '-' + String(m).padStart(2,'0') + '-' + lastDay;

// --- サンプルデータ生成用のマスタ ---
var BRANCHES = ['東京本社', '大阪支社', '名古屋支社', '福岡支社', '札幌支社'];
var DEPTS = ['営業部', '営業推進部', '法人営業部', '企画部', '総務部'];
var FAMILY = ['田中','鈴木','佐藤','高橋','伊藤','渡辺','山本','中村','小林','加藤',
              '吉田','山田','松本','井上','木村','林','斎藤','清水','山口','池田'];
var GIVEN  = ['太郎','花子','一郎','美咲','健一','裕子','大輔','恵','誠','あゆみ',
              '隆','良子','正義','次郎','三郎','直美','浩','幸子','翔太','真由美'];

// 3テーブル構成: 職員マスタ / 端末マスタ / 配布テーブル（多対多の中間テーブル）
// 退社職員6名 + 在籍職員20名、各職員にPC/モニターを配布するデータを生成
export function initDB(db) {
  db.run("CREATE TABLE 職員マスタ (職員ID INTEGER PRIMARY KEY, 氏名 TEXT NOT NULL, 所属部署 TEXT NOT NULL, 支社 TEXT NOT NULL, 入社日 TEXT NOT NULL, 退社日 TEXT)");
  db.run("CREATE TABLE 端末マスタ (端末ID INTEGER PRIMARY KEY, 端末種別 TEXT NOT NULL, 機種 TEXT NOT NULL, シリアル番号 TEXT NOT NULL)");
  db.run("CREATE TABLE 配布テーブル (配布ID INTEGER PRIMARY KEY, 職員ID INTEGER NOT NULL, 端末ID INTEGER NOT NULL, 配布日 TEXT NOT NULL, 返却日 TEXT)");

  var stmtE = db.prepare("INSERT INTO 職員マスタ VALUES (?,?,?,?,?,?)");
  var stmtT = db.prepare("INSERT INTO 端末マスタ VALUES (?,?,?,?)");
  var stmtD = db.prepare("INSERT INTO 配布テーブル VALUES (?,?,?,?,?)");
  db.run("BEGIN;");

  var eid = 1, tid = 1, did = 1;
  var retiringIds = [];

  // 今月退社する職員 (6人)
  var retirees = [
    [eid++, FAMILY[0]+GIVEN[0],  DEPTS[0], BRANCHES[0], '2015-04-01', y+'-'+String(m).padStart(2,'0')+'-15'],
    [eid++, FAMILY[1]+GIVEN[1],  DEPTS[1], BRANCHES[1], '2018-07-01', y+'-'+String(m).padStart(2,'0')+'-20'],
    [eid++, FAMILY[2]+GIVEN[2],  DEPTS[0], BRANCHES[2], '2012-04-01', y+'-'+String(m).padStart(2,'0')+'-10'],
    [eid++, FAMILY[3]+GIVEN[3],  DEPTS[2], BRANCHES[0], '2020-10-01', y+'-'+String(m).padStart(2,'0')+'-25'],
    [eid++, FAMILY[4]+GIVEN[4],  DEPTS[0], BRANCHES[3], '2016-04-01', y+'-'+String(m).padStart(2,'0')+'-28'],
    [eid++, FAMILY[5]+GIVEN[5],  DEPTS[1], BRANCHES[4], '2019-01-01', y+'-'+String(m).padStart(2,'0')+'-30'],
  ];
  retirees.forEach(function(r) {
    stmtE.bind(r); stmtE.step(); stmtE.reset();
    retiringIds.push(r[0]);
  });

  // 在籍中の職員 (20人)
  for (var i = 0; i < 20; i++) {
    var fn = FAMILY[(i+6)%FAMILY.length] + GIVEN[(i+6)%GIVEN.length];
    var dept = DEPTS[i % DEPTS.length];
    var br = BRANCHES[i % BRANCHES.length];
    var hy = 2010 + (i % 14);
    stmtE.bind([eid++, fn, dept, br, hy+'-04-01', null]);
    stmtE.step(); stmtE.reset();
  }

  // 端末マスタ + 配布テーブル
  var pcModels = ['Dell Latitude 5540','Lenovo ThinkPad X1','HP ProBook 450','Dell Latitude 7440','Lenovo ThinkPad T14'];
  var monModels = ['EIZO FlexScan 24','Dell U2422H','BenQ GW2480'];

  retiringIds.forEach(function(staffId, idx) {
    var sn1 = 'PC-' + String(2024000 + staffId).padStart(7,'0');
    var pcTid = tid++;
    stmtT.bind([pcTid, 'ノートPC', pcModels[idx % pcModels.length], sn1]);
    stmtT.step(); stmtT.reset();
    stmtD.bind([did++, staffId, pcTid, '2023-04-01', null]);
    stmtD.step(); stmtD.reset();

    if (idx % 2 === 0) {
      var sn2 = 'MON-' + String(3000 + staffId).padStart(7,'0');
      var monTid = tid++;
      stmtT.bind([monTid, 'モニター', monModels[idx % monModels.length], sn2]);
      stmtT.step(); stmtT.reset();
      stmtD.bind([did++, staffId, monTid, '2023-04-01', null]);
      stmtD.step(); stmtD.reset();
    }

    if (idx < 3) {
      var oldSn = 'PC-' + String(2020000 + staffId).padStart(7,'0');
      var oldTid = tid++;
      stmtT.bind([oldTid, 'ノートPC', pcModels[(idx+2) % pcModels.length], oldSn]);
      stmtT.step(); stmtT.reset();
      stmtD.bind([did++, staffId, oldTid, '2020-04-01', '2023-03-31']);
      stmtD.step(); stmtD.reset();
    }
  });

  for (var j = 7; j <= 26; j++) {
    var sn = 'PC-' + String(2024000 + j).padStart(7,'0');
    var aTid = tid++;
    stmtT.bind([aTid, 'ノートPC', pcModels[j % pcModels.length], sn]);
    stmtT.step(); stmtT.reset();
    stmtD.bind([did++, j, aTid, '2024-04-01', null]);
    stmtD.step(); stmtD.reset();
  }

  db.run("COMMIT;");
  stmtE.free();
  stmtT.free();
  stmtD.free();
}

export function getCounts(db) {
  return {
    employees:     db.exec("SELECT COUNT(*) FROM 職員マスタ")[0].values[0][0],
    devices:       db.exec("SELECT COUNT(*) FROM 端末マスタ")[0].values[0][0],
    distributions: db.exec("SELECT COUNT(*) FROM 配布テーブル")[0].values[0][0]
  };
}

// --- STEP 1〜3: 段階的にデータを絞り込むクエリ群 ---

// STEP1: 今月退社する職員を退社日の範囲指定で抽出
export function step1(db) {
  return db.exec("SELECT 職員ID, 氏名, 所属部署, 支社, 退社日 FROM 職員マスタ WHERE 退社日 BETWEEN '"+MS+"' AND '"+ME+"' ORDER BY 退社日");
}

// STEP2: 3テーブルJOINで退社職員が現在保持している端末を特定
// 返却日 IS NULL = 現在配布中の端末のみ（返却済みは除外）
export function step2(db) {
  return db.exec("SELECT e.職員ID, e.氏名, e.所属部署, e.支社, t.端末種別, t.機種, t.シリアル番号 FROM 職員マスタ e JOIN 配布テーブル d ON e.職員ID = d.職員ID JOIN 端末マスタ t ON d.端末ID = t.端末ID WHERE e.退社日 BETWEEN '"+MS+"' AND '"+ME+"' AND d.返却日 IS NULL ORDER BY e.支社, e.氏名");
}

// STEP3-集計: 支社ごとの端末台数をGROUP BYで集約
export function step3Summary(db) {
  return db.exec("SELECT e.支社, COUNT(t.端末ID) AS 端末台数 FROM 職員マスタ e JOIN 配布テーブル d ON e.職員ID = d.職員ID JOIN 端末マスタ t ON d.端末ID = t.端末ID WHERE e.退社日 BETWEEN '"+MS+"' AND '"+ME+"' AND d.返却日 IS NULL GROUP BY e.支社 ORDER BY 端末台数 DESC");
}

// STEP3-明細: 支社別・職員別の端末一覧（CSV出力のソース）
export function step3Detail(db) {
  return db.exec("SELECT e.支社, e.氏名, t.端末種別, t.機種, t.シリアル番号 FROM 職員マスタ e JOIN 配布テーブル d ON e.職員ID = d.職員ID JOIN 端末マスタ t ON d.端末ID = t.端末ID WHERE e.退社日 BETWEEN '"+MS+"' AND '"+ME+"' AND d.返却日 IS NULL ORDER BY e.支社, e.氏名, t.端末種別");
}

// --- CSV構築（純粋データ変換） ---
// SQL結果をRFC 4180準拠のCSV文字列に変換する。
// カンマ・ダブルクォートを含む値はクォートでエスケープ。
export function buildCSV(result) {
  if (!result.length) return null;
  var cols = result[0].columns;
  var vals = result[0].values;
  var lines = [];
  lines.push(cols.join(','));
  vals.forEach(function(row) {
    lines.push(row.map(function(v) {
      var s = (v === null ? '' : String(v));
      if (s.indexOf(',') >= 0 || s.indexOf('"') >= 0) {
        s = '"' + s.replace(/"/g, '""') + '"';
      }
      return s;
    }).join(','));
  });
  return { text: lines.join('\r\n'), rowCount: vals.length };
}

export function csvFileName() {
  return '退社職員_端末リスト_' + y + String(m).padStart(2,'0') + '.csv';
}

// --- インデックス効果の計測 ---
// 10万件のテーブルでインデックスの有無による検索速度の差を体感させるデモ。
// IDX_TARGETの部署コードで検索し、全件走査(Without) vs 索引アクセス(With)を比較する。
var IDX_N = 100000;
var IDX_TARGET = 'D0457';

export function getIdxN() { return IDX_N; }

export function genLargeData(db) {
  db.run("CREATE TABLE 職員マスタ_large (職員ID INTEGER PRIMARY KEY, 氏名 TEXT, 所属部署 TEXT, 入社日 TEXT)");
  var stmt = db.prepare("INSERT INTO 職員マスタ_large VALUES (?,?,?,?)");
  db.run("BEGIN;");
  for (var i = 1; i <= IDX_N; i++) {
    var dept = 'D' + String(Math.floor(Math.random()*2000)).padStart(4,'0');
    var yr = 2000 + Math.floor(Math.random()*25);
    stmt.bind([i, '職員_'+i, dept, yr+'-01-01']);
    stmt.step(); stmt.reset();
  }
  for (var k = 0; k < 40; k++) {
    stmt.bind([IDX_N+1+k, 'Target_'+k, IDX_TARGET, '2020-01-01']);
    stmt.step(); stmt.reset();
  }
  db.run("COMMIT;");
  stmt.free();
}

// 同一クエリを5回実行して平均応答時間を計測。ばらつきを抑える。
export function measureQuery(db) {
  var runs = 5, total = 0, rows = 0;
  for (var i = 0; i < runs; i++) {
    var t0 = performance.now();
    var res = db.exec("SELECT * FROM 職員マスタ_large WHERE 所属部署='"+IDX_TARGET+"'");
    var t1 = performance.now();
    total += (t1 - t0);
    rows = res.length ? res[0].values.length : 0;
  }
  return { ms: total / runs, rows: rows };
}

export function createIndex(db) {
  var t0 = performance.now();
  db.run("CREATE INDEX idx_busho ON 職員マスタ_large(所属部署)");
  var t1 = performance.now();
  return t1 - t0;
}

export function dropIndex(db) {
  db.run("DROP INDEX IF EXISTS idx_busho");
}

export function resetDB(db) {
  db.run("DROP TABLE IF EXISTS 配布テーブル");
  db.run("DROP TABLE IF EXISTS 端末マスタ");
  db.run("DROP TABLE IF EXISTS 職員マスタ");
  db.run("DROP TABLE IF EXISTS 職員マスタ_large");
  initDB(db);
}
