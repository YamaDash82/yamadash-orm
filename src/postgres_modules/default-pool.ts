import * as PG from 'pg';

export class DefaultPool extends PG.Pool {
  private static instance: DefaultPool;
  
  //シングルトンクラスにする。
  private constructor() {
    super({
      //接続先URLは環境変数からもたらされる。
      //開発時は".env"ファイルから、本番環境時(heroku)はherokuから値がもたらされる。
      connectionString: process.env.DATABASE_URL, 
      //sslに設定する値は開発環境時はfalse、本番環境時はtrueを設定する。
      ssl: !!!process.env.DEVELOP_MODE
    });
  }

  static getInstance(): DefaultPool {
    if (!DefaultPool.instance) {
      DefaultPool.instance = new DefaultPool();
    }

    return DefaultPool.instance;
  }
}