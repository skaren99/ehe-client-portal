import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import AuthGate from "./AuthGate";
import { api, auth } from "./api";
import { summary, mayComplete } from "./domain.mjs";
const PLANNER = false;
type Entry = { author: string; at: string; text: string; type: string };
type Task = {
  id: string;
  title: string;
  date: string;
  group: string;
  assignee: string;
  status: string;
  description: string;
  history: Entry[];
};
type Contact = {
  id: string;
  name: string;
  role: string;
  email: string;
  phone?: string;
  note?: string;
};
type Wedding = {
  id: string;
  names: string;
  date: string;
  venue: string;
  guests: number;
  revision: number;
  privateNote?: string;
  tasks: Task[];
  contacts: Contact[];
};
const date = (d: string) =>
  new Date(d + "T12:00:00").toLocaleDateString("et-EE", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
function Drawer({
  title,
  close,
  children,
}: {
  title: string;
  close: () => void;
  children: ReactNode;
}) {
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement;
    ref.current?.focus();
    const handle = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      if (e.key === "Tab") {
        const els = ref.current?.querySelectorAll<HTMLElement>(
          "button,input,textarea,select,a[href]",
        );
        if (!els?.length) return;
        const first = els[0],
          last = els[els.length - 1];
        if (
          e.shiftKey &&
          (document.activeElement === first ||
            document.activeElement === ref.current)
        ) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", handle);
    return () => {
      document.removeEventListener("keydown", handle);
      previous?.focus();
    };
  }, [close]);
  return (
    <div className="overlay">
      <section
        ref={ref}
        className="drawer"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
      >
        <div className="modal-head">
          <h2>{title}</h2>
          <button className="btn" onClick={close} aria-label="Sulge">
            ×
          </button>
        </div>
        {children}
      </section>
    </div>
  );
}
function Workspace() {
  const [weddings, setWeddings] = useState<Wedding[]>([]),
    [id, setId] = useState(
      new URLSearchParams(location.search).get("wedding") || "",
    ),
    [view, setView] = useState("overview"),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(true),
    [busy, setBusy] = useState(false),
    [modal, setModal] = useState(""),
    [filter, setFilter] = useState("all");
  const wedding = weddings.find((w) => w.id === id),
    task = wedding?.tasks.find((t) => t.id === modal),
    stats = summary(wedding?.tasks || []);
  async function refresh() {
    setLoading(true);
    setError("");
    try {
      const data = await api<Wedding[]>("/api/weddings");
      setWeddings(data);
      if (!PLANNER && !id) setId(data[0]?.id || "");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    void refresh();
  }, []);
  async function run(action: () => Promise<void>) {
    setBusy(true);
    setError("");
    try {
      await action();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  function update(w: Wedding) {
    setWeddings((all) => all.map((x) => (x.id === w.id ? w : x)));
  }
  const close = useCallback(() => setModal(""), []);
  function submit(
    e: FormEvent<HTMLFormElement>,
    action: (v: Record<string, string>) => Promise<void>,
  ) {
    e.preventDefault();
    const v = Object.fromEntries(new FormData(e.currentTarget)) as Record<
      string,
      string
    >;
    void run(() => action(v));
  }
  function choose(w: Wedding) {
    setId(w.id);
    setView("overview");
    setFilter("all");
    history.replaceState({}, "", "/?wedding=" + encodeURIComponent(w.id));
  }
  const toggle = (t: Task) =>
    run(async () => {
      update(
        await api<Wedding>(`/api/weddings/${id}/tasks/${t.id}`, "PATCH", {
          revision: wedding!.revision,
          status: t.status === "Valmis" ? "Ootel" : "Valmis",
        }),
      );
    });
  const taskList = (tasks: Task[]) =>
    tasks.length ? (
      tasks.map((t) => (
        <div className="task-row" key={t.id}>
          <button
            className={"check " + (t.status === "Valmis" ? "done" : "")}
            disabled={busy || !mayComplete(t, PLANNER)}
            aria-label={
              (t.status === "Valmis" ? "Märgi tegemata: " : "Märgi valmis: ") +
              t.title
            }
            onClick={() => void toggle(t)}
          >
            {t.status === "Valmis" ? "✓" : ""}
          </button>
          <button className="task-title" onClick={() => setModal(t.id)}>
            <strong>{t.title}</strong>
            <small>
              {t.assignee} · {date(t.date)} ·{" "}
              {t.history.filter((h) => h.type === "comment").length} kommentaari
            </small>
          </button>
          <span className="pill">{t.status}</span>
        </div>
      ))
    ) : (
      <p className="empty">Tegevusi ei ole.</p>
    );
  return (
    <div className="shell">
      <aside className={"sidebar " + (PLANNER ? "dark" : "")}>
        <a className="brand" href="/">
          ehe <small>EVENTS</small>
        </a>
        <p className="eyebrow">
          {PLANNER ? "KORRALDAJA STUUDIO" : "MEIE PÄEV"}
        </p>
        <nav className="nav" aria-label="Portaali menüü">
          {PLANNER && (
            <button
              onClick={() => {
                setId("");
                setView("overview");
                history.replaceState({}, "", "/");
              }}
            >
              Kõik pulmaprojektid
            </button>
          )}
          {wedding &&
            [
              ["overview", "Ülevaade"],
              ["tasks", "Tegevused"],
              ["contacts", "Kontaktid"],
              ["history", "Ajajoon"],
            ].map(([key, label]) => (
              <button
                key={key}
                className={view === key ? "active" : ""}
                onClick={() => setView(key)}
              >
                {label}
              </button>
            ))}
        </nav>
        <div className="sidebar-bottom">
          <strong>Üks samm korraga, koos.</strong>
          <br />
          EHE Events · Pulmaplaan
        </div>
      </aside>
      <main className="main">
        <header className="topbar">
          <span>
            {PLANNER ? "Korraldaja tööruum" : "Pruutpaari tööruum"}
            {wedding ? " / " + wedding.names : ""}
          </span>
          <div>
            <button
              className="btn text"
              onClick={() => void refresh()}
              disabled={loading}
            >
              Värskenda
            </button>
            <button
              className="btn"
              onClick={() =>
                void auth.signoutRedirect().catch((e) => setError(e.message))
              }
            >
              Logi välja
            </button>
          </div>
        </header>
        <div className="content">
          {error && (
            <div className="notice error" role="alert">
              {error}
            </div>
          )}
          {loading ? (
            <p className="loading">Laadin pulmaplaani…</p>
          ) : !wedding ? (
            <>
              <div className="page-head">
                <div>
                  <p className="eyebrow">TEIE PÄEV. MEIE HOOLE ALL.</p>
                  <h1>{PLANNER ? "Pulmaprojektid" : "Minu pulmaplaan"}</h1>
                  <p>
                    {PLANNER
                      ? "Kõik teie paarid ja nende järgmised sammud."
                      : "Sinu kontoga seotud pulmaprojektid."}
                  </p>
                </div>
                {PLANNER && (
                  <button
                    className="btn primary"
                    onClick={() => setModal("project")}
                  >
                    + Uus pulmaprojekt
                  </button>
                )}
              </div>
              <div className="project-grid">
                {weddings.map((w) => (
                  <button
                    className="card project-card"
                    key={w.id}
                    onClick={() => choose(w)}
                  >
                    <span className="eyebrow">PULMAPLAAN</span>
                    <h2>{w.names}</h2>
                    <p>
                      {date(w.date)}
                      <br />
                      {w.venue}
                    </p>
                    <span className="pill">
                      {summary(w.tasks).open} avatud tegevust
                    </span>
                  </button>
                ))}
              </div>
              {!weddings.length && (
                <p className="empty">
                  Sinu kontoga pole veel pulmaprojekte seotud.
                </p>
              )}
            </>
          ) : (
            <>
              <div className="page-head">
                <div>
                  <p className="eyebrow">MEIE PÄEV</p>
                  <h1>
                    {
                      (
                        {
                          overview: "Kõik oluline, ühes kohas.",
                          tasks: "Meie järgmised sammud.",
                          contacts: "Inimesed meie päeva taga.",
                          history: "Meie ühine teekond.",
                        } as Record<string, string>
                      )[view]
                    }
                  </h1>
                  <p>{wedding.names} · Pulmaplaan</p>
                </div>
                {PLANNER && (
                  <button
                    className="btn primary"
                    onClick={() =>
                      setModal(view === "contacts" ? "contact" : "task")
                    }
                  >
                    + {view === "contacts" ? "Lisa kontakt" : "Lisa tegevus"}
                  </button>
                )}
              </div>
              {view === "overview" && (
                <>
                  <section className="hero-panel">
                    <div>
                      <span className="eyebrow">ÜKS ERILINE PÄEV</span>
                      <h2>{wedding.names}</h2>
                      <div className="meta">
                        <span>{date(wedding.date)}</span>
                        <span>{wedding.venue}</span>
                        <span>{wedding.guests} külalist</span>
                      </div>
                    </div>
                    {PLANNER && (
                      <a
                        className="btn"
                        href={
                          (import.meta.env.VITE_CLIENT_PORTAL_URL ||
                            "http://localhost:5175") +
                          "/?wedding=" +
                          encodeURIComponent(id)
                        }
                        target="_blank"
                        rel="noreferrer"
                      >
                        Ava kliendiportaal ↗
                      </a>
                    )}
                  </section>
                  <div className="stats">
                    {[
                      ["Tegevusi kokku", stats.total],
                      ["Valmis", stats.done],
                      ["Veel ees", stats.open],
                    ].map(([label, value]) => (
                      <div className="stat" key={label}>
                        <small>{label}</small>
                        <strong>{value}</strong>
                      </div>
                    ))}
                  </div>
                  <div className="dashboard-grid">
                    <section className="panel">
                      <div className="panel-head">
                        <h2>Järgmised sammud</h2>
                        <button
                          className="btn text"
                          onClick={() => setView("tasks")}
                        >
                          Vaata kõiki →
                        </button>
                      </div>
                      {taskList(
                        wedding.tasks
                          .filter((t) => t.status !== "Valmis")
                          .slice(0, 5),
                      )}
                    </section>
                    <section className="panel">
                      <div className="panel-head">
                        <h2>Ühes rütmis</h2>
                      </div>
                      <div className="panel-body">
                        <p className="subtle">
                          Tegevused, kokkulepped ja kommentaarid on kogu
                          planeerimise vältel siin koos.
                        </p>
                        {PLANNER && wedding.privateNote && (
                          <div className="private-note">
                            <p className="eyebrow">AINULT KORRALDAJALE</p>
                            {wedding.privateNote}
                          </div>
                        )}
                      </div>
                    </section>
                  </div>
                </>
              )}
              {view === "tasks" && (
                <>
                  <div className="tabs">
                    {[
                      ["all", "Kõik"],
                      ["couple", "Pruutpaar"],
                      ["planner", "Korraldaja"],
                    ].map(([key, label]) => (
                      <button
                        className={"btn " + (filter === key ? "active" : "")}
                        key={key}
                        onClick={() => setFilter(key)}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                  <section className="panel">
                    {taskList(
                      wedding.tasks.filter(
                        (t) => filter === "all" || t.group === filter,
                      ),
                    )}
                  </section>
                </>
              )}
              {view === "contacts" && (
                <div className="contact-grid">
                  {wedding.contacts.map((c) => (
                    <article className="card" key={c.id}>
                      <span className="eyebrow">{c.role}</span>
                      <h2>{c.name}</h2>
                      <p>{c.note}</p>
                      {c.email && (
                        <p>
                          <a href={"mailto:" + c.email}>{c.email}</a>
                        </p>
                      )}
                      {c.phone && <p>{c.phone}</p>}
                    </article>
                  ))}
                </div>
              )}
              {view === "history" && (
                <section className="panel">
                  <div className="panel-body history">
                    {wedding.tasks
                      .flatMap((t) =>
                        t.history.map((h, i) => ({
                          ...h,
                          title: t.title,
                          key: t.id + "-" + i,
                        })),
                      )
                      .sort((a, b) => b.at.localeCompare(a.at))
                      .map((h) => (
                        <article key={h.key}>
                          <strong>
                            {h.author} · {h.title}
                          </strong>
                          <p>{h.text}</p>
                          <small>
                            {new Date(h.at).toLocaleString("et-EE", {
                              timeZone: "Europe/Tallinn",
                            })}
                          </small>
                        </article>
                      ))}
                  </div>
                </section>
              )}
            </>
          )}
        </div>
      </main>
      {modal && (
        <Drawer
          title={
            task
              ? task.title
              : modal === "project"
                ? "Uus pulmaprojekt"
                : modal === "contact"
                  ? "Uus kontakt"
                  : "Uus tegevus"
          }
          close={close}
        >
          {error && (
            <p className="notice error" role="alert">
              {error}
            </p>
          )}
          {task ? (
            <>
              <p>{task.description}</p>
              <span className="pill">
                {task.status} · {date(task.date)}
              </span>
              <div className="history">
                {task.history.map((h, i) => (
                  <article key={i}>
                    <strong>{h.author}</strong>
                    <p>{h.text}</p>
                    <small>
                      {new Date(h.at).toLocaleString("et-EE", {
                        timeZone: "Europe/Tallinn",
                      })}
                    </small>
                  </article>
                ))}
              </div>
              <form
                onSubmit={(e) => {
                  const form = e.currentTarget;
                  submit(e, async (v) => {
                    update(
                      await api<Wedding>(
                        `/api/weddings/${id}/tasks/${task.id}/comments`,
                        "POST",
                        v,
                      ),
                    );
                    form.reset();
                  });
                }}
              >
                <label className="field">
                  Lisa kommentaar
                  <textarea name="text" required maxLength={5000} />
                </label>
                <div className="actions">
                  <button className="btn primary" disabled={busy}>
                    Saada kommentaar
                  </button>
                </div>
              </form>
            </>
          ) : modal === "project" ? (
            <form
              className="form-grid"
              onSubmit={(e) =>
                submit(e, async (v) => {
                  const w = await api<Wedding>("/api/weddings", "POST", {
                    ...v,
                    guests: Number(v.guests),
                  });
                  setWeddings((all) => [...all, w]);
                  choose(w);
                  close();
                })
              }
            >
              <label className="full">
                Pruutpaari nimed
                <input name="names" required maxLength={150} />
              </label>
              <label>
                Kuupäev
                <input type="date" name="date" required />
              </label>
              <label>
                Külalisi
                <input
                  type="number"
                  name="guests"
                  min="0"
                  max="10000"
                  required
                />
              </label>
              <label className="full">
                Pulmakoht
                <input name="venue" required maxLength={200} />
              </label>
              <label className="full">
                Pruutpaari konto ID
                <input name="clientSub" required maxLength={200} />
                <small>Konto tunnuse saad kasutajate haldajalt.</small>
              </label>
              <label className="full">
                Privaatne märkus
                <textarea name="privateNote" maxLength={5000} />
              </label>
              <button className="btn primary full" disabled={busy}>
                Loo pulmaprojekt
              </button>
            </form>
          ) : modal === "task" ? (
            <form
              className="form-grid"
              onSubmit={(e) =>
                submit(e, async (v) => {
                  update(
                    await api<Wedding>(`/api/weddings/${id}/tasks`, "POST", v),
                  );
                  close();
                })
              }
            >
              <label className="full">
                Tegevus
                <input name="title" required maxLength={200} />
              </label>
              <label>
                Tähtaeg
                <input name="date" type="date" required />
              </label>
              <label>
                Kelle tegevus
                <select name="group">
                  <option value="couple">Pruutpaar</option>
                  <option value="planner">Korraldaja</option>
                </select>
              </label>
              <label className="full">
                Vastutaja
                <input name="assignee" required maxLength={100} />
              </label>
              <label className="full">
                Kirjeldus
                <textarea name="description" maxLength={5000} />
              </label>
              <button className="btn primary full" disabled={busy}>
                Lisa tegevus
              </button>
            </form>
          ) : (
            <form
              className="form-grid"
              onSubmit={(e) =>
                submit(e, async (v) => {
                  update(
                    await api<Wedding>(
                      `/api/weddings/${id}/contacts`,
                      "POST",
                      v,
                    ),
                  );
                  close();
                })
              }
            >
              {[
                ["name", "Nimi"],
                ["role", "Roll"],
                ["email", "E-post"],
                ["phone", "Telefon"],
              ].map(([key, label]) => (
                <label key={key}>
                  {label}
                  <input
                    name={key}
                    type={key === "email" ? "email" : "text"}
                    required={["name", "role"].includes(key)}
                    maxLength={
                      key === "phone" ? 60 : key === "role" ? 100 : 150
                    }
                  />
                </label>
              ))}
              <label className="full">
                Märkus
                <textarea name="note" maxLength={3000} />
              </label>
              <button className="btn primary full" disabled={busy}>
                Lisa kontakt
              </button>
            </form>
          )}
        </Drawer>
      )}
    </div>
  );
}
export default function App() {
  return (
    <AuthGate title={PLANNER ? "Korraldaja stuudio" : "Meie pulmaplaan"}>
      <Workspace />
    </AuthGate>
  );
}
