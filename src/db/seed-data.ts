/**
 * Starter seed data (DL-16), ported from the prototype's `starterState`
 * (legacy/app.js). Records reference each other by stable string keys; the
 * seed routine resolves those to generated UUIDs at insert time. Pure data so
 * it can be asserted without a database.
 */
import type { LibraryStatus, MediaItemMetadata, Preferences } from "@/lib/types";

export interface SeedMediaItem {
  key: string;
  type: string;
  title: string;
  creator: string;
  genre: string;
  language: string;
  description: string;
  coverTheme: string;
  metadata?: MediaItemMetadata | null;
  totalUnits?: number | null;
}

export interface SeedCommunityUser {
  key: string;
  name: string;
  avatarColor: string;
}

export interface SeedDemoMember {
  key: string;
  name: string;
  email: string;
  password: string;
  avatarColor: string;
  bio: string;
  preferences: Preferences;
}

export interface SeedLibraryEntry {
  userKey: string;
  mediaKey: string;
  status: LibraryStatus;
  rating: number | null;
  review: string;
  updatedAt: string;
  progress?: number | null;
  tags?: string[];
}

export interface SeedGoal {
  userKey: string;
  period: string;
  periodKey: string;
  targetCount: number;
}

export interface SeedActivity {
  userKey: string;
  mediaKey: string;
  action: "added" | "started" | "finished" | "reviewed";
  detail: string;
  createdAt: string;
}

export const seedMediaItems: SeedMediaItem[] = [
  { key: "left-hand-darkness", type: "ebook", title: "The Left Hand of Darkness", creator: "Ursula K. Le Guin", genre: "Science Fiction", language: "English", description: "A diplomatic journey across an icy planet with a society unlike any other.", coverTheme: "teal" },
  { key: "circe", type: "ebook", title: "Circe", creator: "Madeline Miller", genre: "Mythic Fiction", language: "English", description: "A witch finds her voice among gods, monsters, and exiles.", coverTheme: "gold" },
  { key: "project-hail-mary", type: "ebook", title: "Project Hail Mary", creator: "Andy Weir", genre: "Science Fiction", language: "English", description: "A lone astronaut wakes up with a puzzle that may decide Earth's future.", coverTheme: "navy" },
  { key: "educated", type: "ebook", title: "Educated", creator: "Tara Westover", genre: "Memoir", language: "English", description: "A memoir about family, survival, and the long reach of education.", coverTheme: "stone" },
  { key: "tomorrow", type: "ebook", title: "Tomorrow, and Tomorrow, and Tomorrow", creator: "Gabrielle Zevin", genre: "Literary Fiction", language: "English", description: "A decades-long creative partnership told through games, art, and friendship.", coverTheme: "coral" },
  { key: "sea-of-tranquility", type: "ebook", title: "Sea of Tranquility", creator: "Emily St. John Mandel", genre: "Speculative Fiction", language: "English", description: "Interlocking lives across centuries, stitched together by a strange anomaly.", coverTheme: "indigo" },
  { key: "atomic-habits", type: "ebook", title: "Atomic Habits", creator: "James Clear", genre: "Personal Growth", language: "English", description: "A practical guide to building better systems through tiny behavior changes.", coverTheme: "green" },
  { key: "babel", type: "ebook", title: "Babel", creator: "R. F. Kuang", genre: "Historical Fantasy", language: "English", description: "Language, empire, and resistance collide inside an alternate Oxford.", coverTheme: "crimson" },
  { key: "klara", type: "ebook", title: "Klara and the Sun", creator: "Kazuo Ishiguro", genre: "Literary Fiction", language: "English", description: "An artificial friend watches the human world with careful, luminous attention.", coverTheme: "sun" },
  { key: "system-collapse", type: "ebook", title: "System Collapse", creator: "Martha Wells", genre: "Science Fiction", language: "English", description: "A wary security android gets pulled into another corporate rescue mission.", coverTheme: "violet" },
  { key: "pedro-paramo", type: "ebook", title: "Pedro Paramo", creator: "Juan Rulfo", genre: "Literary Fiction", language: "Spanish", description: "A haunted village, a lost father, and a landmark of Latin American fiction.", coverTheme: "stone" },
  // Multi-type catalog (media-platform-v2): music, podcasts, TV/movies.
  { key: "blue", type: "music", title: "Blue", creator: "Joni Mitchell", genre: "Folk", language: "English", description: "Confessional songwriting that defined a generation.", coverTheme: "indigo", metadata: { kind: "music", album: "Blue" } },
  { key: "the-epic", type: "music", title: "The Epic", creator: "Kamasi Washington", genre: "Jazz", language: "English", description: "A sprawling, three-hour modern jazz statement.", coverTheme: "violet", metadata: { kind: "music", album: "The Epic" } },
  { key: "99pi", type: "podcast", title: "99% Invisible", creator: "Roman Mars", genre: "Design", language: "English", description: "The unnoticed architecture and design that shapes our world.", coverTheme: "green", metadata: { kind: "podcast", show: "99% Invisible", episodeCount: 560 }, totalUnits: 560 },
  { key: "severance", type: "tv", title: "Severance", creator: "Dan Erickson", genre: "Sci-Fi Thriller", language: "English", description: "Workers surgically divide memories between work and personal life.", coverTheme: "navy", metadata: { kind: "video", seasons: 2 }, totalUnits: 2 },
  { key: "arrival", type: "movie", title: "Arrival", creator: "Denis Villeneuve", genre: "Science Fiction", language: "English", description: "A linguist races to communicate with newly arrived visitors.", coverTheme: "teal", metadata: { kind: "video", runtimeMinutes: 116 }, totalUnits: 116 },
];

