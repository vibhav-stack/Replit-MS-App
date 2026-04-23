import { useState } from "react";
import { Link } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { loginSchema } from "@shared/schema";
import { z } from "zod";
import { useAuth } from "@/lib/auth";
import { usePWAInstall } from "@/hooks/use-pwa-install";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Cloud, LogIn, AlertCircle, Loader2, Download, Share, MoreVertical } from "lucide-react";

type LoginForm = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const { login } = useAuth();
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);
  const { platform, install, isInstalled } = usePWAInstall();

  const form = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const onSubmit = async (data: LoginForm) => {
    setError("");
    setIsSubmitting(true);
    try {
      await login(data.email, data.password);
    } catch (err: any) {
      setError(err.message?.replace(/^\d+:\s*/, "") || "Login failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInstall = async () => {
    if (platform === "native") {
      await install();
    } else {
      setShowInstructions(true);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
            <Cloud className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Clear Skies</h1>
          <p className="text-muted-foreground mt-1">MS Patient Management Portal</p>

          {!isInstalled && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleInstall}
              data-testid="button-install-pwa"
              className="mt-4 text-primary border-primary/30 hover:bg-primary/5"
            >
              <Download className="w-3.5 h-3.5 mr-1.5" />
              Install App
            </Button>
          )}
        </div>

        <Card>
          <CardHeader className="space-y-1 pb-4">
            <CardTitle className="text-xl">Welcome back</CardTitle>
            <CardDescription>Sign in to your account to continue</CardDescription>
          </CardHeader>
          <CardContent>
            {error && (
              <Alert variant="destructive" className="mb-4">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription data-testid="text-login-error">{error}</AlertDescription>
              </Alert>
            )}

            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  data-testid="input-email"
                  {...form.register("email")}
                />
                {form.formState.errors.email && (
                  <p className="text-sm text-destructive">{form.formState.errors.email.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between gap-1">
                  <Label htmlFor="password">Password</Label>
                  <Link
                    href="/forgot-password"
                    className="text-sm text-primary hover:underline"
                    data-testid="link-forgot-password"
                  >
                    Forgot password?
                  </Link>
                </div>
                <Input
                  id="password"
                  type="password"
                  placeholder="Enter your password"
                  data-testid="input-password"
                  {...form.register("password")}
                />
                {form.formState.errors.password && (
                  <p className="text-sm text-destructive">{form.formState.errors.password.message}</p>
                )}
              </div>

              <Button type="submit" className="w-full" disabled={isSubmitting} data-testid="button-login">
                {isSubmitting ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <LogIn className="w-4 h-4 mr-2" />
                )}
                {isSubmitting ? "Signing in..." : "Sign In"}
              </Button>
            </form>

            <div className="mt-6 text-center text-sm text-muted-foreground">
              <p>
                Clinician?{" "}
                <Link href="/register" className="text-primary hover:underline font-medium" data-testid="link-register">
                  Register here
                </Link>
              </p>
              <p className="mt-1 text-xs">
                Patients are invited by their clinician via email.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Dialog open={showInstructions} onOpenChange={setShowInstructions}>
        <DialogContent className="max-w-sm" data-testid="dialog-install-instructions">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Download className="w-4 h-4 text-primary" />
              Add to Home Screen
            </DialogTitle>
            <DialogDescription>
              Install Clear Skies for quick access from your home screen.
            </DialogDescription>
          </DialogHeader>

          {platform === "ios" ? (
            <div className="space-y-3 text-sm text-foreground">
              <p className="text-muted-foreground text-xs">Follow these steps in Safari on your iPhone or iPad:</p>
              <div className="space-y-2">
                <div className="flex items-start gap-3">
                  <span className="w-5 h-5 rounded-full bg-primary/10 text-primary text-xs flex items-center justify-center font-semibold shrink-0 mt-0.5">1</span>
                  <p>Tap the <Share className="w-3.5 h-3.5 inline mx-0.5 text-blue-500" /> <strong>Share</strong> button in the Safari toolbar at the bottom of the screen.</p>
                </div>
                <div className="flex items-start gap-3">
                  <span className="w-5 h-5 rounded-full bg-primary/10 text-primary text-xs flex items-center justify-center font-semibold shrink-0 mt-0.5">2</span>
                  <p>Scroll down and tap <strong>"Add to Home Screen"</strong>.</p>
                </div>
                <div className="flex items-start gap-3">
                  <span className="w-5 h-5 rounded-full bg-primary/10 text-primary text-xs flex items-center justify-center font-semibold shrink-0 mt-0.5">3</span>
                  <p>Tap <strong>"Add"</strong> in the top-right corner to confirm.</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-3 text-sm text-foreground">
              <p className="text-muted-foreground text-xs">Follow these steps in Chrome or Edge:</p>
              <div className="space-y-2">
                <div className="flex items-start gap-3">
                  <span className="w-5 h-5 rounded-full bg-primary/10 text-primary text-xs flex items-center justify-center font-semibold shrink-0 mt-0.5">1</span>
                  <p>Tap the <MoreVertical className="w-3.5 h-3.5 inline mx-0.5" /> <strong>menu</strong> button (three dots) in the top-right of your browser.</p>
                </div>
                <div className="flex items-start gap-3">
                  <span className="w-5 h-5 rounded-full bg-primary/10 text-primary text-xs flex items-center justify-center font-semibold shrink-0 mt-0.5">2</span>
                  <p>Select <strong>"Add to Home Screen"</strong> or <strong>"Install App"</strong>.</p>
                </div>
                <div className="flex items-start gap-3">
                  <span className="w-5 h-5 rounded-full bg-primary/10 text-primary text-xs flex items-center justify-center font-semibold shrink-0 mt-0.5">3</span>
                  <p>Tap <strong>"Add"</strong> to confirm.</p>
                </div>
              </div>
            </div>
          )}

          <Button
            variant="outline"
            className="w-full mt-2"
            onClick={() => setShowInstructions(false)}
            data-testid="button-close-install-instructions"
          >
            Got it
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
