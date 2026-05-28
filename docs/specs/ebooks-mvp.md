# E-books MVP Spec

## Goal

Build the first SaaS slice of a digital media tracker around e-books. A user can register, log in, manage their private e-book library, maintain a profile with media preferences, receive recommendations, and review finished books. Community activity is visible only in the feed.

## Scope

### In

- Local registration and login flow for the prototype.
- A single signed-in user experience.
- Editable user profile with name, email, bio, and digital media preferences.
- Book preferences:
  - Favorite authors
  - Favorite genres
  - Languages
- Starter preference fields for music, podcasts, TV shows, and movies.
- Seeded e-book catalog.
- Add catalog items or custom e-books to the signed-in user's private library.
- Three e-book shelves:
  - Wishlist
  - Currently reading
  - Finished
- Reviews with optional text and a 1-5 star rating.
- Community feed that includes activities from the signed-in user and other users.
- Recommendations based on the signed-in user's profile preferences and reading history.
- Local persistence in the browser.

### Out

- Production authentication, password hashing, billing, and server-side persistence.
- External book metadata APIs.
- Full music, podcasts, TV, and movie tracking workflows.
- Social graph, comments, likes, privacy controls, and moderation.

## Personas

- Reader: tracks private reading status and reviews finished books.
- Returning user: logs in to continue from saved profile and shelf state.
- New user: registers and starts with an empty private library.
- Friend: appears only through public feed activity.

## User Stories

1. As a new user, I can register with name, email, and password.
2. As a returning user, I can log in and see only my account information and library.
3. As a signed-in user, I can edit my profile.
4. As a signed-in user, I can capture favorite book authors, genres, and languages.
5. As a signed-in user, I can capture early preferences for music, podcasts, TV shows, and movies.
6. As a signed-in user, I can add an e-book to my wishlist.
7. As a signed-in user, I can mark an e-book as currently reading or finished.
8. As a signed-in user, I can leave a written review and 1-5 star rating for a finished e-book.
9. As a signed-in user, I can see community activity from other users only in the feed.
10. As a signed-in user, I can get recommendations that exclude e-books already in my library.

## Domain Model

### Account

- `id`
- `name`
- `email`
- `password` for local prototype only
- `avatarColor`
- `bio`
- `preferences`

### Preferences

- `books.favoriteAuthors`
- `books.favoriteGenres`
- `books.languages`
- `music.favoriteArtists`
- `music.favoriteGenres`
- `podcasts.topics`
- `streaming.favoriteGenres`

### CommunityUser

- `id`
- `name`
- `avatarColor`

### MediaItem

- `id`
- `type`: `ebook`
- `title`
- `creator`
- `genre`
- `language`
- `description`
- `coverTheme`

### LibraryEntry

- `id`
- `userId`
- `mediaItemId`
- `status`: `wishlist`, `current`, or `finished`
- `rating`: number from 1-5, optional
- `review`: text, optional
- `updatedAt`

### Activity

- `id`
- `userId`
- `mediaItemId`
- `action`: `added`, `started`, `finished`, or `reviewed`
- `detail`
- `createdAt`

## Recommendation Rules

1. Exclude e-books already in the signed-in user's library.
2. Score catalog books by:
   - +4 for matching a favorite author from profile preferences.
   - +3 for matching a favorite genre from profile preferences.
   - +2 for matching a preferred language from profile preferences.
   - +3 for matching a genre from a 4- or 5-star finished book.
   - +2 for matching an author from a 4- or 5-star finished book.
   - +1 for matching a genre from any current or wishlist book.
3. Sort by highest score, then title.
4. When no user signal exists, show a curated starter set.

## Acceptance Criteria

- A new visitor sees a login/register surface, not multiple selectable users.
- A demo account can log in to seeded private shelves and preferences.
- Registering creates a new account and signs that account in.
- The signed-in app shows only the current user's profile, shelves, reviews, and recommendations.
- Other users appear only in the community feed.
- Editing profile fields persists after refresh.
- Adding an e-book to a shelf creates or updates one library entry for the signed-in user.
- Marking an item as finished exposes rating and review controls.
- Saving a review updates the item card and adds a feed entry.
- Recommendations respond to book authors, genres, languages, and reading history.
- Refreshing the browser preserves accounts, login state, profile changes, catalog changes, shelves, reviews, and feed.
- The layout is usable on desktop and mobile widths.

## Future Slices

1. Backend API with secure auth, password hashing, relational persistence, and tenant-safe access control.
2. E-book metadata search via Open Library or Google Books.
3. Public/private activity settings and feed filtering.
4. Music support with albums, artists, playlists, and listening services.
5. Podcasts, TV shows, and movies with media-specific statuses and metadata.
6. Cross-media recommendations driven by unified preferences.
