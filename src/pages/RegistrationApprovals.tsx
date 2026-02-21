import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useIsSuperAdmin } from "@/hooks/use-rbac";
import { Navigate } from "react-router-dom";
import { formatDate } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/hooks/use-toast";
import { CheckCircle2, XCircle, Clock, Eye, Users2, Shield } from "lucide-react";

type Registration = {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  company_name: string | null;
  requested_role: string;
  email_verified: boolean;
  status: string;
  review_notes: string | null;
  auth_user_id: string | null;
  client_subscription_id: string | null;
  created_at: string;
};

const statusBadge: Record<string, string> = {
  pending: "bg-amber-100 text-amber-800",
  approved: "bg-emerald-100 text-emerald-800",
  rejected: "bg-red-100 text-red-800",
};

export default function RegistrationApprovals() {
  const isSuperAdmin = useIsSuperAdmin();
  const qc = useQueryClient();
  const [reviewSheet, setReviewSheet] = useState<Registration | null>(null);
  const [reviewForm, setReviewForm] = useState({
    full_name: "", email: "", phone: "", company_name: "",
    role: "viewer", password: "", review_notes: "", client_subscription_id: "",
  });

  const { data: requests = [] } = useQuery({
    queryKey: ["registration-requests"],
    queryFn: async () => {
      const { data } = await supabase
        .from("registration_requests")
        .select("*")
        .order("created_at", { ascending: false });
      return (data || []) as Registration[];
    },
  });

  const { data: clients = [] } = useQuery({
    queryKey: ["client-subscriptions-list"],
    queryFn: async () => {
      const { data } = await supabase.from("client_subscriptions").select("id, client_name").order("client_name");
      return data || [];
    },
  });

  const approveMutation = useMutation({
    mutationFn: async ({ request, form }: { request: Registration; form: typeof reviewForm }) => {
      if (!form.password || form.password.length < 6) throw new Error("Password must be at least 6 characters");

      // Create user via edge function
      const { data, error } = await supabase.functions.invoke("create-user", {
        body: {
          email: form.email,
          password: form.password,
          full_name: form.full_name,
          phone: form.phone || null,
          roles: [form.role],
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      const userId = data.user_id;

      // Update profile with client link if selected
      if (form.client_subscription_id) {
        await supabase.from("profiles").update({ client_subscription_id: form.client_subscription_id }).eq("user_id", userId);
      }

      // Update registration request
      await supabase.from("registration_requests").update({
        status: "approved",
        review_notes: form.review_notes || null,
        auth_user_id: userId,
        client_subscription_id: form.client_subscription_id || null,
        reviewed_at: new Date().toISOString(),
      }).eq("id", request.id);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["registration-requests"] });
      setReviewSheet(null);
      toast({ title: "User approved and created!" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const rejectMutation = useMutation({
    mutationFn: async ({ id, notes }: { id: string; notes: string }) => {
      await supabase.from("registration_requests").update({
        status: "rejected",
        review_notes: notes || "Rejected by admin",
        reviewed_at: new Date().toISOString(),
      }).eq("id", id);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["registration-requests"] });
      setReviewSheet(null);
      toast({ title: "Registration rejected" });
    },
  });

  if (!isSuperAdmin) return <Navigate to="/" replace />;

  const openReview = (r: Registration) => {
    setReviewSheet(r);
    setReviewForm({
      full_name: r.full_name,
      email: r.email,
      phone: r.phone || "",
      company_name: r.company_name || "",
      role: r.requested_role,
      password: "",
      review_notes: "",
      client_subscription_id: r.client_subscription_id || "",
    });
  };

  const pending = requests.filter(r => r.status === "pending");
  const processed = requests.filter(r => r.status !== "pending");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Registration Approvals</h1>
        <p className="text-sm text-muted-foreground">Review and approve new user registrations</p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Pending", count: pending.length, icon: Clock, color: "text-amber-600" },
          { label: "Approved", count: requests.filter(r => r.status === "approved").length, icon: CheckCircle2, color: "text-emerald-600" },
          { label: "Rejected", count: requests.filter(r => r.status === "rejected").length, icon: XCircle, color: "text-red-600" },
        ].map(s => (
          <Card key={s.label}>
            <CardContent className="p-4 flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground">{s.label}</p>
                <p className="text-2xl font-bold mt-1">{s.count}</p>
              </div>
              <s.icon className={`h-5 w-5 ${s.color} mt-1`} />
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="pending">
        <TabsList>
          <TabsTrigger value="pending">Pending ({pending.length})</TabsTrigger>
          <TabsTrigger value="processed">Processed ({processed.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="pending">
          <Card>
            <CardContent className="pt-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Company</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pending.length === 0 ? (
                    <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">No pending requests</TableCell></TableRow>
                  ) : pending.map(r => (
                    <TableRow key={r.id}>
                      <TableCell className="font-medium">{r.full_name}</TableCell>
                      <TableCell>{r.email}</TableCell>
                      <TableCell>{r.company_name || "—"}</TableCell>
                      <TableCell><Badge variant="outline" className="capitalize">{r.requested_role}</Badge></TableCell>
                      <TableCell>{formatDate(r.created_at)}</TableCell>
                      <TableCell className="text-right">
                        <Button size="sm" onClick={() => openReview(r)} className="gap-1">
                          <Eye className="h-3.5 w-3.5" />Review
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="processed">
          <Card>
            <CardContent className="pt-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Notes</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {processed.length === 0 ? (
                    <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">No processed requests</TableCell></TableRow>
                  ) : processed.map(r => (
                    <TableRow key={r.id}>
                      <TableCell className="font-medium">{r.full_name}</TableCell>
                      <TableCell>{r.email}</TableCell>
                      <TableCell className="capitalize">{r.requested_role}</TableCell>
                      <TableCell><Badge className={statusBadge[r.status]}>{r.status}</Badge></TableCell>
                      <TableCell className="max-w-[200px] truncate">{r.review_notes || "—"}</TableCell>
                      <TableCell>{formatDate(r.created_at)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Review Sheet */}
      <Sheet open={!!reviewSheet} onOpenChange={() => setReviewSheet(null)}>
        <SheetContent className="sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2"><Shield className="h-5 w-5" />Review Registration</SheetTitle>
          </SheetHeader>
          {reviewSheet && (
            <div className="space-y-4 mt-4">
              <p className="text-xs text-muted-foreground">
                You can edit any details before approving. Set a password for the new user.
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Full Name</Label><Input value={reviewForm.full_name} onChange={e => setReviewForm(f => ({ ...f, full_name: e.target.value }))} /></div>
                <div><Label>Email</Label><Input value={reviewForm.email} onChange={e => setReviewForm(f => ({ ...f, email: e.target.value }))} /></div>
                <div><Label>Phone</Label><Input value={reviewForm.phone} onChange={e => setReviewForm(f => ({ ...f, phone: e.target.value }))} /></div>
                <div><Label>Company</Label><Input value={reviewForm.company_name} onChange={e => setReviewForm(f => ({ ...f, company_name: e.target.value }))} /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Assign Role</Label>
                  <Select value={reviewForm.role} onValueChange={v => setReviewForm(f => ({ ...f, role: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">Admin</SelectItem>
                      <SelectItem value="manager">Manager</SelectItem>
                      <SelectItem value="accountant">Accountant</SelectItem>
                      <SelectItem value="viewer">Viewer</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Link to Client</Label>
                  <Select value={reviewForm.client_subscription_id} onValueChange={v => setReviewForm(f => ({ ...f, client_subscription_id: v }))}>
                    <SelectTrigger><SelectValue placeholder="No client" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">No client</SelectItem>
                      {clients.map((c: any) => (
                        <SelectItem key={c.id} value={c.id}>{c.client_name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label>Set Password *</Label>
                <Input type="password" value={reviewForm.password} onChange={e => setReviewForm(f => ({ ...f, password: e.target.value }))} placeholder="Min 6 characters" />
              </div>
              <div>
                <Label>Admin Notes</Label>
                <Input value={reviewForm.review_notes} onChange={e => setReviewForm(f => ({ ...f, review_notes: e.target.value }))} placeholder="Optional notes" />
              </div>
              <div className="flex gap-2 pt-2">
                <Button
                  className="flex-1 gap-1"
                  onClick={() => approveMutation.mutate({ request: reviewSheet, form: reviewForm })}
                  disabled={approveMutation.isPending}
                >
                  <CheckCircle2 className="h-4 w-4" />
                  {approveMutation.isPending ? "Approving…" : "Approve & Create User"}
                </Button>
                <Button
                  variant="destructive"
                  className="gap-1"
                  onClick={() => rejectMutation.mutate({ id: reviewSheet.id, notes: reviewForm.review_notes })}
                  disabled={rejectMutation.isPending}
                >
                  <XCircle className="h-4 w-4" />Reject
                </Button>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
