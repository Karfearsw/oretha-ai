import { OrethaMark } from "@/components/ui/OrethaMark";
import { AuthForm } from "@/components/auth/AuthForm";

export default function SignUpPage() {
  return (
    <main className="flex flex-1 flex-col px-6 pb-10">
      <div className="flex flex-col items-center gap-3 py-8 text-center">
        <OrethaMark size={72} />
        <h1 className="font-display text-[26px] font-bold text-cream">
          Join the family
        </h1>
        <p className="max-w-[280px] text-[13.5px] leading-snug text-sand">
          One account. Every agent, your whole office, and the lab.
        </p>
      </div>
      <AuthForm mode="signup" next="/setup" />
    </main>
  );
}
