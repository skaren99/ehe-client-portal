import { useEffect, useState, type ReactNode } from "react";
import { auth, finishAuth } from "./api";
export default function AuthGate({
  children,
  title,
}: {
  children: ReactNode;
  title: string;
}) {
  const [ready, setReady] = useState(false),
    [signed, setSigned] = useState(false),
    [error, setError] = useState("");
  useEffect(() => {
    let live = true;
    (async () => {
      await finishAuth();
      const user = await auth.getUser();
      if (live) setSigned(!!user && !user.expired);
    })()
      .catch((e) => setError(e.message))
      .finally(() => {
        if (live) setReady(true);
      });
    return () => {
      live = false;
    };
  }, []);
  if (!ready)
    return (
      <main className="login">
        <p>Laadin…</p>
      </main>
    );
  if (!signed)
    return (
      <main className="login">
        <a className="brand" href="/">
          ehe <small>EVENTS</small>
        </a>
        <div className="login-card">
          <p className="eyebrow">TEIE PÄEV. TEIE MOODI.</p>
          <h1>{title}</h1>
          <p>Logi sisse, et jätkata oma tööruumis.</p>
          {error && <p role="alert">{error}</p>}
          <button
            className="btn primary"
            onClick={() =>
              auth.signinRedirect().catch((e) => setError(e.message))
            }
          >
            Logi sisse
          </button>
        </div>
      </main>
    );
  return <>{children}</>;
}
