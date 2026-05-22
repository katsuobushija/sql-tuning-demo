/**
 * sql.js 初期化ラッパー
 * CDNの<script>タグで読み込まれたinitSqlJsグローバルをES Moduleとして再公開する。
 * sql.jsはSQLite をWASMにコンパイルしたもので、ブラウザ内でSQLを実行可能にする。
 * 戻り値はPromise<Database>。各デモページはこれを受け取ってSQLを実行する。
 */
export function createDatabase() {
  return initSqlJs({
    // WASMバイナリのURL解決。sql.jsが内部で呼び出す。
    locateFile: function(f) {
      return 'https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.8.0/' + f;
    }
  }).then(function(SQL) {
    return new SQL.Database();
  });
}