export const seedCommunityUsers: SeedCommunityUser[] = [
  { key: "miles", name: "Miles Chen", avatarColor: "#8b4a62" },
  { key: "sofia", name: "Sofia Reyes", avatarColor: "#7a6426" },
];

export const seedDemoMember: SeedDemoMember = {
  key: "ava",
  name: "Ava Patel",
  email: "ava@example.com",
  password: "readmore",
  avatarColor: "#2f7d7e",
  bio: "Weekend reader, speculative fiction loyalist, and careful reviewer.",
  preferences: {
    books: {
      favoriteAuthors: ["Ursula K. Le Guin", "R. F. Kuang"],
      favoriteGenres: ["Science Fiction", "Historical Fantasy"],
      languages: ["English"],
    },
    music: { favoriteArtists: ["Nils Frahm", "Esperanza Spalding"], favoriteGenres: ["Jazz", "Ambient"] },
    podcasts: { topics: ["Technology", "Books", "Design"] },
    streaming: { favoriteGenres: ["Mystery", "Science Fiction"] },
  },
};

export const seedLibraryEntries: SeedLibraryEntry[] = [
  { userKey: "ava", mediaKey: "left-hand-darkness", status: "finished", rating: 5, review: "Quietly brilliant. The political worldbuilding stayed with me for days.", updatedAt: "2026-05-27T20:35:00.000Z", progress: 304, tags: ["sci-fi", "favorite"] },
  { userKey: "ava", mediaKey: "project-hail-mary", status: "current", rating: null, review: "", updatedAt: "2026-05-28T02:10:00.000Z", progress: 150, tags: ["sci-fi"] },
  { userKey: "ava", mediaKey: "babel", status: "wishlist", rating: null, review: "", updatedAt: "2026-05-25T16:20:00.000Z", tags: ["fantasy"] },
  { userKey: "ava", mediaKey: "blue", status: "finished", rating: 5, review: "A perfect, aching record.", updatedAt: "2026-05-20T19:00:00.000Z", tags: ["folk", "calm"] },
  { userKey: "ava", mediaKey: "99pi", status: "current", rating: null, review: "", updatedAt: "2026-05-29T08:00:00.000Z", progress: 40, tags: ["design"] },
  { userKey: "ava", mediaKey: "severance", status: "wishlist", rating: null, review: "", updatedAt: "2026-05-24T12:00:00.000Z", tags: ["thriller"] },
];

export const seedGoal: SeedGoal = {
  userKey: "ava",
  period: "year",
  periodKey: "2026",
  targetCount: 24,
};

export const seedActivities: SeedActivity[] = [
  { userKey: "ava", mediaKey: "left-hand-darkness", action: "reviewed", detail: "rated it 5 stars", createdAt: "2026-05-27T20:35:00.000Z" },
  { userKey: "ava", mediaKey: "blue", action: "reviewed", detail: "rated it 5 stars", createdAt: "2026-05-20T19:00:00.000Z" },
  { userKey: "ava", mediaKey: "99pi", action: "started", detail: "started listening", createdAt: "2026-05-29T08:00:00.000Z" },
  { userKey: "sofia", mediaKey: "circe", action: "started", detail: "started reading", createdAt: "2026-05-27T18:05:00.000Z" },
  { userKey: "miles", mediaKey: "tomorrow", action: "reviewed", detail: "rated it 4 stars", createdAt: "2026-05-26T17:15:00.000Z" },
  { userKey: "sofia", mediaKey: "klara", action: "added", detail: "added it to their wishlist", createdAt: "2026-05-25T16:20:00.000Z" },
];
