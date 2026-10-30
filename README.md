# kb — the support knowledge base

**kb** = knowledge base. What the support desk knows about how our products break, written
down where the code can keep it honest.

One desk takes reports for every product we run: `sched-prod` (calendar invites for about
300k people) and the rest. When something
goes wrong, the reports reach the desk first. This kb is how the desk triages them, what each
incident turned out to be, and why we decided what we decided.

## What's here

```
src/routes/kb/      the pages (.svx: Markdown with components)
  triage/           how the desk handles incoming reports
  incidents/        one page per big ticket
  decisions/        numbered decision records
src/lib/kb/         components and the logic they run
src/lib/layouts/    the frame every page shares
src/lib/data/       exports from the ticket system
```

## Conventions

- Words in the page, logic in `src/lib` (imported as `#lib/…`). A number that can be computed belongs in a component.
- Every page starts with frontmatter: `title`, `owner`, `status`, `reviewed`.
- A decision is never edited after it is accepted. A new record replaces it.
- A page you add is signed: its frontmatter carries your `signature` and it ends with `<RenderStamp {signature} />`, so the desk knows who wrote it.

## Owners

Support desk. Decision records: whoever signed them.

## Review of ticket #4471

Start with `src/routes/kb/incidents/4471-split/+page.svx` for the signed review,
separate engineering issues, computed report counts, and remaining uncertainty.
Decision `0002-dedupe-by-cause` replaces the subject-only rule; accepted decision
0001 is preserved unchanged as history.

The original export is a snapshot, not the production application. The desk's
later engineering update closed #4471 on 2026-10-05: the parser was fixed, while
the hint was closed without a fix because booking-v3 was retired. The incident
review distinguishes these resolutions from the original report counts.

## Render the pages

The local renderer uses the original Svelte components, mdsvex pages, `#lib`
imports, and runbook layout. It does not replace computed views with handwritten
HTML or implement a production date fix.

With Node.js 22.6 or newer:

```sh
npm ci
npm test
```

`npm test` renders the pages and checks the report counts, cause examples, and
signature in the resulting HTML. To render without running the checks, use
`npm run render:kb`.

The signed review as the desk sees it is
[`rendered/kb/incidents/4471-split/index.html`](rendered/kb/incidents/4471-split/index.html).
Open [`rendered/kb/index.html`](rendered/kb/index.html) locally to browse the
rendered knowledge base. These are static snapshots; interactive examples show
their initial state.

---

Exported 2026-10-04 from the `support` repo, `apps/kb/` → `src/`.
