import { useState, useEffect } from "react";
import { Link, useSearch } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuth } from "@/lib/auth";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Cloud, Lock, AlertCircle, Loader2, CheckCircle, UserPlus } from "lucide-react";

const acceptFormSchema = z.object({
  password: z.string().min(6, "Password must be at least 6 characters"),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

type AcceptForm = z.infer<typeof acceptFormSchema>;

interface InviteInfo {
  email: string;
  name: string;
  clinicianName: string;
}

export default function AcceptInvitePage() {
  const searchString = useSearch();
  const params = new URLSearchParams(searchString);
  const token = params.get("token") || "";
  const { refreshUser } = useAuth();

  const [inviteInfo, setInviteInfo] = useState<InviteInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<AcceptForm>({
    resolver: zodResolver(acceptFormSchema),
    defaultValues: { password: "", confirmPassword: "" },
  });

  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }
    fetch(`/api/auth/invite/${token}`, { credentials: "include" })
      .then(async (res) => {
        if (!res.ok) {
          const body = await res.json();
          throw new Error(body.message || "Invalid invitation");
        }
        return res.json();
      })
      .then((data) => {
        setInviteInfo(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, [token]);

  const onSubmit = async (data: AcceptForm) => {
    setError("");
    setIsSubmitting(true);
    try {
      await apiRequest("POST", "/api/auth/accept-invite", {
        token,
        password: data.password,
      });
      setSuccess(true);
      await refreshUser();
    } catch (err: any) {
      setError(err.message?.replace(/^\d+:\s*/, "") || "Failed to create account");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!token || (!inviteInfo && !loading)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error || "Invalid or expired invitation link."}</AlertDescription>
            </Alert>
            <Link href="/login" className="block mt-4">
              <Button variant="outline" className="w-full" data-testid="button-back-login">
                Back to Sign In
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
            <Cloud className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Clear Skies</h1>
          <p className="text-muted-foreground mt-1">Create Your Patient Account</p>
        </div>

        <Card>
          <CardHeader className="space-y-1 pb-4">
            <CardTitle className="text-xl">Welcome, {inviteInfo?.name}</CardTitle>
            <CardDescription>
              {inviteInfo?.clinicianName} has invited you to join Clear Skies. Set a password to complete your account.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {success ? (
              <div className="space-y-4">
                <Alert className="border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950">
                  <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
                  <AlertDescription className="text-green-800 dark:text-green-200" data-testid="text-invite-success">
                    Your account has been created successfully! Redirecting to your dashboard...
                  </AlertDescription>
                </Alert>
                <Link href="/patient/dashboard">
                  <Button className="w-full" data-testid="button-go-dashboard">
                    Go to Dashboard
                  </Button>
                </Link>
              </div>
            ) : (
              <>
                {error && (
                  <Alert variant="destructive" className="mb-4">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription data-testid="text-invite-error">{error}</AlertDescription>
                  </Alert>
                )}

                <div className="mb-4 p-3 bg-muted/50 rounded-lg">
                  <p className="text-sm text-muted-foreground">Account email</p>
                  <p className="text-sm font-medium" data-testid="text-invite-email">{inviteInfo?.email}</p>
                </div>

                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="password">Create Password</Label>
                    <Input
                      id="password"
                      type="password"
                      placeholder="At least 6 characters"
                      data-testid="input-invite-password"
                      {...form.register("password")}
                    />
                    {form.formState.errors.password && (
                      <p className="text-sm text-destructive">{form.formState.errors.password.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Confirm Password</Label>
                    <Input
                      id="confirmPassword"
                      type="password"
                      placeholder="Confirm your password"
                      data-testid="input-invite-confirm-password"
                      {...form.register("confirmPassword")}
                    />
                    {form.formState.errors.confirmPassword && (
                      <p className="text-sm text-destructive">{form.formState.errors.confirmPassword.message}</p>
                    )}
                  </div>

                  <Button type="submit" className="w-full" disabled={isSubmitting} data-testid="button-accept-invite">
                    {isSubmitting ? (
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    ) : (
                      <UserPlus className="w-4 h-4 mr-2" />
                    )}
                    {isSubmitting ? "Creating account..." : "Create Account"}
                  </Button>
                </form>

                <div className="mt-6 text-center text-sm text-muted-foreground">
                  Already have an account?{" "}
                  <Link href="/login" className="text-primary hover:underline font-medium" data-testid="link-login">
                    Sign in
                  </Link>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
