export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative mx-auto flex min-h-dvh max-w-[32rem] flex-col pad-safe-top">
      {children}
    </div>
  );
}
