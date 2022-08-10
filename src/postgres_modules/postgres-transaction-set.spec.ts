import { config } from 'dotenv';
import { 
  PostgresTransactionSet, 
  SQLCommand, 
  SQLTransactionState, 
  SQL_TRANSACTION_STATE, 
  DefaultPool, 
  PostgresConnection 
} from '../index';

describe('PostgresTransactionSetのテスト', () =>{
  //接続先dbにusersというテーブルがあるものとしてテスト。
  /**
   * users
   *   id: smallint (key)
   *   username: varchar(20)
   */
  
  //環境設定のロード
  config();

  it('単一のコマンドの実行:削除', async () => {
    const command = new SQLCommand(`delete from users where id = 10`);

    const transactionSet = new PostgresTransactionSet(command);

    const result = await transactionSet.execute();
    
    expect(result).toBe(true);

    //コマンド実行状態
    expect(command.state).toBe(SQL_TRANSACTION_STATE.Succeed);
  });

  it('単一のコマンドの実行:insert', async() => {
    const command = new SQLCommand(`insert into users (id, username) values (10, '山田　太郎')`);

    const transactionSet = new PostgresTransactionSet(command);

    expect(await transactionSet.execute()).toBe(true);

    //コマンド実行状態
    expect(command.state).toBe(SQL_TRANSACTION_STATE.Succeed);
  });

  it('単一のコマンドの実行:delete', async() => {
    const command = new SQLCommand('delete from users where id = 10');

    const transactionSet = new PostgresTransactionSet(command);

    expect(await transactionSet.execute()).toBe(true);
  });

  it('誤ったコマンドの実行', async() => {
    //テーブル名を誤ったコマンド
    const command = new SQLCommand('insert into user (id, username) values (10, \'山田　太郎\'');

    const transactionSet = new PostgresTransactionSet(command);

    await expect(async() => {
      await transactionSet.execute();
    }).rejects.toThrow();

  });

  it('トランザクションを伴う複数のコマンドの実行:正常', async() => {
    const commands: SQLCommand[] = [
      new SQLCommand(`insert into users (id, username) values (10, '山田　太郎')`), 
      new SQLCommand(`delete from users where id = 10`)
    ];

    const transactionSet = new PostgresTransactionSet(commands);

    expect(transactionSet.execute());
  });

  it('トランザクションを伴う複数のコマンドの実行:異常', async() => {
    const commands: SQLCommand[] = [
      new SQLCommand(`insert into users (id, username) values (10, '山田　太郎'`), 
      //↓whereの部分、わざとwherと誤っている。
      new SQLCommand(`delete from users wher id = 10`)
    ];
    
    await expect((async () => {
      const transactionSet = new PostgresTransactionSet(commands);

      const result = await transactionSet.execute();

      if(!result){
        throw transactionSet.error;
      }
    })).rejects.toThrow();
  });

  it('clientを外部から渡す場合のテスト:正常', async () => {
    const conn = new PostgresConnection();
    await conn.connect();

    const commands: SQLCommand[] = [
      new SQLCommand(`insert into users (id, username) values (10, '山田　太郎')`), 
      new SQLCommand(`delete from users where id = 10`)
    ];

    //transactionSet内ではトランザクションを制御しないので第3引数はfalseを設定する。
    const transactionSet = new PostgresTransactionSet(conn, commands, false);

    let result = false;

    //トランザクション開始
    await conn.beginTransaction();
    
    result = await transactionSet.execute();
    
    //コミット
    await conn.commitTransaction();
    
    //後処理
    conn.end();
+
    expect(result).toBe(true);
  });

  it('clientを外部から渡す場合のテスト:異常', async() => {
    const commands: SQLCommand[] = [
      new SQLCommand(`insert into users (id, username) values (10, '山田　太郎'`), 
      //↓whereの部分、わざとwherと誤っている。
      new SQLCommand(`delete from users wher id = 10`)
    ];
    
    const conn = new PostgresConnection();
    await conn.connect();

    await expect(async () => {
      await conn.beginTransaction();

      const transactionSet = new PostgresTransactionSet(conn, commands, false);

      try {
        const result = await  transactionSet.execute();

        if(result){
          await conn.commitTransaction();
        } else {
          throw transactionSet.error;
        }
        
      } catch (err) {
        await conn.rollbackTransaction();
        throw err;
      }
    }).rejects.toThrow(); 
  });

  afterAll(() => {
    const pool = DefaultPool.getInstance();

    pool.end();
  });
});