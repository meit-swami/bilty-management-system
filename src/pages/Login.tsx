import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Truck, LogIn } from "lucide-react";

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (login(username, password)) {
      navigate("/", { replace: true });
    } else {
      setError("Invalid username or password");
    }
  };

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
            <a
              href="http://simplecapital.co.in/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xl font-bold text-foreground hover:text-primary transition-colors"
            >
              Simple Capital Solutions
            </a>
            <p className="text-xs text-muted-foreground mt-1">Transport Management System</p>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter username"
                autoComplete="username"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                autoComplete="current-password"
                required
              />
            </div>
            {error && <p className="text-sm text-destructive font-medium">{error}</p>}
            <Button type="submit" className="w-full gap-2">
              <LogIn className="h-4 w-4" />
              Sign In
            </Button>
          </form>
          <p className="text-[10px] text-muted-foreground text-center mt-6">
            © Simple Capital Solutions •{" "}
            <a href="http://simplecapital.co.in/" target="_blank" rel="noopener noreferrer" className="hover:underline">
              simplecapital.co.in
            </a>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
