import { Code2, GraduationCap, Users } from "lucide-react";

const developers = ["John Carl Banate", "Jhorose Land Firmeza", "Jerome Pantonial"];

const syntaxLogoFallback = `data:image/svg+xml;utf8,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 160">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#03160f"/>
      <stop offset="1" stop-color="#08241e"/>
    </linearGradient>
    <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="6" stdDeviation="6" flood-color="#000" flood-opacity=".45"/>
    </filter>
  </defs>
  <rect width="160" height="160" fill="url(#bg)"/>
  <g opacity=".65" stroke="#10bfa5" stroke-width="2" stroke-linecap="round">
    <path d="M-10 30h34m9 0h80m11 0h44"/>
    <path d="M4 53h60m8 0h18m12 0h74"/>
    <path d="M-8 96h74m14 0h52m9 0h38"/>
    <path d="M18 120h42m12 0h86"/>
  </g>
  <g filter="url(#shadow)" fill="none" stroke="#f4f5f3" stroke-width="22" stroke-linecap="round" stroke-linejoin="round" transform="rotate(-8 80 73)">
    <path d="M52 34 25 61l27 27"/>
    <path d="M108 34 135 61l-27 27"/>
    <path d="M102 54 58 98"/>
  </g>
  <text x="80" y="139" fill="#f4f5ff" font-family="Arial, Helvetica, sans-serif" font-size="20" font-weight="700" letter-spacing="8" text-anchor="middle">SYNTAX</text>
</svg>
`)}`;

const AppFooter = () => {
  const year = new Date().getFullYear();
  const syntaxLogoSrc = `${import.meta.env.BASE_URL}syntax%20logo%20new.png`;

  return (
    <footer className="border-t border-border bg-card">
      <div className="mx-auto max-w-6xl px-4 py-8 md:px-6">
        <div className="grid gap-8 md:grid-cols-[1.35fr_1fr] md:items-start">
          <div className="flex gap-4">
            <img
              src="/dvclogo.jpg"
              alt="Davao Vision College, Inc. logo"
              className="h-14 w-14 shrink-0 rounded-md border border-border object-cover shadow-sm"
            />
            <div className="space-y-3">
              <div>
                <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-primary">
                  <GraduationCap className="h-4 w-4" />
                  Davao Vision College, Inc.
                </p>
                <h2 className="mt-1 text-xl font-bold tracking-tight text-section-header">
                  Building brighter paths through education
                </h2>
              </div>
              <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
                A learner-centered institution committed to accessible education, strong values,
                and future-ready academic opportunities for every DVCian.
              </p>
            </div>
          </div>

          <div className="space-y-4 rounded-lg border border-border bg-muted/40 p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-accent">
                  <Code2 className="h-4 w-4" />
                  Developed by
                </p>
                <h3 className="mt-1 text-lg font-bold text-section-header">Triple J</h3>
              </div>
              <div className="h-14 w-14 shrink-0 overflow-hidden rounded-lg border border-border bg-[#03160f] shadow-sm">
                <img
                  src={syntaxLogoSrc}
                  alt="Syntax logo mark"
                  onError={(event) => {
                    event.currentTarget.onerror = null;
                    event.currentTarget.src = syntaxLogoFallback;
                  }}
                  className="h-full w-full object-contain"
                />
              </div>
            </div>

            <div className="grid gap-2">
              {developers.map((developer) => (
                <div
                  key={developer}
                  className="flex items-center gap-2 rounded-md border border-border bg-background px-3 py-2 text-sm font-medium text-foreground"
                >
                  <Users className="h-4 w-4 text-primary" />
                  <span>{developer}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-8 flex flex-col gap-2 border-t border-border pt-4 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <span>© {year} Davao Vision College, Inc.</span>
          <span>Registration System crafted by Triple J.</span>
        </div>
      </div>
    </footer>
  );
};

export default AppFooter;
