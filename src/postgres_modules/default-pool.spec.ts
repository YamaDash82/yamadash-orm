import { DefaultPool } from './default-pool';
import { config } from 'dotenv';

describe('DefaultPoolクラスのテスト', () => {
  //環境変数のロード
  config();

  it('dbへの接続テスト', async () => {
    const pool = new DefaultPool();

    expect(pool).toBeDefined();
    
    let connected = false;
    let disconnected = false;

    try {
      await pool.connect();
      connected = true;

      const data = await pool.query(`select 'taro' as name, 39 as age`);
      console.log(`取得データ:${JSON.stringify(data.rows)}`);
      
      await pool.end();
      disconnected = true;
    } catch (err) {
      console.log(`エラー:${err instanceof Error ? err.message : ""}`);
    } 

    expect(connected).toEqual(true);
    expect(disconnected).toEqual(true);
  }, 100000);
});