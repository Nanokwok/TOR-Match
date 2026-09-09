# TOR Match — Design

Working notes for UI and product presentation. Prefer tokens and existing patterns over inventing new ones.

**Product:** Extract key TOR criteria and automate eligibility matching for BMA government projects — so tech agencies can get a clear yes/no before spending a week on a bid.

## Stack

| Layer | Choice |
| --- | --- |
| App | Next.js (App Router) in `frontend/` |
| Styling | Tailwind CSS v4 + CSS variables in `frontend/src/app/globals.css` |
| Components | shadcn/ui (`base-nova`) + Base UI primitives in `frontend/src/components/ui/` |
| Icons | Lucide |
| Motion | CSS keyframes in `globals.css`, `motion/react` on landing, `@dnd-kit` on workspace |

Config: [`frontend/components.json`](frontend/components.json).

## Brand & color

Primary brand cyan is **`#0088c9`** (`--primary` in light mode). Prefer theme classes (`bg-primary`, `text-primary`, `border-primary`) over hard-coded hex. Literal `#0088C9` / `#0088c9` still appears in a few places (auth, landing accents, browse deep-link cues) — match that when extending those surfaces, or migrate to tokens when touching the file.

| Token | Light | Role |
| --- | --- | --- |
| `--primary` | `#0088c9` | Brand / CTAs / focus accents |
| `--primary-foreground` | `#ebfcff` | Text on primary |
| `--background` / `--foreground` | `#ffffff` / `#0a0a0a` | Page chrome |
| `--muted` / `--muted-foreground` | `#f5f5f5` / `#737373` | Secondary surfaces & copy |
| `--destructive` | `#df2225` | Errors / destructive actions |
| `--radius` | `0.625rem` | Base corner radius (sm→4xl scale from this) |
| `--chart-1`…`--chart-5` | cyan scale | Dashboard charts |

Dark mode overrides live under `.dark` in the same file (`--primary` → `#26b2ed`). Header/footer stay near-black (`#0a0a0a`) in both themes.

**Status colors** (eligibility, badges) use Tailwind semantic hues (emerald / amber / rose) — not brand tokens.

## Typography

Loaded in [`frontend/src/app/layout.tsx`](frontend/src/app/layout.tsx):

| Role | Family | CSS |
| --- | --- | --- |
| UI / headings | Google Sans (latin + thai) | `--font-sans`, `--font-heading` |
| Marketing script (EN) | Covered By Your Grace | `--font-script` |
| Marketing script (TH) | Playpen Sans Thai | `--font-script-th` |
| Mono | Geist Mono | `--font-mono` |

Script fonts are for landing/dashboard flourish (“Find / Match”), not dense product UI.

## Theme & locale

- **Theme:** light / dark / system ([`frontend/src/lib/theme.ts`](frontend/src/lib/theme.ts)). Auth routes force light.
- **Locale:** `en` | `th`, default **`th`** ([`frontend/src/lib/i18n.ts`](frontend/src/lib/i18n.ts)).
- Copy: [`frontend/src/i18n/messages/en.json`](frontend/src/i18n/messages/en.json) + [`th.json`](frontend/src/i18n/messages/th.json). Always add both.
- Domain strings: `LocalizedText` + `pickLocalized` ([`frontend/src/lib/localized-content.ts`](frontend/src/lib/localized-content.ts)).

## Layout shells

- **Main app** `(main)`: sticky dark header + `main` + footer.
- **Auth** `(auth)`: forced light, white page.
- **Admin**: sidebar shell (`SidebarProvider`).

Logo: [`frontend/public/Logo.svg`](frontend/public/Logo.svg).

## Product surfaces

| Surface | Convention |
| --- | --- |
| **Landing** | Full-viewport hero, brand cyan wash, script accents, motion with `motion-reduce` respect. Components under `frontend/src/components/landing/`. |
| **Browse** | Filter bar + split list/detail (`rounded-xl border bg-card`). Deep links pin TOR to top; link badge / soft banners use brand cyan tint. |
| **Workspace** | `bg-muted` canvas, horizontal kanban, cards `rounded-xl border bg-card shadow-sm`. |
| **Company setup** | Centered wizard (`max-w-4xl`), stepped form, primary CTAs. |

Cards are for interactive or list containers — not decorative chrome on marketing heroes.

## Interaction

- Prefer existing enter/exit utilities (`animate-in`, dialog zoom) and landing keyframes (`animate-float`, `animate-landing-fan-in`) over one-off animation.
- Respect `prefers-reduced-motion` where motion is decorative.
- Theme toggle may use View Transitions; don’t break it with large layout jumps.

## Practical rules

1. Extend tokens in `globals.css` before adding new hex values.
2. Reuse `frontend/src/components/ui/*` before building one-off controls.
3. Ship EN + TH strings together.
4. Match the shell of the route you’re in (main vs auth vs admin) — don’t mix.
5. Keep Browse / Workspace density readable on mobile; list panes scroll independently on desktop.

## Source of truth

- Tokens & motion: [`frontend/src/app/globals.css`](frontend/src/app/globals.css)
- Fonts / theme bootstrap: [`frontend/src/app/layout.tsx`](frontend/src/app/layout.tsx)
- UI primitives: [`frontend/src/components/ui/`](frontend/src/components/ui/)
- Chrome: [`frontend/src/components/layout/`](frontend/src/components/layout/)
