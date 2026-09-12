import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

const COOKIE_NAME = "oretha_session";
const secret = new TextEncoder().encode(
  process.env.AUTH_SECRET ?? "dev-secret-do-not-ship",
);

export type SessionUser = {
  id: string;
  email: string;
  name: string;
  tagline: string | null;
  plan: string;
  avatarSeed: string;
  setupCompleted: boolean;
  agentName: string;
  agentEmoji: string;
  voice: string | null;
  censorship: string;
  empowerment: boolean;
  responseLength: string;
};

export function hashPassword(password: string) {
  return bcrypt.hash(password, 12);
}

export function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}

export async function createSession(userId: string) {
  const token = await new SignJWT({})
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(secret);

  const jar = await cookies();
  jar.set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
}

export async function getSessionUser(): Promise<SessionUser | null> {
  const jar = await cookies();
  const token = jar.get(COOKIE_NAME)?.value;
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, secret);
    if (!payload.sub) return null;
    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: {
        id: true,
        email: true,
        name: true,
        tagline: true,
        plan: true,
        avatarSeed: true,
        setupCompleted: true,
        agentName: true,
        agentEmoji: true,
        voice: true,
        censorship: true,
        empowerment: true,
        responseLength: true,
      },
    });
    return user;
  } catch {
    return null;
  }
}

export async function destroySession() {
  const jar = await cookies();
  jar.delete(COOKIE_NAME);
}
