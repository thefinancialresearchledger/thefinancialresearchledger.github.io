# The Financial Research Ledger

A static website for Yongjin (Jin) Hwang. No paid services or build tools are required.

## Publish free with GitHub Pages

1. Create a free GitHub account if needed.
2. Create a public repository named YOURUSERNAME.github.io, replacing YOURUSERNAME with your account name.
3. Upload index.html, research.html, about.html, robots.txt, and the assets folder to the repository root.
4. Open Settings → Pages. Select Deploy from a branch, main, and / (root), then Save.
5. GitHub will show the public website URL after deployment.

GitHub’s free plan requires a public repository for Pages. Provider terms and limits can change. A custom domain is optional and usually costs money.

## Add research

Each paper should have its own HTML page with its title, author, date, abstract, references, and optional PDF download. Add links from research.html and index.html. Once the final public URL is known, add canonical URLs and a sitemap using that address; then submit it through Google Search Console. Search inclusion is decided by Google.

## Typography

All text uses EB Garamond, loaded from Google Fonts. Installed Garamond and a generic serif font are fallbacks if the web font cannot load. The website needs an internet connection for its web font.

## Personal information

The site includes the supplied photo, approved biography, and professional LinkedIn link. The full résumé, phone number, home address, and email are not included.

## Search

Homepage search opens the research library; the library searches titles, summaries, and topics as you type. Add real papers to assets/research-data.js with title, summary, topics (array), date, and a local url. Empty queries show all papers. The initial index is empty because no research has been supplied.
