# Database操作

## 概要

社内開発用独自ORM

**orm**
> オブジェクト関係マッピング（英: Object-relational mapping、O/RM、ORM）とは、データベースとオブジェクト指向プログラミング言語の間の非互換なデータを変換するプログラミング技法である。オブジェクト関連マッピングとも呼ぶ。
> 
> (引用:[Wikipedia:オブジェクト関係マッピング](https://ja.wikipedia.org/wiki/%E3%82%AA%E3%83%96%E3%82%B8%E3%82%A7%E3%82%AF%E3%83%88%E9%96%A2%E4%BF%82%E3%83%9E%E3%83%83%E3%83%94%E3%83%B3%E3%82%B0))

## インストール方法  
対象のNode.jsプロジェクトフォルダで以下のコマンドを実行します。  
`ak-orm Ver2.0.0`より`Recordset`クラスを別パッケージに分離したので`ak-orm-recordset`も合わせてインストールします。
```bash
npm insatll --save git+http://akbusiness.git.co.jp:8080/git/YYamada/ak-orm.git
npm install --save git+http://akbusiness.git.co.jp:8080/git/YYamada/ak-orm-recordset.git
```


## 使用方法
### SQLServer
#### 準備
1. 設定ファイルの作成
    
    以下のようなjsonファイルを作成します。  
    ファイル名は任意で構いません。この例では`sqlconfig.json`としています。  
    このファイルは「トータル社会福祉システム希望」における`PBGP.ini`のような位置づけです。
    ```json:sqlconfig.json
    {
      "mssqlSetting": {
        "server": "PC名もしくはIPアドレス", 
        "user": "sa",
        "password": "", 
        "port": "",
        "instance": "SQL2012"
      }
    }
    ```
    **注意**  
    mssqlSetteing.port、mssqlSetting.instanceはどちらか一方を設定します。両方同時に設定することはありません。

1. SQLConfigurationValueの初期化  
    SQLConfigurationValueクラスのinitialize()メソッドを実行します。  
    引数に先ほど作成したjsonファイルのパスを指定します。

    ```typescript:app.ts
    import { SQLConfigurationValue } from 'ak-orm';
    import { join } from 'path';

    //jsonファイルが実行するjsファイルの階層のconfigフォルダ内にある場合の例。
    SQLConfigurationValue.initilize(join(__dirname, './config/sqlconfig.json'));
    ```

    これでSQLServerへの接続情報がjsonファイルからアプリに保持されます。シングルトンを用いています。  
    アプリ実行中、情報は変わることなく保持し続けます。開発時にこの接続情報を直に参照することはありません。後に出てくるSQLServerへの接続情報をもつクラス`ExConnection`クラスのインスタンス生成時に内部で参照しています。

#### レコードの取得
##### 使用例1 単一のレコードセットの取得
```typescript
import { MSSQLRecordsetFiller } from 'ak-orm';
import { Recordset } from 'ak-orm-recordset';

(async () => {
    const rst = new Recordset('SELECT * FROM 共通.dbo.D_老人台帳_M WHERE [利用者№] BETWEEN 1 AND 10');

    conster filler = new MSSQLRecordsetFiller(rst);
    await filler.fill();

    console.log(`利用者氏名:${rst.records[0]['利用者氏名']}`); // '利用者氏名:山田　太郎'
})();
```
**MSSQLRecordsetFillerの名称について**  
fillを翻訳すると'満たす'。  
Recordsetを満たすものの意で`MSSQLRecordsetFiller`と命名した。


##### 使用例2 複数のレコードセットの取得
```typescript
import { MSSQLRecorsetFiller } from 'ak-orm';
import { Recordset } from 'ak-orm-recordset';

(async () => {
  const rst1 = new Recordset('SELECT * FROM 共通.dbo.D_老人台帳_M WHERE [利用者№] BETWEEN 1 AND 10');
  const rst2 = new Recordset('SELECT * FROM 共通.dbo.D_老人台帳_M被保険者証 WHERE [利用者№] BETWEEN 1 AND 10');

  //fillerの初期化時、引数にRecordsetオブジェクトの配列を渡す。
  const filler = new MSSQLRecordsetFiller([rst1, rst2]);
  filler.fill();
})();
```

##### 使用例3 フィールド名のインテリセンスが効くようにする
使用例1、使用例2で取得したレコードセットの列名を参照するにはブラケット記法を用いています。
```typescript
//レコードセット2行目の'利用者カナ名'列を参照する場合の例
rst.records[1]['利用者カナ名'];
```
次に示すようにTypeScriptのジェネリック型を用いるとドット記法で列を参照できます。
また入力中にインテリセンスで候補も上がるようになります。  
**注意**  
'利用者№'の'№'のような特殊文字の場合、ドット記法はできないようです。ただしインテリセンスは有効なので、候補の中から選択できます。その際は自動でブラケット記法になりました。

```typescript
(async () => {
  //'№'は特殊文字なので、ジェネリックを定義する際もシングルコーテーションでくくる。
  const rst = new Rcordset<{ '利用者№': number, 利用者氏名: string }>('SELECT [利用者№], 利用者氏名 FROM 共通.dbo.D_老人台帳_M WHERE [利用者№] BETWEEN 1 AND 10');

  const filler = new MSSQLFiller(rst);
  await filler.fill();

  //以下、'利用者№'はブラケット記法だが、候補から選択可能、利用者氏名列はドット記法を用いている。
  console.log(`利用者№:${rst.records[0]['利用者№']}, 利用者氏名:${rst.records[0].利用者氏名}`);
})();
```

SELECT句のASを用いたエイリアスと合わせて利用するのも良いと思います。
```typescript
(async () => {
  //ジェネリックのフィールドの定義と、SELECT句のasで指定するエイリアスを対応させる。
  const rst = new Rcordset<{ riyoshaNo: number, riyoshaName: string }>('SELECT [利用者№] AS riyoshaNo, 利用者氏名 as riyoshaName FROM 共通.dbo.D_老人台帳_M WHERE [利用者№] BETWEEN 1 AND 10');

  const filler = new MSSQLFiller(rst);
  await filler.fill();

  console.log(`利用者№:${rst.records[0].riyoshaNo}, 利用者氏名:${rst.records[0].riyoshaName}`);
})();
```

#### レコードの更新
`SQLCommand`クラスと`MSSQLTransactionSet`クラスを用いてレコードを更新することができます。

##### 使用例
`R_HOGE`というテーブルにDELETE/INSERTする例。

```typescript
import { SQLCommand, MSSQLTransactionSet } from 'ak-orm';

(async () => {
  const delCommand = new SQLCommand('DELETE FROM hoge.dbo.R_HOGE WHERE ID = 999');
  const insCommand = new SQLCommand('INSERT INTO hoge.dbo.R_HOGE (ID, FLD1, FLD2) VALUES (999, VAL1, VAL2)');

  //第一引数に実行するコマンドの配列をセット。配列はコマンドを実行する順に格納する。
  //第二引数にトランザクション(BeginTran/Commit/Rollback)を伴うか否かをboolean型で指定。省略可。省略した場合trueを指定したものとみなし、トランザクション処理を伴います。
  const transactionSet = new MSSQLTransactionSet([delCommand, insCommand], true);

  //executeメソッドで処理を実行する。
  //戻り値はboolean型。正常に処理が完了したときtrue、エラーが発生したときfalseを返します。
  if(transactionSet.execute()) {
    console.log('成功');
  } else {
    //エラー発生時、errorプロパティにErrorが格納されます。
    console.log(`エラー内容:${transactionSet.error}`);
  }
})();
```

#### ExConnectionの使いまわし
`MSSQLRecordsetFiller`も`MSSQLTransactionSet`も`ExConnection`クラスのインスタンスを生成し、処理完了とともに`ExConnection`クラスのインスタンスを破棄しています。つまり、DBに接続と切断を行っています。  
`MSSQLRecordsetFiller`も`MSSQLTransactionSet`共にnew時に第一引数に`ExConnection`クラスを指定可能です。  
指定した場合、自身で接続を開き、処理完了とともに、接続を閉じます。  
一度のHTTPリクエストで、データの取得、更新を行う場合は`ExConnection`を使いまわす方が処理速度が速いかもしれません。  
2022/05/25現在計測は行っておりません。  
以下使用例です。
`/update`というルーティングでレコードを取得し、更新するというような例。
```typescript
import { ExConnection, Recordset, MSSQLRecordsetFiller, SQLCommand, MSSQLTransactionset } from 'ak-orm';
...

app.get('/update', async (req, res) => {
  ...

  //dbへ接続する。
  const conn = await ExConnection.getConnection();

  const rst = new Recordset('SELECT ...');

  //第一引数にExConnectionのインスタンスを指定。上で作成した接続情報を用いている。
  const filler = new MSSQLRecordsetFiller(conn, rst);
  //レコードセット取得
  await filler.fill();

  //...何か処理..
  
  //更新SQLを生成
  const insertCommand = new SQLCommand('UPDATE ...');

  //第一引数にExConnectionのインスタンスを指定。上で作成した接続情報を用いている。
  const transactionSet = new MSSQLTransactionSet(conn, command);

  //実行
  if(transactionSet.execute()) {
    //成功
  } else {
    //失敗
  }

  //必ず、接続を閉じる。
  conn.close();
  res.send(...);
});
...
```

#### TransactionをMSSQLTransactionSetの外で制御する  
例) コントロールマスタから現在のIDを取得し、その取得したIDをインクリメントしながら挿入する例  

```typescript
(async () =>{
  //dbへの接続を取得する。
  const conn = await ExConnection.getConnection();

  try {
    //トランザクション開始
    await conn.beginTransactionPromise();

    //コントロールマスタからidを取得する。
    const rst = new Recordset<{maxId: number}>('SELECT current_id FROM m_control WHERE id = 1');
    const filler = new MSSQLRecordsetFiller(conn, rst);
    await filler.fill();

    const maxId = rst.records[0].maxId;

    const insertCommand = new SQLCommand (`INSERT INTO r_hoge (id, ...) VALUES (${++id}, ...`);
    
    //第一引数にExConnectionのインスタンスを指定。上で作成した接続情報を用いている。
    //第三引数はMSSQLTransactionSet内ではトランザクションを制御しないのでfalseを指定する。
    const transactionSet = new MSSQLTransactionSet(conn, command, false)

    //トランザクションコミット
    await conn.commitTransactionPromise();
  } catch (err) {
    //ロールバック
    await conn.rollbackTransactionPromise()

    //エラー処理
    ...
  }
})();
```

### PostgreSQL
#### 準備
1. 環境変数の設定  
    `PostgreSQL`への接続情報は環境変数から取得しています。  
    プロジェクトフォルダのルートに`.env`というファイルを作成し、`.env`に環境変数値を設定します。
    以下のような`.env`を作成してください。  
    ```:.env
    # #はコメントです。
    # 開発モードを示すフラグです。PostgreSQLのコネクション生成時に参照しています。
    DEVELOP_MODE=true

    # PostgreSQLへの接続設定の構文です。
    # DATABASE_URL=postgresql://{ユーザ}:{password}@{接続先サーバ}:{ポート}/{db名}
    # 以下は
    #   ユーザ:root、
    #   パスワード:ak8205、
    #   接続先:host.docker.internal (←この値はコンテナ内からみたホストコンピュータをです。)、
    #   ポート:5432、
    #   データベース:ak_test_db
    # に接続する場合の設定値です。
    DATABASE_URL=postgresql://root:ak8205@host.docker.internal:5432/ak_test_db
    ```
    **注意 `.env`はクラウドにデプロイ時はアップロードしない**  
    Heroku(やその他のクラウド環境)にデプロイする場合、`.env`はアップロードしないように`.dockerignore`を設定してください。デプロイしない、自機での開発作業のみであれば、当**注意**は気にしなくてもよいです。  
  
2. プログラム開始時に環境設定をロードする  
    境設定`.env`のロードには`dotenv`パッケージを使用します。  
    インストールします。
    ```bash
    npm install --save dotenv
    ```
    プログラムの開始箇所で以下を実行します。
    ```typescript
    import * as DotEnv from 'dotenv';

    //.envに設定した環境変数をロードする。
    DotEnv.config();

    //以下は設定した環境変数のテスト 
    console.log(process.env.DATABASE_URL); //.envに設定したDATABASE_URLの値を参照します。
    ```

#### レコードの取得
##### 使用例1 単一のレコードセットの取得
```typescript
import { PostgresRedcordsetFiller } from 'ak-orm';
import { Recordset } from 'ak-orm-recordset';

(async () => {
  const rst = new Recordset('SELECT * FROM m_users');

  const filler = new PostgresRedcordsetFiller(rst);
  await filler.fill();

  console.log(`取得レコード:${JSON.stringify(rst.records)}`);
})();
```

##### 使用例2 複数のレコードセットの取得
```typescript
import { PostgresRedcordsetFiller } from 'ak-orm';
import { Recordset } from 'ak-orm-recordset';

(async () => {
  const rstUser = new Recordset('SELECT * FROM m_users');
  const rstProducts = new Reocrdset('SELECT * FROM m_products');

  //fillerの初期化時、引数にRecordsetオブジェクトの配列を渡す。
  const filler = new PostgresRedcordsetFiller([rstUser, rstProducts]);
  await filler.fill();

  console.log(`取得レコード:${JSON.stringify(rst.records)}`);
})();
```

#### レコードの更新
PostgreSQLにおけるレコードの更新はまだ未実装です。  

## 改定履歴
- 2.3.0 (2022/06/16)  
    `ExConnection`クラスにトランザクションを制御するメソッドを追加。
- 2.2.0 (2022/06/02)  
    PostgreSQLからレコードを取得できるように機能追加
- 2.0.0 (2022/05/27)  
    `Recordset`クラスを`ak-orm-recordset`パッケージに分割
- 1.1.3 (2022/05/25)  
    README.mdの追加  
    メソッド名変更　　
    ExConnection#getInstance()→ExConnection#getConnection()  
    伴ってExConnection#getConnection()の呼び出し箇所修正  
    RecordsetFiller#fill()  
    MSSQLTransactionSet#execute()
  