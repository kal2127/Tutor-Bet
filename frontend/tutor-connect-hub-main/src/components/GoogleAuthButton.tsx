import React, { useEffect, useRef, useState } from "react";

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (options: {
            client_id: string;
            callback: (response: { credential?: string }) => void;
          }) => void;
          renderButton: (
            element: HTMLElement,
            options: Record<string, string | boolean | number>,
          ) => void;
        };
      };
    };
  }
}

interface GoogleAuthButtonProps {
  label?: string;
  onCredential: (credential: string) => void;
}

const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

const GoogleAuthButton: React.FC<GoogleAuthButtonProps> = ({
  label = "Continue with Google",
  onCredential,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scriptReady, setScriptReady] = useState(Boolean(window.google));

  useEffect(() => {
    if (!clientId) return;
    if (window.google) {
      setScriptReady(true);
      return;
    }

    const existing = document.querySelector<HTMLScriptElement>(
      'script[src="https://accounts.google.com/gsi/client"]',
    );

    if (existing) {
      existing.addEventListener("load", () => setScriptReady(true), {
        once: true,
      });
      return;
    }

    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = () => setScriptReady(true);
    document.head.appendChild(script);
  }, []);

  useEffect(() => {
    if (!clientId || !scriptReady || !containerRef.current || !window.google) {
      return;
    }

    containerRef.current.innerHTML = "";
    window.google.accounts.id.initialize({
      client_id: clientId,
      callback: (response) => {
        if (response.credential) onCredential(response.credential);
      },
    });
    window.google.accounts.id.renderButton(containerRef.current, {
      theme: "outline",
      size: "large",
      text: "continue_with",
      shape: "rectangular",
      width: 360,
    });
  }, [onCredential, scriptReady]);

  if (!clientId) {
    return (
      <div className="rounded-xl border border-border bg-muted/40 px-4 py-3 text-center text-sm text-muted-foreground">
        Google sign-in needs VITE_GOOGLE_CLIENT_ID in the frontend .env file.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div ref={containerRef} className="flex justify-center" aria-label={label} />
    </div>
  );
};

export default GoogleAuthButton;
