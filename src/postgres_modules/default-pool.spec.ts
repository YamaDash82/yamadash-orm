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
      //connectメソッド実行でclientが取得できる。
      const client = await pool.connect();
      connected = true;

      //pool.end()前にclientの解放が必要である。
      //これを実行しないと、pool.end()が完了しなかった。
      client.release();
      
      await pool.end();
      disconnected = true;
    } catch (err) {
      console.log(`エラー:${err instanceof Error ? err.message : ""}`);
    } 

    expect(connected).toEqual(true);
    expect(disconnected).toEqual(true);
  });
});