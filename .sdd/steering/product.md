# Product Overview

**LibraryLoop** is a **consumer-focused digital library** — a personal journal for the media a reader/listener/viewer consumes. It is for individuals (not institutions or teams): one signed-in person curating their own collection, tracking progress, and being gently motivated to keep going. A lightweight community feed adds social texture without turning the app into a social network.

## Core Capabilities

- **Multi-type library** — track e-books, music, podcasts, and TV/movies in one place, each with type-appropriate metadata; organize with free-form tags.
- **Shelves & reviews** — move items across Wishlist / In progress / Completed, rate 1–5, and write reviews.
- **Progress, goals, streaks, achievements** — record consumption progress, set a periodic reading goal, build activity streaks, and unlock achievements.
- **Home dashboard** — a live, at-a-glance summary of goals/stats/streaks/achievements, with a retained community activity feed.
- **Discovery** — add custom items of any type or pick from a seeded catalog. (Live NYT Best-Seller recommendations are a separate, planned surface — see `.sdd/specs/nyt-recommendations`.)

## Target Use Cases

- A reader logging what they've finished, rating it, and tracking pages read toward a yearly goal.
- A multi-media consumer keeping books, podcasts, and shows in one tagged, filterable library.
- A returning user landing on Home to see streak, goal progress, and recently-unlocked achievements, then browsing what friends are doing.

## Value Proposition

- **One hub for all media types**, not just books — the data model treats media type as an open set so new types never require a rewrite.
- **Motivation built in** — goals, streaks, and achievements turn passive tracking into a habit.
- **Private by default, per-user** — every record (library, tags, progress, goals, achievements) belongs to the signed-in user and is never shared except through the opt-in community feed.

## Product Principles

- **Personal first**: features serve the individual's journal; social is ambient, not central.
- **Inclusive of media types**: never assume "book" — UI and data derive sensible behavior for any type, with graceful fallbacks for unknown ones.
- **Additive evolution**: new capabilities extend the model without breaking existing data or contracts.
- **Accessible & responsive**: usable from mobile to desktop, light/dark, keyboard- and screen-reader-friendly.

---
_Future releases: Google SSO (the auth schema is already SSO-ready) and live NYT recommendations._
_Last updated: 2026-05-29_
