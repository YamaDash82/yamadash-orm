import { PostgresConnection } from './postgres-connection';
import { AbstractTransactionSet, SQLCommand, SQLTransactionState, SQL_TRANSACTION_STATE } from '../parent_modules/transaction-set'
import * as PG from 'pg';

export class PostgresTransactionSet extends AbstractTransactionSet {
  //状態 
  private _state: SQLTransactionState = SQL_TRANSACTION_STATE.WaitingForExecute;
  
  private _error: any = null;
  private conn!: PostgresConnection;
  //専用Connectionフラグ
  private isPrivateConnection = true; //connが当クラス内で生成したPostgresConnectionの時Trueをセットする。
  //トランザクション処理フラグ
  private isWithTransaction = true; //commit、rollback行うときtrueをセットする。
  commands: SQLCommand[] = [];

  constructor(comannd: SQLCommand, isWithTransactoin?: boolean)
  constructor(commands: SQLCommand[], isWithTransaction?: boolean)
  constructor(conn: PostgresConnection, commands: SQLCommand, isWithTransactoin?: boolean)
  constructor(conn: PostgresConnection, commands: SQLCommand[], isWithTransactoin?: boolean)
  constructor(arg1: any, arg2: any, arg3?: any) {
    super();

    if(arg1 instanceof SQLCommand) { 
      //第一引数が単一のSQLCommandである。
      this.commands.push(arg1);
      
      //専用Connectionである。
      this.isPrivateConnection = true;
      //コネクションを生成する。
      this.conn = new PostgresConnection();

      //トランザクションフラグ
      if (arg2 === undefined) {
        this.isWithTransaction = true;
      } else {
        this.isWithTransaction = arg2;
      }
    } else if(Array.isArray(arg1)) {
      //第一引数が配列→SQLCommandの配列である。
      this.commands.push(...(arg1 as SQLCommand[]));
      
      //専用Connectionである。
      this.isPrivateConnection = true;
      //コネクションを生成する。
      this.conn = new PostgresConnection();

      if (arg2 === undefined) {
        this.isWithTransaction = true;
      } else {
        this.isWithTransaction = arg2;
      }

      //トランザクションフラグ
      if (arg2 === undefined) {
        this.isWithTransaction = true;
      } else {
        this.isWithTransaction = arg2;
      }
    } else {
      //第一引数がPostgresConnectionである。
      this.conn = arg1;

      //専用Connectionではない。
      this.isPrivateConnection = false;

      //トランザクションフラグ(第3引数)
      if (arg3 === undefined) {
        //未指定の場合、trueに設定する。
        this.isWithTransaction = true
      } else {
        this.isWithTransaction = arg3
      }

      //第二引数はSQLComanndまたはSQLCommandの配列である。
      if (Array.isArray(arg2)) {
        //arg2:SQLCommandの配列である。
        this.commands.push(...(arg2 as SQLCommand[]));
      } else {
        //arg2:単一のSQLCommandである。
        this.commands.push((arg2 as SQLCommand));
      }
    }
  }

  async execute(): Promise<boolean> {
    //専用クライアント時、ここでdbに接続する。
    if(this.isPrivateConnection){
      await this.conn.connect();
    }
    
    const client = this.conn.client;

    //処理群
    const processes: (() => Promise<any>)[] = [];

    //トランザクションを伴う場合、トランザクション開始処理を処理群に追加する。
    if (this.isWithTransaction) {
      processes.push(() => {
        return client.query('BEGIN');
      });
    }

    //実行するSQLCommand群の実行処理を処理群に追加する。
    processes.push(...this.commands.map(command => {
      return (async() => {
        return client.query(command.source)
        .then(_ => {
          command.setState(SQL_TRANSACTION_STATE.Succeed);
        })
        .catch(err => {
          command.setError(err);
          command.setState(SQL_TRANSACTION_STATE.Failed);
          throw err;
        });
      });
    }));

    //トランザクションを伴う場合、コミット処理を処理群に追加する。
    if (this.isWithTransaction) {
      processes.push(() => {
        return client.query('COMMIT');
      });
    }
    
    try {
      //コマンド群を順次実行する。
      await processes.reduce((previous, current) => {
        return previous.then(() => {
          return current();
        });
      }, Promise.resolve());

      //コマンド実行状態を成功にする。
      this._state = SQL_TRANSACTION_STATE.Succeed;
    } catch (err) {
      //トランザクションを伴う場合、ロールバックする。
      if (this.isWithTransaction) {
        await client.query('ROLLBACK');
      }

      //エラーを取得し、コマンド実行状態を失敗にする。
      this._error = new Error(err instanceof Error ? err.message : 'トランザクション処理中にエラーが発生しました。');
      this._state = SQL_TRANSACTION_STATE.Failed;
    } finally {
      //専用Connection時、当クラス内で生成したPostgresClientを終了する。
      if (this.isPrivateConnection) {
        await this.conn.end();
      }
    }
    
    if (this._error) {
      throw this._error;
    }

    return true;
  }

  get state(): SQLTransactionState {
    return this._state;
  }

  get error():any {
    return this._error;
  }
}
