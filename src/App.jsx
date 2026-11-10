import {
  IconButton,
  Badge,
  Select,
  Popover,
  Modal,
  Checkbox,
  RegisterSkeleton,
} from "./components.jsx";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Archive,
  ArrowDown,
  ArrowDownRight,
  ArrowLeft,
  ArrowRight,
  ArrowsDownUp,
  ArrowUp,
  ArrowUpRight,
  ArrowClockwise,
  Bank,
  Bell,
  CalendarBlank,
  CaretDown,
  CaretLeft,
  CaretRight,
  Check,
  CheckCircle,
  ClipboardText,
  Columns,
  DotsThree,
  DownloadSimple,
  FileText,
  FunnelSimple,
  GearSix,
  Info,
  List,
  MagnifyingGlass,
  Moon,
  Printer,
  Question,
  Receipt,
  SidebarSimple,
  SlidersHorizontal,
  SquaresFour,
  Sun,
  Tag,
  UserCircle,
  WarningCircle,
  X,
} from "@phosphor-icons/react";
import "@fontsource-variable/quicksand";
import "@fontsource/poppins/latin-ext-400.css";
import "@fontsource/poppins/latin-400.css";
import "@fontsource/poppins/latin-ext-500.css";
import "@fontsource/poppins/latin-500.css";
import "@fontsource/poppins/latin-ext-600.css";
import "@fontsource/poppins/latin-600.css";
import {
  INITIAL_RECORDS,
  DEFAULT_FILTERS,
  MONTHS,
  TAGS,
  money,
  dateLabel,
  filterRecords,
  summarize,
  createCSV,
} from "./data.js";

const polishPlural = new Intl.PluralRules("pl");
const documentWord = (n) =>
  ({
    one: "dokument",
    few: "dokumenty",
    many: "dokumentów",
    other: "dokumentu",
  })[polishPlural.select(n)];

const COLUMN_DEFS = [
  { key: "contractor", label: "Kontrahent" },
  { key: "date", label: "Data" },
  { key: "number", label: "Numer dokumentu" },
  { key: "ksef", label: "Numer KSeF" },
  { key: "id", label: "Identyfikator" },
  { key: "gross", label: "Brutto" },
];
const NAV = [
  { name: "Obszary księgowe", icon: SquaresFour, tone: "slate" },
  { name: "Rejestry i VAT", icon: Receipt, tone: "green" },
  { name: "Księgowania", icon: Bank, tone: "blue" },
  { name: "Majątek", icon: Archive, tone: "orange" },
  { name: "Kontrole", icon: ClipboardText, tone: "violet" },
];
const readSaved = (key, fallback) => {
  try {
    return JSON.parse(localStorage.getItem(key)) ?? fallback;
  } catch {
    return fallback;
  }
};
const save = (key, value) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* private browsing still works */
  }
};

