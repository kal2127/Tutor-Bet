import React, { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Globe, LogOut, Menu, X } from "lucide-react";
import { useI18n } from "@/lib/i18n-context";
import { clearAuthSession, getCurrentUser } from "@/lib/api";
import { Button } from "@/components/ui/button";
import logo from "@/images/Tutorbet_logo_transparent.png";

const Navbar: React.FC = () => {
  const { t, lang, setLang } = useI18n();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [hidden, setHidden] = useState(false);
  const lastScrollY = useRef(0);
  const user = getCurrentUser();

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      const scrollingDown = currentScrollY > lastScrollY.current + 10;
      const scrollingUp = currentScrollY < lastScrollY.current - 8;

      if (scrollingDown && currentScrollY > 120 && !mobileOpen) {
        setHidden(true);
      }

      if (scrollingUp || currentScrollY < 20) {
        setHidden(false);
      }

      lastScrollY.current = currentScrollY;
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [mobileOpen]);

  const isActive = (path: string) => {
    if (path.includes("?")) {
      return `${location.pathname}${location.search}` === path;
    }

    return location.pathname === path;
  };

  const navLinks = [
    { path: "/", label: t.nav.home },
    { path: "/tutors", label: t.nav.findTutors },
    ...(user?.role === "TUTOR"
      ? [
          { path: "/jobs", label: "Requests" },
          { path: "/tutor/dashboard", label: "Dashboard" },
        ]
      : []),
    ...(user?.role === "FAMILY"
      ? [{ path: "/family/dashboard", label: "Dashboard" }]
      : []),
    ...(user?.role === "ADMIN" ? [{ path: "/admin", label: "Admin" }] : []),
    { path: "/become-tutor?fresh=1", label: t.nav.becomeTutor },
    { path: "/feedback", label: "Feedback" },
  ];

  const logout = () => {
    clearAuthSession();
    window.location.href = "/";
  };

  return (
    <nav className={`fixed left-0 right-0 top-0 z-50 border-b border-border bg-card/90 backdrop-blur-xl transition-transform duration-300 ${hidden ? "-translate-y-full" : "translate-y-0"}`}>
      <div className="container mx-auto flex h-20 items-center justify-between">
        <Link to="/" className="flex items-center gap-3">
          <img src={logo} alt="Tutor ቤት" className="h-20 w-auto max-w-[320px] object-contain" />
          <span className="sr-only">
            Tutor ቤት
          </span>
        </Link>

        <div className="hidden items-center gap-2 lg:flex">
          {navLinks.map((link) => (
            <Link
              key={link.path}
              to={link.path}
              className={`rounded-xl px-5 py-3 text-lg font-semibold transition-all duration-200 ${
                isActive(link.path)
                  ? "bg-primary/10 text-primary shadow-sm"
                  : "text-muted-foreground hover:-translate-y-0.5 hover:bg-muted hover:text-foreground"
              }`}
            >
              {link.label}
            </Link>
          ))}
        </div>

        <div className="hidden items-center gap-3 lg:flex">
          <button
            onClick={() => setLang(lang === "en" ? "am" : "en")}
            className="flex items-center gap-2 rounded-xl border border-border px-4 py-2.5 text-lg font-semibold text-muted-foreground transition hover:bg-muted hover:text-foreground"
          >
            <Globe className="h-5 w-5" />
            {lang === "en" ? "AM" : "EN"}
          </button>
          {user ? (
            <Button variant="ghost" size="lg" onClick={logout} className="gap-2">
              <LogOut className="h-5 w-5" />
              Logout
            </Button>
          ) : (
            <>
              <Link to="/login">
                <Button variant="ghost" size="lg">
                  {t.nav.login}
                </Button>
              </Link>
              <Link to="/signup">
                <Button
                  size="lg"
                  className="bg-gradient-primary text-primary-foreground shadow-gold hover:opacity-90"
                >
                  {t.nav.signup}
                </Button>
              </Link>
            </>
          )}
        </div>

        <button className="lg:hidden" onClick={() => setMobileOpen(!mobileOpen)}>
          {mobileOpen ? <X className="h-7 w-7" /> : <Menu className="h-7 w-7" />}
        </button>
      </div>

      {mobileOpen && (
        <div className="border-t border-border bg-card p-4 lg:hidden">
          <div className="flex flex-col gap-2">
            {navLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                onClick={() => setMobileOpen(false)}
                className={`rounded-xl px-4 py-3 text-lg font-semibold ${
                  isActive(link.path)
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground"
                }`}
              >
                {link.label}
              </Link>
            ))}
            <hr className="my-2 border-border" />
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => setLang(lang === "en" ? "am" : "en")}
                className="flex items-center gap-2 rounded-xl border border-border px-4 py-2 text-lg"
              >
                <Globe className="h-5 w-5" />
                {lang === "en" ? "AM" : "EN"}
              </button>
              {user ? (
                <Button variant="ghost" size="lg" onClick={logout}>
                  Logout
                </Button>
              ) : (
                <>
                  <Link to="/login" onClick={() => setMobileOpen(false)}>
                    <Button variant="ghost" size="lg">
                      {t.nav.login}
                    </Button>
                  </Link>
                  <Link to="/signup" onClick={() => setMobileOpen(false)}>
                    <Button size="lg" className="bg-gradient-primary text-primary-foreground">
                      {t.nav.signup}
                    </Button>
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
