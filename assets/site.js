/* Shared, dependency-free interactions. Pure helpers are exported for checks. */
(function () {
  'use strict';
  const fold = value => String(value || '').toLocaleLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  function matches(item, state) {
    const terms = fold(state.query).trim().split(/\s+/).filter(Boolean);
    return (state.theme === 'Tous' || item.tags.includes(state.theme)) &&
      (state.type === 'all' || state.type === item.type) &&
      terms.every(term => fold(item.search).includes(term));
  }
  function order(items, sort, lang) {
    const collator = new Intl.Collator(lang, { sensitivity: 'base' });
    return [...items].sort((a, b) => {
      if (sort === 'title') return collator.compare(a.title, b.title);
      const years = sort === 'oldest' ? Number(a.year) - Number(b.year) : Number(b.year) - Number(a.year);
      return years || a.index - b.index;
    });
  }
  function readState(params, themes, types) {
    return {
      theme: themes.includes(params.get('theme')) ? params.get('theme') : 'Tous',
      query: params.get('q') || '',
      type: types.includes(params.get('type')) ? params.get('type') : 'all',
      sort: ['newest', 'oldest', 'title'].includes(params.get('sort')) ? params.get('sort') : 'newest'
    };
  }
  function writeState(url, state) {
    const next = new URL(url);
    for (const [key, value, defaultValue] of [
      ['theme', state.theme, 'Tous'], ['q', state.query.trim(), ''],
      ['type', state.type, 'all'], ['sort', state.sort, 'newest']
    ]) {
      if (value === defaultValue) next.searchParams.delete(key);
      else next.searchParams.set(key, value);
    }
    return next.pathname + next.search + next.hash;
  }
  function prepareEmail(email, data, english) {
    const subject = (english ? 'Collaboration enquiry — ' : 'Proposition de collaboration — ') + data.reason;
    const body = (english ? 'Hello Hugues,\n\n' : 'Bonjour Hugues,\n\n') + data.message.trim() + '\n\n' +
      data.name.trim() + (data.organisation.trim() ? '\n' + data.organisation.trim() : '');
    return { subject, body, href: 'mailto:' + email + '?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(body) };
  }
  if (typeof module !== 'undefined' && module.exports) module.exports = { fold, matches, order, readState, writeState, prepareEmail };
  if (typeof document === 'undefined') return;
  document.documentElement.classList.add('js-enabled');

  const english = document.documentElement.lang === 'en';
  const menu = document.querySelector('.menu-toggle');
  const nav = document.querySelector('#site-nav');
  if (menu && nav) {
    const close = (returnFocus) => {
      menu.setAttribute('aria-expanded', 'false');
      nav.classList.remove('open');
      if (returnFocus) menu.focus();
    };
    menu.addEventListener('click', () => {
      const open = menu.getAttribute('aria-expanded') !== 'true';
      menu.setAttribute('aria-expanded', String(open));
      nav.classList.toggle('open', open);
    });
    nav.addEventListener('click', event => { if (event.target.closest('a')) close(false); });
    document.addEventListener('keydown', event => {
      if (event.key === 'Escape' && menu.getAttribute('aria-expanded') === 'true') close(true);
    });
    document.addEventListener('click', event => {
      if (!event.target.closest('.site-header') && menu.getAttribute('aria-expanded') === 'true') close(false);
    });
    const wide = window.matchMedia('(min-width: 1081px)');
    wide.addEventListener('change', event => { if (event.matches) close(false); });
  }

  const root = document.querySelector('[data-filter-root]');
  if (root) {
    const buttons = [...root.querySelectorAll('[data-filter]')];
    const search = root.querySelector('.filter-search');
    const type = root.querySelector('.filter-type');
    const sort = root.querySelector('.filter-sort');
    const count = root.querySelector('.filter-count');
    const grid = root.querySelector('.cards-grid');
    const empty = root.querySelector('.empty-state');
    const themes = buttons.map(button => button.dataset.filter);
    const types = [...type.options].map(option => option.value);
    const items = [...root.querySelectorAll('.filter-item')].map((element, index) => ({
      element, index, tags: element.dataset.tags.split('|'), search: element.dataset.search,
      type: element.dataset.type, year: element.dataset.year,
      title: element.querySelector('h3').textContent.trim()
    }));
    let state = readState(new URLSearchParams(location.search), themes, types);
    function syncInputs() {
      search.value = state.query;
      type.value = state.type;
      sort.value = state.sort;
    }
    function update(writeURL = true) {
      state.query = search.value;
      state.type = type.value;
      state.sort = sort.value;
      const sorted = order(items, state.sort, document.documentElement.lang);
      let visible = 0;
      sorted.forEach(item => {
        const match = matches(item, state);
        item.element.hidden = !match;
        if (match) visible++;
        grid.appendChild(item.element);
      });
      buttons.forEach(button => {
        const selected = button.dataset.filter === state.theme;
        button.classList.toggle('selected', selected);
        button.setAttribute('aria-pressed', String(selected));
      });
      count.textContent = english ? `${visible} ${visible === 1 ? 'result' : 'results'}` : `${visible} ${visible === 1 ? 'résultat' : 'résultats'}`;
      empty.hidden = visible !== 0;
      if (writeURL) history.replaceState(null, '', writeState(location.href, state));
      const language = document.querySelector('.lang-switch');
      if (language) {
        const target = new URL(language.href);
        target.search = new URL(location.href).search;
        language.href = target.pathname + target.search;
      }
    }
    buttons.forEach(button => button.addEventListener('click', () => { state.theme = button.dataset.filter; update(); }));
    search.addEventListener('input', () => update());
    type.addEventListener('change', () => update());
    sort.addEventListener('change', () => update());
    root.querySelector('.reset-filters').addEventListener('click', () => {
      state = { theme: 'Tous', query: '', type: 'all', sort: 'newest' };
      syncInputs(); update(); search.focus();
    });
    window.addEventListener('popstate', () => {
      state = readState(new URLSearchParams(location.search), themes, types);
      syncInputs(); update(false);
    });
    syncInputs(); update();
  }

  const copy = document.querySelector('.copy-email');
  if (copy) copy.addEventListener('click', async () => {
    const status = document.querySelector('.copy-status');
    try {
      if (!navigator.clipboard) throw new Error('Clipboard unavailable');
      await navigator.clipboard.writeText(copy.dataset.copy);
      status.textContent = english ? 'Email address copied.' : 'Adresse email copiée.';
    } catch {
      const address = document.querySelector('.email-large');
      const range = document.createRange();
      range.selectNodeContents(address);
      const selection = window.getSelection();
      selection.removeAllRanges(); selection.addRange(range);
      status.textContent = english ? 'Address selected. Use your device’s Copy command.' : 'Adresse sélectionnée. Utilisez la commande Copier de votre appareil.';
    }
  });

  const form = document.querySelector('#contact-form');
  if (form) {
    const params = new URLSearchParams(location.search);
    const context = (params.get('project') || params.get('service') || '').slice(0, 300);
    if (context) {
      form.elements.message.value = (english ? 'I would like to discuss: ' : 'Je souhaite échanger au sujet de : ') + context + '\n\n';
      if (params.has('project')) form.elements.reason.value = 'research';
      else if (/donn|data/i.test(context)) form.elements.reason.value = 'data';
      else if (/suivi|monitor|report/i.test(context)) form.elements.reason.value = 'development';
    }
    form.addEventListener('submit', event => {
      event.preventDefault();
      if (!form.reportValidity()) return;
      const reason = form.elements.reason.selectedOptions[0].textContent;
      const data = { name: form.elements.name.value, organisation: form.elements.organisation.value, message: form.elements.message.value, reason };
      const email = prepareEmail(form.dataset.email, data, english);
      document.querySelector('#prepared-message').value = (english ? 'Subject: ' : 'Objet : ') + email.subject + '\n\n' + email.body;
      document.querySelector('#email-fallback').hidden = false;
      document.querySelector('#form-status').textContent = english ? 'Your draft is ready. Review it in your email application before sending.' : 'Votre brouillon est prêt. Relisez-le dans votre messagerie avant de l’envoyer.';
      location.href = email.href;
    });
  }
})();
