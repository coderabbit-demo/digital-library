# Visual Design Reference (extracted)

Source: the published reference app `https://stash-hut-28896057.figma.site` (Figma Make export). Tokens were extracted from its compiled stylesheet (`/_components/v2/…​.css`) rather than the Figma MCP. The app is built on **shadcn/ui design tokens + Tailwind v4**.

## Aesthetic summary
Clean, neutral, modern dashboard look: near-black primary on white, very subtle borders (black @ 10%), ~10px corner radius, **system** sans/mono fonts (no webfont), **medium-weight headings** (not bold), card-based surfaces, and a sidebar-style app shell (sidebar tokens present). Ships with full **light + dark** themes.

## Tokens — light (`:root`) and dark (`.dark`)
Colors are given as authored (mix of hex and `oklch`).

| Token | Light | Dark |
|-------|-------|------|
| `--background` | `#ffffff` | `oklch(14.5% 0 0)` |
| `--foreground` | `oklch(14.5% 0 0)` | `oklch(98.5% 0 0)` |
| `--card` / `--card-foreground` | `#ffffff` / `oklch(14.5% 0 0)` | `oklch(14.5% 0 0)` / `oklch(98.5% 0 0)` |
| `--popover` / `-foreground` | `oklch(100% 0 0)` / `oklch(14.5% 0 0)` | `oklch(14.5% 0 0)` / `oklch(98.5% 0 0)` |
| `--primary` / `-foreground` | `#030213` / `oklch(100% 0 0)` | `oklch(98.5% 0 0)` / `oklch(20.5% 0 0)` |
| `--secondary` / `-foreground` | `oklch(95% .0058 264.53)` / `#030213` | `oklch(26.9% 0 0)` / `oklch(98.5% 0 0)` |
| `--muted` / `-foreground` | `#ececf0` / `#717182` | `oklch(26.9% 0 0)` / `oklch(70.8% 0 0)` |
| `--accent` / `-foreground` | `#e9ebef` / `#030213` | `oklch(26.9% 0 0)` / `oklch(98.5% 0 0)` |
| `--destructive` / `-foreground` | `#d4183d` / `#ffffff` | `oklch(39.6% .141 25.723)` / `oklch(63.7% .237 25.331)` |
| `--border` | `#0000001a` (black 10%) | `oklch(26.9% 0 0)` |
| `--input` / `--input-background` | `transparent` / `#f3f3f5` | `oklch(26.9% 0 0)` |
| `--ring` | `oklch(43.9% 0 0)` | `oklch(43.9% 0 0)` |

Plus a sidebar token group (`--sidebar`, `--sidebar-foreground`, `--sidebar-primary`, `--sidebar-accent`, `--sidebar-border`, `--sidebar-ring`) and 5 chart colors (`--chart-1..5`) for data viz, and Tailwind oklch color scales (blue/gray/green/orange/purple/yellow).

## Radii
`--radius: 0.625rem` (10px). Derived steps used in components: `sm = radius − 4px`, `md = radius − 2px`, `lg = radius`, `xl = radius + 4px`, `xs = 0.125rem`.

## Typography
- `--font-sans`: system stack (`ui-sans-serif, system-ui, sans-serif, …`); `--font-mono`: system mono stack. **No custom webfont.**
- Base `--font-size: 16px`; weights `normal 400`, `medium 500`, `semibold 600`.
- Base line-height `1.5`. Headings use **medium (500)**: `h1 = text-2xl`, `h2 = text-xl`, `h3 = text-lg`. Body `text-base`; inputs `text-base / 400`.

## Motion
`--default-transition-duration: .15s`; easing `cubic-bezier(.4, 0, .2, 1)`; a `pulse` keyframe is defined.

## Decisions (confirmed with the user)
- **Styling stack:** adopt **Tailwind v4 + shadcn/ui**, dropping in the reference's exact CSS variables above, so components map 1:1 to the reference.
- **Layout fidelity:** match the reference's actual screen composition — captured via headless screenshots of the published site (saved under `.sdd/specs/ui-reskin/screens/`).
- Dark mode is first-class (Requirement 2 confirmed).

## Layout notes (from captured screenshots, `screens/`)
Reference app is "Media Manager — Your digital entertainment hub". Screens captured: Home, Library, Wishlist, Reviews (desktop) + mobile.

- **App shell:** top brand bar — square black logo tile + "Media Manager" (bold) / muted tagline on the left; solid black **"+ Add Item"** button on the right. Below it a **horizontal tab nav** (icon + label): Home · Library · Wishlist · Reviews; active tab is darker with an underline. (Top tabs, not a sidebar.) Thin footer with a tagline + media-type quick links.
- **Page header:** large bold H1 (e.g. "Welcome Back!", "My Library") + muted one-line subtitle.
- **Home:** "Reading Goals & Achievements" → a row of 4 **stat cards** (label with small icon + big number; some with a thin progress bar + caption, e.g. 2026 Goal 1/24, Pages Read 304, Current Streak 5🔥, In Progress). Then an **Achievements** card (unlocked/in-progress sub-grids, a "2/8" count badge).
- **Library:** a **segmented media-type filter** rendered as a pill group with count badges — All 4 · Books 2 · Music 1 · Podcasts 1 (icons per type). Below, a **3-column responsive card grid**.
- **Media card anatomy:** colored **type pill** (book=blue, music=purple, podcast=green) + **status pill** (Completed ✓ / In Progress ⏱) + an overflow **⋮** menu; bold title; muted creator; a meta line (Genre/Album/Category); **gold star rating**; optional italic review snippet; **tag pills** (e.g. fiction, philosophy).
- **Surfaces:** white cards, hairline border (black @ 10%), ~10px radius, generous padding, lots of whitespace; muted gray for secondary text.

### Mapping to our surfaces (adopting the reference IA)
- Nav labels = reference's **Home / Library / Wishlist / Reviews** (Profile reachable from the brand bar; extensible to Recommendations). `AppNav` is relabeled/reorganized accordingly.
- **Library** = the user's full collection across types (our library entries + media-type filter); **Wishlist** = wishlist-status items; **Reviews** = reviewed items. Prior Catalog/Shelves capability folds into this IA; "+ Add Item" covers custom + catalog adds.
- Their stat cards + achievements → our redesigned Home **dashboard** (live goals/stats/achievements), with the community feed retained below.
- Their media card → our `BookCover`/`Pill`/rating/`ShelfStatusButtons` composition, extended with tags + type indicator.

## Implications for the design phase
- Introduce Tailwind v4 + shadcn primitives into the Next.js app; map our surfaces (nav/shell, Home dashboard, Shelves, Catalog, Profile, auth) onto shadcn components + the captured layouts in `screens/`.
- This is **media-platform-v2** (not a pure re-skin): the redesign sits on top of new features (multi-media types, tags, progress, goals, streaks, achievements). Schema/DAL/API are extended **additively and non-breakingly**; existing routes, auth, and contracts are preserved (requirements 14–15).
- The reference's Home (goals/streaks/achievements) is adopted; our community feed is retained within the new design.
