import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { FileText, Lock, Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

const Login = () => {
  const [token, setToken] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      navigate("/admin", { replace: true });
    }
  }, [isAuthenticated, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!token.trim()) {
      toast.error("Please enter an admin token");
      return;
    }

    setIsLoading(true);

    try {
      // Test the token by making a simple API call
      const response = await fetch(
        `${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/forms`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token.trim()}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (response.ok) {
        // Token is valid
        login(token.trim());
        toast.success("Login successful!");
        navigate("/admin");
      } else {
        const errorData = await response.json().catch(() => ({}));
        toast.error(
          errorData.message || "Invalid token. Please check your credentials."
        );
      }
    } catch (error) {
      console.error("Login error:", error);
      toast.error(
        "Failed to connect to server. Please check if the backend is running."
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-subtle flex items-center justify-center p-4">
      <Card className="w-full max-w-md p-8 space-y-6">
        <div className="text-center space-y-4">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-primary">
            <FileText className="w-8 h-8 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Admin Login</h1>
            <p className="text-sm text-muted-foreground mt-2">
              Enter your admin token to access the dashboard
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="token" className="flex items-center gap-2">
              <Lock className="w-4 h-4" />
              Admin Token
            </Label>
            <Input
              id="token"
              type="password"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="Enter your admin token"
              disabled={isLoading}
              className="font-mono"
              autoFocus
            />
            <p className="text-xs text-muted-foreground">
              This token should match the ADMIN_TOKEN configured in your backend
            </p>
          </div>

          <Button
            type="submit"
            className="w-full bg-gradient-primary"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Verifying...
              </>
            ) : (
              "Sign In"
            )}
          </Button>
        </form>

        <div className="pt-4 border-t border-border">
          <p className="text-xs text-muted-foreground text-center">
            Need help? Check your backend .env file for the ADMIN_TOKEN value.
          </p>
        </div>
      </Card>
    </div>
  );
};

export default Login;

