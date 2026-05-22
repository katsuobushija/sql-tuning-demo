# Skills Portfolio

実務と個人開発で培ったスキルを、インタラクティブなデモとプロジェクト紹介で実演するポートフォリオサイト。

**Live:** https://katsuobushija.github.io/portfolio/

## SQL デモ（ブラウザ完結）

sql.js（SQLite の Wasm ビルド）を使い、サーバー不要でブラウザ上で SQL を実行する 4 つのインタラクティブデモ。MVC アーキテクチャで設計。

| デモ | 内容 | 主な SQL |
|------|------|---------|
| **要件定義から実装まで** | 社内DBの要件ヒアリング → テーブル設計 → 正規化 → 実装の一連のフロー | CREATE TABLE, 正規化 |
| **データ抽出・連携業務** | 3テーブル結合 → 拠点別集計 → CSV/Excel 出力 | SELECT, JOIN, GROUP BY |
| **安全を意識した UPDATE** | SELECT で影響範囲を確認してから UPDATE を実行する本番運用の基本動作 | SELECT → UPDATE, DML |
| **データ差分の抽出と同期** | 2つのデータセットを比較し、追加・削除・変更を検出して同期 | JOIN, EXCEPT, NOT IN |

### 技術スタック

- **フロント:** HTML / CSS / Vanilla JavaScript（ES Modules）
- **DB:** sql.js（SQLite → WebAssembly）
- **設計:** MVC（model.js / view.js / controller.js）
- **ホスティング:** GitHub Pages

## その他のプロジェクト

| プロジェクト | 技術 |
|---|---|
| **AI 効果音ジェネレーター** — テキストから 8bit 効果音を AI 生成する Web サービス | PHP, Claude API, Stripe, Google OAuth, Web Audio API |
| **AI 請求書自動仕訳** — 請求書 PDF から勘定科目を自動分類するサーバーレスシステム | AWS Lambda, Bedrock (Claude), DynamoDB, Terraform, Streamlit |
| **AI 画像生成 LoRA 学習環境** — Stable Diffusion のファインチューニング環境構築 | Python, PyTorch, kohya_ss, LoRA |
| **あつめて！算数アイランド** — リリース済み iOS 算数 RPG アプリ | Swift, SpriteKit, GameplayKit |

---

## AI 効果音ジェネレーター — セキュリティ実装

AI 効果音ジェネレーター（https://ohlo.info/ai-sound/ ）では、OWASP Top 10 を意識したセキュリティ対策をフロントエンド・バックエンドの両面で実装している。

### XSS（クロスサイトスクリプティング）対策

AI API から返却されるデータ（ユーザー入力由来のテキストを含む）を DOM に表示する際、`innerHTML` を一切使わず `textContent` と `document.createElement` による DOM 構築で出力。API レスポンスに悪意あるスクリプトが混入しても実行されない。

```javascript
// textContent + DOM構築で安全にレンダリング
btn.textContent = apiData.name;
var span = document.createElement('span');
span.textContent = apiData.label;
btn.appendChild(span);
```

### CSRF（クロスサイトリクエストフォージェリ）対策

全 POST エンドポイントで `X-CSRF-Token` ヘッダーによるトークン検証を実施。トークンはセッション開始時に `random_bytes(32)` で生成し、`hash_equals()` でタイミング攻撃を防止。ログアウトも POST + CSRF 検証を必須にし、外部サイトからの強制ログアウトを防止。

```php
function verifyCsrf(): void {
    $token = $_SERVER['HTTP_X_CSRF_TOKEN'] ?? '';
    if (!hash_equals($_SESSION['csrf_token'], $token)) {
        http_response_code(403);
        exit;
    }
}
```

### SQL インジェクション対策

全 DB クエリで PDO プリペアドステートメントを使用。

```php
$stmt = $db->prepare('SELECT id FROM users WHERE google_id = ?');
$stmt->execute([$googleId]);
```

### OAuth 認証のセキュリティ

- **state パラメータ:** CSRF トークンを流用せず、認証開始時に一回限りの専用トークンを生成。コールバックで検証後に即破棄しリプレイ攻撃を防止
- **セッション固定攻撃対策:** ログイン成功後に `session_regenerate_id(true)` でセッション ID を再生成
- **パスワード不保持:** Google OAuth のみ対応し、パスワードを自サーバーに保存しない設計

```php
// 認証開始: 専用の一回限りトークン
$state = bin2hex(random_bytes(32));
$_SESSION['oauth_state'] = $state;

// コールバック: 検証後に即破棄
$expectedState = $_SESSION['oauth_state'] ?? '';
unset($_SESSION['oauth_state']);
if (!hash_equals($expectedState, $state)) { /* 拒否 */ }
```

### Stripe Webhook のセキュリティ（4 層防御）

1. **HMAC-SHA256 署名検証** — `Stripe-Signature` ヘッダーを検証し偽造リクエストを排除
2. **タイムスタンプ検証** — 署名の生成時刻が 5 分以内でなければ拒否（リプレイ攻撃対策）
3. **冪等性チェック** — `stripe_session_id` を DB に記録し同一イベントの二重処理を防止
4. **クレジット数検証** — metadata の `credits` がサーバー設定値と一致するか検証し改ざんを排除

### 決済のレースコンディション対策

クレジット消費時に `UPDATE WHERE credits > 0` + トランザクションを使用し、同時リクエストでマイナス残高が発生しない設計。

```php
$db->beginTransaction();
$stmt = $db->prepare('UPDATE users SET credits = credits - 1 WHERE id = ? AND credits > 0');
$stmt->execute([$userId]);
if ($stmt->rowCount() === 0) {
    $db->rollBack(); // 残高不足 → 処理中止
}
$db->commit();
```

### セッション Cookie の堅牢化

```php
session_set_cookie_params([
    'secure'   => true,   // HTTPS のみ送信
    'httponly'  => true,   // JavaScript からアクセス不可
    'samesite' => 'Lax',  // クロスサイトでの自動送信を制限
]);
```

### 情報漏洩の防止

- **エラーメッセージ:** API エラーの詳細はクライアントに返さず `error_log()` でサーバーログに記録。ユーザーには汎用メッセージのみ表示
- **設定ファイル保護:** `.htaccess` で `.env`・`config.php`・`db.php`・`setup.sql`・`data/` への直接アクセスを遮断
- **HTTPS 強制:** HTTP アクセスは 301 で HTTPS にリダイレクト

### レートリミット（二重構造）

| ユーザー種別 | 制限方式 | 目的 |
|---|---|---|
| 未ログイン | IP アドレス + 日別ファイル（5 回/日） | API 乱用防止 |
| ログイン済み | クレジット残高（DB 管理） | 課金モデルの制御 |

### 入力バリデーション

- テキスト長制限: `mb_strlen()` で 200 文字超を拒否
- HTTP メソッド制限: 各エンドポイントで許可メソッドを明示的にチェック
- Content-Type 検証: API レスポンスが JSON であることをフロントで確認してからパース
