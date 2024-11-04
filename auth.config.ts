import type { NextAuthConfig } from 'next-auth';

export const authConfig = {
  pages: {
    signIn: '/login'
  },
  callbacks: {
    authorized({
      auth, // ユーザーのセッション
      request: { nextUrl }, // 入力されたリクエスト
    }) {
      const isLoggedIn = !!auth?.user;
      const isOnDashboard = nextUrl.pathname.startsWith('/dashboard');
      if (isOnDashboard) {
        if (isLoggedIn) return true;
        return false; // 認証されていないユーザーをログインページにリダイレクトする
      } else if (isLoggedIn) {
        return Response.redirect(new URL('dashboard', nextUrl));
      }
      return true;
    },
  },
  providers: []
} satisfies NextAuthConfig;