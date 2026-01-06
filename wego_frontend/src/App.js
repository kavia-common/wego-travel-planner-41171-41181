import React, { useEffect, useMemo, useState } from "react";
import "./App.css";
import { supabase } from "./lib/supabaseClient";

/**
 * Ocean Professional theme tokens (kept local and lightweight).
 * We keep UI self-contained in this file, using inline styles + minimal classNames.
 */
const THEME = {
  primary: "#2563EB",
  secondary: "#F59E0B",
  background: "#f9fafb",
  surface: "#ffffff",
  text: "#111827",
  mutedText: "#6B7280",
  border: "rgba(17, 24, 39, 0.12)",
  shadow: "0 10px 25px rgba(17, 24, 39, 0.10)",
  shadowSm: "0 4px 14px rgba(17, 24, 39, 0.08)",
};

/** Mock data (no external service calls yet). */
const MOCK_QUOTES = [
  {
    id: "q1",
    destination: "Goa, India",
    price: 27999,
    nights: 4,
    rating: 4.7,
    tags: ["Beaches", "Food", "Adventure"],
  },
  {
    id: "q2",
    destination: "Jaipur, India",
    price: 18999,
    nights: 3,
    rating: 4.5,
    tags: ["Culture", "City", "Food"],
  },
  {
    id: "q3",
    destination: "Bali, Indonesia",
    price: 74999,
    nights: 6,
    rating: 4.8,
    tags: ["Beaches", "Adventure", "Culture"],
  },
  {
    id: "q4",
    destination: "Dubai, UAE",
    price: 89999,
    nights: 5,
    rating: 4.6,
    tags: ["City", "Food", "Adventure"],
  },
  {
    id: "q5",
    destination: "Manali, India",
    price: 22999,
    nights: 4,
    rating: 4.4,
    tags: ["Mountains", "Adventure", "Culture"],
  },
  {
    id: "q6",
    destination: "Paris, France",
    price: 159999,
    nights: 6,
    rating: 4.9,
    tags: ["City", "Culture", "Food"],
  },
];

const MOCK_REVIEWS = [
  {
    id: "r1",
    name: "Aarav",
    date: "2025-05-12",
    destination: "Goa",
    rating: 5,
    text: "Planner suggestions were spot-on. Great beach stays within budget and smooth day-by-day flow.",
  },
  {
    id: "r2",
    name: "Meera",
    date: "2025-04-03",
    destination: "Bali",
    rating: 4,
    text: "Loved the itinerary structure and interest-based picks. Would like more filters for hotel category.",
  },
  {
    id: "r3",
    name: "Kabir",
    date: "2025-02-22",
    destination: "Dubai",
    rating: 5,
    text: "Quick options, clear pricing examples, and easy-to-follow plan. Perfect for a short city break.",
  },
  {
    id: "r4",
    name: "Sana",
    date: "2025-01-17",
    destination: "Jaipur",
    rating: 4,
    text: "Culture and food recommendations were excellent. UI feels premium and easy on mobile.",
  },
];

/**
 * Formatting helpers
 */
function formatINR(amount) {
  try {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `₹${amount}`;
  }
}

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

