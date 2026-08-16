import React, { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import GoogleAuthButton from "@/components/GoogleAuthButton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api, setAuthSession } from "@/lib/api";
import { useI18n } from "@/lib/i18n-context";

const Signup: React.FC = () => {
  const { t, lang } = useI18n();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isTutorSignup = searchParams.get("role") === "tutor";
  const nextPath = searchParams.get("next");
  const f = lang === "am" ? "font-ethiopic" : "";

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (isTutorSignup) {
        navigate("/become-tutor", {
          state: { fullName, email, phone, password },
        });
        return;
      }

      await api.registerFamily({ full_name: fullName, email, phone, password });
      navigate(`/login${nextPath ? `?next=${encodeURIComponent(nextPath)}` : ""}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Signup failed");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleCredential = async (credential: string) => {
    setError("");
    setLoading(true);

    try {
      const result = await api.googleAuth({
        credential,
        role: isTutorSignup ? "TUTOR" : "FAMILY",
      });

      if ("profile" in result) {
        navigate("/become-tutor", {
          state: {
            fullName: result.profile.full_name,
            email: result.profile.email,
            googleIdToken: result.profile.google_id_token,
          },
        });
        return;
      }

      setAuthSession(result.token, result.user);
      navigate(nextPath || "/family/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Google sign-in failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto flex min-h-[calc(100vh-4rem)] items-center justify-center px-4 py-10">
        <div className="w-full max-w-md rounded-xl border border-border bg-card p-8 shadow-sm">
          <div className="mb-8 text-center">
            <h1 className={`text-2xl font-bold ${f}`}>
              {isTutorSignup ? "Create Tutor Account" : t.auth.signupTitle}
            </h1>
            <p className={`mt-2 text-muted-foreground ${f}`}>
              {isTutorSignup
                ? "Create your account first, then complete the tutor application."
                : t.auth.signupSubtitle}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">
                {error}
              </div>
            )}

            <div>
              <Label className={f}>{t.auth.fullName}</Label>
              <Input
                value={fullName}
                onChange={(event) => setFullName(event.target.value)}
                placeholder={lang === "am" ? "ሙሉ ስም" : "Full name"}
                required
              />
            </div>

            <div>
              <Label className={f}>{t.auth.email}</Label>
              <Input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="email@example.com"
                required
              />
            </div>

            <div>
              <Label className={f}>{t.auth.phone}</Label>
              <Input
                type="tel"
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                placeholder="+251..."
                required
              />
            </div>

            <div>
              <Label className={f}>{t.auth.password}</Label>
              <Input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="••••••••"
                required
              />
            </div>

            <Button
              type="submit"
              disabled={loading}
              className={`w-full bg-gradient-primary text-primary-foreground shadow-gold hover:opacity-90 ${f}`}
            >
              {loading
                ? "Creating account..."
                : isTutorSignup
                  ? "Continue to Tutor Application"
                  : t.auth.signup}
            </Button>
          </form>

          <div className="my-5 flex items-center gap-3">
            <div className="h-px flex-1 bg-border" />
            <span className="text-xs font-medium text-muted-foreground">OR</span>
            <div className="h-px flex-1 bg-border" />
          </div>

          <GoogleAuthButton onCredential={handleGoogleCredential} />

          <p className={`mt-6 text-center text-sm text-muted-foreground ${f}`}>
            {t.auth.hasAccount}{" "}
            <Link
              to={`/login${nextPath ? `?next=${encodeURIComponent(nextPath)}` : ""}`}
              className="font-medium text-primary hover:underline"
            >
              {t.nav.login}
            </Link>
          </p>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Signup;
