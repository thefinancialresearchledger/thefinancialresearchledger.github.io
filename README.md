# The Financial Research Ledger — Rich Text Editor Upgrade

This package adds a Word-style article editor to your existing `admin.html`, following the warm beige/brown color scheme.

## Features
- Select text and apply **bold**, underline, 9 font sizes (12–40 px), or 10 curated colors.
- Format paragraphs and preserve formatting in previews and published research articles.
- Keep research graphs, figure markers, the draft importer/exporter, and the existing GitHub publishing flow.
- Keep the prior plaintext article format working.
- No external libraries or API requests; no changes to GitHub credentials.

## Install on your Mac
1. **Make a backup of your local website repository** first. Do not delete its existing images or JS files.
2. Extract this ZIP.
3. In Terminal run:
   `python3 /path/to/extracted/ledger-editor-upgrade/install_editor.py /path/to/your/thefinancialresearchledger.github.io`
4. Open your local `admin.html` in a browser to inspect the new toolbar. The publishing connection still needs to run on your HTTPS website.
5. Test formatting, article preview, and insertion of figure markers before committing.
6. Commit and push only once your existing GitHub `fatal error in commit_refs` problem is resolved.

Installer creates a dated `thefinancialresearchledger.github.io-rich-editor-backup-*` directory beside your website folder, outside the Git repository.

## Files modified
- `admin.html` — load new editor CSS and JavaScript
- `assets/admin.js` — sync editor text with the existing publishing and image controls
- `assets/editor-core.js` — sanitize and render styled rich text safely
- `assets/admin.css` — not modified
- `assets/rich-editor.css` — added
- `assets/rich-editor.js` — added

## Limitations
- This is a local upgrade package built against the public `main` branch as it appeared November 4, 2026, not the newer unpushed local commit. The installer stops without edits if expected code patterns don't match.
- The formatting controls are for **research article body text**, not the homepage banner, biography, or navigation.
- Pasted content is intentionally converted to plain text before applying editor styling, for safety.
- Complex selections spanning multiple block-level paragraphs may need formatting separately.
- Github Pages can't publish updates until your GitHub remote accepts a push.
