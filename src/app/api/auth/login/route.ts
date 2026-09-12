import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createSession, verifyPassword } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const email = String(body.email ?? "").trim().toLowerCase();
    const password = String(body.password ?? "");

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required." },
        { status: 400 },
      );
    }

    const user = await prisma.user.findUnique({ where: { email } });
    const ok = user ? await verifyPassword(password, user.passwordHash) : false;
    if (!user || !ok) {
      return NextResponse.json(
        { error: "Email or password doesn't match." },
        { status: 401 },
      );
    }

    await createSession(user.id);
    return NextResponse.json({
      user: { id: user.id, email: user.email, name: user.name },
    });
  } catch (err) {
    console.error("login failed:", err);
    return NextResponse.json(
      { error: "Something went wrong on our end. Try again." },
      { status: 500 },
    );
  }
}