function initialsFromName(name) {
  const parts = String(name || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (!parts.length) return "U";
  const first = parts[0]?.[0] || "U";
  const last = (parts.length > 1 ? parts[parts.length - 1]?.[0] : "") || "";
  return (first + last).toUpperCase();
}

function toISODateLocal(d) {
  // yyyy-mm-dd for <input type="date">
  const pad = (x) => String(x).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

const INTERESTS = [
  "Beaches",
  "Mountains",
  "City",
  "Culture",
  "Food",
  "Adventure",
];

// PUBLIC_INTERFACE
function App() {
  /** This is a public function. */
  const [activeNav, setActiveNav] = useState("home");

  // Planner state
  const todayISO = useMemo(() => toISODateLocal(new Date()), []);
  const defaultEndISO = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return toISODateLocal(d);
  }, []);

  const [planner, setPlanner] = useState({
    destination: "",
    tripType: "Domestic",
    nights: 4,
    budget: 50000,
    travelers: 2,
    startDate: todayISO,
    endDate: defaultEndISO,
    interests: new Set(["Beaches", "Food"]),
  });

  const [validation, setValidation] = useState({});
  const [planResult, setPlanResult] = useState(null);
  const [isPlanning, setIsPlanning] = useState(false);

  // Quotes (still used in-page; removed "Refresh Quotes" from header per requirements)
  const [quoteSeed, setQuoteSeed] = useState(1);
  const [quotes, setQuotes] = useState(() => pickQuotes(MOCK_QUOTES, 3, 1));

  // Auth state
  const [user, setUser] = useState(null);
  const [authError, setAuthError] = useState("");
  const [authBusy, setAuthBusy] = useState(false);

  // Sign-in prompt (modal)
  const [isSignInOpen, setIsSignInOpen] = useState(false);

  // Sticky header shadow on scroll (small UX polish)
  const [scrolled, setScrolled] = useState(false);

  // Track auth on mount and on auth changes.
  useEffect(() => {
    let isMounted = true;

    (async () => {
      try {
        const { data, error } = await supabase.auth.getUser();
        if (!isMounted) return;
        if (error) {
          // Not fatal; can happen if there is no session.
          setUser(null);
          return;
        }
        setUser(data?.user ?? null);
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error("Failed to read auth user:", e);
        if (isMounted) setUser(null);
      }
    })();

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      // Keep it minimal: only update user state.
      setUser(session?.user ?? null);
    });

    return () => {
      isMounted = false;
      sub?.subscription?.unsubscribe?.();
    };
  }, []);

  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY || 0;
      setScrolled(y > 4);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    setQuotes(pickQuotes(MOCK_QUOTES, 3, quoteSeed));
  }, [quoteSeed]);

  // Active section tracking only (no programmatic scroll). This keeps nav highlighting professional.
  useEffect(() => {
    const sectionIds = [
      "home",
      "info",
      "planner",
      "quotes",
      "reviews",
      "about",
      "contact",
      "privacy-policies",
    ];

    const handler = () => {
      const headerOffset = 88;
      const candidates = sectionIds
        .map((id) => {
          const el = document.getElementById(id);
          if (!el) return null;
          const top = el.getBoundingClientRect().top;
          return { id, top };
        })
        .filter(Boolean);

      const best = candidates
        .filter((c) => c.top <= headerOffset + 16)
        .sort((a, b) => b.top - a.top)[0];

      if (best && best.id !== activeNav) setActiveNav(best.id);
      if (!best && activeNav !== "home") setActiveNav("home");
    };

    window.addEventListener("scroll", handler, { passive: true });
    handler();
    return () => window.removeEventListener("scroll", handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeNav]);

  const layout = useMemo(
    () => ({
      page: {
        minHeight: "100vh",
        fontFamily:
          'Inter, ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, "Apple Color Emoji", "Segoe UI Emoji"',
        background: `radial-gradient(900px 460px at 20% -10%, rgba(37, 99, 235, 0.14), transparent 60%),
                     radial-gradient(1000px 520px at 85% 0%, rgba(245, 158, 11, 0.10), transparent 55%),
                     ${THEME.background}`,
        color: THEME.text,
      },
      container: {
        maxWidth: 1120,
        margin: "0 auto",
        padding: "0 18px",
      },
      section: {
        padding: "56px 0",
      },
      sectionTitle: {
        fontSize: 22,
        lineHeight: 1.2,
        margin: "0 0 10px",
        letterSpacing: "-0.02em",
      },
      sectionSubtitle: {
        margin: "0 0 18px",
        color: THEME.mutedText,
        maxWidth: 820,
        lineHeight: 1.55,
      },
      card: {
        background: THEME.surface,
        border: `1px solid ${THEME.border}`,
        borderRadius: 18,
        boxShadow: THEME.shadowSm,
      },
    }),
    []
  );

  /**
   * Controlled navigation:
   * - triggered only by user click
   * - uses scrollIntoView per request
   * - focuses the section for accessibility
   */
  // PUBLIC_INTERFACE
  const onNavClick = (id) => {
    /** This is a public function. */
    const el = document.getElementById(id);
    if (!el) return;

    // Scroll into view (requested).
    el.scrollIntoView({ behavior: "smooth", block: "start" });

    // Set focus for screen readers/keyboard users.
    // The section becomes programmatically focusable without affecting tab order.
    el.setAttribute("tabindex", "-1");
    window.setTimeout(() => {
      try {
        el.focus({ preventScroll: true });
      } catch {
        // no-op: some browsers may not support preventScroll
        el.focus();
      }
    }, 300);

    setActiveNav(id);
  };

  // PUBLIC_INTERFACE
  const refreshQuotes = () => {
    /** This is a public function. */
    setQuoteSeed((s) => s + 1);
  };

  // PUBLIC_INTERFACE
  const signInWithGoogle = async () => {
    /** This is a public function. */
    setAuthError("");
    setAuthBusy(true);

    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          // Keep it deterministic; after OAuth, return to the same origin.
          redirectTo: window.location.origin,
        },
      });

      if (error) {
        setAuthError(error.message || "Unable to start Google sign-in.");
      }
      // On success, browser will redirect to Google, then back to redirectTo.
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error("Google sign-in error:", e);
      setAuthError("Something went wrong starting sign-in. Please try again.");
    } finally {
      setAuthBusy(false);
    }
  };

  // PUBLIC_INTERFACE
  const signOut = async () => {
    /** This is a public function. */
    setAuthError("");
    try {
      const { error } = await supabase.auth.signOut();
      if (error) setAuthError(error.message || "Sign out failed.");
      // user state will be updated by onAuthStateChange
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error("Sign out error:", e);
      setAuthError("Something went wrong signing out.");
    }
  };

  // PUBLIC_INTERFACE
  const onOpenSignIn = () => {
    /** This is a public function. */
    setAuthError("");
    setIsSignInOpen(true);
  };

  // PUBLIC_INTERFACE
  const onCloseSignIn = () => {
    /** This is a public function. */
    setIsSignInOpen(false);
  };

  // PUBLIC_INTERFACE
  const updatePlannerField = (key, value) => {
    /** This is a public function. */
    setPlanner((p) => ({ ...p, [key]: value }));
  };

  // PUBLIC_INTERFACE
  const toggleInterest = (interest) => {
    /** This is a public function. */
    setPlanner((p) => {
      const next = new Set(p.interests);
      if (next.has(interest)) next.delete(interest);
      else next.add(interest);
      return { ...p, interests: next };
    });
  };

  // PUBLIC_INTERFACE
  const validatePlanner = () => {
    /** This is a public function. */
    const errors = {};
    const destination = planner.destination.trim();

    if (!destination) errors.destination = "Please enter a destination.";
    if (destination.length > 60)
      errors.destination = "Destination is too long (max 60 characters).";

    const nights = Number(planner.nights);
    if (!Number.isFinite(nights) || nights < 1 || nights > 60) {
      errors.nights = "Nights must be between 1 and 60.";
    }

    const budget = Number(planner.budget);
    if (!Number.isFinite(budget) || budget < 1000) {
      errors.budget = "Budget must be at least 1,000.";
    }

    const travelers = Number(planner.travelers);
    if (!Number.isFinite(travelers) || travelers < 1 || travelers > 12) {
      errors.travelers = "Travelers must be between 1 and 12.";
    }

    if (!planner.startDate) errors.startDate = "Select a start date.";
    if (!planner.endDate) errors.endDate = "Select an end date.";

    if (planner.startDate && planner.endDate) {
      const s = new Date(planner.startDate);
      const e = new Date(planner.endDate);
      if (Number.isNaN(s.getTime()) || Number.isNaN(e.getTime())) {
        errors.dates = "Please provide valid dates.";
      } else if (e < s) {
        errors.dates = "End date must be after start date.";
      }
    }

    if (!planner.interests || planner.interests.size === 0) {
      errors.interests = "Select at least one interest.";
    }

    setValidation(errors);
    return Object.keys(errors).length === 0;
  };

  // PUBLIC_INTERFACE
  const onPlanTrip = async (e) => {
    /** This is a public function. */
    e.preventDefault();

    if (!validatePlanner()) {
      setPlanResult(null);
      return;
    }

    setIsPlanning(true);
    setPlanResult(null);

    // Mock search handling: in future, call backend / quotes / itinerary generator.
    // Keeping it local-only per requirements.
    await new Promise((r) => setTimeout(r, 450));

    const matchedQuotes = MOCK_QUOTES.filter((q) => {
      const withinBudget = q.price <= Number(planner.budget) * 1.15;
      const typeMatch =
        planner.tripType === "Domestic"
          ? /india/i.test(q.destination)
          : !/india/i.test(q.destination);
      const interestMatch = q.tags.some((t) => planner.interests.has(t));
      return withinBudget && typeMatch && interestMatch;
    });

    const top = matchedQuotes.length
      ? pickQuotes(matchedQuotes, 3, quoteSeed + 10)
      : quotes;

    setPlanResult({
      summary: `Plan ready for ${planner.destination} • ${planner.nights} night(s) • ${planner.tripType}`,
      tips: [
        `Use interests (${Array.from(planner.interests).join(
          ", "
        )}) to refine experiences.`,
        `Try shifting dates for better prices and availability.`,
        `Save your quote and book later when you're ready.`,
      ],
      recommendedQuotes: top,
    });

    setIsPlanning(false);

    // IMPORTANT: Keep navigation click-only.
    // We do NOT auto-scroll users after planning; they can choose where to go next.
  };

  const headerStyles = useMemo(
    () => ({
      shell: {
        position: "sticky",
        top: 0,
        zIndex: 20,
        backdropFilter: "saturate(180%) blur(12px)",
        background: "rgba(249, 250, 251, 0.88)",
        borderBottom: `1px solid ${
          scrolled ? "rgba(17, 24, 39, 0.14)" : "rgba(17, 24, 39, 0.10)"
        }`,
        boxShadow: scrolled ? "0 14px 30px rgba(17, 24, 39, 0.10)" : "none",
        transition: "box-shadow 180ms ease, border-color 180ms ease",
      },
      row: {
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
        padding: "12px 0",
      },
      brand: {
        display: "flex",
        alignItems: "center",
        gap: 10,
        minWidth: 220,
        textAlign: "left",
      },
      logo: {
        width: 38,
        height: 38,
        borderRadius: 14,
        background: `linear-gradient(135deg, ${THEME.primary}, ${THEME.secondary})`,
        boxShadow: THEME.shadowSm,
      },
      titleWrap: { display: "flex", flexDirection: "column" },
      title: {
        fontSize: 15,
        fontWeight: 900,
        letterSpacing: "-0.02em",
        margin: 0,
        lineHeight: 1.1,
      },
      subtitle: {
        margin: 0,
        fontSize: 12,
        color: THEME.mutedText,
      },
      nav: {
        display: "flex",
        alignItems: "center",
        gap: 6,
        flexWrap: "wrap",
        justifyContent: "center",
      },
      navBtn: (active) => ({
        appearance: "none",
        border: `1px solid ${active ? "rgba(37, 99, 235, 0.28)" : "transparent"}`,
        background: active ? "rgba(37, 99, 235, 0.10)" : "transparent",
        color: THEME.text,
        padding: "9px 11px",
        borderRadius: 999,
        fontSize: 13,
        fontWeight: 750,
        cursor: "pointer",
        transition:
          "background 160ms ease, border-color 160ms ease, transform 120ms ease, box-shadow 160ms ease",
        outline: "none",
      }),
      right: { display: "flex", gap: 10, alignItems: "center", minWidth: 220 },
    }),
    [scrolled]
  );

  const primaryBtn = useMemo(
    () => ({
      appearance: "none",
      border: "1px solid rgba(37, 99, 235, 0.42)",
      background: `linear-gradient(135deg, ${THEME.primary}, #1D4ED8)`,
      color: "#fff",
      padding: "11px 14px",
      borderRadius: 12,
      fontSize: 13,
      fontWeight: 850,
      cursor: "pointer",
      boxShadow: THEME.shadowSm,
      transition:
        "transform 120ms ease, box-shadow 160ms ease, filter 160ms ease",
      outline: "none",
      whiteSpace: "nowrap",
    }),
    []
  );

  const secondaryBtn = useMemo(
    () => ({
      appearance: "none",
      border: `1px solid ${THEME.border}`,
      background: THEME.surface,
      color: THEME.text,
      padding: "11px 14px",
      borderRadius: 12,
      fontSize: 13,
      fontWeight: 850,
      cursor: "pointer",
      boxShadow: "none",
      transition:
        "transform 120ms ease, box-shadow 160ms ease, filter 160ms ease",
      outline: "none",
      whiteSpace: "nowrap",
    }),
    []
  );

  const accentBtn = useMemo(
    () => ({
      appearance: "none",
      border: "1px solid rgba(245, 158, 11, 0.38)",
      background: `linear-gradient(135deg, rgba(245, 158, 11, 0.20), rgba(245, 158, 11, 0.10))`,
      color: THEME.text,
      padding: "11px 14px",
      borderRadius: 12,
      fontSize: 13,
      fontWeight: 900,
      cursor: "pointer",
      transition:
        "transform 120ms ease, box-shadow 160ms ease, filter 160ms ease",
      outline: "none",
      whiteSpace: "nowrap",
    }),
    []
  );

  return (
    <div style={layout.page}>
      <a
        href="#planner"
        style={{
          position: "absolute",
          left: 10,
          top: -48,
          background: THEME.surface,
          padding: "10px 12px",
          borderRadius: 12,
          border: `1px solid ${THEME.border}`,
          color: THEME.text,
          textDecoration: "none",
          fontWeight: 900,
          outline: "none",
          boxShadow: THEME.shadowSm,
        }}
        onFocus={(e) => {
          e.currentTarget.style.top = "10px";
        }}
        onBlur={(e) => {
          e.currentTarget.style.top = "-48px";
        }}
      >
        Skip to planner
      </a>

      <header style={headerStyles.shell} aria-label="Primary header">
        <div style={layout.container}>
          <div style={headerStyles.row}>
            <div style={headerStyles.brand} aria-label="WEGO brand">
              <div style={headerStyles.logo} aria-hidden="true" />
              <div style={headerStyles.titleWrap}>
                <p style={headerStyles.title}>WEGO Travel Planner</p>
                <p style={headerStyles.subtitle}>
                  Business-ready itineraries • Consumer-friendly planning
                </p>
              </div>
            </div>

            <nav style={headerStyles.nav} aria-label="Primary navigation">
              <NavItem
                label="Home"
                targetId="home"
                active={activeNav === "home"}
                onClick={onNavClick}
                styleFn={headerStyles.navBtn}
              />
              <NavItem
                label="About"
                targetId="about"
                active={activeNav === "about"}
                onClick={onNavClick}
                styleFn={headerStyles.navBtn}
              />
              <NavItem
                label="Contact"
                targetId="contact"
                active={activeNav === "contact"}
                onClick={onNavClick}
                styleFn={headerStyles.navBtn}
              />
              <NavItem
                label="Privacy Policies"
                targetId="privacy-policies"
                active={activeNav === "privacy-policies"}
                onClick={onNavClick}
                styleFn={headerStyles.navBtn}
              />
            </nav>

            <div style={headerStyles.right}>
              {user ? (
                <button
                  type="button"
                  style={secondaryBtn}
                  onClick={signOut}
                  aria-label="Sign out"
                >
                  Sign Out
                </button>
              ) : (
                <button
                  type="button"
                  style={primaryBtn}
                  onClick={onOpenSignIn}
                  aria-haspopup="dialog"
                  aria-expanded={isSignInOpen}
                >
                  Sign In
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      {isSignInOpen ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Sign in dialog"
          onMouseDown={(e) => {
            // Close when clicking the backdrop (but not when clicking inside the modal)
            if (e.target === e.currentTarget) onCloseSignIn();
          }}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 50,
            background: "rgba(17, 24, 39, 0.45)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 16,
          }}
        >
          <div
            style={{
              width: "min(520px, 100%)",
              background: THEME.surface,
              borderRadius: 18,
              border: `1px solid ${THEME.border}`,
              boxShadow: THEME.shadow,
              overflow: "hidden",
              textAlign: "left",
            }}
          >
            <div
              style={{
                padding: 16,
                borderBottom: `1px solid ${THEME.border}`,
                background:
                  "linear-gradient(135deg, rgba(37, 99, 235, 0.08), rgba(245, 158, 11, 0.06))",
                display: "flex",
                alignItems: "start",
                justifyContent: "space-between",
                gap: 12,
              }}
            >
              <div>
                <h2 style={{ margin: 0, fontSize: 18, letterSpacing: "-0.02em" }}>
                  Sign in
                </h2>
                <p
                  style={{
                    margin: "6px 0 0",
                    color: THEME.mutedText,
                    fontSize: 13,
                  }}
                >
                  Continue with Google to save plans and personalize your
                  experience.
                </p>
              </div>

              <button
                type="button"
                onClick={onCloseSignIn}
                aria-label="Close sign in dialog"
                style={{
                  appearance: "none",
                  border: `1px solid ${THEME.border}`,
                  background: THEME.surface,
                  color: THEME.text,
                  width: 38,
                  height: 38,
                  borderRadius: 12,
                  cursor: "pointer",
                  fontWeight: 900,
                  lineHeight: 1,
                  outline: "none",
                }}
              >
                ×
              </button>
            </div>

            <div style={{ padding: 16 }}>
              <button
                type="button"
                style={{
                  ...secondaryBtn,
                  width: "100%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 10,
                  padding: "12px 14px",
                  opacity: authBusy ? 0.85 : 1,
                  cursor: authBusy ? "progress" : "pointer",
                }}
                onClick={async () => {
                  await signInWithGoogle();
                  // Note: OAuth redirects, so usually the modal won't remain open.
                  // Still, we close it for immediate UX responsiveness.
                  onCloseSignIn();
                }}
                disabled={authBusy}
              >
                <span
                  aria-hidden="true"
                  style={{
                    width: 22,
                    height: 22,
                    borderRadius: 8,
                    background:
                      "linear-gradient(135deg, rgba(17,24,39,0.08), rgba(17,24,39,0.02))",
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    border: `1px solid ${THEME.border}`,
                    fontSize: 12,
                    fontWeight: 900,
                  }}
                >
                  G
                </span>
                Continue with Google
              </button>

              {authError ? (
                <div
                  role="status"
                  aria-live="polite"
                  style={{
                    marginTop: 12,
                    padding: 12,
                    borderRadius: 14,
                    border: "1px solid rgba(239, 68, 68, 0.35)",
                    background: "rgba(239, 68, 68, 0.08)",
                    color: "#B91C1C",
                    fontSize: 13,
                    lineHeight: 1.5,
                    fontWeight: 800,
                  }}
                >
                  {authError}
                </div>
              ) : null}

              <div
                style={{
                  marginTop: 12,
                  padding: 12,
                  borderRadius: 14,
                  border: `1px solid ${THEME.border}`,
                  background: THEME.background,
                  color: THEME.mutedText,
                  fontSize: 13,
                  lineHeight: 1.5,
                }}
              >
                <strong style={{ color: THEME.text }}>Note:</strong> WEGO uses
                Supabase Auth. If you see a provider or redirect error, confirm
                your Supabase Google provider settings and allowed redirect URLs.
              </div>
            </div>
          </div>
        </div>
      ) : null}

      <main>
        {/* HOME / HERO */}
        <section
          id="home"
          style={{ ...layout.section, paddingTop: 34 }}
          aria-label="Hero section"
        >
          <div style={layout.container}>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1.1fr 0.9fr",
                gap: 18,
                alignItems: "stretch",
              }}
            >
              <div
                style={{
                  ...layout.card,
                  padding: 24,
                  background:
                    "linear-gradient(135deg, rgba(37, 99, 235, 0.10), rgba(245, 158, 11, 0.08))",
                  textAlign: "left",
                }}
              >
                <div
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "8px 12px",
                    borderRadius: 999,
                    border: "1px solid rgba(37, 99, 235, 0.22)",
                    background: "rgba(255,255,255,0.62)",
                    color: THEME.text,
                    fontWeight: 900,
                    fontSize: 12,
                    letterSpacing: "0.01em",
                    width: "fit-content",
                  }}
                >
                  <span
                    aria-hidden="true"
                    style={{
                      width: 10,
                      height: 10,
                      borderRadius: 999,
                      background: THEME.primary,
                      boxShadow: "0 0 0 4px rgba(37, 99, 235, 0.16)",
                    }}
                  />
                  WEGO Travel Planner for businesses and travelers
                </div>

                <h1
                  style={{
                    margin: "14px 0 10px",
                    fontSize: 38,
                    letterSpacing: "-0.03em",
                    lineHeight: 1.08,
                  }}
                >
                  Professional trip planning, without booking pressure.
                </h1>
                <p
                  style={{
                    margin: "0 0 14px",
                    color: THEME.mutedText,
                    lineHeight: 1.6,
                    fontSize: 15,
                    maxWidth: 640,
                  }}
                >
                  Build clear itineraries for teams or personal travel—based on
                  budget, duration, and interests. Start planning now, review
                  curated quote ideas, and book when you’re ready.
                </p>

                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: 10,
                    marginTop: 14,
                  }}
                  aria-label="Hero actions"
                >
                  {/* CTA must require click (no auto open). Click scrolls to general info area. */}
                  <button
                    type="button"
                    style={primaryBtn}
                    onClick={() => onNavClick("info")}
                  >
                    See how WEGO works
                  </button>
                  <button
                    type="button"
                    style={accentBtn}
                    onClick={() => onNavClick("planner")}
                  >
                    Open planner
                  </button>
                </div>

                <div
                  style={{
                    marginTop: 18,
                    display: "grid",
                    gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
                    gap: 10,
                  }}
                >
                  <StatChip label="For teams" value="Consistent itineraries" />
                  <StatChip label="For travelers" value="Fast planning flow" />
                  <StatChip label="For everyone" value="Transparent options" />
                </div>
              </div>

              <div style={{ ...layout.card, padding: 18, textAlign: "left" }}>
                <h2 style={{ ...layout.sectionTitle, marginBottom: 10 }}>
                  Today’s highlights
                </h2>
                <p style={{ ...layout.sectionSubtitle, marginBottom: 14 }}>
                  Mocked quote suggestions (backend integration will replace this
                  soon).
                </p>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr",
                    gap: 10,
                  }}
                >
                  {quotes.slice(0, 2).map((q) => (
                    <QuoteCard
                      key={q.id}
                      quote={q}
                      compact
                      onCta={() => {
                        // Future integration: route to quote details page
                        // eslint-disable-next-line no-alert
                        alert(
                          `View Details placeholder\n\nDestination: ${
                            q.destination
                          }\nSample price: ${formatINR(q.price)}`
                        );
                      }}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* GENERAL INFO AREA (hero CTA scroll target) */}
        <section id="info" style={{ ...layout.section, paddingTop: 10 }}>
          <div style={layout.container}>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr",
                gap: 12,
              }}
            >
              <div
                style={{
                  ...layout.card,
                  padding: 18,
                  textAlign: "left",
                }}
              >
                <h2 style={layout.sectionTitle}>Designed for clarity</h2>
                <p style={{ ...layout.sectionSubtitle, marginBottom: 0 }}>
                  WEGO is a lightweight planning UI. It focuses on{" "}
                  <strong>structured inputs</strong>,{" "}
                  <strong>local validation</strong>, and{" "}
                  <strong>clear next steps</strong>—without auto-opening sections
                  or forcing navigation. Use the header links to jump to About,
                  Contact, or Privacy Policies only when you choose.
                </p>
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
                  gap: 12,
                }}
              >
                <InfoCard
                  title="Predictable navigation"
                  text="Sections only scroll into view on explicit clicks—no mount-time auto-scroll."
                />
                <InfoCard
                  title="Professional UI"
                  text="Consistent typography, spacing, and subtle hover/focus depth to match Ocean Professional."
                />
                <InfoCard
                  title="Built for iteration"
                  text="Mock data today; ready for real quotes, saved itineraries, and authentication later."
                />
              </div>
            </div>
          </div>
        </section>

        {/* PLANNER */}
        <section id="planner" style={layout.section} aria-label="Planner section">
          <div style={layout.container}>
            <h2 style={layout.sectionTitle}>Planner</h2>
            <p style={layout.sectionSubtitle}>
              Enter your trip preferences. We’ll validate locally and suggest
              matching quote ideas. (Future: generate a full itinerary and fetch
              real prices.)
            </p>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1.15fr 0.85fr",
                gap: 18,
                alignItems: "start",
              }}
            >
              <PlannerPanel
                planner={planner}
                validation={validation}
                isPlanning={isPlanning}
                onSubmit={onPlanTrip}
                onFieldChange={updatePlannerField}
                onToggleInterest={toggleInterest}
              />

              <div style={{ ...layout.card, padding: 16, textAlign: "left" }}>
                <h3
                  style={{
                    margin: "0 0 10px",
                    fontSize: 16,
                    letterSpacing: "-0.01em",
                  }}
                >
                  Helper hints
                </h3>

                <Hint
                  title="Destination"
                  text="Try city + country (e.g., “Bali, Indonesia”)."
                />
                <Hint
                  title="Budget"
                  text="Set a flexible ceiling; prices shown are sample estimates."
                />
                <Hint
                  title="Interests"
                  text="Pick what matters most—WEGO prioritizes matching experiences."
                />

                <div
                  style={{
                    marginTop: 14,
                    padding: 12,
                    borderRadius: 14,
                    border: `1px solid ${THEME.border}`,
                    background:
                      "linear-gradient(135deg, rgba(37, 99, 235, 0.06), rgba(245, 158, 11, 0.05))",
                  }}
                >
                  <p style={{ margin: 0, fontWeight: 900 }}>
                    Tip: Save time with Google Sign-In
                  </p>
                  <p style={{ margin: "6px 0 0", color: THEME.mutedText }}>
                    Sign in enables saved plans and personalized recommendations.
                  </p>
                </div>

                {planResult ? (
                  <div style={{ marginTop: 16 }}>
                    <h4 style={{ margin: "0 0 8px" }}>Latest plan</h4>
                    <div
                      style={{
                        padding: 12,
                        borderRadius: 14,
                        background: THEME.background,
                        border: `1px solid ${THEME.border}`,
                      }}
                    >
                      <p style={{ margin: 0, fontWeight: 900 }}>
                        {planResult.summary}
                      </p>
                      <ul
                        style={{
                          margin: "8px 0 0",
                          paddingLeft: 18,
                          color: THEME.mutedText,
                        }}
                      >
                        {planResult.tips.map((t, idx) => (
                          <li key={idx}>{t}</li>
                        ))}
                      </ul>

                      {/* CTA must require click; no auto navigation */}
                      <div
                        style={{
                          display: "flex",
                          gap: 10,
                          marginTop: 12,
                          flexWrap: "wrap",
                        }}
                      >
                        <button
                          type="button"
                          style={secondaryBtn}
                          onClick={() => onNavClick("quotes")}
                        >
                          View matching quotes
                        </button>
                        <button
                          type="button"
                          style={accentBtn}
                          onClick={() => onNavClick("contact")}
                        >
                          Share feedback
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div style={{ marginTop: 16 }}>
                    <h4 style={{ margin: "0 0 8px" }}>Preview</h4>
                    <p style={{ margin: 0, color: THEME.mutedText }}>
                      Submit the planner to generate a quick summary and matching
                      quote suggestions.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* QUOTES */}
        <section id="quotes" style={layout.section} aria-label="Quotes section">
          <div style={layout.container}>
            <div
              style={{
                display: "flex",
                alignItems: "end",
                justifyContent: "space-between",
                gap: 12,
                flexWrap: "wrap",
                marginBottom: 12,
              }}
            >
              <div style={{ textAlign: "left" }}>
                <h2 style={layout.sectionTitle}>Quotes</h2>
                <p style={{ ...layout.sectionSubtitle, marginBottom: 0 }}>
                  Dynamic quote cards (mocked). Refresh anytime or adjust inputs
                  in the planner for more relevant suggestions.
                </p>
              </div>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <button
                  type="button"
                  style={secondaryBtn}
                  onClick={() => onNavClick("planner")}
                >
                  Update preferences
                </button>
                <button type="button" style={primaryBtn} onClick={refreshQuotes}>
                  Rotate quotes
                </button>
              </div>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
                gap: 12,
              }}
            >
              {(planResult?.recommendedQuotes || quotes).map((q) => (
                <QuoteCard
                  key={q.id}
                  quote={q}
                  onCta={() => {
                    // Future integration: route to quote details / booking flow
                    // eslint-disable-next-line no-alert
                    alert(
                      `Book later placeholder\n\nWe will add “Save quote” + checkout later.\nDestination: ${q.destination}`
                    );
                  }}
                />
              ))}
            </div>

            <div
              style={{
                marginTop: 12,
                padding: 12,
                borderRadius: 16,
                background: THEME.surface,
                border: `1px dashed rgba(37, 99, 235, 0.35)`,
                color: THEME.mutedText,
                textAlign: "left",
              }}
              role="note"
              aria-label="Quotes note"
            >
              Prices and ratings shown are mocked locally. Future iterations will
              integrate real inventory and live pricing.
            </div>
          </div>
        </section>

        {/* REVIEWS */}
        <section id="reviews" style={layout.section} aria-label="Reviews section">
          <div style={layout.container}>
            <h2 style={layout.sectionTitle}>Reviews</h2>
            <p style={layout.sectionSubtitle}>
              What travelers say about planning with WEGO (sample data for now).
            </p>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                gap: 12,
              }}
            >
              {MOCK_REVIEWS.map((r) => (
                <ReviewItem key={r.id} review={r} />
              ))}
            </div>
          </div>
        </section>

        {/* ABOUT */}
        <section id="about" style={layout.section} aria-label="About section">
          <div style={layout.container}>
            <h2 style={layout.sectionTitle}>About WEGO</h2>
            <p style={layout.sectionSubtitle}>
              WEGO helps businesses and travelers plan with speed and confidence:
              structured preferences, clear outputs, and transparent choices.
              Today’s UI is a foundation for future integrations: live quotes,
              saved itineraries, and secure authentication.
            </p>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
                gap: 12,
              }}
            >
              <InfoCard
                title="Modern planning"
                text="Budget, duration, trip type, and interests—all in one panel."
              />
              <InfoCard
                title="Curated suggestions"
                text="Mocked quote rotation now. Future: real-time inventory and smart ranking."
              />
              <InfoCard
                title="Trust & clarity"
                text="Clear policies, simple contact options, and accessible UI."
              />
            </div>
          </div>
        </section>

        {/* CONTACT */}
        <section id="contact" style={layout.section} aria-label="Contact section">
          <div style={layout.container}>
            <h2 style={layout.sectionTitle}>Contact Us</h2>
            <p style={layout.sectionSubtitle}>
              Have feedback or partnership inquiries? Send a message below. (No-op
              submit for now.)
            </p>

            <div style={{ ...layout.card, padding: 16 }}>
              <ContactForm />
            </div>
          </div>
        </section>

        {/* PRIVACY POLICIES */}
        <section
          id="privacy-policies"
          style={{ ...layout.section, paddingBottom: 62 }}
          aria-label="Privacy policies section"
        >
          <div style={layout.container}>
            <h2 style={layout.sectionTitle}>Privacy Policies</h2>
            <p style={layout.sectionSubtitle}>
              A concise overview of how a typical travel planning app handles data.
              This demo UI does not currently send personal data to a backend.
            </p>

            <div style={{ ...layout.card, padding: 16, textAlign: "left" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 14 }}>
                <div>
                  <h3 style={{ margin: "0 0 6px", fontSize: 16 }}>
                    Data we may collect
                  </h3>
                  <ul style={{ margin: 0, paddingLeft: 18, color: THEME.mutedText }}>
                    <li>
                      <strong style={{ color: THEME.text }}>User profile</strong>:
                      name, email, and basic account details (when sign-in is enabled).
                    </li>
                    <li>
                      <strong style={{ color: THEME.text }}>Trip preferences</strong>:
                      destination, dates, budget, travelers, and interests you enter in the planner.
                    </li>
                    <li>
                      <strong style={{ color: THEME.text }}>Usage data</strong>:
                      interactions and basic diagnostics to improve performance and reliability.
                    </li>
                  </ul>
                </div>

                <div>
                  <h3 style={{ margin: "0 0 6px", fontSize: 16 }}>
                    How we use information
                  </h3>
                  <ul style={{ margin: 0, paddingLeft: 18, color: THEME.mutedText }}>
                    <li>Personalize recommendations and suggested trip ideas.</li>
                    <li>Facilitate booking workflows (e.g., saving quotes, checkout later).</li>
                    <li>Maintain security, prevent abuse, and troubleshoot issues.</li>
                  </ul>
                </div>

                <div>
                  <h3 style={{ margin: "0 0 6px", fontSize: 16 }}>
                    Storage & retention
                  </h3>
                  <p style={{ margin: 0, color: THEME.mutedText, lineHeight: 1.55 }}>
                    When accounts are enabled, we retain data only as long as needed to
                    provide the service and meet legal/operational obligations. You may
                    request deletion as described below.
                  </p>
                </div>

                <div>
                  <h3 style={{ margin: "0 0 6px", fontSize: 16 }}>
                    Third‑party sharing
                  </h3>
                  <p style={{ margin: 0, color: THEME.mutedText, lineHeight: 1.55 }}>
                    We may share limited data with service providers that help operate the app,
                    such as <strong style={{ color: THEME.text }}>analytics</strong> tools and
                    <strong style={{ color: THEME.text }}> authentication providers</strong> (e.g., Google)
                    when you choose to sign in. We do not sell personal information.
                  </p>
                </div>

                <div>
                  <h3 style={{ margin: "0 0 6px", fontSize: 16 }}>
                    Cookies & tracking
                  </h3>
                  <p style={{ margin: 0, color: THEME.mutedText, lineHeight: 1.55 }}>
                    Cookies or similar technologies may be used for session management,
                    preferences, and basic analytics. You can manage cookies through your browser settings.
                  </p>
                </div>

                <div>
                  <h3 style={{ margin: "0 0 6px", fontSize: 16 }}>
                    Your rights
                  </h3>
                  <ul style={{ margin: 0, paddingLeft: 18, color: THEME.mutedText }}>
                    <li>Access or request a copy of your information.</li>
                    <li>Correct inaccurate information.</li>
                    <li>Request deletion of your account and associated data (where applicable).</li>
                    <li>Opt out of certain analytics or marketing communications (if enabled).</li>
                  </ul>
                </div>

                <div>
                  <h3 style={{ margin: "0 0 6px", fontSize: 16 }}>
                    Contact
                  </h3>
                  <p style={{ margin: 0, color: THEME.mutedText, lineHeight: 1.55 }}>
                    For privacy questions or requests, contact:{" "}
                    <strong style={{ color: THEME.text }}>
                      privacy@yourcompany.example
                    </strong>{" "}
                    (placeholder).
                  </p>
                </div>

                <div
                  style={{
                    paddingTop: 10,
                    borderTop: `1px solid ${THEME.border}`,
                    color: THEME.mutedText,
                    fontSize: 13,
                  }}
                >
                  <strong style={{ color: THEME.text }}>Effective date:</strong>{" "}
                  2026-01-06
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer
        style={{
          borderTop: `1px solid ${THEME.border}`,
          background: "rgba(255, 255, 255, 0.65)",
          padding: "18px 0",
        }}
        aria-label="Footer"
      >
        <div style={layout.container}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 10,
              flexWrap: "wrap",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div
                aria-hidden="true"
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 10,
                  background: `linear-gradient(135deg, ${THEME.primary}, ${THEME.secondary})`,
                }}
              />
              <p style={{ margin: 0, color: THEME.mutedText, fontWeight: 800 }}>
                © {new Date().getFullYear()} WEGO • Travel Planner UI
              </p>
            </div>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              <button
                type="button"
                onClick={() => onNavClick("contact")}
                style={{
                  ...secondaryBtn,
                  padding: "8px 12px",
                  borderRadius: 999,
                }}
              >
                Contact
              </button>
              <button
                type="button"
                onClick={() => onNavClick("privacy-policies")}
                style={{
                  ...secondaryBtn,
                  padding: "8px 12px",
                  borderRadius: 999,
                }}
              >
                Privacy Policies
              </button>
            </div>
          </div>
        </div>
      </footer>

      {/* Lightweight responsive overrides + hover/focus polish without mount transitions */}
      <style>{`
        :root {
          --wego-focus: rgba(37, 99, 235, 0.45);
        }

        /* Ensure focus outlines are visible and accessible */
        :where(button, a, input, select, textarea):focus-visible {
          outline: 3px solid var(--wego-focus);
          outline-offset: 2px;
        }

        /* Subtle hover/focus transitions (not on mount) */
        button:hover {
          transform: translateY(-1px);
        }
        button:active {
          transform: translateY(0);
        }

        /* Card hover depth (subtle) */
        [data-card="true"]:hover {
          transform: translateY(-2px);
          box-shadow: 0 14px 34px rgba(17, 24, 39, 0.12);
        }

        @media (max-width: 980px) {
          #home > div > div,
          #planner > div > div,
          #privacy-policies > div > div {
            grid-template-columns: 1fr !important;
          }

          #quotes > div > div:nth-of-type(2) {
            grid-template-columns: 1fr !important;
          }

          #info > div > div:nth-of-type(2) {
            grid-template-columns: 1fr !important;
          }
        }

        @media (max-width: 820px) {
          #quotes > div > div:nth-of-type(2) {
            grid-template-columns: 1fr !important;
          }
          #reviews > div > div:nth-of-type(3) {
            grid-template-columns: 1fr !important;
          }
        }

        @media (max-width: 720px) {
          /* Quote + review grids */
          #quotes > div > div:nth-of-type(2),
          #reviews > div > div:nth-of-type(3) {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
}

/**
 * NAV ITEM
 */
// PUBLIC_INTERFACE
function NavItem({ label, targetId, active, onClick, styleFn }) {
  /** This is a public function. */
  const [isFocused, setIsFocused] = useState(false);

  return (
    <a
      href={`#${targetId}`}
      onClick={(e) => {
        e.preventDefault();
        onClick(targetId);
      }}
      aria-current={active ? "page" : undefined}
      aria-label={`Go to ${label}`}
      onFocus={() => setIsFocused(true)}
      onBlur={() => setIsFocused(false)}
      style={{
        display: "inline-flex",
        textDecoration: "none",
      }}
    >
      <span
        style={{
          ...styleFn(active),
          boxShadow: isFocused ? `0 0 0 4px rgba(37, 99, 235, 0.16)` : "none",
        }}
      >
        {label}
      </span>
    </a>
  );
}

