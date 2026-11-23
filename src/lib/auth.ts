import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";

// Security notes on this config:
// - Sessions are JWT-based, signed with NEXTAUTH_SECRET (set this in your
//   environment, never commit it). The session cookie is httpOnly and
//   SameSite=Lax by default, which is what defeats the classic
//   "hidden <img> tag" CSRF attack: a cross-site GET can't change state
//   because our mutating routes only accept POST, and SameSite=Lax does not
//   attach the cookie to cross-site POSTs.
// - Passwords are never stored in plain text; only bcrypt hashes are stored
//   and compared.
// - We never trust a client-supplied user id or role for authorization.
//   Every API route re-reads the session server-side and re-checks the role
//   against the database before acting.
export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const user = await prisma.user.findUnique({
          where: { email: credentials.email.toLowerCase().trim() },
        });
        if (!user) return null;

        const valid = await bcrypt.compare(credentials.password, user.passwordHash);
        if (!valid) return null;

        return { id: user.id, name: user.name, email: user.email, role: user.role };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = (user as any).id;
        token.role = (user as any).role;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.id;
        (session.user as any).role = token.role;
      }
      return session;
    },
  },
};
