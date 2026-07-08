"use client";

import { useActionState, useState } from "react";
import { loginAction } from "@/lib/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { APP_NAME } from "@/lib/constants";
import { Loader2 } from "lucide-react";

const DEFAULT_PASSWORD = "password123";

const UKE_OPERATOR_CODES = [
  "ITJEN",
  "BSK",
  "BPSDM",
  "AHU",
  "KI",
  "PP",
  "BPHN",
  "SETJEN",
] as const;

const ROLE_ACCOUNTS = [
  {
    label: "Admin",
    email: "admin@kemenkumham.go.id",
    password: DEFAULT_PASSWORD,
  },
  {
    label: "Executive",
    email: "executive@kemenkumham.go.id",
    password: DEFAULT_PASSWORD,
  },
] as const;

const OPERATOR_ACCOUNTS = UKE_OPERATOR_CODES.map((code) => ({
  label: `Operator ${code}`,
  email: `operator-${code.toLowerCase()}@kemenkumham.go.id`,
  password: DEFAULT_PASSWORD,
}));

function applyAccount(
  account: { email: string; password: string },
  setEmail: (email: string) => void,
  setPassword: (password: string) => void
) {
  setEmail(account.email);
  setPassword(account.password);
}

export function LoginForm() {
  const [state, formAction, pending] = useActionState(loginAction, {
    success: false,
    error: "",
  });
  const [email, setEmail] = useState<string>(ROLE_ACCOUNTS[0].email);
  const [password, setPassword] = useState<string>(ROLE_ACCOUNTS[0].password);

  return (
    <Card className="w-full max-w-md border-border/50 shadow-2xl">
      <CardHeader className="space-y-1 text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground text-lg font-bold">
          SA
        </div>
        <CardTitle className="text-xl">{APP_NAME}</CardTitle>
        <CardDescription>Masuk untuk mengakses dashboard eksekutif</CardDescription>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@kemenkumham.go.id"
              required
              autoComplete="email"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              name="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="password123"
              required
              autoComplete="current-password"
            />
          </div>
          {!state.success && state.error && (
            <p className="text-sm text-destructive">{state.error}</p>
          )}
          <Button type="submit" className="w-full" disabled={pending}>
            {pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Masuk
          </Button>
        </form>

        <div className="mt-4 space-y-3">
          <p className="text-center text-xs text-muted-foreground">Login cepat (dev)</p>

          <div className="space-y-2">
            <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              Administrator & Executive
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              {ROLE_ACCOUNTS.map((account) => (
                <Button
                  key={account.label}
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => applyAccount(account, setEmail, setPassword)}
                >
                  {account.label}
                </Button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              Operator UKE
            </p>
            <div className="flex max-h-32 flex-wrap justify-center gap-2 overflow-y-auto pr-1">
              {OPERATOR_ACCOUNTS.map((account) => (
                <Button
                  key={account.email}
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => applyAccount(account, setEmail, setPassword)}
                >
                  {account.label}
                </Button>
              ))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