/**
 * PLANNER PANEL
 */
// PUBLIC_INTERFACE
function PlannerPanel({
  planner,
  validation,
  isPlanning,
  onSubmit,
  onFieldChange,
  onToggleInterest,
}) {
  /** This is a public function. */
  const fieldStyle = {
    width: "100%",
    padding: "10px 12px",
    borderRadius: 12,
    border: `1px solid ${THEME.border}`,
    background: THEME.surface,
    outline: "none",
    fontSize: 14,
  };

  const labelStyle = {
    fontSize: 12,
    fontWeight: 900,
    marginBottom: 6,
    display: "block",
    letterSpacing: "0.01em",
  };

  const helpStyle = {
    marginTop: 6,
    color: THEME.mutedText,
    fontSize: 12,
    lineHeight: 1.4,
  };

  const errorStyle = {
    marginTop: 6,
    color: "#B91C1C",
    fontSize: 12,
    fontWeight: 800,
  };

  const panelCard = {
    background: THEME.surface,
    border: `1px solid ${THEME.border}`,
    borderRadius: 18,
    boxShadow: THEME.shadow,
    overflow: "hidden",
    textAlign: "left",
  };

  const header = {
    padding: 16,
    borderBottom: `1px solid ${THEME.border}`,
    background:
      "linear-gradient(135deg, rgba(37, 99, 235, 0.07), rgba(245, 158, 11, 0.06))",
  };

  const body = { padding: 16 };

  return (
    <div style={panelCard} aria-label="Planner panel">
      <div style={header}>
        <h3 style={{ margin: 0, fontSize: 16, letterSpacing: "-0.01em" }}>
          Trip preferences
        </h3>
        <p style={{ margin: "6px 0 0", color: THEME.mutedText }}>
          Fill the essentials. Fields marked required help shape suggestions.
        </p>
      </div>

      <form onSubmit={onSubmit} style={body} noValidate>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
            gap: 12,
          }}
        >
          <div style={{ gridColumn: "1 / -1" }}>
            <label style={labelStyle} htmlFor="destination">
              Destination <span aria-hidden="true">*</span>
            </label>
            <input
              id="destination"
              name="destination"
              type="text"
              value={planner.destination}
              onChange={(e) => onFieldChange("destination", e.target.value)}
              placeholder="e.g., Bali, Indonesia"
              style={{
                ...fieldStyle,
                borderColor: validation.destination
                  ? "rgba(185, 28, 28, 0.4)"
                  : THEME.border,
              }}
              aria-invalid={Boolean(validation.destination)}
              aria-describedby="destination_help destination_error"
              autoComplete="off"
              required
            />
            <div id="destination_help" style={helpStyle}>
              Keep it specific for better suggestions.
            </div>
            {validation.destination ? (
              <div id="destination_error" style={errorStyle}>
                {validation.destination}
              </div>
            ) : null}
          </div>

          <div>
            <label style={labelStyle} htmlFor="tripType">
              Trip type
            </label>
            <select
              id="tripType"
              name="tripType"
              value={planner.tripType}
              onChange={(e) => onFieldChange("tripType", e.target.value)}
              style={fieldStyle}
              aria-label="Trip type"
            >
              <option value="Domestic">Domestic</option>
              <option value="International">International</option>
            </select>
            <div style={helpStyle}>
              Domestic is matched to “India” destinations in mock data.
            </div>
          </div>

          <div>
            <label style={labelStyle} htmlFor="nights">
              Duration (nights) <span aria-hidden="true">*</span>
            </label>
            <input
              id="nights"
              name="nights"
              type="number"
              min={1}
              max={60}
              value={planner.nights}
              onChange={(e) =>
                onFieldChange("nights", clamp(Number(e.target.value), 1, 60))
              }
              style={{
                ...fieldStyle,
                borderColor: validation.nights
                  ? "rgba(185, 28, 28, 0.4)"
                  : THEME.border,
              }}
              aria-invalid={Boolean(validation.nights)}
              aria-describedby="nights_help nights_error"
              required
            />
            <div id="nights_help" style={helpStyle}>
              1–60 nights.
            </div>
            {validation.nights ? (
              <div id="nights_error" style={errorStyle}>
                {validation.nights}
              </div>
            ) : null}
          </div>

          <div>
            <label style={labelStyle} htmlFor="budget">
              Budget (INR) <span aria-hidden="true">*</span>
            </label>
            <input
              id="budget"
              name="budget"
              type="number"
              min={1000}
              value={planner.budget}
              onChange={(e) =>
                onFieldChange("budget", Math.max(0, Number(e.target.value)))
              }
              style={{
                ...fieldStyle,
                borderColor: validation.budget
                  ? "rgba(185, 28, 28, 0.4)"
                  : THEME.border,
              }}
              aria-invalid={Boolean(validation.budget)}
              aria-describedby="budget_help budget_error"
              required
            />
            <div id="budget_help" style={helpStyle}>
              Example: 50000 for mid-range trips.
            </div>
            {validation.budget ? (
              <div id="budget_error" style={errorStyle}>
                {validation.budget}
              </div>
            ) : null}
          </div>

          <div>
            <label style={labelStyle} htmlFor="travelers">
              Travelers <span aria-hidden="true">*</span>
            </label>
            <input
              id="travelers"
              name="travelers"
              type="number"
              min={1}
              max={12}
              value={planner.travelers}
              onChange={(e) =>
                onFieldChange("travelers", clamp(Number(e.target.value), 1, 12))
              }
              style={{
                ...fieldStyle,
                borderColor: validation.travelers
                  ? "rgba(185, 28, 28, 0.4)"
                  : THEME.border,
              }}
              aria-invalid={Boolean(validation.travelers)}
              aria-describedby="travelers_help travelers_error"
              required
            />
            <div id="travelers_help" style={helpStyle}>
              Great for solo, couples, and small groups.
            </div>
            {validation.travelers ? (
              <div id="travelers_error" style={errorStyle}>
                {validation.travelers}
              </div>
            ) : null}
          </div>

          <div>
            <label style={labelStyle} htmlFor="startDate">
              Start date <span aria-hidden="true">*</span>
            </label>
            <input
              id="startDate"
              name="startDate"
              type="date"
              value={planner.startDate}
              onChange={(e) => onFieldChange("startDate", e.target.value)}
              style={{
                ...fieldStyle,
                borderColor:
                  validation.startDate || validation.dates
                    ? "rgba(185, 28, 28, 0.4)"
                    : THEME.border,
              }}
              aria-invalid={Boolean(validation.startDate || validation.dates)}
              aria-describedby="dates_help dates_error"
              required
            />
          </div>

          <div>
            <label style={labelStyle} htmlFor="endDate">
              End date <span aria-hidden="true">*</span>
            </label>
            <input
              id="endDate"
              name="endDate"
              type="date"
              value={planner.endDate}
              onChange={(e) => onFieldChange("endDate", e.target.value)}
              style={{
                ...fieldStyle,
                borderColor:
                  validation.endDate || validation.dates
                    ? "rgba(185, 28, 28, 0.4)"
                    : THEME.border,
              }}
              aria-invalid={Boolean(validation.endDate || validation.dates)}
              aria-describedby="dates_help dates_error"
              required
            />
          </div>

          <div style={{ gridColumn: "1 / -1" }}>
            <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
              <label style={{ ...labelStyle, marginBottom: 0 }}>
                Interests <span aria-hidden="true">*</span>
              </label>
              <span
                id="dates_help"
                style={{ color: THEME.mutedText, fontSize: 12 }}
              >
                Choose at least one.
              </span>
            </div>

            <fieldset
              style={{
                border: "none",
                padding: 0,
                margin: "10px 0 0",
              }}
              aria-label="Interests"
            >
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
                  gap: 10,
                }}
              >
                {INTERESTS.map((i) => {
                  const checked = planner.interests.has(i);
                  return (
                    <label
                      key={i}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                        padding: "10px 12px",
                        borderRadius: 12,
                        border: `1px solid ${
                          checked ? "rgba(37, 99, 235, 0.35)" : THEME.border
                        }`,
                        background: checked
                          ? "rgba(37, 99, 235, 0.08)"
                          : THEME.surface,
                        cursor: "pointer",
                        userSelect: "none",
                        transition: "transform 120ms ease, box-shadow 160ms ease",
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => onToggleInterest(i)}
                        aria-label={i}
                      />
                      <span style={{ fontWeight: 800, fontSize: 13 }}>{i}</span>
                    </label>
                  );
                })}
              </div>
            </fieldset>

            {validation.interests ? (
              <div id="dates_error" style={errorStyle}>
                {validation.interests}
              </div>
            ) : validation.dates ? (
              <div id="dates_error" style={errorStyle}>
                {validation.dates}
              </div>
            ) : null}

            <div
              style={{
                marginTop: 14,
                display: "flex",
                gap: 10,
                flexWrap: "wrap",
              }}
            >
              <button
                type="submit"
                style={{
                  appearance: "none",
                  border: "1px solid rgba(37, 99, 235, 0.42)",
                  background: `linear-gradient(135deg, ${THEME.primary}, #1D4ED8)`,
                  color: "#fff",
                  padding: "10px 14px",
                  borderRadius: 12,
                  fontSize: 14,
                  fontWeight: 900,
                  cursor: isPlanning ? "progress" : "pointer",
                  opacity: isPlanning ? 0.85 : 1,
                  boxShadow: THEME.shadowSm,
                  outline: "none",
                  transition:
                    "transform 120ms ease, box-shadow 160ms ease, filter 160ms ease",
                }}
                aria-busy={isPlanning}
              >
                {isPlanning ? "Planning..." : "Search / Plan Trip"}
              </button>

              <button
                type="button"
                onClick={() => {
                  // Quick reset (client-side only)
                  const d = new Date();
                  const end = new Date();
                  end.setDate(end.getDate() + 7);
                  onFieldChange("destination", "");
                  onFieldChange("tripType", "Domestic");
                  onFieldChange("nights", 4);
                  onFieldChange("budget", 50000);
                  onFieldChange("travelers", 2);
                  onFieldChange("startDate", toISODateLocal(d));
                  onFieldChange("endDate", toISODateLocal(end));
                }}
                style={{
                  appearance: "none",
                  border: `1px solid ${THEME.border}`,
                  background: THEME.surface,
                  color: THEME.text,
                  padding: "10px 14px",
                  borderRadius: 12,
                  fontSize: 14,
                  fontWeight: 900,
                  cursor: "pointer",
                  outline: "none",
                  transition:
                    "transform 120ms ease, box-shadow 160ms ease, filter 160ms ease",
                }}
              >
                Reset
              </button>
            </div>

            <p style={{ ...helpStyle, marginTop: 12 }}>
              By continuing, you agree this is a demo experience. Future releases
              will provide live pricing and booking.
            </p>
          </div>
        </div>
      </form>
    </div>
  );
}

