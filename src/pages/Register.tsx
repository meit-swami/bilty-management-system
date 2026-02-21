import { useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Truck, UserPlus, CheckCircle2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";

export default function Register() {
  const [form, setForm] = useState({
    full_name: "", email: "", phone: "", company_name: "", requested_role: "viewer",
  });
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.full_name.trim() || !form.email.trim()) {
      toast({ title: "Name and email are required", variant: "destructive" });
      return;
    }
    setLoading(true);

    // Insert registration request (public RLS allows insert)
    const { error } = await supabase.from("registration_requests").insert({
      full_name: form.full_name.trim(),
      email: form.email.trim().toLowerCase(),
      phone: form.phone.trim() || null,
      company_name: form.company_name.trim() || null,
      requested_role: form.requested_role,
    });

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      setLoading(false);
      return;
    }

    // Send email verification (via Supabase magic link / OTP)
    const { error: otpError } = await supabase.auth.signInWithOtp({
      email: form.email.trim().toLowerCase(),
      options: {
        shouldCreateUser: false,
        data: { registration_request: true },
      },
    });

    // Even if OTP fails (user doesn't exist yet), we still accept the registration
    setLoading(false);
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/40 px-4">
        <Card className="w-full max-w-sm shadow-lg">
          <CardContent className="p-8 text-center space-y-4">
            <div className="flex justify-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-emerald-100">
                <CheckCircle2 className="h-7 w-7 text-emerald-600" />
              </div>
            </div>
            <h2 className="text-lg font-semibold">Registration Submitted!</h2>
            <p className="text-sm text-muted-foreground">
              Your request has been sent to the administrator for approval.
              You will receive an email once your account is approved.
            </p>
            <Link to="/login">
              <Button variant="outline" className="mt-2">Back to Login</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/40 px-4">
      <Card className="w-full max-w-sm shadow-lg">
        <CardHeader className="text-center space-y-3 pb-2">
          <div className="flex justify-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-primary shadow-md">
              <Truck className="h-7 w-7 text-primary-foreground" />
            </div>
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">Create Account</h1>
            <p className="text-xs text-muted-foreground mt-1">Request access to the Transport Management System</p>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="space-y-1.5">
              <Label>Full Name *</Label>
              <Input value={form.full_name} onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))} placeholder="John Doe" required />
            </div>
            <div className="space-y-1.5">
              <Label>Email *</Label>
              <Input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="you@company.com" required />
            </div>
            <div className="space-y-1.5">
              <Label>Phone</Label>
              <Input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="+91 9876543210" />
            </div>
            <div className="space-y-1.5">
              <Label>Company Name</Label>
              <Input value={form.company_name} onChange={e => setForm(f => ({ ...f, company_name: e.target.value }))} placeholder="Your Company" />
            </div>
            <div className="space-y-1.5">
              <Label>Requested Role</Label>
              <Select value={form.requested_role} onValueChange={v => setForm(f => ({ ...f, requested_role: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="manager">Manager</SelectItem>
                  <SelectItem value="accountant">Accountant</SelectItem>
                  <SelectItem value="viewer">Viewer</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button type="submit" className="w-full gap-2" disabled={loading}>
              <UserPlus className="h-4 w-4" />
              {loading ? "Submitting…" : "Submit Registration"}
            </Button>
          </form>
          <p className="text-xs text-muted-foreground text-center mt-4">
            Already have an account?{" "}
            <Link to="/login" className="text-primary hover:underline">Sign in</Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
