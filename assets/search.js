(() => {
  const form = document.querySelector('[data-library-search]');
  if (!form) return;
  const input = form.querySelector('input[name="q"]');
  const container = document.getElementById('research-results');
  const papers = Array.isArray(window.ledgerResearch) ? window.ledgerResearch : [];
  input.value = (new URLSearchParams(location.search).get('q') || '').slice(0, 200);
  function render() {
    const query = input.value.trim();
    const words = query.toLocaleLowerCase().split(/\s+/).filter(Boolean);
    const matches = papers.filter(paper => {
      const text = [paper.title, paper.summary, ...(paper.topics || [])].join(' ').toLocaleLowerCase();
      return words.every(word => text.includes(word));
    });
    container.replaceChildren();
    const status = document.createElement('p');
    status.className = 'search-status';
    status.textContent = !papers.length
      ? (query ? `No results for “${query}”. The research library is awaiting its first publication.` : 'The research library is awaiting its first publication.')
      : `${matches.length} ${matches.length === 1 ? 'paper' : 'papers'}${query ? ` matching “${query}”` : ''}.`;
    container.append(status);
    for (const paper of matches) {
      const article = document.createElement('article');
      article.className = 'result-row';
      const heading = document.createElement('h3');
      const link = document.createElement('a');
      const url = new URL(paper.url, location.href);
      if (!['https:', 'http:', 'file:'].includes(url.protocol)) continue;
      link.href = url.href;
      link.textContent = paper.title;
      heading.append(link);
      const summary = document.createElement('p');
      summary.textContent = paper.summary || '';
      const meta = document.createElement('p');
      meta.className = 'eyebrow';
      meta.textContent = [...(paper.topics || []), paper.date || ''].filter(Boolean).join(' · ');
      article.append(meta, heading, summary);
      container.append(article);
    }
  }
  form.addEventListener('submit', event => {
    event.preventDefault();
    const url = new URL(location.href);
    if (input.value.trim()) url.searchParams.set('q', input.value.trim()); else url.searchParams.delete('q');
    try { history.replaceState(null, '', url); } catch (_) { /* File previews may restrict history. */ }
    render();
  });
  input.addEventListener('input', render);
  render();
})();