/**
 * QUOTE CARD
 */
// PUBLIC_INTERFACE
function QuoteCard({ quote, onCta, compact = false }) {
  /** This is a public function. */
  const ratingPct = (clamp(quote.rating, 0, 5) / 5) * 100;

  return (
    <div
      data-card="true"
      style={{
        background: THEME.surface,
        border: `1px solid ${THEME.border}`,
        borderRadius: 18,
        padding: compact ? 12 : 14,
        boxShadow: THEME.shadowSm,
        display: "flex",
        flexDirection: "column",
        gap: 10,
        minHeight: compact ? "auto" : 180,
        transition: "transform 140ms ease, box-shadow 180ms ease",
      }}
      aria-label={`Quote card for ${quote.destination}`}
    >
      <div
        style={{
          display: "flex",
          alignItems: "start",
          justifyContent: "space-between",
          gap: 10,
        }}
      >
        <div style={{ textAlign: "left" }}>
          <p style={{ margin: 0, fontWeight: 950, letterSpacing: "-0.01em" }}>
            {quote.destination}
          </p>
          <p style={{ margin: "6px 0 0", color: THEME.mutedText, fontSize: 13 }}>
            Sample from <strong>{formatINR(quote.price)}</strong> • {quote.nights}{" "}
            night(s)
          </p>
        </div>

        <div
          aria-label={`Rating ${quote.rating} out of 5`}
          style={{
            minWidth: 86,
            textAlign: "right",
          }}
        >
          <div
            style={{
              position: "relative",
              display: "inline-block",
              lineHeight: 1,
              fontSize: 14,
              letterSpacing: 1,
              color: "rgba(17, 24, 39, 0.22)",
            }}
          >
            {"★★★★★"}
            <div
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: `${ratingPct}%`,
                overflow: "hidden",
                color: THEME.secondary,
                whiteSpace: "nowrap",
              }}
              aria-hidden="true"
            >
              {"★★★★★"}
            </div>
          </div>
          <div style={{ marginTop: 6, fontSize: 12, color: THEME.mutedText }}>
            {quote.rating.toFixed(1)} / 5
          </div>
        </div>
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        {quote.tags.map((t) => (
          <span
            key={t}
            style={{
              fontSize: 12,
              fontWeight: 900,
              padding: "6px 10px",
              borderRadius: 999,
              border: `1px solid ${THEME.border}`,
              background: "rgba(17, 24, 39, 0.02)",
              color: THEME.text,
            }}
          >
            {t}
          </span>
        ))}
      </div>

      <div style={{ marginTop: "auto", display: "flex", gap: 10, flexWrap: "wrap" }}>
        <button
          type="button"
          onClick={onCta}
          style={{
            appearance: "none",
            border: "1px solid rgba(37, 99, 235, 0.42)",
            background: `linear-gradient(135deg, ${THEME.primary}, #1D4ED8)`,
            color: "#fff",
            padding: "10px 12px",
            borderRadius: 12,
            fontSize: 13,
            fontWeight: 900,
            cursor: "pointer",
            boxShadow: THEME.shadowSm,
            flex: 1,
            minWidth: 140,
            outline: "none",
            transition: "transform 120ms ease, box-shadow 160ms ease",
          }}
        >
          {compact ? "View Details" : "Book later"}
        </button>

        <button
          type="button"
          onClick={() => {
            // Future integration: add to favorites, saved quotes, etc.
            // eslint-disable-next-line no-alert
            alert("Saved placeholder: this quote will be saveable with auth soon.");
          }}
          style={{
            appearance: "none",
            border: `1px solid ${THEME.border}`,
            background: THEME.surface,
            color: THEME.text,
            padding: "10px 12px",
            borderRadius: 12,
            fontSize: 13,
            fontWeight: 900,
            cursor: "pointer",
            minWidth: 120,
            outline: "none",
            transition: "transform 120ms ease, box-shadow 160ms ease",
          }}
        >
          Save
        </button>
      </div>
    </div>
  );
}

