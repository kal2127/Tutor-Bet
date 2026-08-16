import React, { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useI18n } from "@/lib/i18n-context";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api, setAuthSession } from "@/lib/api";
import GoogleAuthButton from "@/components/GoogleAuthButton";

const Login: React.FC = () => {
  const { t, lang } = useI18n();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const nextPath = searchParams.get("next");
  const f = lang === "am" ? "font-ethiopic" : "";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const result = await api.login({ email, password });
      setAuthSession(result.token, result.user);
      if (result.user.role === "ADMIN") navigate("/admin");
      else if (result.user.role === "TUTOR") navigate("/tutor/dashboard");
      else navigate(nextPath || "/family/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleCredential = async (credential: string) => {
    setError("");
    setLoading(true);
    try {
      const result = await api.googleAuth({ credential, role: "FAMILY" });
      if ("profile" in result) {
        setError("Tutor Google signup must start from Become a Tutor.");
        return;
      }
      setAuthSession(result.token, result.user);
      if (result.user.role === "ADMIN") navigate("/admin");
      else if (result.user.role === "TUTOR") navigate("/tutor/dashboard");
      else navigate(nextPath || "/family/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Google login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto flex min-h-[calc(100vh-4rem)] items-center justify-center px-4">
        <div className="w-full max-w-md rounded-xl border border-border bg-card p-8">
          <div className="text-center mb-8">
            <h1 className={`text-2xl font-bold ${f}`}>{t.auth.loginTitle}</h1>
            <p className={`text-muted-foreground mt-2 ${f}`}>
              {t.auth.loginSubtitle}
            </p>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">
                {error}
              </div>
            )}
            <div>
              <Label className={f}>{t.auth.email}</Label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="email@example.com"
                required
              />
            </div>
            <div>
              <Label className={f}>{t.auth.password}</Label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
              />
            </div>
            <Button
              type="submit"
              disabled={loading}
              className={`w-full bg-gradient-primary text-primary-foreground shadow-gold hover:opacity-90 ${f}`}
            >
              {loading ? "Loading..." : t.auth.login}
            </Button>
          </form>
          <div className="my-5 flex items-center gap-3">
            <div className="h-px flex-1 bg-border" />
            <span className="text-xs font-medium text-muted-foreground">OR</span>
            <div className="h-px flex-1 bg-border" />
          </div>
          <GoogleAuthButton onCredential={handleGoogleCredential} />
          <p className={`mt-6 text-center text-sm text-muted-foreground ${f}`}>
            {t.auth.noAccount}{" "}
            <Link
              to={`/signup${nextPath ? `?next=${encodeURIComponent(nextPath)}` : ""}`}
              className="font-medium text-primary hover:underline"
            >
              {t.nav.signup}
            </Link>
          </p>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default Login;
