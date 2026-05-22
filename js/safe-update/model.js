/**
 * safe-update Model — データ定義とDB操作（MVCのM）
 * 「SELECT → UPDATE → SELECT」の3ステップで安全にデータを更新する業務を再現する。
 * DOM や document を一切使わない。db は引数で受け取る。
 */

// 法人マスタの初期データ。business_id=25 の行がUPDATE対象。
var CORP_DATA = [
  [1,  25, '山田建設株式会社',     '山田太郎',   '東京都千代田区丸の内1-1',     '2001-04-01', 5000],
  [2,  25, '佐藤商事株式会社',     '佐藤花子',   '大阪府大阪市北区梅田2-3',     '1998-07-15', 3000],
  [3,  25, '田中製作所',           '田中一郎',   '愛知県名古屋市中区栄4-5',     '2005-11-20', 1500],
  [4,  25, '鈴木物産株式会社',     '鈴木次郎',   '福岡県福岡市博多区住吉3-1',   '2010-03-10', 8000],
  [5,  10, '高橋工業株式会社',     '高橋三郎',   '北海道札幌市中央区大通1-2',   '1995-01-20', 12000],
  [6,  10, '伊藤電機株式会社',     '伊藤美咲',   '宮城県仙台市青葉区中央3-3',   '2003-06-01', 4500],
  [7,  15, '渡辺食品株式会社',     '渡辺健一',   '広島県広島市中区紙屋町1-1',   '2008-09-12', 2000],
  [8,  15, '中村運輸株式会社',     '中村良子',   '京都府京都市下京区四条通2-1', '2000-02-28', 6000],
  [9,  30, '小林薬品株式会社',     '小林正義',   '兵庫県神戸市中央区三宮1-5',   '1992-08-05', 15000],
  [10, 30, '加藤不動産株式会社',   '加藤裕子',   '千葉県千葉市美浜区幕張2-3',   '2012-04-20', 9000],
  [11, 42, '吉田情報システム',     '吉田隆',     '埼玉県さいたま市大宮区1-8',   '2015-01-10', 3500],
  [12, 42, '山口コンサルティング', '山口恵',     '神奈川県横浜市西区みなとみらい', '2007-11-30', 2500],
  [13, 25, '松本環境サービス',     '松本大輔',   '静岡県浜松市中区板屋町1-1',   '2018-05-15', 1000],
  [14, 50, '井上精密機器',         '井上誠',     '新潟県新潟市中央区万代3-1',   '1999-10-01', 7000],
  [15, 50, '木村デザイン事務所',   '木村あゆみ', '長野県長野市南千歳1-2',       '2020-03-01', 500],
];

export function initDB(db) {
  db.run("CREATE TABLE corporation (id INTEGER PRIMARY KEY, business_id INTEGER NOT NULL, corp_name TEXT NOT NULL, rep_name TEXT, address TEXT, established TEXT, capital INTEGER)");
  var stmt = db.prepare("INSERT INTO corporation VALUES (?,?,?,?,?,?,?)");
  db.run("BEGIN TRANSACTION;");
  CORP_DATA.forEach(function(row) { stmt.bind(row); stmt.step(); stmt.reset(); });
  db.run("COMMIT;");
  stmt.free();
}

export function getCount(db) {
  return db.exec("SELECT COUNT(*) FROM corporation")[0].values[0][0];
}

// ① SELECT: UPDATE前に影響範囲を確認するためのクエリ
export function selectTargets(db) {
  return db.exec("SELECT id, business_id, corp_name, rep_name FROM corporation WHERE business_id = 25");
}

// ② UPDATE: corp_nameの先頭に'N'を付加。changes()で実際の更新件数を取得。
export function updateTargets(db) {
  db.run("UPDATE corporation SET corp_name = 'N' || corp_name WHERE business_id = 25");
  return db.exec("SELECT changes()")[0].values[0][0];
}

// ③ VERIFY: UPDATE後に同じ条件でSELECTし、Before/After比較に使用
export function verifyTargets(db) {
  return db.exec("SELECT id, business_id, corp_name, rep_name FROM corporation WHERE business_id = 25");
}

export function resetDB(db) {
  db.run("DROP TABLE IF EXISTS corporation");
  initDB(db);
}