/**
 * REVIEW ITEM
 */
// PUBLIC_INTERFACE
function ReviewItem({ review }) {
  /** This is a public function. */
  const ratingPct = (clamp(review.rating, 0, 5) / 5) * 100;

  return (
    <article
      data-card="true"
      style={{
        background: THEME.surface,
        border: `1px solid ${THEME.border}`,
        borderRadius: 18,
        padding: 14,
        boxShadow: THEME.shadowSm,
        display: "flex",
        flexDirection: "column",
        gap: 10,
        transition: "transform 140ms ease, box-shadow 180ms ease",
      }}
      aria-label={`Review by ${review.name}`}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div
          aria-hidden="true"
          style={{
            width: 40,
            height: 40,
            borderRadius: 14,
            background:
              "linear-gradient(135deg, rgba(37, 99, 235, 0.15), rgba(245, 158, 11, 0.15))",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontWeight: 950,
            color: THEME.text,
            border: `1px solid ${THEME.border}`,
          }}
        >
          {initialsFromName(review.name)}
        </div>

        <div style={{ flex: 1 }}>
          <p style={{ margin: 0, fontWeight: 950 }}>
            {review.name}{" "}
            <span style={{ color: THEME.mutedText, fontWeight: 800 }}>
              • {review.destination}
            </span>
          </p>
          <p style={{ margin: "4px 0 0", color: THEME.mutedText, fontSize: 12 }}>
            {new Date(review.date).toLocaleDateString(undefined, {
              year: "numeric",
              month: "short",
              day: "2-digit",
            })}
          </p>
        </div>

        <div
          aria-label={`Rating ${review.rating} out of 5`}
          style={{
            minWidth: 80,
            textAlign: "right",
          }}
        >
          <div
            style={{
              position: "relative",
              display: "inline-block",
              lineHeight: 1,
              fontSize: 14,
              letterSpacing: 1,
              color: "rgba(17, 24, 39, 0.22)",
            }}
          >
            {"★★★★★"}
            <div
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: `${ratingPct}%`,
                overflow: "hidden",
                color: THEME.secondary,
                whiteSpace: "nowrap",
              }}
              aria-hidden="true"
            >
              {"★★★★★"}
            </div>
          </div>
        </div>
      </div>

      <p style={{ margin: 0, color: THEME.text, lineHeight: 1.55 }}>
        {review.text}
      </p>
    </article>
  );
}

