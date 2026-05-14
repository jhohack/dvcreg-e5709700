import { Code2, GraduationCap, Sparkles, Users } from "lucide-react";

const developers = ["John Carl Banate", "Jhorose Land Firmeza", "Jerome Pantonial"];

const AppFooter = () => {
  const year = new Date().getFullYear();

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
              <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary text-primary-foreground">
                <Sparkles className="h-5 w-5" />
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
