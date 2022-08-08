import * as PG from 'pg'
import { DefaultPool } from './default-pool';

//未接続エラー
export class NotConnectedError extends Error {
  constructor() {
    super();

    this.message = 'PostgresConnectionクラスのインスタンス生成後、connect()メソッドが実行されてません。';
  }
}

export class PostgresConnection {
  private pool!: DefaultPool;
  private _client!: PG.PoolClient;
  private connected = false;

  constructor() {
    this.pool = DefaultPool.getInstance();
  }

  async connect(): Promise<void> {
    this._client = await this.pool.connect();

    this.connected = true;
  }
  
  get client(): PG.PoolClient {
    if(!this.connected) throw new NotConnectedError();

    return this._client;
  }

  async beginTransaction(): Promise<void> {
    if (!this.connected) throw new NotConnectedError();

    this._client.query('BEGIN');
  }

  async commitTransaction(): Promise<void> {
    if (!this.connected) throw new NotConnectedError();
    
    this._client.query('COMMIT');
  }

  async rollbackTransaction(): Promise<void> {
    if(!this.connected) throw new NotConnectedError();
    
    this._client.query('ROLLBACK');
  }

  async end(): Promise<void> {
    this._client.release();
  }
}