/**
 * CONTACT FORM (no-op submit)
 */
// PUBLIC_INTERFACE
function ContactForm() {
  /** This is a public function. */
  const [form, setForm] = useState({ name: "", email: "", message: "" });
  const [touched, setTouched] = useState({});
  const [status, setStatus] = useState("idle");

  const errors = useMemo(() => {
    const e = {};
    if (touched.name && !form.name.trim()) e.name = "Name is required.";
    if (touched.email) {
      const v = form.email.trim();
      if (!v) e.email = "Email is required.";
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v))
        e.email = "Enter a valid email.";
    }
    if (touched.message && form.message.trim().length < 10)
      e.message = "Message should be at least 10 characters.";
    return e;
  }, [form, touched]);

  const fieldStyle = (hasError) => ({
    width: "100%",
    padding: "10px 12px",
    borderRadius: 12,
    border: `1px solid ${hasError ? "rgba(185, 28, 28, 0.35)" : THEME.border}`,
    background: THEME.surface,
    outline: "none",
    fontSize: 14,
  });

  // PUBLIC_INTERFACE
  const onSubmit = async (e) => {
    /** This is a public function. */
    e.preventDefault();
    setTouched({ name: true, email: true, message: true });

    const hasErrors =
      !form.name.trim() ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim()) ||
      form.message.trim().length < 10;

    if (hasErrors) return;

    setStatus("sending");
    await new Promise((r) => setTimeout(r, 400));
    setStatus("sent");

    // No-op: future integration will send to backend / ticketing system
    // eslint-disable-next-line no-console
    console.log("Contact form placeholder submit:", form);
  };

  return (
    <form onSubmit={onSubmit} noValidate aria-label="Contact form">
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
          gap: 12,
        }}
      >
        <div>
          <label
            htmlFor="contact_name"
            style={{
              fontSize: 12,
              fontWeight: 950,
              display: "block",
              marginBottom: 6,
              letterSpacing: "0.01em",
            }}
          >
            Name
          </label>
          <input
            id="contact_name"
            value={form.name}
            onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
            onBlur={() => setTouched((p) => ({ ...p, name: true }))}
            style={fieldStyle(Boolean(errors.name))}
            aria-invalid={Boolean(errors.name)}
            aria-describedby="contact_name_err"
            placeholder="Your name"
          />
          {errors.name ? (
            <div
              id="contact_name_err"
              style={{
                marginTop: 6,
                color: "#B91C1C",
                fontSize: 12,
                fontWeight: 900,
              }}
            >
              {errors.name}
            </div>
          ) : null}
        </div>

        <div>
          <label
            htmlFor="contact_email"
            style={{
              fontSize: 12,
              fontWeight: 950,
              display: "block",
              marginBottom: 6,
              letterSpacing: "0.01em",
            }}
          >
            Email
          </label>
          <input
            id="contact_email"
            type="email"
            value={form.email}
            onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
            onBlur={() => setTouched((p) => ({ ...p, email: true }))}
            style={fieldStyle(Boolean(errors.email))}
            aria-invalid={Boolean(errors.email)}
            aria-describedby="contact_email_err"
            placeholder="you@example.com"
          />
          {errors.email ? (
            <div
              id="contact_email_err"
              style={{
                marginTop: 6,
                color: "#B91C1C",
                fontSize: 12,
                fontWeight: 900,
              }}
            >
              {errors.email}
            </div>
          ) : null}
        </div>

        <div style={{ gridColumn: "1 / -1" }}>
          <label
            htmlFor="contact_message"
            style={{
              fontSize: 12,
              fontWeight: 950,
              display: "block",
              marginBottom: 6,
              letterSpacing: "0.01em",
            }}
          >
            Message
          </label>
          <textarea
            id="contact_message"
            value={form.message}
            onChange={(e) => setForm((p) => ({ ...p, message: e.target.value }))}
            onBlur={() => setTouched((p) => ({ ...p, message: true }))}
            rows={4}
            style={{
              ...fieldStyle(Boolean(errors.message)),
              resize: "vertical",
            }}
            aria-invalid={Boolean(errors.message)}
            aria-describedby="contact_message_help contact_message_err"
            placeholder="How can we help? (This is a demo – submission is a no-op)"
          />
          <div
            id="contact_message_help"
            style={{ marginTop: 6, color: THEME.mutedText, fontSize: 12 }}
          >
            We’ll wire this to a real support channel soon.
          </div>
          {errors.message ? (
            <div
              id="contact_message_err"
              style={{
                marginTop: 6,
                color: "#B91C1C",
                fontSize: 12,
                fontWeight: 900,
              }}
            >
              {errors.message}
            </div>
          ) : null}
        </div>

        <div
          style={{
            gridColumn: "1 / -1",
            display: "flex",
            gap: 10,
            flexWrap: "wrap",
          }}
        >
          <button
            type="submit"
            style={{
              appearance: "none",
              border: "1px solid rgba(37, 99, 235, 0.42)",
              background: `linear-gradient(135deg, ${THEME.primary}, #1D4ED8)`,
              color: "#fff",
              padding: "10px 14px",
              borderRadius: 12,
              fontSize: 14,
              fontWeight: 950,
              cursor: status === "sending" ? "progress" : "pointer",
              boxShadow: THEME.shadowSm,
              opacity: status === "sending" ? 0.85 : 1,
              outline: "none",
              transition: "transform 120ms ease, box-shadow 160ms ease",
            }}
            aria-busy={status === "sending"}
          >
            {status === "sent"
              ? "Sent (demo)"
              : status === "sending"
              ? "Sending..."
              : "Send message"}
          </button>

          <button
            type="button"
            onClick={() => {
              setForm({ name: "", email: "", message: "" });
              setTouched({});
              setStatus("idle");
            }}
            style={{
              appearance: "none",
              border: `1px solid ${THEME.border}`,
              background: THEME.surface,
              color: THEME.text,
              padding: "10px 14px",
              borderRadius: 12,
              fontSize: 14,
              fontWeight: 950,
              cursor: "pointer",
              outline: "none",
              transition: "transform 120ms ease, box-shadow 160ms ease",
            }}
          >
            Clear
          </button>

          {status === "sent" ? (
            <div
              style={{
                alignSelf: "center",
                color: THEME.mutedText,
                fontWeight: 900,
              }}
            >
              Thanks! (Saved to console only.)
            </div>
          ) : null}
        </div>
      </div>
    </form>
  );
}