export function App() {
  const [records, setRecords] = useState(() => {
    const tags = readSaved("onsaldo-tags", {});
    return INITIAL_RECORDS.map((r) => ({
      ...r,
      tags: Array.isArray(tags[r.id])
        ? tags[r.id].filter((t) => TAGS.includes(t))
        : [],
    }));
  });
  const [kind, setKind] = useState("sales");
  const [year, setYear] = useState(2026);
  const [month, setMonth] = useState(9);
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState({ ...DEFAULT_FILTERS });
  const [draft, setDraft] = useState({ ...DEFAULT_FILTERS });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [sort, setSort] = useState({ key: "date", direction: "asc" });
  const [selected, setSelected] = useState([]);
  const [detailId, setDetailId] = useState(null);
  const [dialog, setDialog] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(
    () => matchMedia("(max-width:700px)").matches,
  );
  const sidebarRef = useRef();
  const [scenario, setScenario] = useState(() => {
    const value = new URLSearchParams(location.search).get("state");
    return ["empty", "error"].includes(value) ? value : "filled";
  });
  const [loading, setLoading] = useState(true);
  const [theme, setTheme] = useState(() => readSaved("onsaldo-theme", "light"));
  const [toast, setToast] = useState("");
  const [columns, setColumns] = useState(() => {
    const value = readSaved(
      "onsaldo-columns",
      COLUMN_DEFS.map((c) => c.key),
    );
    return Array.isArray(value) && value.includes("contractor")
      ? [...new Set(value)].filter((k) => COLUMN_DEFS.some((c) => c.key === k))
      : COLUMN_DEFS.map((c) => c.key);
  });
  const [draftTags, setDraftTags] = useState([]);
  const [tagTargets, setTagTargets] = useState([]);
  const [notificationsRead, setNotificationsRead] = useState(false);
  const [printRecords, setPrintRecords] = useState([]);
  const searchRef = useRef();
  const retryTimer = useRef();
  useEffect(() => {
    const media = matchMedia("(max-width:700px)");
    const update = () => {
      setIsMobile(media.matches);
      if (!media.matches) setSidebarOpen(false);
    };
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);
  useEffect(() => {
    if (!isMobile || !sidebarOpen) return;
    const previous = document.activeElement;
    document.body.classList.add("dialog-open");
    sidebarRef.current?.querySelector("button")?.focus();
    const handleKey = (e) => {
      if (e.key === "Escape") {
        e.preventDefault();
        setSidebarOpen(false);
      }
      if (e.key === "Tab") {
        const buttons = [
          ...sidebarRef.current.querySelectorAll("button"),
        ].filter((el) => el.getClientRects().length);
        const first = buttons[0],
          last = buttons.at(-1);
        if (!sidebarRef.current.contains(document.activeElement)) {
          e.preventDefault();
          first.focus({ preventScroll: true });
        } else if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("keydown", handleKey);
      if (!document.querySelector("dialog[open]")) {
        document.body.classList.remove("dialog-open");
        document.querySelector(".mobile-menu")?.focus({ preventScroll: true });
      }
    };
  }, [isMobile, sidebarOpen]);
  useEffect(() => {
    if (dialog) setSidebarOpen(false);
  }, [dialog]);
  useEffect(() => {
    setLoading(true);
    const timer = setTimeout(() => setLoading(false), 520);
    return () => clearTimeout(timer);
  }, [kind, month, year]);
  const toggleTheme = () => {
    const root = document.documentElement;
    const next = root.dataset.theme === "dark" ? "light" : "dark";
    root.classList.add("theme-transitioning");
    // Arm the root transition before changing its target; also supports reversal.
    getComputedStyle(root).getPropertyValue("--bg");
    root.dataset.theme = next;
    setTheme(next);
    clearTimeout(themeTimer.current);
    themeTimer.current = setTimeout(
      () => root.classList.remove("theme-transitioning"),
      480,
    );
  };
  const themeTimer = useRef();
  useEffect(
    () => () => {
      clearTimeout(themeTimer.current);
      document.documentElement.classList.remove("theme-transitioning");
    },
    [],
  );
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    save("onsaldo-theme", theme);
  }, [theme]);
  useEffect(() => {
    save("onsaldo-columns", columns);
  }, [columns]);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(""), 4000);
    return () => clearTimeout(t);
  }, [toast]);
  useEffect(() => () => clearTimeout(retryTimer.current), []);
  useEffect(() => {
    const key = (e) => {
      if (
        (e.metaKey || e.ctrlKey) &&
        e.key === "k" &&
        !document.querySelector("dialog[open]")
      ) {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, []);
  useEffect(() => {
    setPage(1);
    setSelected([]);
  }, [kind, year, month, search, filters, scenario, pageSize]);

  const filtered = useMemo(
    () =>
      filterRecords(records, {
        kind,
        year,
        month,
        search,
        filters,
        state: scenario,
      }),
    [records, kind, year, month, search, filters, scenario],
  );
  const sorted = useMemo(
    () =>
      [...filtered].sort((a, b) => {
        const av = a[sort.key],
          bv = b[sort.key];
        const diff =
          typeof av === "number"
            ? av - bv
            : String(av).localeCompare(String(bv), "pl", { numeric: true });
        return sort.direction === "asc" ? diff : -diff;
      }),
    [filtered, sort],
  );
  const pages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const safePage = Math.min(page, pages);
  const visible = sorted.slice((safePage - 1) * pageSize, safePage * pageSize);
  const totals = summarize(filtered);
  const detail = records.find((r) => r.id === detailId);
  const activeFilters = Object.entries(filters).filter(
    ([, value]) => value !== "all",
  );
  const allVisibleSelected =
    visible.length > 0 && visible.every((r) => selected.includes(r.id));
  const filterNames = {
    operation: "Operacja",
    jpk: "JPK V7",
    series: "Seria",
    tag: "Oznaczenie",
  };
  const filterValue = (key, value) =>
    key === "operation"
      ? value === "invoice"
        ? "Faktury"
        : "Korekty"
      : value === "none"
        ? "Brak kodu"
        : value;
  const periodTitle = `${MONTHS[month][0].toUpperCase()}${MONTHS[month].slice(1)} ${year}`;
  const periodCount = (type) =>
    scenario === "filled"
      ? records.filter(
          (r) =>
            r.kind === type &&
            r.date.startsWith(`${year}-${String(month + 1).padStart(2, "0")}`),
        ).length
      : 0;
  const close = () => setDialog(null);
  const changeMonth = (delta) => {
    const d = new Date(year, month + delta, 1);
    setYear(d.getFullYear());
    setMonth(d.getMonth());
  };
  const resetFilters = () => {
    setSearch("");
    setFilters({ ...DEFAULT_FILTERS });
  };
  const retry = () => {
    setLoading(true);
    retryTimer.current = setTimeout(() => {
      setScenario("filled");
      setLoading(false);
      const url = new URL(location.href);
      url.searchParams.delete("state");
      history.replaceState(null, "", url);
      setToast("Rejestr został wczytany.");
    }, 750);
  };
  const chooseScenario = (value) => {
    setScenario(value);
    setYear(2026);
    setMonth(9);
    resetFilters();
    setDialog(null);
    const url = new URL(location.href);
    value === "filled"
      ? url.searchParams.delete("state")
      : url.searchParams.set("state", value);
    history.replaceState(null, "", url);
  };
  const toggleSelection = (id) =>
    setSelected((current) =>
      current.includes(id) ? current.filter((v) => v !== id) : [...current, id],
    );
  const openTags = (ids) => {
    setTagTargets(ids);
    setDraftTags(
      ids.length === 1
        ? (records.find((r) => r.id === ids[0])?.tags ?? [])
        : [],
    );
    setDialog("tags");
  };
  const applyTags = () => {
    const next = records.map((r) =>
      tagTargets.includes(r.id) ? { ...r, tags: [...draftTags] } : r,
    );
    setRecords(next);
    setSelected([]);
    save("onsaldo-tags", Object.fromEntries(next.map((r) => [r.id, r.tags])));
    close();
    setToast(`Zapisano oznaczenia: ${tagTargets.length} dok.`);
  };
  const exportCSV = (rows = filtered) => {
    if (!rows.length) return;
    const blob = new Blob([createCSV(rows)], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `onsaldo-${kind}-${year}-${String(month + 1).padStart(2, "0")}.csv`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setToast(
      `Wyeksportowano ${rows.length} {documentWord(rows.length)} do CSV.`,
    );
  };
  const print = (rows = filtered) => {
    setPrintRecords(rows);
    close();
    requestAnimationFrame(() => requestAnimationFrame(() => window.print()));
  };
  const sortBy = (key) =>
    setSort((current) => ({
      key,
      direction:
        current.key === key && current.direction === "asc" ? "desc" : "asc",
    }));
  const showNav = (name) => {
    setSidebarOpen(false);
    name === "Rejestry i VAT" ? close() : setDialog(name);
  };
  const filterDialog = () => {
    setDraft({ ...filters });
    setDialog("filters");
  };
  const hasSearchOrFilters = Boolean(search.trim() || activeFilters.length);

  return (
    <>
      <a className="skip-link" href="#main">
        Przejdź do rejestru
      </a>
      <div className="app-shell">
        <header className="app-header">
          <div className="topbar" inert={isMobile && sidebarOpen}>
            <div className="topbar-left">
              <IconButton
                className="mobile-menu"
                icon={List}
                label="Otwórz nawigację"
                onClick={() => setSidebarOpen(true)}
              />
              <button
                className="wordmark"
                onClick={() => setDialog("Obszary księgowe")}
                aria-label="Onsaldo — obszary księgowe"
              >
                <svg
                  className="brand-mark"
                  viewBox="0 0 64 64"
                  fill="none"
                  aria-hidden="true"
                >
                  <rect
                    x="11"
                    y="8"
                    width="42"
                    height="48"
                    rx="18"
                    stroke="currentColor"
                    strokeWidth="7"
                  />
                  <path
                    d="M24 27h16M24 38h11"
                    stroke="currentColor"
                    strokeWidth="5"
                    strokeLinecap="round"
                  />
                </svg>
                <span>
                  onsaldo<span className="brand-dot">.</span>
                </span>
              </button>
              <span className="topbar-divider" />
              <button
                className="organization"
                onClick={() => setDialog("organization")}
              >
                <span className="org-avatar">OP</span>
                <span>
                  <strong>Onsaldo Preview</strong>
                  <small>Sp. z o.o.</small>
                </span>
                <CaretDown size={14} />
              </button>
            </div>
            <div className="topbar-actions">
              <button className="demo-switch" onClick={() => setDialog("demo")}>
                <span className="demo-dot" />
                Wersja demo
                <CaretDown size={12} />
              </button>
              <IconButton
                className="help-button"
                icon={Question}
                label="Pomoc i skróty"
                onClick={() => setDialog("help")}
              />
              <motion.button
                className="icon-button theme-toggle"
                whileTap={{ scale: 0.9 }}
                aria-label={
                  theme === "light" ? "Włącz ciemny motyw" : "Włącz jasny motyw"
                }
                title={
                  theme === "light" ? "Włącz ciemny motyw" : "Włącz jasny motyw"
                }
                onClick={toggleTheme}
              >
                <span className="theme-icon" aria-hidden="true">
                  <motion.span
                    initial={false}
                    animate={{
                      rotate: theme === "light" ? 0 : -70,
                      scale: theme === "light" ? 1 : 0.7,
                      opacity: theme === "light" ? 1 : 0,
                    }}
                    transition={{ duration: 0.3 }}
                  >
                    <Moon size={21} />
                  </motion.span>
                  <motion.span
                    initial={false}
                    animate={{
                      rotate: theme === "dark" ? 0 : 70,
                      scale: theme === "dark" ? 1 : 0.7,
                      opacity: theme === "dark" ? 1 : 0,
                    }}
                    transition={{ duration: 0.3 }}
                  >
                    <Sun size={21} />
                  </motion.span>
                </span>
              </motion.button>
              <button
                className="icon-button notification-button"
                aria-label={`Powiadomienia${notificationsRead ? "" : ", 4 nieprzeczytane"}`}
                title="Powiadomienia"
                onClick={() => setDialog("notifications")}
              >
                <Bell size={21} />
                {!notificationsRead && (
                  <span className="notification-count">4</span>
                )}
              </button>
              <span className="topbar-divider" />
              <button
                className="profile"
                onClick={() => setDialog("profile")}
                aria-label="Konto użytkownika"
              >
                <span className="profile-avatar">PR</span>
                <span className="profile-copy">
                  <strong>Preview Reviewer</strong>
                  <small>Konto użytkownika</small>
                </span>
                <CaretDown size={13} />
              </button>
            </div>
          </div>
          <AnimatePresence>
            {sidebarOpen && (
              <motion.button
                key="nav-overlay"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="mobile-scrim"
                aria-label="Zamknij nawigację"
                onClick={() => setSidebarOpen(false)}
              />
            )}
          </AnimatePresence>
          <aside
            ref={sidebarRef}
            onTransitionEnd={(e) => {
              if (e.propertyName === "transform" && sidebarOpen)
                sidebarRef.current
                  ?.querySelector("button")
                  ?.focus({ preventScroll: true });
            }}
            inert={isMobile && !sidebarOpen}
            role={isMobile ? "dialog" : undefined}
            aria-modal={isMobile && sidebarOpen ? true : undefined}
            className={`sidebar ${sidebarOpen ? "mobile-open" : ""}`}
            aria-label="Nawigacja główna"
          >
            <div className="mobile-nav-title">
              <span>Nawigacja</span>
              <IconButton
                icon={X}
                label="Zamknij nawigację"
                onClick={() => setSidebarOpen(false)}
              />
            </div>
            <nav>
              {NAV.map(({ name, icon: Icon, tone }) => (
                <button
                  key={name}
                  className={`nav-item ${name === "Rejestry i VAT" ? "active" : ""}`}
                  onClick={() => showNav(name)}
                  aria-current={name === "Rejestry i VAT" ? "page" : undefined}
                >
                  <span
                    className={`module-tile tile-${tone}`}
                    aria-hidden="true"
                  >
                    <Icon size={17} weight="bold" />
                  </span>
                  <span>{name}</span>
                </button>
              ))}
            </nav>
            <button
              className="accounting-period"
              onClick={() => setDialog("context")}
            >
              <CalendarBlank size={19} />
              <span>
                Rok księgowy <strong>2026</strong>
              </span>
              <span className="status-dot amber" />
              <CaretRight size={14} />
            </button>
            <div className="mobile-nav-extras">
              <button
                className="secondary-button"
                onClick={() => setDialog("organization")}
              >
                <Bank size={19} />
                Organizacja
              </button>
              <button
                className="secondary-button"
                onClick={() => setDialog("notifications")}
              >
                <Bell size={19} />
                Powiadomienia {!notificationsRead && <Badge>4</Badge>}
              </button>

              <button
                className="secondary-button"
                onClick={() => setDialog("demo")}
              >
                <SlidersHorizontal size={19} />
                Tryb demonstracyjny
              </button>
              <button className="text-link" onClick={() => setDialog("help")}>
                <Question size={19} />
                Pomoc i skróty
              </button>
            </div>
          </aside>
        </header>
        <div className="workspace" inert={isMobile && sidebarOpen}>
          <main id="main" className="main-content">
            <div className="page-heading">
              <div>
                <div className="eyebrow">Ewidencje / Rejestry</div>
                <div className="page-title">
                  <span
                    className="module-tile tile-green tile-hero"
                    aria-hidden="true"
                  >
                    VAT
                  </span>
                  <h1>Rejestry i VAT</h1>
                </div>
                <p>Twoje dokumenty, w przejrzystym porządku.</p>
              </div>
              <div className="heading-actions">
                <div className="period-control">
                  <IconButton
                    icon={CaretLeft}
                    label="Poprzedni miesiąc"
                    onClick={() => changeMonth(-1)}
                  />
                  <button
                    className="period-button"
                    onClick={() => setDialog("period")}
                  >
                    <CalendarBlank size={17} />
                    <span>{periodTitle}</span>
                    <CaretDown size={12} />
                  </button>
                  <IconButton
                    icon={CaretRight}
                    label="Następny miesiąc"
                    onClick={() => changeMonth(1)}
                  />
                </div>
              </div>
            </div>
            <button
              className="context-notice"
              onClick={() => setDialog("context")}
            >
              <Info size={17} />
              <span>
                <strong>Pracujesz na danych demonstracyjnych.</strong>{" "}
                <span className="notice-detail">
                  Kontekst VAT wymaga potwierdzenia.
                </span>
              </span>
              <span className="notice-link">
                Szczegóły <ArrowUpRight size={14} />
              </span>
            </button>
            <section
              className={`summary ${loading ? "is-loading" : ""} ${scenario === "error" ? "unavailable" : ""}`}
              aria-label="Podsumowanie przefiltrowanego rejestru"
            >
              <div className="summary-item">
                <span className="summary-label">
                  <span className="metric-icon module-tile tile-blue">
                    <FileText size={21} weight="duotone" />
                  </span>
                  Wartość netto
                </span>
                <strong>
                  {scenario === "error" ? "—" : money(totals.net)}
                </strong>
                <span className="summary-caption">Bez podatku VAT</span>
              </div>
              <div className="summary-item">
                <button
                  className="summary-label vat-label"
                  onClick={() => setDialog("rates")}
                  disabled={scenario === "error"}
                >
                  <span className="metric-icon module-tile tile-violet">
                    <Bank size={21} weight="duotone" />
                  </span>
                  Podatek VAT <CaretDown size={13} />
                </button>
                <strong>
                  {scenario === "error" ? "—" : money(totals.vat)}
                </strong>
                <button
                  className="text-link summary-caption"
                  onClick={() => setDialog("rates")}
                  disabled={scenario === "error"}
                >
                  Zobacz stawki <CaretRight size={12} />
                </button>
              </div>
              <div className="summary-item summary-total">
                <span className="summary-label">
                  <span className="metric-icon module-tile tile-green">
                    <Receipt size={21} weight="duotone" />
                  </span>
                  Wartość brutto
                </span>
                <strong>
                  {scenario === "error" ? "—" : money(totals.gross)}
                </strong>
                <span className="summary-caption">
                  <span className="status-dot" />{" "}
                  {scenario === "error"
                    ? "Dane niedostępne"
                    : `${filtered.length} ${documentWord(filtered.length)} w widoku`}
                </span>
              </div>
            </section>
            <section
              className="register"
              aria-label="Dokumenty VAT"
              aria-busy={loading}
            >
              <div className="register-top">
                <div
                  className="register-tabs"
                  role="tablist"
                  aria-label="Rodzaj rejestru"
                >
                  {[
                    ["sales", "Sprzedaż", ArrowUpRight],
                    ["purchase", "Zakupy", ArrowDownRight],
                  ].map(([value, label, Icon]) => (
                    <button
                      key={value}
                      id={`tab-${value}`}
                      role="tab"
                      aria-selected={kind === value}
                      aria-controls="register-panel"
                      tabIndex={kind === value ? 0 : -1}
                      className={kind === value ? "selected" : ""}
                      onClick={() => setKind(value)}
                      onKeyDown={(e) => {
                        if (
                          ["ArrowLeft", "ArrowRight", "Home", "End"].includes(
                            e.key,
                          )
                        ) {
                          e.preventDefault();
                          const next =
                            e.key === "Home"
                              ? "sales"
                              : e.key === "End"
                                ? "purchase"
                                : kind === "sales"
                                  ? "purchase"
                                  : "sales";
                          setKind(next);
                          document.getElementById(`tab-${next}`)?.focus();
                        }
                      }}
                    >
                      {kind === value && (
                        <motion.span
                          className="tab-indicator"
                          layoutId="register-tab"
                          transition={{
                            type: "spring",
                            stiffness: 420,
                            damping: 36,
                          }}
                        />
                      )}
                      <Icon size={19} weight="duotone" />
                      <span>{label}</span>
                      <span className="tab-count">{periodCount(value)}</span>
                    </button>
                  ))}
                </div>
                <Popover
                  label="Działania rejestru"
                  className="register-actions"
                  trigger={
                    <>
                      <DownloadSimple size={16} />
                      <span>Eksportuj</span>
                      <CaretDown size={12} />
                    </>
                  }
                >
                  {(done) => (
                    <>
                      <span className="popover-title">DZIAŁANIA REJESTRU</span>
                      <button
                        disabled={!filtered.length}
                        onClick={() => {
                          exportCSV();
                          done();
                        }}
                      >
                        <DownloadSimple size={17} /> Pobierz CSV{" "}
                        <small>{filtered.length} dok.</small>
                      </button>
                      <button
                        disabled={!filtered.length}
                        onClick={() => {
                          print();
                          done();
                        }}
                      >
                        <Printer size={17} /> Drukuj rejestr
                      </button>
                      <hr />
                      <button
                        onClick={() => {
                          setDialog("columns");
                          done();
                        }}
                      >
                        <Columns size={17} /> Ustaw kolumny
                      </button>
                      <button
                        onClick={() => {
                          setDialog("sort");
                          done();
                        }}
                      >
                        <ArrowsDownUp size={17} /> Sortowanie
                      </button>
                      <button
                        onClick={() => {
                          setDraft({ ...filters });
                          setDialog("series");
                          done();
                        }}
                      >
                        <FileText size={17} /> Serie dokumentów
                      </button>
                      <button
                        onClick={() => {
                          setTagTargets(
                            selected.length
                              ? selected
                              : filtered.map((r) => r.id),
                          );
                          setDraftTags([]);
                          setDialog("tags");
                          done();
                        }}
                        disabled={!filtered.length}
                      >
                        <Tag size={17} /> Oznaczenia dokumentów
                      </button>
                    </>
                  )}
                </Popover>
              </div>
              <div
                id="register-panel"
                role="tabpanel"
                aria-labelledby={`tab-${kind}`}
              >
                <div className="table-toolbar">
                  <div className="search-box">
                    <MagnifyingGlass size={18} />
                    <input
                      ref={searchRef}
                      aria-label="Szukaj dokumentu lub kontrahenta"
                      placeholder={
                        isMobile
                          ? "Szukaj…"
                          : "Szukaj dokumentu lub kontrahenta…"
                      }
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                    />
                    {search ? (
                      <IconButton
                        icon={X}
                        label="Wyczyść wyszukiwanie"
                        onClick={() => {
                          setSearch("");
                          searchRef.current.focus();
                        }}
                      />
                    ) : (
                      <kbd>⌘ K</kbd>
                    )}
                  </div>
                  <div className="toolbar-actions">
                    <button
                      className={`subtle-button ${activeFilters.length ? "has-filters" : ""}`}
                      onClick={filterDialog}
                    >
                      <FunnelSimple size={17} />
                      <span>Filtry</span>
                      {activeFilters.length > 0 && (
                        <span className="filter-count">
                          {activeFilters.length}
                        </span>
                      )}
                    </button>
                    <span className="toolbar-divider" />
                    <IconButton
                      icon={Columns}
                      label="Ustaw kolumny"
                      onClick={() => setDialog("columns")}
                    />
                    <Popover
                      label="Sortowanie dokumentów"
                      trigger={<ArrowsDownUp size={18} />}
                      className="sort-menu"
                      title="Sortowanie dokumentów"
                    >
                      {(done) => (
                        <>
                          <span className="popover-title">SORTUJ WEDŁUG</span>
                          {[
                            ["date", "Daty dokumentu"],
                            ["contractor", "Kontrahenta"],
                            ["number", "Numeru dokumentu"],
                            ["gross", "Wartości brutto"],
                          ].map(([key, label]) => (
                            <button
                              key={key}
                              onClick={() => {
                                sortBy(key);
                                done();
                              }}
                            >
                              {sort.key === key ? (
                                <Check size={16} />
                              ) : (
                                <span className="menu-icon-spacer" />
                              )}
                              {label}
                              {sort.key === key &&
                                (sort.direction === "asc" ? (
                                  <ArrowUp size={14} />
                                ) : (
                                  <ArrowDown size={14} />
                                ))}
                            </button>
                          ))}
                        </>
                      )}
                    </Popover>
                  </div>
                </div>
                {activeFilters.length > 0 && (
                  <div className="filter-chips">
                    {activeFilters.map(([key, value]) => (
                      <button
                        key={key}
                        onClick={() => setFilters({ ...filters, [key]: "all" })}
                        aria-label={`Usuń filtr ${filterNames[key]}: ${filterValue(key, value)}`}
                      >
                        {filterNames[key]}:{" "}
                        <strong>{filterValue(key, value)}</strong>
                        <X size={12} />
                      </button>
                    ))}
                    <button
                      className="clear-filters"
                      onClick={() => setFilters({ ...DEFAULT_FILTERS })}
                    >
                      Wyczyść filtry
                    </button>
                  </div>
                )}
                {selected.length > 0 && (
                  <div className="selection-toolbar">
                    <button
                      className="selection-clear"
                      onClick={() => setSelected([])}
                      aria-label="Odznacz wszystkie"
                    >
                      <X size={15} />
                    </button>
                    <strong>{selected.length} zaznaczonych</strong>
                    <button onClick={() => openTags(selected)}>
                      <Tag size={16} /> Oznacz
                    </button>
                    <button
                      onClick={() =>
                        exportCSV(
                          filtered.filter((r) => selected.includes(r.id)),
                        )
                      }
                    >
                      <DownloadSimple size={16} /> Pobierz
                    </button>
                    <button
                      onClick={() =>
                        print(filtered.filter((r) => selected.includes(r.id)))
                      }
                    >
                      <Printer size={16} />
                      <span>Drukuj</span>
                    </button>
                  </div>
                )}
                {loading ? (
                  <RegisterSkeleton
                    count={Math.min(pageSize, periodCount(kind) || 5)}
                  />
                ) : scenario === "error" ? (
                  <div className="empty-state error-state" role="alert">
                    <div className="state-icon">
                      <WarningCircle size={32} weight="duotone" />
                    </div>
                    <h3>Nie udało się wczytać rejestru</h3>
                    <p>
                      Wystąpił problem z pobraniem dokumentów.
                      <br />
                      Twoje ustawienia filtrów zostały zachowane.
                    </p>
                    <button className="primary-button" onClick={retry}>
                      <ArrowClockwise size={17} /> Spróbuj ponownie
                    </button>
                    <small>Symulacja błędu · dane demonstracyjne</small>
                  </div>
                ) : filtered.length === 0 ? (
                  <div className="empty-state">
                    <div className="state-icon">
                      {hasSearchOrFilters ? (
                        <MagnifyingGlass size={32} />
                      ) : (
                        <Receipt size={32} weight="duotone" />
                      )}
                    </div>
                    <h3>
                      {hasSearchOrFilters
                        ? "Nie znaleziono dokumentów"
                        : "Ten okres jest jeszcze pusty"}
                    </h3>
                    <p>
                      {hasSearchOrFilters
                        ? "Spróbuj innej frazy lub zmień wybrane filtry."
                        : "Nie ma dokumentów w wybranym rejestrze i okresie."}
                    </p>
                    <button
                      className="primary-button"
                      onClick={
                        hasSearchOrFilters
                          ? resetFilters
                          : () => chooseScenario("filled")
                      }
                    >
                      {hasSearchOrFilters
                        ? "Wyczyść wyszukiwanie i filtry"
                        : "Pokaż październik 2026"}
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="desktop-table">
                      <table>
                        <thead>
                          <tr>
                            <th className="checkbox-cell">
                              <Checkbox
                                aria-label="Zaznacz dokumenty na tej stronie"
                                checked={allVisibleSelected}
                                onChange={() =>
                                  setSelected(
                                    allVisibleSelected
                                      ? selected.filter(
                                          (id) =>
                                            !visible.some((r) => r.id === id),
                                        )
                                      : [
                                          ...new Set([
                                            ...selected,
                                            ...visible.map((r) => r.id),
                                          ]),
                                        ],
                                  )
                                }
                              />
                            </th>
                            {columns.map((key) => (
                              <th
                                key={key}
                                className={`col-${key}`}
                                aria-sort={
                                  sort.key === key
                                    ? sort.direction === "asc"
                                      ? "ascending"
                                      : "descending"
                                    : "none"
                                }
                              >
                                <button onClick={() => sortBy(key)}>
                                  {COLUMN_DEFS.find((c) => c.key === key).label}
                                  {sort.key === key &&
                                    (sort.direction === "asc" ? (
                                      <ArrowUp size={12} />
                                    ) : (
                                      <ArrowDown size={12} />
                                    ))}
                                </button>
                              </th>
                            ))}
                            <th className="row-end">
                              <span className="sr-only">Szczegóły</span>
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {visible.map((row) => (
                            <tr
                              key={row.id}
                              className={
                                selected.includes(row.id) ? "row-selected" : ""
                              }
                            >
                              <td className="checkbox-cell">
                                <Checkbox
                                  aria-label={`Zaznacz ${row.contractor}`}
                                  checked={selected.includes(row.id)}
                                  onChange={() => toggleSelection(row.id)}
                                />
                              </td>
                              {columns.map((key) => (
                                <td key={key} className={`col-${key}`}>
                                  {key === "contractor" ? (
                                    <button
                                      className="contractor-button"
                                      onClick={() => setDetailId(row.id)}
                                    >
                                      <span
                                        className={`document-icon ${row.operation === "correction" ? "correction" : ""}`}
                                      >
                                        <FileText size={17} />
                                      </span>
                                      <span>
                                        <strong>{row.contractor}</strong>
                                        {row.tags.length > 0 && (
                                          <small className="row-tags">
                                            <Tag size={11} />
                                            {row.tags.join(", ")}
                                          </small>
                                        )}
                                      </span>
                                    </button>
                                  ) : key === "date" ? (
                                    dateLabel(row.date)
                                  ) : key === "number" ? (
                                    <button
                                      className="document-number"
                                      onClick={() => setDetailId(row.id)}
                                    >
                                      {row.number}
                                    </button>
                                  ) : key === "ksef" ? (
                                    <span className="ksef-status">
                                      <span className="status-dot muted" />
                                      Brak potwierdzenia
                                    </span>
                                  ) : key === "gross" ? (
                                    <span
                                      className={
                                        row.gross < 0 ? "negative-amount" : ""
                                      }
                                    >
                                      {money(row.gross)}
                                    </span>
                                  ) : (
                                    <span className="identifier">{row.id}</span>
                                  )}
                                </td>
                              ))}
                              <td className="row-end">
                                <IconButton
                                  icon={CaretRight}
                                  label={`Szczegóły: ${row.contractor}`}
                                  onClick={() => setDetailId(row.id)}
                                />
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <div className="mobile-documents">
                      {visible.map((row) => (
                        <article
                          key={row.id}
                          className={`mobile-document ${selected.includes(row.id) ? "row-selected" : ""}`}
                        >
                          <div className="mobile-document-select">
                            <Checkbox
                              aria-label={`Zaznacz ${row.contractor}`}
                              checked={selected.includes(row.id)}
                              onChange={() => toggleSelection(row.id)}
                            />
                          </div>
                          <button
                            className="mobile-document-main"
                            onClick={() => setDetailId(row.id)}
                          >
                            <span className="mobile-document-heading">
                              <strong>{row.contractor}</strong>
                              <CaretRight size={15} />
                            </span>
                            <span className="mobile-document-number">
                              {row.number}
                            </span>
                            <span className="mobile-document-footer">
                              <span>{dateLabel(row.date)}</span>
                              <strong
                                className={
                                  row.gross < 0 ? "negative-amount" : ""
                                }
                              >
                                {money(row.gross)}
                              </strong>
                            </span>
                            {row.tags.length > 0 && (
                              <span className="row-tags">
                                <Tag size={12} />
                                {row.tags.join(", ")}
                              </span>
                            )}
                          </button>
                        </article>
                      ))}
                    </div>
                    <footer className="table-footer">
                      <span>
                        <strong>
                          {(safePage - 1) * pageSize + 1}–
                          {Math.min(safePage * pageSize, filtered.length)}
                        </strong>{" "}
                        z {filtered.length}{" "}
                        {filtered.length === 1 ? "dokumentu" : "dokumentów"}
                      </span>
                      <div className="pagination">
                        <label>
                          <span className="page-size-label">Na stronie</span>
                          <Select
                            aria-label="Liczba dokumentów na stronie"
                            value={pageSize}
                            onChange={(e) =>
                              setPageSize(Number(e.target.value))
                            }
                          >
                            <option value="5">5</option>
                            <option value="10">10</option>
                            <option value="20">20</option>
                          </Select>
                        </label>
                        <span className="pagination-divider" />
                        <IconButton
                          icon={CaretLeft}
                          label="Poprzednia strona"
                          disabled={safePage <= 1}
                          onClick={() => {
                            setPage(safePage - 1);
                            setSelected([]);
                          }}
                        />
                        <span className="page-number">
                          {safePage}
                          <span> / {pages}</span>
                        </span>
                        <IconButton
                          icon={CaretRight}
                          label="Następna strona"
                          disabled={safePage >= pages}
                          onClick={() => {
                            setPage(safePage + 1);
                            setSelected([]);
                          }}
                        />
                      </div>
                    </footer>
                  </>
                )}
              </div>
            </section>
            <footer className="page-footer">
              <span>
                <CheckCircle size={14} /> Dane demonstracyjne · bez operacji
                zewnętrznych
              </span>
              <button onClick={() => setDialog("help")}>
                Potrzebujesz pomocy? <ArrowUpRight size={12} />
              </button>
            </footer>
          </main>
        </div>
      </div>
      <AnimatePresence initial={false}>
        {detail && (
          <Modal
            key="dialog-1"
            drawer
            title={detail.contractor}
            subtitle={
              detail.operation === "correction"
                ? "Korekta · rejestr VAT"
                : "Faktura · rejestr VAT"
            }
            onClose={() => setDetailId(null)}
            footer={
              <>
                <button
                  className="secondary-button"
                  onClick={() => print([detail])}
                >
                  <Printer size={17} /> Drukuj
                </button>
                <button
                  className="primary-button"
                  onClick={() => exportCSV([detail])}
                >
                  <DownloadSimple size={17} /> Pobierz CSV
                </button>
              </>
            }
          >
            <div className="document-preview-title">
              <span className="document-icon large">
                <FileText size={26} weight="duotone" />
              </span>
              <span>
                <small>NUMER DOKUMENTU</small>
                <strong>{detail.number}</strong>
              </span>
            </div>
            <div className="detail-amount">
              <span>Wartość brutto</span>
              <strong>{money(detail.gross)}</strong>
              <div>
                <span>
                  Netto <b>{money(detail.net)}</b>
                </span>
                <span>
                  VAT <b>{money(detail.vat)}</b>
                </span>
              </div>
            </div>
            <h3 className="section-label">Dane dokumentu</h3>
            <dl className="detail-list">
              <div>
                <dt>Kontrahent</dt>
                <dd>{detail.contractor}</dd>
              </div>
              <div>
                <dt>Data dokumentu</dt>
                <dd>{dateLabel(detail.date)}</dd>
              </div>
              <div>
                <dt>Numer dokumentu</dt>
                <dd>{detail.number}</dd>
              </div>
              <div>
                <dt>Numer KSeF</dt>
                <dd>
                  <Badge>Brak potwierdzenia</Badge>
                </dd>
              </div>
              <div>
                <dt>Identyfikator</dt>
                <dd>{detail.id}</dd>
              </div>
              <div>
                <dt>Rodzaj operacji</dt>
                <dd>
                  {detail.operation === "correction" ? "Korekta" : "Faktura"}
                </dd>
              </div>
              <div>
                <dt>Kod JPK V7</dt>
                <dd>{detail.jpk === "none" ? "Brak kodu" : detail.jpk}</dd>
              </div>
              <div>
                <dt>Seria dokumentów</dt>
                <dd>{detail.series}</dd>
              </div>
              <div>
                <dt>Stawka VAT</dt>
                <dd>
                  {detail.vatRate === "np"
                    ? "Nie podlega (np)"
                    : `${detail.vatRate}%`}
                </dd>
              </div>
            </dl>
            <div className="detail-tags">
              <h3 className="section-label">Oznaczenia</h3>
              <div>
                {detail.tags.map((t) => (
                  <Badge key={t} tone="teal">
                    {t}
                  </Badge>
                ))}
                <button
                  className="text-link"
                  onClick={() => openTags([detail.id])}
                >
                  <Tag size={15} />
                  {detail.tags.length ? "Zmień oznaczenia" : "Dodaj oznaczenie"}
                </button>
              </div>
            </div>
            <p className="detail-note">
              <Info size={16} /> Podgląd danych demonstracyjnych. Dokument nie
              jest wysyłany do KSeF.
            </p>
          </Modal>
        )}
        {dialog === "filters" && (
          <Modal
            key="dialog-2"
            drawer
            title="Filtry"
            subtitle="Pokaż tylko dokumenty, których potrzebujesz."
            onClose={close}
            footer={
              <>
                <button
                  className="secondary-button"
                  onClick={() => setDraft({ ...DEFAULT_FILTERS })}
                >
                  Wyczyść
                </button>
                <button
                  className="primary-button"
                  onClick={() => {
                    setFilters({ ...draft });
                    close();
                  }}
                >
                  Zastosuj filtry <Check size={16} />
                </button>
              </>
            }
          >
            <div className="filter-form">
              <div className="filter-period-note">
                <CalendarBlank size={18} />
                <span>
                  Wybrany okres<strong>{periodTitle}</strong>
                </span>
                <button
                  className="text-link"
                  onClick={() => setDialog("period")}
                >
                  Zmień
                </button>
              </div>
              <Select
                label="Rodzaj operacji"
                value={draft.operation}
                onChange={(e) =>
                  setDraft({ ...draft, operation: e.target.value })
                }
              >
                <option value="all">Wszystkie operacje</option>
                <option value="invoice">Faktury</option>
                <option value="correction">Korekty</option>
              </Select>
              <Select
                label="Kod JPK V7"
                value={draft.jpk}
                onChange={(e) => setDraft({ ...draft, jpk: e.target.value })}
              >
                <option value="all">Wszystkie kody</option>
                <option value="none">Brak kodu</option>
                <option value="GTU_12">GTU_12</option>
                <option value="TP">TP</option>
              </Select>
              <Select
                label="Seria dokumentów"
                value={draft.series}
                onChange={(e) => setDraft({ ...draft, series: e.target.value })}
              >
                <option value="all">Wszystkie serie</option>
                <option value="FV">FV — faktury</option>
                <option value="KOR">KOR — korekty</option>
              </Select>
              <Select
                label="Oznaczenie"
                value={draft.tag}
                onChange={(e) => setDraft({ ...draft, tag: e.target.value })}
              >
                <option value="all">Wszystkie oznaczenia</option>
                {TAGS.map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </Select>
            </div>
          </Modal>
        )}
        {dialog === "period" && (
          <Modal
            key="dialog-3"
            title="Okres rejestru"
            subtitle="Wybierz rok i miesiąc rozliczenia."
            onClose={close}
            footer={
              <button className="primary-button" onClick={close}>
                Gotowe <Check size={16} />
              </button>
            }
          >
            <Select
              label="Rok"
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
            >
              {Array.from(new Set([2024, 2025, 2026, 2027, 2028, year]))
                .sort()
                .map((y) => (
                  <option key={y}>{y}</option>
                ))}
            </Select>
            <div className="month-grid" aria-label="Miesiąc">
              {MONTHS.map((m, i) => (
                <button
                  key={m}
                  className={month === i ? "chosen" : ""}
                  aria-pressed={month === i}
                  onClick={() => setMonth(i)}
                >
                  {m[0].toUpperCase() + m.slice(1)}
                </button>
              ))}
            </div>
            <p className="helper-text">
              Dane demonstracyjne są dostępne dla października 2026.
            </p>
          </Modal>
        )}
        {dialog === "columns" && (
          <Modal
            key="dialog-4"
            title="Widoczne kolumny"
            subtitle="Dopasuj rejestr do swojego sposobu pracy."
            onClose={close}
            footer={
              <>
                <button
                  className="secondary-button"
                  onClick={() => setColumns(COLUMN_DEFS.map((c) => c.key))}
                >
                  Przywróć domyślne
                </button>
                <button className="primary-button" onClick={close}>
                  Gotowe
                </button>
              </>
            }
          >
            <p className="helper-text">
              Na telefonie wszystkie pola są dostępne w szczegółach dokumentu.
            </p>
            <div className="column-list">
              {[
                ...columns,
                ...COLUMN_DEFS.map((c) => c.key).filter(
                  (k) => !columns.includes(k),
                ),
              ].map((key) => (
                <div key={key}>
                  <label>
                    <Checkbox
                      checked={columns.includes(key)}
                      disabled={key === "contractor"}
                      onChange={() =>
                        setColumns(
                          columns.includes(key)
                            ? columns.filter((k) => k !== key)
                            : [...columns, key],
                        )
                      }
                    />
                    {COLUMN_DEFS.find((c) => c.key === key).label}
                  </label>
                  <span>
                    {key === "contractor" ? (
                      <small>Zawsze widoczna</small>
                    ) : (
                      columns.includes(key) && (
                        <>
                          <IconButton
                            icon={ArrowUp}
                            label={`Przenieś kolumnę ${COLUMN_DEFS.find((c) => c.key === key).label} w lewo`}
                            disabled={columns.indexOf(key) <= 1}
                            onClick={() => {
                              const next = [...columns];
                              const i = next.indexOf(key);
                              [next[i - 1], next[i]] = [next[i], next[i - 1]];
                              setColumns(next);
                            }}
                          />
                          <IconButton
                            icon={ArrowDown}
                            label={`Przenieś kolumnę ${COLUMN_DEFS.find((c) => c.key === key).label} w prawo`}
                            disabled={
                              columns.indexOf(key) === columns.length - 1
                            }
                            onClick={() => {
                              const next = [...columns];
                              const i = next.indexOf(key);
                              [next[i], next[i + 1]] = [next[i + 1], next[i]];
                              setColumns(next);
                            }}
                          />
                        </>
                      )
                    )}
                  </span>
                </div>
              ))}
            </div>
          </Modal>
        )}
        {dialog === "rates" && (
          <Modal
            key="dialog-5"
            title="Kwoty według stawek VAT"
            subtitle={`${kind === "sales" ? "Sprzedaż" : "Zakupy"} · ${periodTitle} · bieżący widok`}
            onClose={close}
            footer={
              <button className="primary-button" onClick={close}>
                Zamknij
              </button>
            }
          >
            <div className="rate-total">
              <span>Łączny podatek VAT</span>
              <strong>{money(totals.vat)}</strong>
            </div>
            {["23", "np"].map((rate) => {
              const rows = filtered.filter((r) => r.vatRate === rate);
              const amount = summarize(rows);
              return (
                <div className="rate-row" key={rate}>
                  <div>
                    <strong>
                      {rate === "np" ? "Nie podlega (np)" : `${rate}%`}
                    </strong>
                    <strong>{money(amount.vat)}</strong>
                  </div>
                  <progress
                    max={Math.max(1, Math.abs(totals.vat))}
                    value={Math.abs(amount.vat)}
                    aria-label={`VAT według stawki ${rate}`}
                  />
                  <small>
                    Netto: {money(amount.net)} · {rows.length}{" "}
                    {documentWord(rows.length)}
                  </small>
                </div>
              );
            })}
            <p className="helper-text">
              Podsumowanie obejmuje wszystkie dokumenty pasujące do wyszukiwania
              i filtrów, również na innych stronach.
            </p>
          </Modal>
        )}

        {dialog === "sort" && (
          <Modal
            key="dialog-6"
            title="Sortowanie dokumentów"
            subtitle="Wybierz kolejność dokumentów w rejestrze."
            onClose={close}
            footer={
              <button className="primary-button" onClick={close}>
                Gotowe
              </button>
            }
          >
            <div className="filter-form">
              <Select
                label="Sortuj według"
                value={sort.key}
                onChange={(e) => setSort({ ...sort, key: e.target.value })}
              >
                {COLUMN_DEFS.map((c) => (
                  <option key={c.key} value={c.key}>
                    {c.label}
                  </option>
                ))}
              </Select>
              <Select
                label="Kolejność"
                value={sort.direction}
                onChange={(e) =>
                  setSort({ ...sort, direction: e.target.value })
                }
              >
                <option value="asc">Rosnąco</option>
                <option value="desc">Malejąco</option>
              </Select>
            </div>
          </Modal>
        )}
        {dialog === "series" && (
          <Modal
            key="dialog-7"
            title="Serie dokumentów"
            subtitle="Zawęź rejestr do wybranej serii."
            onClose={close}
            footer={
              <button
                className="primary-button"
                onClick={() => {
                  setFilters({ ...filters, series: draft.series });
                  close();
                }}
              >
                Zastosuj
              </button>
            }
          >
            <Select
              label="Seria dokumentów"
              value={draft.series}
              onChange={(e) => setDraft({ ...draft, series: e.target.value })}
            >
              <option value="all">Wszystkie serie</option>
              <option value="FV">FV — faktury</option>
              <option value="KOR">KOR — korekty</option>
            </Select>
          </Modal>
        )}
        {dialog === "tags" && (
          <Modal
            key="dialog-8"
            title="Oznaczenia dokumentów"
            subtitle={`Wybrane dokumenty: ${tagTargets.length}`}
            onClose={close}
            footer={
              <>
                <button className="secondary-button" onClick={close}>
                  Anuluj
                </button>
                <button
                  className="primary-button"
                  disabled={!tagTargets.length}
                  onClick={applyTags}
                >
                  Zapisz oznaczenia
                </button>
              </>
            }
          >
            <div className="tag-choices">
              {TAGS.map((tag) => (
                <label key={tag}>
                  <Checkbox
                    checked={draftTags.includes(tag)}
                    onChange={() =>
                      setDraftTags(
                        draftTags.includes(tag)
                          ? draftTags.filter((t) => t !== tag)
                          : [...draftTags, tag],
                      )
                    }
                  />
                  <Tag size={17} />
                  <span>{tag}</span>
                </label>
              ))}
            </div>
            <p className="helper-text">
              Wybrany zestaw zastąpi dotychczasowe oznaczenia tych dokumentów.
              Zmiany są zapisywane tylko w tej przeglądarce.
            </p>
          </Modal>
        )}
        {dialog === "context" && (
          <Modal
            key="dialog-9"
            title="Kontekst księgowy"
            subtitle="Onsaldo Preview Sp. z o.o."
            onClose={close}
            footer={
              <button className="primary-button" onClick={close}>
                Rozumiem
              </button>
            }
          >
            <div className="context-card">
              <CalendarBlank size={25} />
              <div>
                <h3>Okres księgowy · 2026</h3>
                <Badge tone="amber">Wymaga konfiguracji</Badge>
              </div>
            </div>
            <p>
              Rok rozliczeniowy i kontekst VAT wymagają potwierdzenia przed
              uruchomieniem operacji księgowych.
            </p>
            <p>
              W tym podglądzie widzisz wyłącznie dane demonstracyjne. Nie jest
              to ewidencja organizacji, a działania nie uruchamiają księgowania
              ani operacji zewnętrznych.
            </p>
            <div className="info-box">
              <Info size={19} />
              <span>
                Konfiguracja rzeczywistej organizacji nie jest dostępna w wersji
                demonstracyjnej.
              </span>
            </div>
          </Modal>
        )}
        {dialog === "Obszary księgowe" && (
          <Modal
            key="dialog-10"
            wide
            title="Obszary księgowe"
            subtitle="Dostępność obszarów aktywnej organizacji."
            onClose={close}
          >
            <div className="info-box">
              <Info size={19} />
              <span>
                To jest mapa zakresu. Status pokazuje gotowość warunków, ale nie
                uruchamia księgowania.
              </span>
            </div>
            <div className="areas-grid">
              {[
                "Rejestr VAT",
                "KPiR",
                "Ewidencja przychodów",
                "Pełne księgi",
                "Majątek",
                "Kontrole",
              ].map((area, i) => (
                <details key={area}>
                  <summary>
                    <span>
                      <span
                        className={`module-tile tile-${["green", "blue", "violet", "blue", "orange", "violet"][i]}`}
                        aria-hidden="true"
                      >
                        {i === 0 ? (
                          <Receipt size={19} />
                        ) : i === 4 ? (
                          <Archive size={19} />
                        ) : i === 5 ? (
                          <ClipboardText size={19} />
                        ) : i === 2 ? (
                          <FileText size={19} />
                        ) : (
                          <Bank size={19} />
                        )}
                      </span>
                      {area}
                    </span>
                    <CaretDown size={15} />
                  </summary>
                  <p>
                    {area === "Rejestr VAT"
                      ? "Podgląd rejestrów sprzedaży i zakupów jest dostępny. Kontekst VAT wymaga potwierdzenia."
                      : "Obszar wymaga potwierdzenia konfiguracji organizacji. W tym prototypie dostępny jest podgląd rejestrów VAT."}
                  </p>
                  {area === "Rejestr VAT" && (
                    <button className="text-link" onClick={close}>
                      Otwórz rejestry <ArrowRight size={14} />
                    </button>
                  )}
                </details>
              ))}
            </div>
            <button
              className="period-overview"
              onClick={() => setDialog("context")}
            >
              <CalendarBlank size={20} />
              <span>Okres księgowy · 2026</span>
              <Badge tone="amber">Wymaga konfiguracji</Badge>
              <CaretRight size={16} />
            </button>
          </Modal>
        )}
        {["Księgowania", "Majątek", "Kontrole"].includes(dialog) && (
          <Modal
            key="dialog-11"
            title={dialog}
            subtitle="Obszar księgowy organizacji"
            onClose={close}
            footer={
              <button className="primary-button" onClick={close}>
                Wróć do rejestrów
              </button>
            }
          >
            <div className="info-box">
              <Info size={20} />
              <span>
                Ten obszar wymaga konfiguracji. Zakres demonstracji obejmuje
                ekran Rejestry i VAT.
              </span>
            </div>
            <button
              className="text-link"
              onClick={() => setDialog("Obszary księgowe")}
            >
              Zobacz dostępność wszystkich obszarów <ArrowRight size={15} />
            </button>
          </Modal>
        )}
        {dialog === "demo" && (
          <Modal
            key="dialog-12"
            title="Tryb demonstracyjny"
            subtitle="Sprawdź zachowanie ekranu w różnych sytuacjach."
            onClose={close}
          >
            <div className="scenario-list">
              {[
                [
                  "filled",
                  "Z danymi",
                  "Rejestry sprzedaży i zakupu, filtry oraz dokumenty.",
                  Receipt,
                ],
                [
                  "empty",
                  "Brak danych",
                  "Pusty rejestr i powrót do przykładowych dokumentów.",
                  FileText,
                ],
                [
                  "error",
                  "Błąd wczytywania",
                  "Komunikat błędu i ponowne pobranie danych.",
                  WarningCircle,
                ],
              ].map(([value, title, desc, Icon]) => (
                <button
                  className={scenario === value ? "chosen" : ""}
                  key={value}
                  onClick={() => chooseScenario(value)}
                >
                  <Icon size={22} />
                  <span>
                    <strong>{title}</strong>
                    <small>{desc}</small>
                  </span>
                  {scenario === value ? (
                    <Check size={18} />
                  ) : (
                    <CaretRight size={18} />
                  )}
                </button>
              ))}
            </div>
          </Modal>
        )}
        {dialog === "help" && (
          <Modal
            key="dialog-13"
            title="Wszystko pod ręką"
            subtitle="Kilka wskazówek do pracy z rejestrem."
            onClose={close}
          >
            <div className="help-list">
              <div>
                <MagnifyingGlass size={20} />
                <span>
                  <strong>Szybkie wyszukiwanie</strong>
                  <p>
                    Szukaj po kontrahencie, numerze dokumentu, KSeF lub
                    identyfikatorze. Skrót: Ctrl / ⌘ + K.
                  </p>
                </span>
              </div>
              <div>
                <FunnelSimple size={20} />
                <span>
                  <strong>Tylko to, czego potrzebujesz</strong>
                  <p>
                    Połącz filtry operacji, kodu JPK V7, serii i oznaczeń. Sumy
                    aktualizują się dla całego wyniku.
                  </p>
                </span>
              </div>
              <div>
                <FileText size={20} />
                <span>
                  <strong>Pełne dane dokumentu</strong>
                  <p>
                    Kliknij kontrahenta lub strzałkę przy wierszu. Na telefonie
                    dotknij karty dokumentu.
                  </p>
                </span>
              </div>
              <div>
                <DownloadSimple size={20} />
                <span>
                  <strong>Eksport i drukowanie</strong>
                  <p>
                    Eksportuj cały wynik albo zaznaczone dokumenty. Plik CSV
                    zawiera wszystkie pola, również ukryte kolumny.
                  </p>
                </span>
              </div>
            </div>
            <button
              className="secondary-button"
              onClick={() => setDialog("demo")}
            >
              Sprawdź stany demonstracyjne <ArrowRight size={16} />
            </button>
          </Modal>
        )}
        {dialog === "notifications" && (
          <Modal
            key="dialog-14"
            title="Powiadomienia"
            subtitle={
              notificationsRead
                ? "Wszystko przeczytane."
                : "4 informacje o środowisku demonstracyjnym."
            }
            onClose={close}
            footer={
              <button
                className="primary-button"
                onClick={() => {
                  setNotificationsRead(true);
                  close();
                }}
              >
                Oznacz wszystkie jako przeczytane
              </button>
            }
          >
            <div className="notification-list">
              {[
                [
                  "Kontekst VAT",
                  "Wymaga potwierdzenia przed rozpoczęciem pracy.",
                ],
                ["Okres księgowy", "Rok 2026 wymaga konfiguracji."],
                [
                  "Dane demonstracyjne",
                  "Dostępne są dokumenty z października 2026.",
                ],
                ["KSeF", "Numery dokumentów nie zostały potwierdzone."],
              ].map(([title, desc]) => (
                <div key={title}>
                  <Info size={18} />
                  <span>
                    <strong>{title}</strong>
                    <p>{desc}</p>
                  </span>
                </div>
              ))}
            </div>
          </Modal>
        )}
        {dialog === "organization" && (
          <Modal key="dialog-15" title="Aktywna organizacja" onClose={close}>
            <div className="organization-detail">
              <span className="org-avatar">OP</span>
              <div>
                <h3>Onsaldo Preview Sp. z o.o.</h3>
                <Badge tone="teal">Aktywna organizacja</Badge>
              </div>
              <CheckCircle size={22} />
            </div>
            <p className="helper-text">
              W tej demonstracji dostępna jest jedna organizacja. Jej dane są
              przykładowe.
            </p>
          </Modal>
        )}
        {dialog === "profile" && (
          <Modal key="dialog-16" title="Konto użytkownika" onClose={close}>
            <div className="organization-detail">
              <UserCircle size={42} />
              <div>
                <h3>Preview Reviewer</h3>
                <p>Użytkownik demonstracyjny</p>
              </div>
            </div>
            <p>
              Podgląd jest dostępny bez logowania. Wszystkie oznaczenia
              dokumentów i ustawienia widoku są zapisywane lokalnie.
            </p>
          </Modal>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {toast && (
          <motion.div
            key="toast"
            initial={{ opacity: 0, y: 20, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12 }}
            className="toast"
            role="status"
          >
            <CheckCircle size={20} weight="fill" />
            <span>{toast}</span>
            <IconButton
              icon={X}
              label="Zamknij komunikat"
              onClick={() => setToast("")}
            />
          </motion.div>
        )}
      </AnimatePresence>
      <section className="print-view">
        <h1>
          Onsaldo · Rejestr VAT {kind === "sales" ? "sprzedaży" : "zakupów"}
        </h1>
        <p>{periodTitle} · Dane demonstracyjne · Onsaldo Preview Sp. z o.o.</p>
        <table>
          <thead>
            <tr>
              {[
                "Kontrahent",
                "Data",
                "Numer dokumentu",
                "KSeF / ID",
                "Netto",
                "VAT",
                "Brutto",
              ].map((h) => (
                <th key={h}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {(printRecords.length ? printRecords : filtered).map((r) => (
              <tr key={r.id}>
                <td>{r.contractor}</td>
                <td>{dateLabel(r.date)}</td>
                <td>
                  {r.number}
                  <br />
                  {r.jpk === "none" ? "" : r.jpk} {r.tags.join(", ")}
                </td>
                <td>
                  {r.ksef}
                  <br />
                  {r.id}
                </td>
                <td>{money(r.net)}</td>
                <td>{money(r.vat)}</td>
                <td>{money(r.gross)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p>
          Netto:{" "}
          {money(summarize(printRecords.length ? printRecords : filtered).net)}{" "}
          · VAT:{" "}
          {money(summarize(printRecords.length ? printRecords : filtered).vat)}{" "}
          · Brutto:{" "}
          {money(
            summarize(printRecords.length ? printRecords : filtered).gross,
          )}
        </p>
      </section>
    </>
  );
}
