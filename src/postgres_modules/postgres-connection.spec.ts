import { config } from 'dotenv';
import { DefaultPool } from './default-pool';
import { PostgresConnection } from './postgres-connection';

describe('PostgresConnectionクラスのテスト', () => {
  //環境変数を取得する。
  config();

  beforeAll(async () => {
    console.log('beforeall');
    const conn = new PostgresConnection();
    await conn.connect();
    await conn.client.query('DELETE FROM users WHERE id = 10');
    await conn.end();
  });

  it('インスタンス生成テスト', () => {
    const conn = new PostgresConnection();

    expect(conn).toBeDefined();
  });

  it('未接続エラー確認', async () => {
    const conn = new PostgresConnection();

    await expect(async () => {
      conn.client.query(`SELECT 'Jhon' as name`);
    }).rejects.toThrow();
  });

  it('トランザクションテスト', async () => {
    const conn = new PostgresConnection();
    
    await conn.connect();

    await conn.beginTransaction();

    await conn.client.query('DELETE FROM users WHERE id = 10');

    await conn.client.query(`INSERT INTO users (id, username) VALUES (10, '山田 太郎')`);

    await conn.commitTransaction();

    await conn.end();
  });

  it('トランザクションテスト:ロールバック', async () => {
    const conn = new PostgresConnection();

    await conn.connect();
    
    await expect(async () => {
      try {
        await conn.beginTransaction()

        await conn.client.query('DELETE FROM users WHERE id = 10');

        //誤ったINSERT句
        await conn.client.query(`INSERT INT users (id, username) VALUES (10, '山田 太郎')`);

        await conn.commitTransaction();
      } catch (err) {
        console.log('ロールバック');
        await conn.rollbackTransaction();

        throw err;
      }
    }).rejects.toThrow();

    await conn.end();
  });

  /*
  it('poolの解放', async () => {
    const pool = DefaultPool.getInstance();

    let result = false;
    try {
      await pool.end();

      result = true;
    } catch (err) {
      console.log(`pool.endでエラー発生:${err instanceof Error ? err.message : ''}`);
    }
    
    expect(result).toBe(true);
  });
  */
});