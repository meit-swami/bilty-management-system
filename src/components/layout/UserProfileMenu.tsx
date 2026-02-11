import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { swalSuccess, swalError } from "@/lib/swal";
import { User, Clock, Shield, LogOut, KeyRound, QrCode } from "lucide-react";
import { useNavigate } from "react-router-dom";

export function UserProfileMenu() {
  const { user, logout, loginTime } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [elapsed, setElapsed] = useState("00:00:00");

  // Profile form
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // MFA state
  const [mfaEnrolling, setMfaEnrolling] = useState(false);
  const [qrCode, setQrCode] = useState("");
  const [factorId, setFactorId] = useState("");
  const [totpCode, setTotpCode] = useState("");
  const [mfaEnabled, setMfaEnabled] = useState(false);
  const [mfaFactorId, setMfaFactorId] = useState<string | null>(null);
  const [mfaDbEnabled, setMfaDbEnabled] = useState(true); // from profiles.mfa_enabled

  const { data: profile } = useQuery({
    queryKey: ["my-profile-menu", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data } = await supabase.from("profiles").select("*").eq("user_id", user.id).single();
      return data;
    },
    enabled: !!user?.id,
  });

  // Check MFA status
  useEffect(() => {
    const checkMfa = async () => {
      const { data } = await supabase.auth.mfa.listFactors();
      if (data?.totp && data.totp.length > 0) {
        const verified = data.totp.find((f) => f.status === "verified");
        if (verified) {
          setMfaEnabled(true);
          setMfaFactorId(verified.id);
        }
      }
    };
    if (user) checkMfa();
  }, [user]);

  // Sync mfa_enabled from DB
  useEffect(() => {
    if (profile) {
      setMfaDbEnabled((profile as any).mfa_enabled === 1);
    }
  }, [profile]);

  // Login timer
  useEffect(() => {
    if (!loginTime) return;
    const interval = setInterval(() => {
      const diff = Math.floor((Date.now() - loginTime) / 1000);
      const h = String(Math.floor(diff / 3600)).padStart(2, "0");
      const m = String(Math.floor((diff % 3600) / 60)).padStart(2, "0");
      const s = String(diff % 60).padStart(2, "0");
      setElapsed(`${h}:${m}:${s}`);
    }, 1000);
    return () => clearInterval(interval);
  }, [loginTime]);

  // Populate form when profile loads
  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || "");
      setPhone(profile.phone || "");
    }
  }, [profile]);

  const updateProfileMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error("Not authenticated");
      const { error } = await supabase.from("profiles").update({
        full_name: fullName.trim(),
        phone: phone.trim(),
      }).eq("user_id", user.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-profile-menu"] });
      swalSuccess("Profile updated");
    },
    onError: (err: Error) => swalError(err.message),
  });

  const changePasswordMutation = useMutation({
    mutationFn: async () => {
      if (newPassword.length < 6) throw new Error("Password must be at least 6 characters");
      if (newPassword !== confirmPassword) throw new Error("Passwords do not match");
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
    },
    onSuccess: () => {
      swalSuccess("Password changed successfully");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    },
    onError: (err: Error) => swalError(err.message),
  });

  const enrollMfa = async () => {
    const { data, error } = await supabase.auth.mfa.enroll({
      factorType: "totp",
      issuer: "Simple Capital Solutions",
    });
    if (error) {
      swalError(error.message);
      return;
    }
    setFactorId(data.id);
    setQrCode(data.totp.qr_code);
    setMfaEnrolling(true);
  };

  const verifyMfa = async () => {
    if (totpCode.length !== 6) {
      swalError("Enter the 6-digit code from your authenticator app");
      return;
    }
    const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({ factorId });
    if (challengeError) {
      swalError(challengeError.message);
      return;
    }
    const { error: verifyError } = await supabase.auth.mfa.verify({
      factorId,
      challengeId: challenge.id,
      code: totpCode,
    });
    if (verifyError) {
      swalError(verifyError.message);
      return;
    }
    setMfaEnabled(true);
    setMfaFactorId(factorId);
    setMfaEnrolling(false);
    setTotpCode("");
    swalSuccess("Two-Factor Authentication enabled!");
  };

  const unenrollMfa = async () => {
    if (!mfaFactorId) return;
    const { error } = await supabase.auth.mfa.unenroll({ factorId: mfaFactorId });
    if (error) {
      swalError(error.message);
      return;
    }
    setMfaEnabled(false);
    setMfaFactorId(null);
    swalSuccess("Two-Factor Authentication disabled");
  };

  const handleLogout = async () => {
    setPopoverOpen(false);
    await logout();
    navigate("/login", { replace: true });
  };

  const displayName = profile?.full_name || user?.email?.split("@")[0] || "User";

  return (
    <>
      <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="sm" className="gap-2 text-sm font-medium max-w-[220px]">
            <User className="h-4 w-4 shrink-0" />
            <span className="truncate hidden sm:inline">{displayName}</span>
            <span className="text-[10px] text-muted-foreground font-mono hidden md:inline">
              <Clock className="h-3 w-3 inline mr-0.5" />
              {elapsed}
            </span>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-56 p-2" align="end">
          <div className="px-2 py-1.5 border-b mb-1">
            <p className="text-sm font-medium truncate">{displayName}</p>
            <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start gap-2 text-sm"
            onClick={() => { setPopoverOpen(false); setDialogOpen(true); }}
          >
            <KeyRound className="h-4 w-4" /> My Profile
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start gap-2 text-sm text-destructive hover:text-destructive"
            onClick={handleLogout}
          >
            <LogOut className="h-4 w-4" /> Sign Out
          </Button>
        </PopoverContent>
      </Popover>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>My Profile</DialogTitle>
          </DialogHeader>
          <Tabs defaultValue="profile" className="mt-2">
            <TabsList className="w-full">
              <TabsTrigger value="profile" className="flex-1">Profile</TabsTrigger>
              <TabsTrigger value="password" className="flex-1">Password</TabsTrigger>
              <TabsTrigger value="2fa" className="flex-1">2FA</TabsTrigger>
            </TabsList>

            <TabsContent value="profile" className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label>Full Name</Label>
                <Input value={fullName} onChange={(e) => setFullName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Phone</Label>
                <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input value={user?.email || ""} disabled className="opacity-60" />
              </div>
              <Button onClick={() => updateProfileMutation.mutate()} disabled={updateProfileMutation.isPending} className="w-full">
                {updateProfileMutation.isPending ? "Saving..." : "Save Profile"}
              </Button>
            </TabsContent>

            <TabsContent value="password" className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label>New Password</Label>
                <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Min 6 characters" />
              </div>
              <div className="space-y-2">
                <Label>Confirm Password</Label>
                <Input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Re-enter password" />
              </div>
              <Button onClick={() => changePasswordMutation.mutate()} disabled={changePasswordMutation.isPending} className="w-full">
                {changePasswordMutation.isPending ? "Changing..." : "Change Password"}
              </Button>
            </TabsContent>

            <TabsContent value="2fa" className="space-y-4 pt-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Shield className="h-5 w-5 text-primary" />
                  <div>
                    <p className="text-sm font-medium">Two-Factor Authentication</p>
                    <p className="text-xs text-muted-foreground">Microsoft Authenticator / Google Authenticator</p>
                  </div>
                </div>
                <Badge variant={mfaEnabled && mfaDbEnabled ? "default" : "secondary"}>
                  {mfaEnabled && mfaDbEnabled ? "Enabled" : "Disabled"}
                </Badge>
              </div>

              {/* Master toggle - allows user to disable 2FA enforcement without unenrolling */}
              {mfaEnabled && (
                <div className="flex items-center justify-between rounded-md border p-3">
                  <div>
                    <p className="text-sm font-medium">2FA Enforcement</p>
                    <p className="text-xs text-muted-foreground">
                      Toggle OFF to bypass 2FA on login (fallback if app is lost)
                    </p>
                  </div>
                  <Switch
                    checked={mfaDbEnabled}
                    onCheckedChange={async (checked) => {
                      if (!user?.id) return;
                      const { error } = await supabase.from("profiles").update({
                        mfa_enabled: checked ? 1 : 0,
                      } as any).eq("user_id", user.id);
                      if (error) { swalError(error.message); return; }
                      setMfaDbEnabled(checked);
                      queryClient.invalidateQueries({ queryKey: ["my-profile-menu"] });
                      swalSuccess(checked ? "2FA enforcement enabled" : "2FA enforcement disabled — you can login without code");
                    }}
                  />
                </div>
              )}

              {!mfaEnabled && !mfaEnrolling && (
                <Button onClick={enrollMfa} className="w-full gap-2">
                  <QrCode className="h-4 w-4" /> Set Up 2FA
                </Button>
              )}

              {mfaEnrolling && (
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Scan this QR code with Microsoft Authenticator or any TOTP app:
                  </p>
                  <div className="flex justify-center">
                    <img src={qrCode} alt="QR Code" className="w-48 h-48 border rounded-lg" />
                  </div>
                  <div className="space-y-2">
                    <Label>Enter 6-digit code from your app</Label>
                    <Input
                      value={totpCode}
                      onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                      placeholder="000000"
                      maxLength={6}
                      className="text-center text-lg tracking-widest font-mono"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => { setMfaEnrolling(false); setTotpCode(""); }} className="flex-1">
                      Cancel
                    </Button>
                    <Button onClick={verifyMfa} className="flex-1" disabled={totpCode.length !== 6}>
                      Verify & Enable
                    </Button>
                  </div>
                </div>
              )}

              {mfaEnabled && (
                <Button variant="destructive" onClick={unenrollMfa} className="w-full">
                  Remove 2FA Enrollment
                </Button>
              )}
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>
    </>
  );
}
