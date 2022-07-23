import { AbstractRecordsetFiller } from '../parent_modules/recordset-filler'
import { Recordset } from '../parent_modules/recordset';
import { DefaultPool } from './default-pool';

export class PostgresRecordsetFiller extends AbstractRecordsetFiller {
  private pool: DefaultPool;
  private _recordsets: Recordset<any>[] = [];
  private _isPrivatePool = false;

  constructor(recordset: Recordset<any>)
  constructor(recordsets: Recordset<any>[])
  constructor(pool: DefaultPool, recordset: Recordset<any>)
  constructor(pool: DefaultPool, recordsets: Recordset<any>[])
  constructor(arg1: any, arg2?: any) {
    super();

    if(arg2) {
      //引数が2つ渡されているとき
      //第一引数:Pool, 第二引数:Recordset | Recorset[]
      this.pool = arg1;

      if(Array.isArray(arg2)) {
        this._recordsets = arg2;
      } else {
        this._recordsets.push(arg2);
      }
    } else {
      this.pool = new DefaultPool();
      this._isPrivatePool = true;

      if(Array.isArray(arg1)) {
        this._recordsets = arg1;
      } else {
        this._recordsets.push(arg1);
      }
    }
  }

  async fill(): Promise<void> {
    try {
      const client = await this.pool.connect();
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
          )  
        });

        await Promise.all(processes);
      })().catch(err => {
        throw err;
      }).finally(() => {
        client.release();
        if(this._isPrivatePool) {
          this.pool.end();
        }
      });
    } catch(err) {
      throw err;
    }
  }
}