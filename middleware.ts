/** 認証ミドルウェアを作成する 
 * Middleware を使用する利点は、Middleware が認証を確認するまで、保護されたルートのレンダリングが開始されないこと。
*/
import NextAuth from "next-auth";
import { authConfig } from "./auth.config";

// 認証の設定を読み込んで、NextAuth を初期化して auth プロパティにアクセスする。
export default NextAuth(authConfig).auth;

export const config = {
  /** ミドルウェアのマッチャーを設定する 
   * この設定は、認証ミドルウェアがどのリクエストに適用されるかを制御する。
   * この例では、/api と /_next/static と /_next/image と .png ファイルを除くすべてのリクエストに適用される。
   * https://nextjs.org/docs/app/building-your-application/routing/middleware#matcher
  */
  matcher: ['/((?!api|_next/static|_next/image|.*\\.png$).*)'],
};