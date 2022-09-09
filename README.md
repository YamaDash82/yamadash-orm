# yamadash-orm

## 概要

`node-postgres`パッケージをラップしたORMです。  
以下を想定して作成しました。
- HerokuでのPostegreSQL使用
- Node.JSプロジェクトに`npm install`して使用

[node-postgres](https://node-postgres.com/)
## 準備  
1. Node.jsプロジェクトへのインストール  
    ```bash
    npm install --save https://github.com/YamaDash82/yamadash-orm.git
    ```
1. 環境変数設定
    ローカルでの開発作業の設定をします。  
    プロジェクトディレクトリに`.env`ファイルを作成し(既に`.env`ファイルが有ればそれを使用します。)、以下を記入します。  
    ```:.env
    # 開発環境フラグ
    DEVELOP_MODE=true
    # 接続文字列
    DATABASE_URL=postgresql://{ユーザー名}:{パスワード}@{ホスト}:{ポート}/{データベース}
    ```
    開発時この設定を読んでPostgreSQLに接続します。  
    Herokuにデプロイ時は、この設定をアップロードしてはいけません。`DATABASE_URL`の値はHerokuからもたらされます。  
    `DEVELOP_MODE`はnode-postgresの`Pool`クラスのインスタンスをnewする際のオプション値の設定をHerokuでの実環境と開発環境時で切り替えるために使用しています。  
    以下の箇所です。    
    ```typescript
    const new Pool({
      connectionString: process.env.DATABASE_URL, 
      //sslに設定する値は開発環境時はfalse、本番環境時はtrueを設定する。
      ssl: !!!process.env.DEVELOP_MODE
    });
    ```

1. 環境変数のロード  
    `.env`をロードするために`dotenv`パッケージを使用します。  
    ```bash
    npm install --save dotenv
    ```

    プログラムの開始箇所で以下を実行します。  
    ```typescript
    import { config } from 'dotenv';

    //.envに設定した環境設定をロードする。 
    config();

    //.envに設定した値の確認 ※この記述は不要です。
    config(process.env.DATABASE_URL);
    ```
## 使用方法
### クラスと当ライブラリにおける用語  
- Recordset  
    SELECT文とその結果をオブジェクト配列で保持するクラスです。  
    
    Recordsetのインスタンスを生成しただけではrecordsに結果はセットされません。  
    結果の取得には以下のRecordsetFillerを使用します。  
    以降レコードセットと呼称することもあります。    
    ※私、過去に仕事でMicrosoft Access、Access VBA使うこと多々あり、そこでADODB.Recordsetなるものがあったのでその影響でこの名称にしました。
- PostgresRecordsetFiller  
    インスタンスの生成時、引数に1つまたは複数のRecordsetオブジェクトを渡します。  
    fill()メソッドを実行すると、引数に指定した各Recordsetのrecordsプロパティに結果をセットします。
    以降RecordsetFillerと略して呼称することもあります。
- SQLCommand  
    データベースに対して行うINSERT/UPDATE/DELTEコマンドを保持します。  

- PostgersqlTransactionSet  
    コマンドを実行するクラスです。
    インスタンスの生成時、引数に1つまたは複数のSQLCommandオブジェクトと、トランザクション処理(BEGIN/COMMMIT/ROLLBACK)を伴うかを指定します。  
    execute()メソッドで実行します。
    以降TransactionSetと略して呼称することもあります。  

### レコードの取得  
#### 単一のレコードセットの取得  
```typescript
import { PostgresRecordsetFiller, Recordset } from 'yamadash-orm';

(async () => {
  const rst = new Recordset('SELECT user_id, user_name FROM users');

  const filler = new PostgresRecordsetFiller(rst);
  await filler.fill();

  //1行目の内容
  console.log(`ユーザーID:${rst.records[0]['user_id']}, ユーザー名:${rst.records[0]['user_name']}`);
  //2行目の内容
  console.log(`ユーザーID:${rst.records[1]['user_id']}, ユーザー名:${rst.records[1]['user_name']}`);
})();
```
TypeScriptのジェネリックを使うとドット記法が使えるようになります。またインテリセンスも効くようになります。  
```typescript
...
  const rst = new Recordset<{ userId: number, userName: string}>('SELECT user_id as "userId", user_name as "userName" FROM users');

  const filler = new PostgresRecordsetFiller(rst);
  await filler.fill();

  //1行目の内容
  console.log(`ユーザーID:${rst.records[0].userId}, ユーザー名:${rst.records[0].userName}`);
...
```
#### 複数のレコードセットの取得
```typescript
import { PostgresRecordsetFiller, Recordset } from 'yamadash-orm';

const userRst = new Recordset<{userId: number, userName: string}>('SELECT user_id AS "userId", user_name AS "userName" FROM users');

const productRst = new Recordset<{productNo: string, productName: string}>(`SELECT product_no AS "productNo", product_name AS "productName FROM products"`);

const filler = new PostgresRecordsetFiller([userRst, productRst]);
await filler.fill();
```

### レコードの更新  
`SQLCommand`クラスと`PostgresTransactionSet`クラスを使ってレコードを更新します。  
usersテーブルにDELETE/INSERTする例  

```typescript
import { PostgresTransactionSet, SQLCommand } from 'yamadash-orm';

(async () => {
    const delCommand = new SQLCommand('DELETE FROM users WHERE user_id = 1');
    const insCommand = new SQLCommand('INSERT INTO users (user_id, user_name) VALUES (1, '山田　太郎')');

    //第一引数に実行するコマンドを実行する順に配列としてセットします。
    //第二引数にトランザクション(BEGIN/COMMIT/ROLLBACK)を伴うかをboolean型で指定します。省略可で、デフォルト値はtrueです。
    const transactionSet = new PostgresTransactionSet([delCommand, insCommand], true);

    //executeメソッドで処理を実行します。
    //戻り値はboolean型です。正常終了時true、それ以外の時falseを返します。
    if(await transactionSet.execute()) {
        console.log('成功');
    } else {
        //失敗時、errorプロパティにスローされたエラーが格納されています。
        console.log(`エラー内容:${transactionSet.error}`);
    }
})();
```

### 接続の使いまわし  
RecordsetFiller、TransactionSetは内部で`PostgresConnection`オブジェクトを生成し、それを使用してデータベースへの接続、切断を行っています。  
RecordsetFiller、TransactionSetどちらも第一引数に`PostgresConnection`オブジェクトを渡すことができます。この場合は開発者が`PostgresConnection`のconnect()メソッドとend()メソッドを呼び出すことで、データベースへの接続、切断を行います。  
一度のHTTPリクエストでレコードの取得と更新を行う場合など、処理速度が速くなると思います。  

```typescript
app.get('update', async(req, res) => {
    //接続オブジェクト
    const conn = new PostgresConnection();
    try {
        //**接続**
        conn.connect();

        const rst = new Recordset(`SELECT ...`);
        //第一引数に接続オブジェクトを指定する。
        const filler = new PostgresRecordsetFiller(conn, rst);

        //...何か処理

        const command = new SQLCOmmand('UPDATE ...');
        
        //第1引数に接続オブジェクトを指定する。
        const transactionSet = new PostgresTransactionSet(conn, command);
    } catch(err) {
        //エラー処理
    } finally {
        //**切断**
        conn.end();
    }
    
    return res.send(...);
});
```

### トランザクション処理を手動で制御する  
トランザクション処理を行う場合、TransactionSetオブジェクト内で自動で制御しています。  
外部からConnectionオブジェクトを渡すことで、トランザクション処理を手動で制御することができます。  
トランザクション処理内でレコードの参照が必要な場合などに良いと思います。  

例)コントロールマスタから現在のIDを取得し、そのID+1で登録後、コントロールマスタを更新する
```typescript
(async () => {
    //接続オブジェクト
    const conn = new PostgresConnection();

    try {
        //**トランザクション開始**
        await conn.beginTransaction()

        const rst = new Recordset(`SELECT current_max_id FROM control WHERE id = 1`);
        //第1引数にConnectionオブジェクトを渡す。
        const filler = new PostgresRecordsetFiller(conn, rst);
        const newUserId = rst.records[0]['current_max_id'] + 1;

        const command1 = new SQLCommand(`INSERT INTO users (user_id, user_name) VALUES (${newUserId}, ${userName})`);
        const command2 = new SQLCommand(`UPDATE control SET current_max_id = ${newUserId} WHERE id = 1`);

        //第1引数にConnectionオブジェクトを渡す。
        //TransactionSetオブジェクト内でトランザクション処理を制御しないので、第3引数はfalseを指定する。
        const transactionSet = new PostgresTransactionSet(conn, [command1, command2], false);

        //**トランザクションコミット**
        await conn.commitTransaction();
    } catch (err) {
        //**ロールバック**
        await conn.rollbackTransaction();
    } finally {
        conn.end();
    }
})();
```

以上です。