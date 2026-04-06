import { useState, useEffect } from "react";
import { supabase } from "./supabase";
import "./App.css";

/**
 * Futurist Health root UI: Supabase auth, post-login dashboard, and assessment flow.
 * Data persistence for assessments is not wired yet—submit only updates local state.
 */
export default function App() {
  // Auth form
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [session, setSession] = useState(null);
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState("");

  // Logged-in shell: dashboard vs assessment tab
  const [activeTab, setActiveTab] = useState("dashboard");
  const [assessmentSubmitted, setAssessmentSubmitted] = useState(false);
  /** 0 = sit-ups, 1 = chest presses (wizard steps before submit). */
  const [assessmentStep, setAssessmentStep] = useState(0);
  const [assessmentAnswers, setAssessmentAnswers] = useState({
    sitUps: "",
    chestPresses: "",
  });

  // Restore session on load and keep React state in sync when Supabase auth changes.
  useEffect(() => {
    // `getSession()` should return a Promise in normal Supabase usage.
    // This extra guarding prevents runtime crashes if it returns `undefined`
    // (e.g. certain test/mock environments).
    const res = supabase?.auth?.getSession?.();
    if (res && typeof res.then === "function") {
      res.then(({ data }) => setSession(data.session)).catch(() => setSession(null));
    } else if (res && res.data) {
      setSession(res.data.session ?? null);
    } else {
      setSession(null);
    }

    const authStateChangeResult = supabase.auth.onAuthStateChange?.((_event, session) => {
      setSession(session);
    });

    const listener = authStateChangeResult?.data;
    return () => listener?.subscription?.unsubscribe?.();
  }, []);

  // Nudge new sessions toward the assessment until they submit (local flag only).
  useEffect(() => {
    if (session && !assessmentSubmitted) {
      setActiveTab("assessment");
      return;
    }
    if (!session) {
      setActiveTab("dashboard");
      setAssessmentSubmitted(false);
      setAssessmentStep(0);
      setAssessmentAnswers({ sitUps: "", chestPresses: "" });
    }
  }, [session, assessmentSubmitted]);

  // Auth actions (Supabase)
  const signUp = async () => {
    setAuthError("");
    setAuthLoading(true);
    try {
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) setAuthError(error.message);
      else alert("Check your email to confirm!");
    } finally {
      setAuthLoading(false);
    }
  };

  const signIn = async () => {
    setAuthError("");
    setAuthLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setAuthError(error.message);
    } finally {
      setAuthLoading(false);
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  /** Marks assessment complete in the UI; replace with API save when backend exists. 
  const submitAssessment = (e) => {
    e?.preventDefault();
    setAssessmentSubmitted(true);
  };*/

  const goToChestPressQuestion = () => {
    const raw = assessmentAnswers.sitUps.trim();
    if (raw === "") return;
    setAssessmentStep(1);
  };

  const finishAssessmentFromWizard = () => {
    const raw = assessmentAnswers.chestPresses.trim();
    if (raw === "") return;
    setAssessmentSubmitted(true);
  };

  // --- Not signed in: branded login / signup ---
  // 🔐 NOT LOGGED IN
  if (!session) {
    return (
      <div className="fh-loginPage">
        <div className="fh-loginTop">
          <div className="fh-brandMark" aria-hidden="true">
            FH
          </div>
          <div>
            <div className="fh-brandName">Futurist Health</div>
            <div className="fh-brandTagline">
              Track muscle health over time. Stay ahead with data-driven training insights.
            </div>
          </div>
        </div>

        <div className="fh-loginCard" role="region" aria-label="Login / Signup">
          <div className="fh-loginCardHeader">
            <h2 className="fh-loginTitle">Login / Signup</h2>
            <p className="fh-loginSubtitle">
              Sign in to keep your muscle-health history synced across devices.
            </p>
          </div>

          <form
            className="fh-loginForm"
            onSubmit={(e) => {
              e.preventDefault();
              signIn();
            }}
          >
            <label className="fh-field">
              <span className="fh-label">Email</span>
              <input
                className="fh-input"
                placeholder="Email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </label>

            <label className="fh-field">
              <span className="fh-label">Password</span>
              <input
                className="fh-input"
                placeholder="Password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </label>

            {authError ? (
              <div className="fh-authError" role="alert">
                {authError}
              </div>
            ) : null}

            <div className="fh-actions">
              <button
                type="button"
                className="fh-secondaryButton"
                onClick={signIn}
                disabled={authLoading}
                aria-busy={authLoading}
              >
                Login
              </button>
              <button
                type="button"
                className="fh-primaryButton"
                onClick={signUp}
                disabled={authLoading}
                aria-busy={authLoading}
              >
                Signup
              </button>
            </div>

            <div className="fh-privacyNote">
              By continuing, you agree to receive account-related emails from Futurist Health.
            </div>
          </form>
        </div>
      </div>
    );
  }

  // --- Signed in: tabs, assessment wizard, dashboard tiles ---
  // ✅ LOGGED IN
  return (
    <div className="fh-dashboardPage">
      <header className="fh-dashboardHeader">
        <div>
          <div className="fh-dashboardTitle">Dashboard</div>
          <div className="fh-dashboardSub">
            Signed in as <span className="fh-mono">{session.user.email}</span>
          </div>
        </div>
        <button className="fh-secondaryButton" onClick={signOut}>
          Logout
        </button>
      </header>

      <section className="fh-dashboardTabs" aria-label="Dashboard tabs">
        <button
          type="button"
          className={`fh-tabButton ${activeTab === "dashboard" ? "is-active" : ""}`}
          onClick={() => setActiveTab("dashboard")}
        >
          Dashboard
        </button>
        <button
          type="button"
          className={`fh-tabButton ${activeTab === "assessment" ? "is-active" : ""}`}
          onClick={() => setActiveTab("assessment")}
        >
          Assessment
        </button>
      </section>

      {activeTab === "assessment" ? (
        <section className="fh-assessmentPanel" aria-label="Take assessment">
          <div className="fh-assessmentHeader">
            <h2 className="fh-assessmentTitle">Take Assessment</h2>
            <p className="fh-assessmentSub">
              Please complete this after login so we can personalize your muscle health insights.
            </p>
          </div>

          {!assessmentSubmitted ? (
            <div className="fh-assessmentWizard">
              <p className="fh-assessmentProgress" aria-live="polite">
                Question {assessmentStep + 1} of 2
              </p>

              {assessmentStep === 0 ? (
                <form
                  className="fh-assessmentQuestionCard"
                  onSubmit={(e) => {
                    e.preventDefault();
                    goToChestPressQuestion();
                  }}
                >
                  <h3 className="fh-assessmentQuestionText" id="assessment-q1">
                    How many sit ups can you do
                  </h3>
                  <div className="fh-assessmentAnswerRow">
                    <label className="fh-assessmentAnswerLabel" htmlFor="assessment-situps">
                      <span className="fh-sr-only">Answer</span>
                      <input
                        id="assessment-situps"
                        type="number"
                        min="0"
                        inputMode="numeric"
                        className="fh-input fh-assessmentInput"
                        placeholder="Type your answer"
                        value={assessmentAnswers.sitUps}
                        onChange={(e) =>
                          setAssessmentAnswers((prev) => ({ ...prev, sitUps: e.target.value }))
                        }
                        aria-labelledby="assessment-q1"
                      />
                    </label>
                    <button
                      type="submit"
                      className="fh-assessmentArrowBtn"
                      aria-label="Continue to next question"
                    >
                      <span className="fh-assessmentArrowGlyph" aria-hidden="true">
                        →
                      </span>
                    </button>
                  </div>
                  <button
                    type="button"
                    className="fh-assessmentExitLink"
                    onClick={() => setActiveTab("dashboard")}
                  >
                    Exit to main dashboard
                  </button>
                </form>
              ) : (
                <form
                  className="fh-assessmentQuestionCard"
                  onSubmit={(e) => {
                    e.preventDefault();
                    finishAssessmentFromWizard();
                  }}
                >
                  <h3 className="fh-assessmentQuestionText" id="assessment-q2">
                    How many chest presses can you do
                  </h3>
                  <div className="fh-assessmentAnswerRow">
                    <label className="fh-assessmentAnswerLabel" htmlFor="assessment-chest">
                      <span className="fh-sr-only">Answer</span>
                      <input
                        id="assessment-chest"
                        type="number"
                        min="0"
                        inputMode="numeric"
                        className="fh-input fh-assessmentInput"
                        placeholder="Type your answer"
                        value={assessmentAnswers.chestPresses}
                        onChange={(e) =>
                          setAssessmentAnswers((prev) => ({ ...prev, chestPresses: e.target.value }))
                        }
                        aria-labelledby="assessment-q2"
                      />
                    </label>
                    <button
                      type="submit"
                      className="fh-assessmentArrowBtn"
                      aria-label="Submit assessment"
                    >
                      <span className="fh-assessmentArrowGlyph" aria-hidden="true">
                        →
                      </span>
                    </button>
                  </div>
                  <button
                    type="button"
                    className="fh-assessmentExitLink"
                    onClick={() => setActiveTab("dashboard")}
                  >
                    Exit to main dashboard
                  </button>
                </form>
              )}
            </div>
          ) : (
            <div className="fh-assessmentResult">
              <p className="fh-assessmentResultText">We will return your assessment results soon</p>
              <button type="button" className="fh-primaryButton" onClick={() => setActiveTab("dashboard")}>
                Exit to main dashboard
              </button>
            </div>
          )}
        </section>
      ) : null}

      {activeTab === "dashboard" ? (
        <>
          {!assessmentSubmitted ? (
            <section className="fh-assessmentPrompt" aria-label="Assessment prompt">
              <span>Take your assessment to unlock personalized stats and plan updates.</span>
              <button type="button" className="fh-primaryButton" onClick={() => setActiveTab("assessment")}>
                Open assessment
              </button>
            </section>
          ) : null}

          <section className="fh-heroCard" aria-label="Today summary">
            <div className="fh-heroLeft">
              <div className="fh-heroKicker">Muscle health</div>
              <div className="fh-heroHeadline">Stay consistent. Measure, adapt, recover.</div>
              <div className="fh-heroBody">
                Take a quick assessment to capture soreness, strength, and mobility. We’ll use it to
                track trends and refine your plan.
              </div>
            </div>
            <div className="fh-heroRight">
              <div className="fh-metricsGrid" aria-label="Key metrics">
                <div className="fh-metric">
                  <div className="fh-metricLabel">Readiness</div>
                  <div className="fh-metricValue">—</div>
                  <div className="fh-metricHint">Needs assessment</div>
                </div>
                <div className="fh-metric">
                  <div className="fh-metricLabel">Soreness</div>
                  <div className="fh-metricValue">—</div>
                  <div className="fh-metricHint">Log today</div>
                </div>
                <div className="fh-metric">
                  <div className="fh-metricLabel">Training load</div>
                  <div className="fh-metricValue">—</div>
                  <div className="fh-metricHint">Last 7 days</div>
                </div>
                <div className="fh-metric">
                  <div className="fh-metricLabel">Mobility</div>
                  <div className="fh-metricValue">—</div>
                  <div className="fh-metricHint">Range-of-motion</div>
                </div>
              </div>
            </div>
          </section>

          <main className="fh-tiles" aria-label="Dashboard sections">
        <button className="fh-tile fh-tilePrimary" type="button">
          <div className="fh-tileHeader">
            <div className="fh-tileTitle">Take assessment</div>
            <div className="fh-tileBadge">2–3 min</div>
          </div>
          <div className="fh-tileBody">
            Log soreness, pain, strength, and mobility for key muscle groups.
          </div>
          <div className="fh-tileFooter">Start now →</div>
        </button>

        <section className="fh-tile" aria-label="Stats">
          <div className="fh-tileHeader">
            <div className="fh-tileTitle">Stats</div>
          </div>
          <div className="fh-tileBody">
            Weekly trends, readiness, and muscle-group history. (Connect data to unlock charts.)
          </div>
          <div className="fh-miniList" aria-label="Stats preview">
            <div className="fh-miniRow">
              <span>Last assessment</span>
              <span className="fh-dim">—</span>
            </div>
            <div className="fh-miniRow">
              <span>Highest soreness</span>
              <span className="fh-dim">—</span>
            </div>
            <div className="fh-miniRow">
              <span>Best day</span>
              <span className="fh-dim">—</span>
            </div>
          </div>
        </section>

        <section className="fh-tile" aria-label="Training plan">
          <div className="fh-tileHeader">
            <div className="fh-tileTitle">Training plan</div>
            <div className="fh-tileBadge fh-badgeSoft">Adaptive</div>
          </div>
          <div className="fh-tileBody">
            Today: prioritize quality reps, track load, and adjust based on readiness.
          </div>
          <div className="fh-miniList" aria-label="Plan preview">
            <div className="fh-miniRow">
              <span>Focus</span>
              <span className="fh-dim">Full body</span>
            </div>
            <div className="fh-miniRow">
              <span>Intensity</span>
              <span className="fh-dim">Moderate</span>
            </div>
            <div className="fh-miniRow">
              <span>Duration</span>
              <span className="fh-dim">45–60 min</span>
            </div>
          </div>
        </section>

        <section className="fh-tile" aria-label="Recovery">
          <div className="fh-tileHeader">
            <div className="fh-tileTitle">Recovery</div>
          </div>
          <div className="fh-tileBody">
            Sleep, hydration, and mobility work that supports muscle repair and resilience.
          </div>
          <div className="fh-miniList" aria-label="Recovery checklist">
            <div className="fh-miniRow">
              <span>Mobility</span>
              <span className="fh-dim">10 min</span>
            </div>
            <div className="fh-miniRow">
              <span>Protein</span>
              <span className="fh-dim">Target</span>
            </div>
            <div className="fh-miniRow">
              <span>Sleep</span>
              <span className="fh-dim">7–9 hrs</span>
            </div>
          </div>
        </section>

        <section className="fh-tile" aria-label="Trends & alerts">
          <div className="fh-tileHeader">
            <div className="fh-tileTitle">Trends & alerts</div>
            <div className="fh-tileBadge fh-badgeWarn">Beta</div>
          </div>
          <div className="fh-tileBody">
            Spot overuse risk by muscle group, highlight improving strength, and catch plateaus.
          </div>
          <div className="fh-tileFooter fh-dim">No alerts yet</div>
        </section>

        <section className="fh-tile" aria-label="Notes">
          <div className="fh-tileHeader">
            <div className="fh-tileTitle">Notes</div>
          </div>
          <div className="fh-tileBody">
            Track context like “new shoes,” “extra sleep,” or “tight hip flexors” to interpret
            changes.
          </div>
          <div className="fh-tileFooter">Add a note →</div>
        </section>
          </main>
        </>
      ) : null}
    </div>
  );
}
