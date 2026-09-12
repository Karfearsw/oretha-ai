export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto flex min-h-dvh max-w-[32rem] flex-col bg-canvas pad-safe-top">
      {children}
    </div>
  );
}