/**
 * Small supporting UI elements
 */
// PUBLIC_INTERFACE
function StatChip({ label, value }) {
  /** This is a public function. */
  return (
    <div
      data-card="true"
      style={{
        padding: 12,
        borderRadius: 18,
        border: `1px solid ${THEME.border}`,
        background: "rgba(255, 255, 255, 0.75)",
        transition: "transform 140ms ease, box-shadow 180ms ease",
        boxShadow: "0 2px 10px rgba(17,24,39,0.05)",
        textAlign: "left",
      }}
      aria-label={`${label}: ${value}`}
    >
      <p
        style={{
          margin: 0,
          fontSize: 12,
          color: THEME.mutedText,
          fontWeight: 900,
        }}
      >
        {label}
      </p>
      <p style={{ margin: "4px 0 0", fontSize: 14, fontWeight: 950 }}>
        {value}
      </p>
    </div>
  );
}

// PUBLIC_INTERFACE
function Hint({ title, text }) {
  /** This is a public function. */
  return (
    <div style={{ padding: "10px 0", borderBottom: `1px solid ${THEME.border}` }}>
      <p style={{ margin: 0, fontWeight: 950 }}>{title}</p>
      <p style={{ margin: "6px 0 0", color: THEME.mutedText, lineHeight: 1.55 }}>
        {text}
      </p>
    </div>
  );
}

// PUBLIC_INTERFACE
function InfoCard({ title, text }) {
  /** This is a public function. */
  return (
    <div
      data-card="true"
      style={{
        background: THEME.surface,
        border: `1px solid ${THEME.border}`,
        borderRadius: 18,
        padding: 16,
        boxShadow: THEME.shadowSm,
        textAlign: "left",
        transition: "transform 140ms ease, box-shadow 180ms ease",
      }}
    >
      <h3 style={{ margin: "0 0 8px", fontSize: 16, fontWeight: 950 }}>
        {title}
      </h3>
      <p style={{ margin: 0, color: THEME.mutedText, lineHeight: 1.55 }}>
        {text}
      </p>
    </div>
  );
}

/**
 * Quotes selection logic (deterministic shuffle by seed)
 */
// PUBLIC_INTERFACE
function pickQuotes(all, count, seed) {
  /** This is a public function. */
  const arr = [...all];
  // simple seeded shuffle
  let s = seed || 1;
  for (let i = arr.length - 1; i > 0; i -= 1) {
    s = (s * 9301 + 49297) % 233280;
    const j = Math.floor((s / 233280) * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr.slice(0, count);
}

export default App;
