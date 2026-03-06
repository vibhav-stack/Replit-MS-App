import { useState } from "react";
import { Link } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuth } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Cloud, UserPlus, AlertCircle, Loader2, Stethoscope, User } from "lucide-react";

const registerFormSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  confirmPassword: z.string(),
  role: z.enum(["clinician", "patient"]),
  clinicianEmail: z.string().email("Invalid clinician email").optional().or(z.literal("")),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
}).refine((data) => {
  if (data.role === "patient" && (!data.clinicianEmail || data.clinicianEmail === "")) {
    return false;
  }
  return true;
}, {
  message: "Clinician email is required for patient registration",
  path: ["clinicianEmail"],
});

type RegisterForm = z.infer<typeof registerFormSchema>;

export default function RegisterPage() {
  const { register: registerUser } = useAuth();
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<RegisterForm>({
    resolver: zodResolver(registerFormSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      confirmPassword: "",
      role: "clinician",
      clinicianEmail: "",
    },
  });

  const selectedRole = form.watch("role");

  const onSubmit = async (data: RegisterForm) => {
    setError("");
    setIsSubmitting(true);
    try {
      await registerUser({
        name: data.name,
        email: data.email,
        password: data.password,
        role: data.role,
        clinicianEmail: data.role === "patient" ? data.clinicianEmail : undefined,
      });
    } catch (err: any) {
      setError(err.message?.replace(/^\d+:\s*/, "") || "Registration failed");
    } finally {
      setIsSubmitting(false);
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
          <p className="text-muted-foreground mt-1">Create your account</p>
        </div>

        <Card>
          <CardHeader className="space-y-1 pb-4">
            <CardTitle className="text-xl">Register</CardTitle>
            <CardDescription>Choose your role and set up your account</CardDescription>
          </CardHeader>
          <CardContent>
            {error && (
              <Alert variant="destructive" className="mb-4">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription data-testid="text-register-error">{error}</AlertDescription>
              </Alert>
            )}

            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-3">
                <Label>I am a...</Label>
                <RadioGroup
                  value={selectedRole}
                  onValueChange={(val) => form.setValue("role", val as "clinician" | "patient")}
                  className="grid grid-cols-2 gap-3"
                >
                  <Label
                    htmlFor="role-clinician"
                    className={`flex items-center gap-3 rounded-md border-2 p-3 cursor-pointer transition-colors ${
                      selectedRole === "clinician"
                        ? "border-primary bg-primary/5"
                        : "border-border"
                    }`}
                  >
                    <RadioGroupItem value="clinician" id="role-clinician" data-testid="radio-clinician" />
                    <div className="flex items-center gap-2">
                      <Stethoscope className="w-4 h-4 text-primary" />
                      <span className="text-sm font-medium">Clinician</span>
                    </div>
                  </Label>
                  <Label
                    htmlFor="role-patient"
                    className={`flex items-center gap-3 rounded-md border-2 p-3 cursor-pointer transition-colors ${
                      selectedRole === "patient"
                        ? "border-primary bg-primary/5"
                        : "border-border"
                    }`}
                  >
                    <RadioGroupItem value="patient" id="role-patient" data-testid="radio-patient" />
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-primary" />
                      <span className="text-sm font-medium">Patient</span>
                    </div>
                  </Label>
                </RadioGroup>
              </div>

              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <Input
                  id="name"
                  placeholder="Your full name"
                  data-testid="input-name"
                  {...form.register("name")}
                />
                {form.formState.errors.name && (
                  <p className="text-sm text-destructive">{form.formState.errors.name.message}</p>
                )}
              </div>

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
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="At least 6 characters"
                  data-testid="input-password"
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
                  data-testid="input-confirm-password"
                  {...form.register("confirmPassword")}
                />
                {form.formState.errors.confirmPassword && (
                  <p className="text-sm text-destructive">{form.formState.errors.confirmPassword.message}</p>
                )}
              </div>

              {selectedRole === "patient" && (
                <div className="space-y-2">
                  <Label htmlFor="clinicianEmail">Clinician's Email</Label>
                  <Input
                    id="clinicianEmail"
                    type="email"
                    placeholder="Your clinician's email address"
                    data-testid="input-clinician-email"
                    {...form.register("clinicianEmail")}
                  />
                  <p className="text-xs text-muted-foreground">
                    Enter the email of the clinician managing your care
                  </p>
                  {form.formState.errors.clinicianEmail && (
                    <p className="text-sm text-destructive">{form.formState.errors.clinicianEmail.message}</p>
                  )}
                </div>
              )}

              <Button type="submit" className="w-full" disabled={isSubmitting} data-testid="button-register">
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
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
