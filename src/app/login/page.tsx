import { LoginForm } from "@/components/auth/login-form";

export default function LoginPage() {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background p-4">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-1/4 top-0 h-[500px] w-[500px] rounded-full bg-primary/20 blur-[120px]" />
        <div className="absolute -right-1/4 bottom-0 h-[500px] w-[500px] rounded-full bg-purple-500/10 blur-[120px]" />
      </div>
      <LoginForm />
    </div>
  );
}
