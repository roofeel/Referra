import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { useToast } from '../components/ToastProvider';

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (options: {
            client_id: string;
            callback: (response: { credential?: string }) => void;
            auto_select?: boolean;
            cancel_on_tap_outside?: boolean;
          }) => void;
          prompt: () => void;
        };
      };
    };
  }
}

const GOOGLE_SCRIPT_SRC = 'https://accounts.google.com/gsi/client';

const navigationItems = ['Home', 'Features', 'Pricing', 'Documentation'];

const problemCards = [
  {
    title: 'Fragmented Routing',
    icon: '↗',
    copy:
      'Inconsistent parameter naming across agencies creates black holes in your reporting funnel.',
  },
  {
    title: 'Latency in Attribution',
    icon: '⏱',
    copy:
      'Waiting 24 hours for daily attribution blocks fast bidding changes and budget optimization.',
  },
  {
    title: 'Logic Fragility',
    icon: '≠',
    copy:
      'Regex-based systems break when platforms update, leading to corrupted mappings and false negatives.',
  },
];

const featureCards = [
  {
    eyebrow: 'CORE MODULE',
    title: 'Visual Rule Editor',
    icon: '✦',
    copy:
      'Map incoming signals to a stable referrer model without shipping a new regex bundle every week.',
    className: 'lg:col-span-2',
  },
  {
    eyebrow: 'AI LAYER',
    title: 'AI Parameter Extraction',
    icon: '◌',
    copy:
      'Recognize unknown campaign parameters, cluster naming drift, and suggest mappings before revenue leaks.',
  },
  {
    eyebrow: 'DATA SYSTEM',
    title: 'Unified Ledger',
    icon: '▣',
    copy:
      'Keep every attribution rule, event transform, and sync state in one auditable system of record.',
  },
];

const implementationSteps = [
  {
    title: 'Upload Data',
    copy: 'Inject your event streams via batch CSV/JSON uploads or direct HTTP API webhooks.',
  },
  {
    title: 'Map & Configure',
    copy: 'Define rules in the Visual Editor. Our AI identifies legacy parameters automatically for mapping.',
  },
  {
    title: 'Run Engine',
    copy: 'The Attribution Engine processes streams in real-time, enforcing rule strictness and data integrity.',
  },
  {
    title: 'Analyze Results',
    copy: 'Review high-fidelity dashboards or export enriched datasets to your internal warehouse.',
  },
];

function useGoogleIdentity(onCredential: (credential: string) => Promise<void>) {
  const toast = useToast();
  const initializedRef = useRef(false);
  const [isReady, setIsReady] = useState(false);
  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID?.trim() ?? '';

  useEffect(() => {
    if (!googleClientId) {
      return;
    }

    const initializeGoogle = () => {
      if (!window.google?.accounts.id || initializedRef.current) {
        return;
      }

      window.google.accounts.id.initialize({
        client_id: googleClientId,
        cancel_on_tap_outside: false,
        callback: async ({ credential }) => {
          if (!credential) {
            toast.error('Google login failed. Missing credential.');
            return;
          }

          try {
            await onCredential(credential);
          } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to login with Google';
            toast.error(message);
          }
        },
      });

      initializedRef.current = true;
      setIsReady(true);
    };

    if (window.google?.accounts.id) {
      initializeGoogle();
      return;
    }

    const existingScript = document.querySelector<HTMLScriptElement>(`script[src="${GOOGLE_SCRIPT_SRC}"]`);
    const script = existingScript ?? document.createElement('script');

    const handleLoad = () => initializeGoogle();
    script.addEventListener('load', handleLoad);

    if (!existingScript) {
      script.src = GOOGLE_SCRIPT_SRC;
      script.async = true;
      script.defer = true;
      document.head.appendChild(script);
    }

    return () => {
      script.removeEventListener('load', handleLoad);
    };
  }, [googleClientId, onCredential, toast]);

  const promptGoogleLogin = () => {
    if (!googleClientId) {
      toast.error('Missing VITE_GOOGLE_CLIENT_ID in web/.env.local');
      return;
    }

    if (!window.google?.accounts.id) {
      toast.error('Google login is still loading. Try again in a moment.');
      return;
    }

    window.google.accounts.id.prompt();
  };

  return { googleClientId, isReady, promptGoogleLogin };
}

