/** サーバー起動設定。APIキー等の秘匿値はsecretsStore.tsが別途.env永続化とGUI更新を扱う。 */
export const env = {
  port: Number(process.env.PORT ?? 4000),
  host: process.env.HOST ?? "0.0.0.0",
  corsOrigin: process.env.CORS_ORIGIN ?? "http://localhost:5173",
};
