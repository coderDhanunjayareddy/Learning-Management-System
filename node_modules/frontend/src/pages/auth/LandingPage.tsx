import { Link } from 'react-router-dom';
import gvjbLogo from '/gvjb.png';
import spectropyLogo from '/logo.png';

const headingFont = { fontFamily: '"Playfair Display", "Georgia", serif' };

const LandingPage = () => {
  return (
    <div
      className="relative min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top,_#fff7ed,_#ffffff_40%,_#fef9f3_100%)] text-slate-900"
      style={{ fontFamily: '"Source Sans 3", "Segoe UI", sans-serif' }}
    >
      <style>
        {`
          @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700&family=Source+Sans+3:wght@300;400;600;700&display=swap');
        `}
      </style>

      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-24 right-0 h-72 w-72 rounded-full bg-amber-200/40 blur-3xl" />
        <div className="absolute top-40 -left-10 h-64 w-64 rounded-full bg-rose-200/40 blur-3xl" />
        <div className="absolute bottom-0 right-10 h-72 w-72 rounded-full bg-orange-100/60 blur-3xl" />
        <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-white/90 to-transparent" />
      </div>

      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <div className="flex items-center gap-4">
            <img
              src={gvjbLogo}
              alt="GVB Logo"
              className="h-14 w-auto object-contain"
            />
            <div className="leading-tight">
              <div className="text-lg font-extrabold">
                Grameena Vidhyajyothi Bharath
              </div>
            </div>
          </div>
          <Link
            to="/login"
            className="rounded-full bg-amber-400 px-6 py-2 text-sm font-semibold text-slate-900 shadow-md transition hover:bg-amber-500"
          >
            Login
          </Link>
        </div>
      </header>

      <main className="relative z-10">
        <section className="mx-auto grid max-w-6xl gap-12 px-4 py-16 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700">
              <span className="h-2 w-2 rounded-full bg-amber-500" />
              Satellite-powered rural education
            </div>
            <h1
              className="mt-5 text-3xl font-extrabold leading-tight md:text-5xl"
              style={headingFont}
            >
              Empowering Rural Education Through Satellite Technology
            </h1>
            <p className="mt-4 text-lg text-slate-600">
              Grameena Vidhyajyothi Bharath delivers satellite-based digital
              education that reaches remote communities across India, providing
              quality learning even where internet access is not available.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                to="/login"
                className="rounded-lg bg-slate-900 px-6 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
              >
                Go to Login
              </Link>
              <a
                href="#program"
                className="rounded-lg border border-slate-300 px-6 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
              >
                Explore Program
              </a>
            </div>
            <div className="mt-10 grid gap-4 sm:grid-cols-2">
              {[
                'Offline-first delivery for rural schools',
                'Structured curriculum aligned to foundations',
                'Teacher enablement with guided resources',
                'Consistent learning progress tracking',
              ].map((item) => (
                <div
                  key={item}
                  className="rounded-2xl border border-amber-100 bg-white/80 p-4 shadow-sm"
                >
                  <p className="text-sm font-semibold text-slate-700">{item}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-3xl border border-amber-100 bg-white/90 p-8 shadow-xl">
            <div className="flex items-center gap-3">
              <img
                src={gvjbLogo}
                alt="GVB"
                className="h-10 w-auto object-contain"
              />
              <div className="text-sm font-semibold text-amber-700">
                Digital Education Services
              </div>
            </div>
            <p className="mt-4 text-slate-600">
              GVB focuses on delivering a reliable learning ecosystem for rural
              schools through satellite connectivity, structured content, and
              innovative delivery methods.
            </p>
            <div className="mt-6 grid gap-4">
              <div className="rounded-2xl bg-amber-50 p-4">
                <h3 className="text-sm font-semibold text-amber-800">
                  Satellite Education Access
                </h3>
                <p className="mt-1 text-sm text-slate-600">
                  Learning continues even in remote areas with limited or no
                  internet connectivity.
                </p>
              </div>
              <div className="rounded-2xl bg-slate-50 p-4">
                <h3 className="text-sm font-semibold text-slate-800">
                  Rural Learning Solutions
                </h3>
                <p className="mt-1 text-sm text-slate-600">
                  Tailored academic support that strengthens foundational
                  understanding in underserved regions.
                </p>
              </div>
              <div className="rounded-2xl bg-amber-50 p-4">
                <h3 className="text-sm font-semibold text-amber-800">
                  Innovative Learning Methods
                </h3>
                <p className="mt-1 text-sm text-slate-600">
                  A modern digital learning experience designed for rural
                  classrooms.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section id="program" className="mx-auto max-w-6xl px-4 pb-16">
          <div className="grid gap-6 md:grid-cols-3">
            {[
              {
                title: 'Inclusive Access',
                description:
                  'Satellite-enabled delivery ensures learners get consistent access even without internet connectivity.',
              },
              {
                title: 'Teacher Support',
                description:
                  'Guided resources and structured lesson flows help teachers deliver with confidence.',
              },
              {
                title: 'Student Progress',
                description:
                  'Track understanding over time and provide focused interventions to close learning gaps.',
              },
            ].map((card) => (
              <div
                key={card.title}
                className="rounded-3xl border border-slate-200 bg-white p-6 shadow-lg"
              >
                <h3 className="text-lg font-semibold text-slate-900">
                  {card.title}
                </h3>
                <p className="mt-3 text-sm text-slate-600">{card.description}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 pb-16">
          <div className="grid gap-8 md:grid-cols-[1.1fr_0.9fr]">
            <div className="rounded-3xl bg-slate-900 p-8 text-white shadow-xl">
              <h2 className="text-2xl font-bold" style={headingFont}>
                About GVB
              </h2>
              <p className="mt-3 text-slate-200">
                Grameena Vidhyajyothi Bharath pioneers satellite-based digital
                education to ensure consistent learning access for rural
                students, no matter how remote the location.
              </p>
              <div className="mt-6 grid gap-3">
                {[
                  'Reliable content delivery via satellite',
                  'Structured curriculum for foundational learning',
                  'Community-focused learning outcomes',
                ].map((item) => (
                  <div
                    key={item}
                    className="rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-sm"
                  >
                    {item}
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-3xl border border-amber-100 bg-white/90 p-8 shadow-lg">
              <h3 className="text-lg font-semibold text-slate-900">
                Learning Journey
              </h3>
              <div className="mt-4 space-y-4 text-sm text-slate-600">
                {[
                  'Satellite-enabled classroom sessions',
                  'Guided concept lessons with practice',
                  'Teacher support and monitoring',
                  'Progress tracking and remediation',
                ].map((step, index) => (
                  <div key={step} className="flex items-start gap-3">
                    <div className="mt-1 h-6 w-6 rounded-full bg-amber-200 text-center text-xs font-bold text-slate-900">
                      {index + 1}
                    </div>
                    <p>{step}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 pb-16">
          <div className="rounded-3xl bg-amber-200/80 p-8 text-slate-900 shadow-xl">
            <div className="flex flex-wrap items-center justify-between gap-6">
              <div>
                <h2 className="text-2xl font-bold" style={headingFont}>
                  Ready to continue learning?
                </h2>
                <p className="mt-2 text-slate-700">
                  Access GVB learning resources and course modules.
                </p>
              </div>
              <Link
                to="/login"
                className="rounded-full bg-slate-900 px-6 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
              >
                Login to Platform
              </Link>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 pb-20">
          <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-lg">
            <h3 className="text-lg font-semibold text-slate-900">Contact</h3>
            <div className="mt-4 grid gap-4 md:grid-cols-3">
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Email
                </p>
                <p className="mt-2 text-sm font-semibold text-slate-800">
                  info@grameenavidyajyothi.com
                </p>
              </div>
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Phone
                </p>
                <p className="mt-2 text-sm font-semibold text-slate-800">
                  +91-9876543210
                </p>
              </div>
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Office Hours
                </p>
                <p className="mt-2 text-sm font-semibold text-slate-800">
                  9:00 AM - 5:00 PM
                </p>
              </div>
            </div>
            <div className="mt-4 text-sm text-slate-600">
              South India, Rural Areas
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-200 py-6 text-center text-sm text-slate-500">
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-3 px-4 sm:flex-row sm:justify-between">
          <div className="flex items-center gap-2">
            <img src={gvjbLogo} alt="GVB" className="h-8 w-auto" />
            <span>Grameena Vidhyajyothi Bharath</span>
          </div>
          <div className="flex items-center gap-2 text-slate-500">
            <img src={spectropyLogo} alt="Spectropy" className="h-6 w-auto" />
            <span>Powered by Spectropy</span>
          </div>
          <div>© {new Date().getFullYear()} GVB. All rights reserved.</div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
