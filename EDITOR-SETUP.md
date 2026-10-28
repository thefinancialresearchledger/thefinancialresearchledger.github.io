# Your website editor

## Install once

Upload the contents of the editor update ZIP to the top level of your existing website repository, alongside index.html. Keep its assets folder as a folder. Commit the upload. This adds an Owner editor link to your website footer. You can also open /admin.html directly at your website address.

This is a static editor that writes to your GitHub repository using the GitHub API. There is no paid backend or monthly editor subscription. GitHub still hosts the site; free hosting is subject to GitHub’s terms and limits.

## Create your publishing token

1. Sign in to the GitHub account that owns the website.
2. Open https://github.com/settings/personal-access-tokens/new . Choose a fine-grained personal access token.
3. Give it a name such as Financial Research Ledger editor and choose an expiration date.
4. Under Repository access, select Only select repositories, and select only your website repository.
5. Under Repository permissions, enable Contents: Read and write and Pages: Read-only. Metadata: Read-only is included automatically. Leave other permissions off.
6. Generate the token. Treat it like a password: copy it into the Publishing token field in your website editor. Do not upload it as a file or send it in chat.
7. Check the GitHub username and repository fields match your actual website. Defaults assume thefinancialresearchledger / thefinancialresearchledger.github.io. Click Connect website.

The token is sent only to api.github.com and is kept only in page memory. Disconnecting or closing/reloading the editor clears it. You will need it again next session, so keep it in your password manager. Replace the token when it expires.

GitHub Pages must use Deploy from a branch, with your publishing branch and /(root). The editor reads the actual Pages branch and URL from GitHub. If you use a project subfolder URL rather than the root URL, finish renaming your repository first.

## Publish research

Choose New paper, enter a title, date, topics, summary, and article text. Text uses plain paragraphs, separated by blank lines. Add references at the end of the article, or use a PDF for the fully formatted paper. Attach an optional PDF up to 10 MB. Click Preview to read the draft without publishing. Click Publish paper when ready.

The editor publishes the article, optional PDF, research library index, and sitemap in one commit. Your paper appears in the Research library, homepage latest papers, and site search. GitHub Pages needs time to deploy; a successful save is not a guarantee that deployment has already completed. If it does not appear after a few minutes, check the repository’s Actions tab.

## Edit a paper

Connect and select the paper under Published papers. Make changes, preview, and click Publish changes. The article’s URL stays the same. An existing PDF is retained unless you upload a replacement.

## Edit your introduction

Connect, click Edit introduction, update the paragraphs, and click Publish introduction. This updates the biography on the About page.

## Drafts

Download draft saves the current text as a JSON file on your computer. Open draft loads it again. PDF files must be attached separately each time; they are not included in downloaded drafts. Drafts are not automatically saved. You can write and preview drafts while disconnected, but publishing requires a connection.

## Access and limits

The editor page is public, but only someone with a suitable token can write to your repository. Do not share the token. Readers do not need an account. The editor excludes itself from indexing. It is intended for one author, research papers, and your biography; layout changes still require editing the website files. Passwordless sign-in and a richer visual document editor would require a separately configured authentication service.

External scripts are blocked on the editor page. It uses local fonts, falling back to Garamond or serif, while your public site continues to load EB Garamond.

## Conflicts and recovery

If the website changes in another session while you are editing, publishing stops rather than overwriting it. Download your draft, reconnect to refresh, and reopen the draft before publishing. Published articles are public and saved in repository history. Keep confidential research in downloaded drafts until you intend to publish.

## Delete a published paper

Connect the editor, select the paper under Published papers, and click Delete paper. Check the title in the confirmation before confirming. The editor removes the article page, research listing, sitemap entry, and its PDF (unless another paper uses that PDF) together in one commit. Allow GitHub Pages a few minutes to publish the removal. Refresh the public site afterward. Earlier versions remain in GitHub history; search-engine caches and previously downloaded copies are not erased.
