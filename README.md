# LibraryLoop

Spec-driven SaaS prototype for tracking digital media consumption. The first implemented slice focuses on e-books.

## Current Slice

- Register and log in with a single signed-in account.
- Editable user profile with media preferences.
- E-book wishlist, currently reading, and finished shelves.
- Text reviews with 1-5 star ratings.
- Community feed with activity from other readers.
- Recommendation scoring from profile preferences and reader history.
- Custom e-book creation.
- Browser-local persistence.

## Spec

See [docs/specs/ebooks-mvp.md](docs/specs/ebooks-mvp.md).

## Run

```sh
python3 -m http.server 4173
```

Then open `http://localhost:4173`.
