import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/db';

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  session: { strategy: 'jwt', maxAge: 60 * 60 }, // 1 hour
  pages: {
    signIn: '/login',
  },
  providers: [
    Credentials({
      credentials: {
        username: { label: 'Usuario', type: 'text' },
        email: { label: 'Email', type: 'text' },
        password: { label: 'Contraseña', type: 'password' },
      },
      async authorize(credentials) {
        const rawUser = (credentials?.username ?? credentials?.email) as string | undefined;
        const password = credentials?.password as string | undefined;
        if (!rawUser || !password) return null;
        const username = rawUser.trim().toLowerCase();

        const user = await prisma.usuario.findUnique({ where: { username } });
        if (!user) return null;
        if (user.estado !== 'Activo') return null;

        const ok = await bcrypt.compare(password, user.password_hash);
        if (!ok) return null;

        return {
          id: String(user.id),
          username: user.username,
          name: user.nombre_completo,
          role: user.rol,
          nombreCompleto: user.nombre_completo,
          mustChangePassword: user.must_change_password,
          estado: user.estado,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id;
        token.username = user.username;
        token.role = user.role;
        token.nombreCompleto = user.nombreCompleto;
        token.mustChangePassword = user.mustChangePassword;
        token.estado = user.estado;
      }
      // Allow session update (e.g. after password change) to refresh the flag
      if (trigger === 'update' && session?.mustChangePassword === false) {
        token.mustChangePassword = false;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.username = token.username as string;
        session.user.role = token.role as string;
        session.user.nombreCompleto = token.nombreCompleto as string;
        session.user.mustChangePassword = token.mustChangePassword as boolean;
        session.user.estado = token.estado as string;
      }
      return session;
    },
  },
});
