import { AbstractRecordsetFiller } from '../parent_modules/recordset-filler'
import { Recordset } from '../parent_modules/recordset';
import { PostgresConnection } from './postgres-connection';

export class PostgresRecordsetFiller extends AbstractRecordsetFiller {
  //private pool: DefaultPool;
  private conn: PostgresConnection;
  private _recordsets: Recordset<any>[] = [];
  private _isPrivateConn = false;

  constructor(recordset: Recordset<any>)
  constructor(recordsets: Recordset<any>[])
  constructor(conn: PostgresConnection, recordset: Recordset<any>)
  constructor(conn: PostgresConnection, recordsets: Recordset<any>[])
  constructor(arg1: any, arg2?: any) {
    super();

    if(arg2) {
      //引数が2つ渡されているとき
      //第一引数:PostgresConnection, 第二引数:Recordset | Recorset[]
      this.conn = arg1;

      if(Array.isArray(arg2)) {
        this._recordsets = arg2;
      } else {
        this._recordsets.push(arg2);
      }
    } else {
      this.conn = new PostgresConnection();
      this._isPrivateConn = true;

      if(Array.isArray(arg1)) {
        this._recordsets = arg1;
      } else {
        this._recordsets.push(arg1);
      }
    }
  }

  async fill(): Promise<void> {
    try {
      //専用Conn時、接続する。
      if (this._isPrivateConn) {
        await this.conn.connect();
      }
      const client = this.conn.client;
      
      await (async () => {
        const processes: Promise<void>[] = [];
        
        //複数のレコードセットを開く(SELECT句を実行する)際、逐次処理(逐次処理の必要はないため)ではなく、
        //Promise.allを用いたいので、processesに処理を蓄積させ、後にPromise.allでレコードセットを満たす。
        this._recordsets.forEach(rst => {
          processes.push(
            //https://node-postgres.com/api/pool
            //↑のpool.connectを参考にコーディングした。
            new Promise((resolve, reject) => {
              client.query(rst.source, (err, result) => {
                if(err){
                  return reject(err);
                }

                rst.records.push(...result.rows);

                return resolve();
              });
            })
          );  
        });

        await Promise.all(processes);
      })().catch(err => {
        throw err;
      }).finally(async () => {
        //専用接続時、切断する。
        if(this._isPrivateConn) {
          this.conn.end();
        }
      });
    } catch(err) {
      throw err;
    }
  }
}