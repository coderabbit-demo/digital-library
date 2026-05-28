(function () {
  const STORAGE_KEY = "libraryloop.ebooks.v2";
  const COLORS = ["#2f7d7e", "#8b4a62", "#7a6426", "#4f6f9f", "#6b7650"];

  const starterState = {
    auth: {
      currentUserId: null,
      view: "login",
      message: ""
    },
    accounts: [
      {
        id: "u-ava",
        name: "Ava Patel",
        email: "ava@example.com",
        password: "readmore",
        avatarColor: "#2f7d7e",
        bio: "Weekend reader, speculative fiction loyalist, and careful reviewer.",
        preferences: {
          books: {
            favoriteAuthors: ["Ursula K. Le Guin", "R. F. Kuang"],
            favoriteGenres: ["Science Fiction", "Historical Fantasy"],
            languages: ["English"]
          },
          music: {
            favoriteArtists: ["Nils Frahm", "Esperanza Spalding"],
            favoriteGenres: ["Jazz", "Ambient"]
          },
          podcasts: {
            topics: ["Technology", "Books", "Design"]
          },
          streaming: {
            favoriteGenres: ["Mystery", "Science Fiction"]
          }
        }
      }
    ],
    communityUsers: [
      { id: "u-miles", name: "Miles Chen", avatarColor: "#8b4a62" },
      { id: "u-sofia", name: "Sofia Reyes", avatarColor: "#7a6426" }
    ],
    mediaItems: [
      {
        id: "b-left-hand-darkness",
        type: "ebook",
        title: "The Left Hand of Darkness",
        creator: "Ursula K. Le Guin",
        genre: "Science Fiction",
        language: "English",
        description: "A diplomatic journey across an icy planet with a society unlike any other.",
        coverTheme: "teal"
      },
      {
        id: "b-circe",
        type: "ebook",
        title: "Circe",
        creator: "Madeline Miller",
        genre: "Mythic Fiction",
        language: "English",
        description: "A witch finds her voice among gods, monsters, and exiles.",
        coverTheme: "gold"
      },
      {
        id: "b-project-hail-mary",
        type: "ebook",
        title: "Project Hail Mary",
        creator: "Andy Weir",
        genre: "Science Fiction",
        language: "English",
        description: "A lone astronaut wakes up with a puzzle that may decide Earth's future.",
        coverTheme: "navy"
      },
      {
        id: "b-educated",
        type: "ebook",
        title: "Educated",
        creator: "Tara Westover",
        genre: "Memoir",
        language: "English",
        description: "A memoir about family, survival, and the long reach of education.",
        coverTheme: "stone"
      },
      {
        id: "b-tomorrow",
        type: "ebook",
        title: "Tomorrow, and Tomorrow, and Tomorrow",
        creator: "Gabrielle Zevin",
        genre: "Literary Fiction",
        language: "English",
        description: "A decades-long creative partnership told through games, art, and friendship.",
        coverTheme: "coral"
      },
      {
        id: "b-sea-of-tranquility",
        type: "ebook",
        title: "Sea of Tranquility",
        creator: "Emily St. John Mandel",
        genre: "Speculative Fiction",
        language: "English",
        description: "Interlocking lives across centuries, stitched together by a strange anomaly.",
        coverTheme: "indigo"
      },
      {
        id: "b-atomic-habits",
        type: "ebook",
        title: "Atomic Habits",
        creator: "James Clear",
        genre: "Personal Growth",
        language: "English",
        description: "A practical guide to building better systems through tiny behavior changes.",
        coverTheme: "green"
      },
      {
        id: "b-babel",
        type: "ebook",
        title: "Babel",
        creator: "R. F. Kuang",
        genre: "Historical Fantasy",
        language: "English",
        description: "Language, empire, and resistance collide inside an alternate Oxford.",
        coverTheme: "crimson"
      },
      {
        id: "b-klara",
        type: "ebook",
        title: "Klara and the Sun",
        creator: "Kazuo Ishiguro",
        genre: "Literary Fiction",
        language: "English",
        description: "An artificial friend watches the human world with careful, luminous attention.",
        coverTheme: "sun"
      },
      {
        id: "b-system-collapse",
        type: "ebook",
        title: "System Collapse",
        creator: "Martha Wells",
        genre: "Science Fiction",
        language: "English",
        description: "A wary security android gets pulled into another corporate rescue mission.",
        coverTheme: "violet"
      },
      {
        id: "b-pedro-paramo",
        type: "ebook",
        title: "Pedro Paramo",
        creator: "Juan Rulfo",
        genre: "Literary Fiction",
        language: "Spanish",
        description: "A haunted village, a lost father, and a landmark of Latin American fiction.",
        coverTheme: "stone"
      }
    ],
    libraryEntries: [
      {
        id: "le-1",
        userId: "u-ava",
        mediaItemId: "b-left-hand-darkness",
        status: "finished",
        rating: 5,
        review: "Quietly brilliant. The political worldbuilding stayed with me for days.",
        updatedAt: "2026-05-27T20:35:00.000Z"
      },
      {
        id: "le-2",
        userId: "u-ava",
        mediaItemId: "b-project-hail-mary",
        status: "current",
        rating: null,
        review: "",
        updatedAt: "2026-05-28T02:10:00.000Z"
      },
      {
        id: "le-3",
        userId: "u-ava",
        mediaItemId: "b-babel",
        status: "wishlist",
        rating: null,
        review: "",
        updatedAt: "2026-05-25T16:20:00.000Z"
      }
    ],
    activities: [
      {
        id: "a-1",
        userId: "u-ava",
        mediaItemId: "b-left-hand-darkness",
        action: "reviewed",
        detail: "rated it 5 stars",
        createdAt: "2026-05-27T20:35:00.000Z"
      },
      {
        id: "a-2",
        userId: "u-sofia",
        mediaItemId: "b-circe",
        action: "started",
        detail: "started reading",
        createdAt: "2026-05-27T18:05:00.000Z"
      },
      {
        id: "a-3",
        userId: "u-miles",
        mediaItemId: "b-tomorrow",
        action: "reviewed",
        detail: "rated it 4 stars",
        createdAt: "2026-05-26T17:15:00.000Z"
      },
      {
        id: "a-4",
        userId: "u-sofia",
        mediaItemId: "b-klara",
        action: "added",
        detail: "added it to their wishlist",
        createdAt: "2026-05-25T16:20:00.000Z"
      }
    ],
    filters: {
      shelf: "all",
      catalog: "all"
    }
  };

  let state = loadState();
  const app = document.getElementById("app");

  function loadState() {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return structuredClone(starterState);

    try {
      const parsed = JSON.parse(saved);
      return normalizeState({
        ...structuredClone(starterState),
        ...parsed,
        auth: { ...structuredClone(starterState.auth), ...(parsed.auth || {}) },
        filters: { shelf: "all", catalog: "all", ...(parsed.filters || {}) }
      });
    } catch (error) {
      console.warn("Could not load saved state", error);
      return structuredClone(starterState);
    }
  }

  function normalizeState(nextState) {
    nextState.accounts = nextState.accounts.map((account) => ({
      ...account,
      preferences: normalizePreferences(account.preferences)
    }));
    nextState.mediaItems = nextState.mediaItems.map((item) => ({
      language: "English",
      ...item
    }));
    return nextState;
  }

  function normalizePreferences(preferences = {}) {
    return {
      books: {
        favoriteAuthors: [],
        favoriteGenres: [],
        languages: [],
        ...(preferences.books || {})
      },
      music: {
        favoriteArtists: [],
        favoriteGenres: [],
        ...(preferences.music || {})
      },
      podcasts: {
        topics: [],
        ...(preferences.podcasts || {})
      },
      streaming: {
        favoriteGenres: [],
        ...(preferences.streaming || {})
      }
    };
  }

  function persist() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  function setState(updater) {
    state = normalizeState(updater(state));
    persist();
    render();
  }

  function byId(collection, id) {
    return collection.find((item) => item.id === id);
  }

  function currentUser() {
    return byId(state.accounts, state.auth.currentUserId);
  }

  function knownUser(userId) {
    return byId(state.accounts, userId) || byId(state.communityUsers, userId);
  }

  function userInitial(user) {
    return (user?.name || "?").trim()[0]?.toUpperCase() || "?";
  }

  function activeEntries() {
    const user = currentUser();
    if (!user) return [];
    return state.libraryEntries.filter((entry) => entry.userId === user.id);
  }

  function itemForEntry(entry) {
    return byId(state.mediaItems, entry.mediaItemId);
  }

  function formatDate(value) {
    return new Intl.DateTimeFormat(undefined, {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit"
    }).format(new Date(value));
  }

  function escapeHtml(value) {
    return String(value || "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function normalizeId(value) {
    return value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
  }

  function uid(prefix) {
    return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  }

  function splitList(value) {
    return String(value || "")
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }

  function listValue(items) {
    return (items || []).join(", ");
  }

  function lowerSet(items) {
    return new Set((items || []).map((item) => item.toLowerCase()));
  }

  function statusLabel(status) {
    return {
      wishlist: "Wishlist",
      current: "Currently reading",
      finished: "Finished"
    }[status];
  }

  function actionForStatus(status) {
    if (status === "current") return "started";
    if (status === "finished") return "finished";
    return "added";
  }

  function detailForStatus(status, hadEntry) {
    if (status === "wishlist") return hadEntry ? "moved it to their wishlist" : "added it to their wishlist";
    if (status === "current") return "started reading";
    return "marked it finished";
  }

  function addActivity(nextState, userId, mediaItemId, action, detail) {
    nextState.activities = [
      {
        id: uid("activity"),
        userId,
        mediaItemId,
        action,
        detail,
        createdAt: new Date().toISOString()
      },
      ...nextState.activities
    ].slice(0, 60);
  }

  function upsertLibraryEntry(mediaItemId, status) {
    setState((current) => {
      const next = structuredClone(current);
      const user = byId(next.accounts, next.auth.currentUserId);
      if (!user) return next;

      const existing = next.libraryEntries.find(
        (entry) => entry.userId === user.id && entry.mediaItemId === mediaItemId
      );
      const now = new Date().toISOString();

      if (existing) {
        existing.status = status;
        existing.updatedAt = now;
        if (status !== "finished") {
          existing.rating = null;
          existing.review = "";
        }
      } else {
        next.libraryEntries.push({
          id: uid("entry"),
          userId: user.id,
          mediaItemId,
          status,
          rating: null,
          review: "",
          updatedAt: now
        });
      }

      addActivity(next, user.id, mediaItemId, actionForStatus(status), detailForStatus(status, Boolean(existing)));
      return next;
    });
  }

  function saveReview(entryId, rating, review) {
    setState((current) => {
      const next = structuredClone(current);
      const user = byId(next.accounts, next.auth.currentUserId);
      const entry = byId(next.libraryEntries, entryId);
      if (!user || !entry || entry.userId !== user.id) return next;

      entry.status = "finished";
      entry.rating = Number(rating);
      entry.review = review.trim();
      entry.updatedAt = new Date().toISOString();
      addActivity(next, entry.userId, entry.mediaItemId, "reviewed", `rated it ${entry.rating} stars`);
      return next;
    });
  }

  function registerAccount(formData) {
    const name = formData.get("name").trim();
    const email = formData.get("email").trim().toLowerCase();
    const password = formData.get("password");
    if (!name || !email || !password) return;

    setState((current) => {
      const next = structuredClone(current);
      if (next.accounts.some((account) => account.email.toLowerCase() === email)) {
        next.auth.message = "An account already exists for that email.";
        next.auth.view = "register";
        return next;
      }

      const account = {
        id: `u-${normalizeId(name)}-${Date.now().toString(36)}`,
        name,
        email,
        password,
        avatarColor: COLORS[next.accounts.length % COLORS.length],
        bio: "",
        preferences: normalizePreferences()
      };

      next.accounts.push(account);
      next.auth.currentUserId = account.id;
      next.auth.message = "";
      return next;
    });
  }

  function loginAccount(formData) {
    const email = formData.get("email").trim().toLowerCase();
    const password = formData.get("password");

    setState((current) => {
      const next = structuredClone(current);
      const account = next.accounts.find(
        (candidate) => candidate.email.toLowerCase() === email && candidate.password === password
      );
      if (!account) {
        next.auth.message = "Email or password does not match.";
        next.auth.view = "login";
        return next;
      }

      next.auth.currentUserId = account.id;
      next.auth.message = "";
      return next;
    });
  }

  function saveProfile(formData) {
    setState((current) => {
      const next = structuredClone(current);
      const user = byId(next.accounts, next.auth.currentUserId);
      if (!user) return next;

      const nextEmail = formData.get("email").trim().toLowerCase();
      const emailOwner = next.accounts.find(
        (account) => account.email.toLowerCase() === nextEmail && account.id !== user.id
      );
      if (emailOwner) {
        next.auth.message = "That email is already registered.";
        return next;
      }

      user.name = formData.get("name").trim() || user.name;
      user.email = nextEmail || user.email;
      user.bio = formData.get("bio").trim();
      user.preferences = {
        books: {
          favoriteAuthors: splitList(formData.get("bookAuthors")),
          favoriteGenres: splitList(formData.get("bookGenres")),
          languages: splitList(formData.get("bookLanguages"))
        },
        music: {
          favoriteArtists: splitList(formData.get("musicArtists")),
          favoriteGenres: splitList(formData.get("musicGenres"))
        },
        podcasts: {
          topics: splitList(formData.get("podcastTopics"))
        },
        streaming: {
          favoriteGenres: splitList(formData.get("streamingGenres"))
        }
      };
      next.auth.message = "Profile saved.";
      return next;
    });
  }

  function addCustomBook(formData) {
    const title = formData.get("title").trim();
    const creator = formData.get("creator").trim();
    const genre = formData.get("genre").trim();
    const language = formData.get("language").trim() || "English";
    const description = formData.get("description").trim();
    const status = formData.get("status");
    if (!title || !creator || !genre) return;

    setState((current) => {
      const next = structuredClone(current);
      const user = byId(next.accounts, next.auth.currentUserId);
      if (!user) return next;

      const mediaItem = {
        id: `b-${normalizeId(`${title}-${creator}`)}-${Date.now().toString(36)}`,
        type: "ebook",
        title,
        creator,
        genre,
        language,
        description: description || "A custom e-book added to this account.",
        coverTheme: ["teal", "gold", "coral", "green", "violet"][next.mediaItems.length % 5]
      };
      next.mediaItems.push(mediaItem);
      next.libraryEntries.push({
        id: uid("entry"),
        userId: user.id,
        mediaItemId: mediaItem.id,
        status,
        rating: null,
        review: "",
        updatedAt: new Date().toISOString()
      });
      addActivity(next, user.id, mediaItem.id, actionForStatus(status), detailForStatus(status, false));
      return next;
    });
  }

  function resetDemo() {
    localStorage.removeItem(STORAGE_KEY);
    state = structuredClone(starterState);
    render();
  }

  function shelfCounts() {
    return activeEntries().reduce(
      (counts, entry) => {
        counts[entry.status] += 1;
        counts.total += 1;
        return counts;
      },
      { total: 0, wishlist: 0, current: 0, finished: 0 }
    );
  }

  function reviewedCount() {
    return activeEntries().filter((entry) => entry.rating).length;
  }

  function getRecommendations() {
    const user = currentUser();
    if (!user) return [];

    const entries = activeEntries();
    const libraryIds = new Set(entries.map((entry) => entry.mediaItemId));
    const preferences = user.preferences.books;
    const favoriteAuthors = lowerSet(preferences.favoriteAuthors);
    const favoriteGenres = lowerSet(preferences.favoriteGenres);
    const preferredLanguages = lowerSet(preferences.languages);
    const signals = {
      strongGenres: new Set(),
      strongCreators: new Set(),
      lightGenres: new Set()
    };

    entries.forEach((entry) => {
      const item = itemForEntry(entry);
      if (!item) return;
      if (entry.status === "finished" && Number(entry.rating) >= 4) {
        signals.strongGenres.add(item.genre.toLowerCase());
        signals.strongCreators.add(item.creator.toLowerCase());
      }
      if (entry.status === "current" || entry.status === "wishlist") {
        signals.lightGenres.add(item.genre.toLowerCase());
      }
    });

    const scored = state.mediaItems
      .filter((item) => item.type === "ebook" && !libraryIds.has(item.id))
      .map((item) => {
        const genre = item.genre.toLowerCase();
        const creator = item.creator.toLowerCase();
        const language = item.language.toLowerCase();
        let score = 0;
        if (favoriteAuthors.has(creator)) score += 4;
        if (favoriteGenres.has(genre)) score += 3;
        if (preferredLanguages.has(language)) score += 2;
        if (signals.strongGenres.has(genre)) score += 3;
        if (signals.strongCreators.has(creator)) score += 2;
        if (signals.lightGenres.has(genre)) score += 1;
        return { item, score };
      })
      .sort((a, b) => b.score - a.score || a.item.title.localeCompare(b.item.title));

    const hasSignals =
      favoriteAuthors.size ||
      favoriteGenres.size ||
      preferredLanguages.size ||
      signals.strongGenres.size ||
      signals.strongCreators.size ||
      signals.lightGenres.size;
    return (hasSignals ? scored : scored.filter((entry) => ["b-circe", "b-sea-of-tranquility", "b-klara"].includes(entry.item.id))).slice(0, 4);
  }

  function renderStars(rating, entryId) {
    const selected = Number(rating) || 0;
    return [1, 2, 3, 4, 5]
      .map(
        (value) => `
          <button
            class="star-button ${value <= selected ? "is-selected" : ""}"
            type="button"
            data-action="set-rating"
            data-entry-id="${entryId}"
            data-rating="${value}"
            aria-label="${value} star${value === 1 ? "" : "s"}"
          >★</button>
        `
      )
      .join("");
  }

  function renderReadOnlyStars(rating) {
    if (!rating) return "";
    return `<span class="stars" aria-label="${rating} out of 5 stars">${"★".repeat(rating)}${"☆".repeat(5 - rating)}</span>`;
  }

  function renderCover(item) {
    const initials = item.title
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 3)
      .map((word) => word[0])
      .join("");

    return `
      <div class="book-cover cover-${item.coverTheme || "teal"}" aria-hidden="true">
        <span>${escapeHtml(initials)}</span>
      </div>
    `;
  }

  function renderAuth() {
    const isRegister = state.auth.view === "register";
    return `
      <main class="auth-shell">
        <section class="auth-card" aria-labelledby="auth-title">
          <div class="brand auth-brand">
            <div class="brand-mark">LL</div>
            <div>
              <strong>LibraryLoop</strong>
              <span>Digital media journal</span>
            </div>
          </div>
          <div>
            <p class="eyebrow">Account</p>
            <h1 id="auth-title">${isRegister ? "Create account" : "Sign in"}</h1>
          </div>
          ${state.auth.message ? `<p class="form-message">${escapeHtml(state.auth.message)}</p>` : ""}
          <form class="auth-form" data-form="${isRegister ? "register" : "login"}">
            ${
              isRegister
                ? `
                  <label>
                    Name
                    <input name="name" type="text" required autocomplete="name" placeholder="Ava Patel" />
                  </label>
                `
                : ""
            }
            <label>
              Email
              <input name="email" type="email" required autocomplete="email" placeholder="ava@example.com" />
            </label>
            <label>
              Password
              <input name="password" type="password" required autocomplete="${isRegister ? "new-password" : "current-password"}" placeholder="readmore" />
            </label>
            <button class="primary-button" type="submit">${isRegister ? "Register" : "Log in"}</button>
          </form>
          <div class="auth-actions">
            <button class="subtle-button" data-action="toggle-auth" data-view="${isRegister ? "login" : "register"}" type="button">
              ${isRegister ? "Use existing account" : "Create new account"}
            </button>
            <button class="subtle-button" data-action="demo-login" type="button">Use demo account</button>
          </div>
        </section>
      </main>
    `;
  }

  function renderAccountRail() {
    const user = currentUser();
    return `
      <aside class="account-rail" aria-label="Account">
        <div class="brand">
          <div class="brand-mark">LL</div>
          <div>
            <strong>LibraryLoop</strong>
            <span>E-books</span>
          </div>
        </div>

        <div class="signed-in-card">
          <span class="avatar" style="--avatar-color: ${user.avatarColor}">${escapeHtml(userInitial(user))}</span>
          <div>
            <strong>${escapeHtml(user.name)}</strong>
            <span>${escapeHtml(user.email)}</span>
          </div>
        </div>

        <nav class="rail-nav" aria-label="Sections">
          <a href="#profile">Profile</a>
          <a href="#recommendations">Recommendations</a>
          <a href="#shelves">Shelves</a>
          <a href="#catalog">Catalog</a>
        </nav>

        <div class="rail-actions">
          <button class="subtle-button" data-action="logout" type="button">Sign out</button>
          <button class="subtle-button" data-action="reset-demo" type="button">Reset demo data</button>
        </div>
      </aside>
    `;
  }

  function renderHero() {
    const counts = shelfCounts();
    const user = currentUser();
    return `
      <section class="workspace-hero">
        <div>
          <p class="eyebrow">Signed in</p>
          <h1>${escapeHtml(user.name)}</h1>
        </div>
        <div class="stat-grid" aria-label="Reading stats">
          <div class="stat">
            <strong>${counts.wishlist}</strong>
            <span>Wishlist</span>
          </div>
          <div class="stat">
            <strong>${counts.current}</strong>
            <span>Reading</span>
          </div>
          <div class="stat">
            <strong>${counts.finished}</strong>
            <span>Finished</span>
          </div>
          <div class="stat">
            <strong>${reviewedCount()}</strong>
            <span>Reviewed</span>
          </div>
        </div>
      </section>
    `;
  }

  function renderProfile() {
    const user = currentUser();
    const preferences = user.preferences;
    return `
      <section class="section profile-section" id="profile" aria-labelledby="profile-title">
        <div class="section-heading">
          <div>
            <p class="eyebrow">Account</p>
            <h2 id="profile-title">Profile</h2>
          </div>
        </div>
        ${state.auth.message ? `<p class="form-message">${escapeHtml(state.auth.message)}</p>` : ""}
        <form class="profile-form" data-form="save-profile">
          <label>
            Name
            <input name="name" type="text" required value="${escapeHtml(user.name)}" autocomplete="name" />
          </label>
          <label>
            Email
            <input name="email" type="email" required value="${escapeHtml(user.email)}" autocomplete="email" />
          </label>
          <label class="wide-field">
            Bio
            <textarea name="bio" rows="3">${escapeHtml(user.bio)}</textarea>
          </label>

          <div class="preference-group">
            <h3>Books</h3>
            <label>
              Favorite authors
              <input name="bookAuthors" type="text" value="${escapeHtml(listValue(preferences.books.favoriteAuthors))}" />
            </label>
            <label>
              Favorite genres
              <input name="bookGenres" type="text" value="${escapeHtml(listValue(preferences.books.favoriteGenres))}" />
            </label>
            <label>
              Languages
              <input name="bookLanguages" type="text" value="${escapeHtml(listValue(preferences.books.languages))}" />
            </label>
          </div>

          <div class="preference-group">
            <h3>Music</h3>
            <label>
              Favorite artists
              <input name="musicArtists" type="text" value="${escapeHtml(listValue(preferences.music.favoriteArtists))}" />
            </label>
            <label>
              Favorite genres
              <input name="musicGenres" type="text" value="${escapeHtml(listValue(preferences.music.favoriteGenres))}" />
            </label>
          </div>

          <div class="preference-group">
            <h3>Podcasts</h3>
            <label>
              Topics
              <input name="podcastTopics" type="text" value="${escapeHtml(listValue(preferences.podcasts.topics))}" />
            </label>
          </div>

          <div class="preference-group">
            <h3>TV and movies</h3>
            <label>
              Favorite genres
              <input name="streamingGenres" type="text" value="${escapeHtml(listValue(preferences.streaming.favoriteGenres))}" />
            </label>
          </div>

          <button class="primary-button" type="submit">Save profile</button>
        </form>
      </section>
    `;
  }

  function renderRecommendations() {
    const recommendations = getRecommendations();

    return `
      <section class="section recommendations-section" id="recommendations" aria-labelledby="recommendations-title">
        <div class="section-heading">
          <div>
            <p class="eyebrow">For you</p>
            <h2 id="recommendations-title">Recommendations</h2>
          </div>
        </div>
        <div class="recommendation-grid">
          ${recommendations
            .map(
              ({ item, score }) => `
                <article class="media-card recommendation-card">
                  ${renderCover(item)}
                  <div class="card-body">
                    <div>
                      <span class="pill">${escapeHtml(item.genre)}</span>
                      <h3>${escapeHtml(item.title)}</h3>
                      <p class="creator">${escapeHtml(item.creator)} · ${escapeHtml(item.language)}</p>
                      <p>${escapeHtml(item.description)}</p>
                    </div>
                    <div class="card-actions">
                      <span class="match-score">${score > 0 ? `${score} match` : "Curated pick"}</span>
                      <button class="primary-button" data-action="add-to-shelf" data-item-id="${item.id}" data-status="wishlist" type="button">+ Wishlist</button>
                    </div>
                  </div>
                </article>
              `
            )
            .join("")}
        </div>
      </section>
    `;
  }

  function renderShelves() {
    const entries = activeEntries()
      .map((entry) => ({ entry, item: itemForEntry(entry) }))
      .filter(({ item }) => item);
    const filtered =
      state.filters.shelf === "all" ? entries : entries.filter(({ entry }) => entry.status === state.filters.shelf);

    return `
      <section class="section shelves-section" id="shelves" aria-labelledby="shelves-title">
        <div class="section-heading">
          <div>
            <p class="eyebrow">Library</p>
            <h2 id="shelves-title">Shelves</h2>
          </div>
          <div class="segmented-control" role="tablist" aria-label="Shelf filter">
            ${["all", "wishlist", "current", "finished"]
              .map(
                (filter) => `
                  <button
                    class="${state.filters.shelf === filter ? "is-active" : ""}"
                    data-action="set-shelf-filter"
                    data-filter="${filter}"
                    type="button"
                  >${filter === "all" ? "All" : statusLabel(filter)}</button>
                `
              )
              .join("")}
          </div>
        </div>
        <div class="shelf-grid">
          ${
            filtered.length
              ? filtered.map(({ entry, item }) => renderLibraryCard(entry, item)).join("")
              : `<div class="empty-state">No e-books here yet.</div>`
          }
        </div>
      </section>
    `;
  }

  function renderLibraryCard(entry, item) {
    return `
      <article class="media-card library-card">
        ${renderCover(item)}
        <div class="card-body">
          <div>
            <div class="card-kicker">
              <span class="pill">${statusLabel(entry.status)}</span>
              ${renderReadOnlyStars(entry.rating)}
            </div>
            <h3>${escapeHtml(item.title)}</h3>
            <p class="creator">${escapeHtml(item.creator)} · ${escapeHtml(item.genre)} · ${escapeHtml(item.language)}</p>
            <p>${escapeHtml(item.description)}</p>
            ${entry.review ? `<blockquote>${escapeHtml(entry.review)}</blockquote>` : ""}
          </div>

          <div class="status-actions" aria-label="Move ${escapeHtml(item.title)}">
            <button data-action="add-to-shelf" data-item-id="${item.id}" data-status="wishlist" type="button">Wishlist</button>
            <button data-action="add-to-shelf" data-item-id="${item.id}" data-status="current" type="button">Reading</button>
            <button data-action="add-to-shelf" data-item-id="${item.id}" data-status="finished" type="button">Finished</button>
          </div>

          ${
            entry.status === "finished"
              ? `
                <form class="review-form" data-form="save-review" data-entry-id="${entry.id}">
                  <div class="rating-row" data-rating-group="${entry.id}">
                    ${renderStars(entry.rating, entry.id)}
                    <input type="hidden" name="rating" value="${entry.rating || 5}" />
                  </div>
                  <label for="review-${entry.id}">Review</label>
                  <textarea id="review-${entry.id}" name="review" rows="3" placeholder="What should friends know?">${escapeHtml(entry.review)}</textarea>
                  <button class="primary-button" type="submit">Save review</button>
                </form>
              `
              : ""
          }
        </div>
      </article>
    `;
  }

  function renderCatalog() {
    const libraryIds = new Set(activeEntries().map((entry) => entry.mediaItemId));
    const genres = ["all", ...Array.from(new Set(state.mediaItems.map((item) => item.genre))).sort()];
    const items =
      state.filters.catalog === "all"
        ? state.mediaItems
        : state.mediaItems.filter((item) => item.genre === state.filters.catalog);

    return `
      <section class="section catalog-section" id="catalog" aria-labelledby="catalog-title">
        <div class="section-heading">
          <div>
            <p class="eyebrow">E-book catalog</p>
            <h2 id="catalog-title">Discover and add</h2>
          </div>
          <select class="select-control" data-action="set-catalog-filter" aria-label="Catalog genre">
            ${genres
              .map((genre) => `<option value="${escapeHtml(genre)}" ${state.filters.catalog === genre ? "selected" : ""}>${genre === "all" ? "All genres" : escapeHtml(genre)}</option>`)
              .join("")}
          </select>
        </div>
        <div class="catalog-grid">
          ${items
            .map(
              (item) => `
                <article class="catalog-row ${libraryIds.has(item.id) ? "is-owned" : ""}">
                  ${renderCover(item)}
                  <div>
                    <span class="pill">${escapeHtml(item.genre)}</span>
                    <h3>${escapeHtml(item.title)}</h3>
                    <p>${escapeHtml(item.creator)} · ${escapeHtml(item.language)}</p>
                  </div>
                  <div class="status-actions">
                    <button data-action="add-to-shelf" data-item-id="${item.id}" data-status="wishlist" type="button">Wishlist</button>
                    <button data-action="add-to-shelf" data-item-id="${item.id}" data-status="current" type="button">Reading</button>
                    <button data-action="add-to-shelf" data-item-id="${item.id}" data-status="finished" type="button">Finished</button>
                  </div>
                </article>
              `
            )
            .join("")}
        </div>
      </section>
    `;
  }

  function renderCustomBookForm() {
    return `
      <section class="section custom-book-section" aria-labelledby="custom-book-title">
        <div class="section-heading">
          <div>
            <p class="eyebrow">Missing title</p>
            <h2 id="custom-book-title">Add a custom e-book</h2>
          </div>
        </div>
        <form class="custom-book-form" data-form="add-book">
          <label>
            Title
            <input name="title" type="text" required placeholder="Book title" />
          </label>
          <label>
            Author
            <input name="creator" type="text" required placeholder="Author" />
          </label>
          <label>
            Genre
            <input name="genre" type="text" required placeholder="Genre" />
          </label>
          <label>
            Language
            <input name="language" type="text" required value="English" />
          </label>
          <label>
            Shelf
            <select name="status">
              <option value="wishlist">Wishlist</option>
              <option value="current">Currently reading</option>
              <option value="finished">Finished</option>
            </select>
          </label>
          <label class="wide-field">
            Description
            <textarea name="description" rows="3" placeholder="Short description"></textarea>
          </label>
          <button class="primary-button" type="submit">Add e-book</button>
        </form>
      </section>
    `;
  }

  function renderFeed() {
    return `
      <aside class="activity-panel" aria-labelledby="feed-title">
        <div class="section-heading compact">
          <div>
            <p class="eyebrow">Community</p>
            <h2 id="feed-title">Feed</h2>
          </div>
        </div>
        <div class="feed-list">
          ${state.activities
            .slice()
            .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
            .slice(0, 12)
            .map((activity) => {
              const user = knownUser(activity.userId);
              const item = byId(state.mediaItems, activity.mediaItemId);
              if (!user || !item) return "";
              return `
                <article class="feed-item">
                  <span class="avatar" style="--avatar-color: ${user.avatarColor}">${escapeHtml(userInitial(user))}</span>
                  <div>
                    <p><strong>${escapeHtml(user.name)}</strong> ${escapeHtml(activity.detail)} <strong>${escapeHtml(item.title)}</strong>.</p>
                    <time datetime="${activity.createdAt}">${formatDate(activity.createdAt)}</time>
                  </div>
                </article>
              `;
            })
            .join("")}
        </div>
      </aside>
    `;
  }

  function renderApp() {
    if (!currentUser()) return renderAuth();

    return `
      <div class="app-shell">
        ${renderAccountRail()}
        <main>
          ${renderHero()}
          <div class="content-layout">
            <div class="primary-stack">
              ${renderProfile()}
              ${renderRecommendations()}
              ${renderShelves()}
              ${renderCatalog()}
              ${renderCustomBookForm()}
            </div>
            ${renderFeed()}
          </div>
        </main>
      </div>
    `;
  }

  function render() {
    app.innerHTML = renderApp();
  }

  app.addEventListener("click", (event) => {
    const button = event.target.closest("button");
    if (!button) return;

    const action = button.dataset.action;
    if (!action) return;

    if (action === "toggle-auth") {
      setState((current) => ({
        ...current,
        auth: { ...current.auth, view: button.dataset.view, message: "" }
      }));
    }

    if (action === "demo-login") {
      setState((current) => ({
        ...current,
        auth: { ...current.auth, currentUserId: "u-ava", view: "login", message: "" }
      }));
    }

    if (action === "logout") {
      setState((current) => ({
        ...current,
        auth: { ...current.auth, currentUserId: null, view: "login", message: "" }
      }));
    }

    if (action === "add-to-shelf") {
      upsertLibraryEntry(button.dataset.itemId, button.dataset.status);
    }

    if (action === "set-shelf-filter") {
      setState((current) => ({
        ...current,
        filters: { ...current.filters, shelf: button.dataset.filter }
      }));
    }

    if (action === "set-rating") {
      const group = app.querySelector(`[data-rating-group="${button.dataset.entryId}"]`);
      const input = group.querySelector('input[name="rating"]');
      input.value = button.dataset.rating;
      group.querySelectorAll(".star-button").forEach((star) => {
        star.classList.toggle("is-selected", Number(star.dataset.rating) <= Number(button.dataset.rating));
      });
    }

    if (action === "reset-demo") {
      resetDemo();
    }
  });

  app.addEventListener("change", (event) => {
    const target = event.target;
    if (target.dataset.action === "set-catalog-filter") {
      setState((current) => ({
        ...current,
        filters: { ...current.filters, catalog: target.value }
      }));
    }
  });

  app.addEventListener("submit", (event) => {
    event.preventDefault();
    const form = event.target;
    const formType = form.dataset.form;
    const formData = new FormData(form);

    if (formType === "login") {
      loginAccount(formData);
    }

    if (formType === "register") {
      registerAccount(formData);
    }

    if (formType === "save-profile") {
      saveProfile(formData);
    }

    if (formType === "add-book") {
      addCustomBook(formData);
    }

    if (formType === "save-review") {
      saveReview(form.dataset.entryId, formData.get("rating"), formData.get("review"));
    }
  });

  render();
})();