function LedgerVisual() {
  return (
    <div className="w-full max-w-md overflow-hidden rounded-xl border border-slate-200/70 bg-white/90 p-6 shadow-[0_24px_80px_-32px_rgba(15,23,42,0.35)] backdrop-blur">
      <div className="mb-4 flex items-center justify-between border-b border-slate-200 pb-4">
        <span className="text-xs font-mono uppercase tracking-[0.24em] text-slate-500">LEDGER_ID: PI-882-X</span>
        <span className="rounded bg-blue-50 px-3 py-1 text-[11px] font-semibold text-blue-700">
          ACTIVE SYNC
        </span>
      </div>

      <div className="space-y-3">
        {[1, 2, 3].map((row) => (
          <div key={row} className="flex h-11 items-center justify-between rounded-sm border border-slate-200 bg-slate-50 px-4">
            <div className={`h-2 rounded-full bg-slate-300 ${row === 1 ? 'w-1/3' : row === 2 ? 'w-1/2' : 'w-1/4'}`} />
            <div className={`h-2 rounded-full bg-blue-500/50 ${row === 1 ? 'w-8' : row === 2 ? 'w-12' : 'w-10'}`} />
          </div>
        ))}
      </div>

      <div className="mt-5 rounded-lg bg-slate-800 p-5 text-white">
        <div className="mb-3 flex items-center gap-2 text-xs font-semibold tracking-[0.2em] text-slate-200">
          <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-white/10 text-sm">AI</span>
          EXTRACTION LAYER
        </div>
        <div className="space-y-1 font-mono text-[11px] leading-5 text-slate-300">
          <div>Analyzing string pattern...</div>
          <div>Found: [utm_source, cid, ref_id]</div>
          <div>Confidence Score: 0.9984</div>
        </div>
      </div>

      <div className="mt-5 flex items-center justify-between border-t border-slate-200 pt-4">
        <span className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">Throughput</span>
        <span className="text-sm font-semibold text-slate-900">1,402 req/s</span>
      </div>
    </div>
  );
}

