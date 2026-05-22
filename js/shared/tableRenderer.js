/**
 * DOM ヘルパーと共通テーブル描画
 * 全デモページのSQL結果表示で共通利用する。
 */

export function $(id) {
  return document.getElementById(id);
}

/**
 * sql.js の db.exec() 結果を HTML テーブルに変換して描画する。
 * 全デモページの結果表示で使用する共通関数。
 *
 * @param {string}   containerId              - 描画先のDOM要素ID
 * @param {Array}    result                   - db.exec()の戻り値 [{columns:[], values:[[]]}]
 * @param {Object}   [options]
 * @param {number}   [options.highlightCol]   - 単一カラムのハイライト（Before/After比較用）
 * @param {number[]} [options.hlCols]         - 複数カラムのハイライト（差分表示用）
 * @param {string}   [options.hlClass]        - ハイライト用CSSクラス名（デフォルト "hl"）
 * @param {string}   [options.nullDisplay=''] - NULL値の表示用HTML
 * @param {string}   [options.label]          - テーブル上部のラベルテキスト
 * @param {boolean}  [options.append=false]   - trueなら既存内容に追記（支社別など複数テーブル表示用）
 * @returns {number} 行数
 */
export function renderTable(containerId, result, options) {
  options = options || {};
  var container = $(containerId);

  if (!result || !result.length || !result[0].values.length) {
    container.innerHTML = '<p style="color:#888;font-size:13px;margin-top:8px;">結果: 0件</p>';
    return 0;
  }

  var cols = result[0].columns;
  var vals = result[0].values;
  var nullDisplay = options.nullDisplay != null ? options.nullDisplay : '';

  var html = '<div class="table-wrap"><table class="result"><tr>';
  cols.forEach(function(c) { html += '<th>' + c + '</th>'; });
  html += '</tr>';

  vals.forEach(function(row) {
    html += '<tr>';
    row.forEach(function(val, i) {
      var cls = '';
      if (options.highlightCol === i) {
        cls = ' class="highlight"';
      } else if (options.hlClass) {
        if (typeof options.hlCols === 'undefined') {
          cls = ' class="' + options.hlClass + '"';
        } else if (options.hlCols && options.hlCols.indexOf(i) >= 0) {
          cls = ' class="' + options.hlClass + '"';
        }
      } else if (options.hlCols && options.hlCols.indexOf(i) >= 0) {
        cls = ' class="hl"';
      }
      html += '<td' + cls + '>' + (val === null ? nullDisplay : val) + '</td>';
    });
    html += '</tr>';
  });

  html += '</table></div>';

  if (options.label) {
    html = '<div style="font-family:var(--mono);font-size:12px;color:var(--accent2);margin-top:12px;letter-spacing:1px;">' + options.label + '</div>' + html;
  }

  container.innerHTML = (options.append ? container.innerHTML : '') + html;
  return vals.length;
}
