"use client";

import { useActionState, useState } from "react";
import { loginAction } from "@/lib/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { APP_NAME } from "@/lib/constants";
import { Loader2 } from "lucide-react";

const DEMO_ACCOUNTS = [
  {
    label: "Admin",
    email: "admin@kemenkumham.go.id",
    password: "password123",
  },
  {
    label: "Operator UKE",
    email: "operator@kemenkumham.go.id",
    password: "password123",
  },
  {
    label: "Executive",
    email: "executive@kemenkumham.go.id",
    password: "password123",
  },
] as const;

export function LoginForm() {
  const [state, formAction, pending] = useActionState(loginAction, {
    success: false,
    error: "",
  });
  const [email, setEmail] = useState<string>(DEMO_ACCOUNTS[0].email);
  const [password, setPassword] = useState<string>(DEMO_ACCOUNTS[0].password);

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

        <div className="mt-4 space-y-2">
          <p className="text-center text-xs text-muted-foreground">Login cepat (dev)</p>
          <div className="flex flex-wrap justify-center gap-2">
            {DEMO_ACCOUNTS.map((account) => (
              <Button
                key={account.label}
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setEmail(account.email);
                  setPassword(account.password);
                }}
              >
                {account.label}
              </Button>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