export default function Landing() {
  const navigate = useNavigate();
  const { isAuthenticated, loginWithGoogleCredential } = useAuth();
  const { googleClientId, isReady, promptGoogleLogin } = useGoogleIdentity(loginWithGoogleCredential);

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  return (
    <div className="min-h-screen bg-[#f7f9fb] text-slate-900">
      <div className="fixed inset-x-0 top-0 z-50 border-b border-white/40 bg-white/85 backdrop-blur-md">
        <nav className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          <div className="text-xl font-black tracking-[-0.04em] text-slate-900">Referrer AI</div>
          <div className="hidden items-center gap-8 md:flex">
            {navigationItems.map((item, index) => (
              <a
                key={item}
                href={index === 0 ? '#top' : item === 'Features' ? '#features' : '#'}
                className={`pb-1 text-sm font-medium tracking-tight transition-colors ${
                  index === 0
                    ? 'border-b-2 border-blue-700 text-blue-700'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {item}
              </a>
            ))}
          </div>
          <button
            type="button"
            onClick={promptGoogleLogin}
            className="rounded bg-blue-700 px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-600"
          >
            Get Started
          </button>
        </nav>
      </div>

      <main id="top" className="pt-16">
        <section className="relative overflow-hidden bg-[#eef3f8] py-24 lg:py-32">
          <div className="absolute right-[-12rem] top-[-18rem] h-[40rem] w-[40rem] rounded-full bg-blue-500/10 blur-3xl" />
          <div className="mx-auto grid max-w-7xl gap-16 px-6 lg:grid-cols-2 lg:items-center">
            <div className="relative z-10">
              <span className="mb-6 inline-flex rounded bg-blue-100 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.24em] text-blue-800">
                Enterprise Attribution Engine
              </span>
              <h1 className="max-w-3xl text-5xl font-black leading-[1.05] tracking-[-0.04em] text-slate-950 lg:text-7xl">
                Master the Architecture of Data Attribution
              </h1>
              <p className="mt-8 max-w-xl text-lg leading-8 text-slate-600">
                Referrer AI provides a unified ledger for URL rules, AI-driven parameter extraction, and
                high-fidelity event mapping.
              </p>

              <div className="mt-10 flex flex-wrap items-center gap-4">
                <button
                  type="button"
                  onClick={promptGoogleLogin}
                  className="rounded-lg bg-gradient-to-r from-blue-700 to-blue-500 px-8 py-4 text-base font-bold text-white shadow-[0_16px_40px_-20px_rgba(37,99,235,0.8)] transition hover:-translate-y-0.5"
                >
                  Get Started
                </button>
              </div>

              {!googleClientId ? (
                <p className="mt-6 text-sm text-rose-600">Set `VITE_GOOGLE_CLIENT_ID` to enable Google login.</p>
              ) : !isReady ? (
                <p className="mt-6 text-sm text-slate-500">Google login is loading.</p>
              ) : null}
            </div>

            <div className="relative flex items-center justify-center lg:min-h-[600px]">
              <LedgerVisual />
            </div>
          </div>
        </section>

        <section className="bg-[#f7f9fb] py-24">
          <div className="mx-auto max-w-7xl px-6">
            <div className="max-w-3xl">
              <h2 className="text-3xl font-black tracking-[-0.03em] text-slate-950 lg:text-4xl">
                The Chaos of Unstructured Data
              </h2>
              <p className="mt-6 text-lg leading-8 text-slate-600">
                Enterprises lose attributed revenue through fragmented URL structures, legacy tagging, and
                inconsistent campaign mapping. Manual parsing does not scale.
              </p>
            </div>

            <div className="mt-12 grid gap-8 md:grid-cols-3">
              {problemCards.map((card) => (
                <article
                  key={card.title}
                  className="rounded-xl border border-slate-200 bg-white/70 p-8 shadow-[0_16px_50px_-36px_rgba(15,23,42,0.4)] backdrop-blur"
                >
                  <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-lg bg-rose-50 text-lg font-bold text-rose-500">
                    {card.icon}
                  </div>
                  <h3 className="text-xl font-bold text-slate-900">{card.title}</h3>
                  <p className="mt-3 text-sm leading-7 text-slate-600">{card.copy}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="features" className="bg-[#eef3f8] py-24">
          <div className="mx-auto max-w-7xl px-6">
            <div className="mb-16 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <h2 className="text-3xl font-black tracking-[-0.03em] text-slate-950 lg:text-4xl">
                  The Precision Engine
                </h2>
                <p className="mt-4 text-lg text-slate-600">Four pillars of a modern attribution architecture.</p>
              </div>
            </div>

            <div className="grid gap-6 lg:grid-cols-4">
              {featureCards.map((card) => (
                <article
                  key={card.title}
                  className={`rounded-xl border border-slate-200 bg-white p-8 shadow-[0_16px_50px_-36px_rgba(15,23,42,0.35)] transition hover:-translate-y-1 ${card.className ?? ''}`}
                >
                  <div className="mb-12 flex items-start justify-between">
                    <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-50 text-lg font-bold text-blue-700">
                      {card.icon}
                    </div>
                    <span className="text-[11px] font-bold uppercase tracking-[0.24em] text-slate-500">
                      {card.eyebrow}
                    </span>
                  </div>
                  <h3 className="text-2xl font-bold tracking-[-0.02em] text-slate-950">{card.title}</h3>
                  <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-600">{card.copy}</p>
                </article>
              ))}

              <article className="lg:col-span-4 flex flex-col gap-12 rounded-xl bg-slate-700 p-10 text-white lg:flex-row lg:items-center">
                <div className="lg:w-1/2">
                  <h3 className="text-2xl font-bold tracking-[-0.02em]">High-Performance Analysis</h3>
                  <p className="mt-4 max-w-xl text-sm leading-7 text-slate-300">
                    Real-time attribution windows (24h/48h) with P90 duration tracking. Monitor
                    processing health with nanosecond granularity.
                  </p>
                  <div className="mt-6 grid grid-cols-2 gap-4">
                    <div className="rounded-lg bg-white/5 p-4">
                      <div className="mb-1 text-xs uppercase tracking-[0.18em] text-slate-400">P90 Latency</div>
                      <div className="text-xl font-bold text-white">14ms</div>
                    </div>
                    <div className="rounded-lg bg-white/5 p-4">
                      <div className="mb-1 text-xs uppercase tracking-[0.18em] text-slate-400">Queue Depth</div>
                      <div className="text-xl font-bold text-white">0.02%</div>
                    </div>
                  </div>
                </div>

                <div className="w-full lg:w-1/2">
                  <div className="rounded-lg bg-slate-800/80 p-6 shadow-2xl">
                    <div className="mb-4 flex items-center justify-between">
                      <div className="text-sm font-semibold text-slate-200">Analysis Dashboard</div>
                      <div className="text-xs uppercase tracking-[0.2em] text-cyan-300">Live</div>
                    </div>
                    <div className="space-y-3">
                      <div className="h-24 rounded-lg bg-[linear-gradient(135deg,rgba(34,211,238,0.22),rgba(15,23,42,0.2))] ring-1 ring-white/10" />
                      <div className="grid grid-cols-3 gap-3">
                        <div className="h-20 rounded-lg bg-white/5 ring-1 ring-white/10" />
                        <div className="h-20 rounded-lg bg-white/5 ring-1 ring-white/10" />
                        <div className="h-20 rounded-lg bg-white/5 ring-1 ring-white/10" />
                      </div>
                    </div>
                  </div>
                </div>
              </article>
            </div>
          </div>
        </section>

        <section className="bg-[#f7f9fb] py-24">
          <div className="mx-auto max-w-7xl px-6">
            <div className="mx-auto mb-20 max-w-2xl text-center">
              <h2 className="text-3xl font-black tracking-[-0.03em] text-slate-950 lg:text-4xl">
                Implementation Protocol
              </h2>
              <p className="mt-4 text-lg text-slate-600">
                Streamlined onboarding designed for enterprise data teams.
              </p>
            </div>

            <div className="relative grid gap-8 lg:grid-cols-4">
              <div className="absolute left-0 top-6 hidden h-[2px] w-full bg-slate-200 lg:block" />
              {implementationSteps.map((step, index) => (
                <div
                  key={step.title}
                  className="relative z-10 flex flex-col items-center text-center lg:items-start lg:text-left"
                >
                  <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-full bg-blue-700 text-lg font-bold text-white ring-8 ring-blue-700/5">
                    {index + 1}
                  </div>
                  <h4 className="mb-3 text-lg font-bold text-slate-900">{step.title}</h4>
                  <p className="text-sm leading-7 text-slate-600">{step.copy}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-200 bg-white/80">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-6 py-10 text-sm text-slate-500 md:flex-row md:items-center md:justify-between">
          <div className="font-semibold text-slate-700">Referrer AI</div>
          <div>Unified attribution infrastructure for campaign routing and AI mapping.</div>
        </div>
      </footer>
    </div>
  );
}
