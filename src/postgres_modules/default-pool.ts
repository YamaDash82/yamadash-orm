import * as PG from 'pg';

export class DefaultPool extends PG.Pool {
  constructor() {
    super({
      //接続先URLは環境変数からもたらされる。
      //開発時は".env"ファイルから、本番環境時(heroku)はherokuから値がもたらされる。
      connectionString: process.env.DATABASE_URL, 
      //sslに設定する値は開発環境時はfalse、本番環境時はtrueを設定する。
      ssl: !!!process.env.DEVELOP_MODE
    });
  }
}

export interface TransactionCommand {
  beginTransaction: Promise<void>;
  commitTransactoin: Promise<void>;

}

export class ExClient extends PG.Client {
  async beginTransactoin(): Promise<PG.QueryResult> {
    return this.query('BEGIN');
  }

  async commitTransaction(): Promise<PG.QueryResult> {
    return this.query('COMMIT');
  }

  async rollbackTransaction(): Promise<PG.QueryResult> {
    return this.query('ROLLBACK');
  }
}

export function beginTransaction(client: PG.Client): Promise<PG.QueryResult> {
  return client.query('BEGIN');
}

export function commitTransaction(client: PG.Client): Promise<PG.QueryResult> {
  return client.query('COMMIT');
}

export function rollbackTransaction(client: PG.Client): Promise<PG.QueryResult> {
  return client.query('ROLLBACK');
}