import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createSession, hashPassword } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const name = String(body.name ?? "").trim();
    const email = String(body.email ?? "").trim().toLowerCase();
    const password = String(body.password ?? "");
    const tagline = body.tagline ? String(body.tagline).trim() : null;

    if (!name || !email || !password) {
      return NextResponse.json(
        { error: "Name, email, and password are required." },
        { status: 400 },
      );
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json(
        { error: "That email doesn't look right." },
        { status: 400 },
      );
    }
    if (password.length < 8) {
      return NextResponse.json(
        { error: "Password needs at least 8 characters." },
        { status: 400 },
      );
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json(
        { error: "That email is already in the family. Sign in instead." },
        { status: 409 },
      );
    }

    const passwordHash = await hashPassword(password);
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        name,
        tagline,
        avatarSeed: name.charAt(0).toUpperCase(),
      },
      select: { id: true, email: true, name: true },
    });

    await createSession(user.id);
    return NextResponse.json({ user }, { status: 201 });
  } catch (err) {
    console.error("register failed:", err);
    return NextResponse.json(
      { error: "Something went wrong on our end. Try again." },
      { status: 500 },
    );
  }
}
