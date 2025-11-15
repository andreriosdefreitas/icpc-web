// scripts moved from index.htm
(function(){
  'use strict';

  // Fetch and inject a partial HTML into the page
  async function fetchPartial(url){
    const res = await fetch(url, {cache: 'no-store'});
    if (!res.ok) throw new Error(res.status + ' ' + res.statusText);
    return await res.text();
  }

  // Insert header and footer partials into placeholders #site-header and #site-footer
  async function loadShell(){
    const headerEl = document.getElementById('site-header');
    const navEl = document.getElementById('site-nav');
    const footerEl = document.getElementById('site-footer');
    const promises = [];
    if (headerEl) {
      const p = fetchPartial('header.htm').then(html => { headerEl.innerHTML = html; });
      promises.push(p);
    }
    if (navEl) {
      const p = fetchPartial('nav.htm').then(html => { navEl.innerHTML = html; });
      promises.push(p);
    }
    if (footerEl) {
      const p = fetchPartial('footer.htm').then(html => { footerEl.innerHTML = html; });
      promises.push(p);
    }
    await Promise.all(promises);
  }

  // Wait for DOM ready
  function domReady(){
    return new Promise(resolve => {
      if (document.readyState !== 'loading') return resolve();
      document.addEventListener('DOMContentLoaded', () => resolve(), {once:true});
    });
  }

  // Map/address link: transform #address into a link (tries Plus Code if present)
  function initAddressLink(){
    try{
      const p = document.getElementById('address');
      if (!p) return;
    const plus = (p.dataset && p.dataset.plus) ? p.dataset.plus.trim() : '';
    const mapsShort = (p.dataset && p.dataset.mapsShort) ? p.dataset.mapsShort.trim() : '';
    const addrText = p.textContent.trim();
    const query = plus ? (plus + ' ' + addrText) : addrText;
    if (!query && !mapsShort) return;
    console.debug('[maps] initAddressLink query:', query, 'mapsShort:', mapsShort);

    // Prefer an explicit short maps link (deep link) when provided; otherwise build a search query
    const mapsUrl = mapsShort || ('https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(query));

    const a = document.createElement('a');
    a.href = mapsUrl;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
      const pinSvg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" focusable="false" style="flex:0 0 16px;fill:currentColor;margin-right:.4rem"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5a2.5 2.5 0 1 1 0-5 2.5 2.5 0 0 1 0 5z"/></svg>';
      a.insertAdjacentHTML('beforeend', pinSvg);
      a.appendChild(document.createTextNode(' ' + addr));
  a.title = 'Abrir no Google Maps';
  // ensure the href is set (helps with middle-click / open in new tab)
  a.setAttribute('href', mapsUrl);
  a.setAttribute('role', 'link');

      a.addEventListener('click', function(e){
        const ua = navigator.userAgent || '';
        const isAndroid = /Android/i.test(ua);
        const isIOS = /iPhone|iPad|iPod/i.test(ua);
        const hasTouch = ('ontouchstart' in window) || (navigator.maxTouchPoints && navigator.maxTouchPoints > 0);
        const isMobile = (isAndroid || isIOS) && hasTouch;

        // If a short maps link is provided, open it directly (works as an app link or web fallback)
        if (mapsShort) {
          e.preventDefault();
          window.open(mapsUrl, '_blank');
          return;
        }

        // Otherwise attempt native maps on mobile, fallback to web
        if (isMobile) {
          e.preventDefault();
          const encodedQuery = encodeURIComponent(query);
          if (isAndroid) {
            const geo = 'geo:0,0?q=' + encodedQuery;
            window.location.href = geo;
            setTimeout(() => { window.open(mapsUrl, '_blank'); }, 800);
          } else if (isIOS) {
            const mapsScheme = 'maps://?q=' + encodedQuery;
            window.location.href = mapsScheme;
            setTimeout(() => { window.open(mapsUrl, '_blank'); }, 800);
          }
        } else {
          e.preventDefault();
          window.open(mapsUrl, '_blank');
        }
      });

      p.textContent = '';
      p.appendChild(a);
    }catch(err){
      console.error('Erro ao transformar address em link:', err);
    }
  }

  // Main app initialization; runs after shell is loaded and DOM ready
  function initApp(){
    const nav = document.getElementById('primary-nav');
    const menuToggle = document.querySelector('.menu-toggle');
    const main = document.querySelector('main .container') || document.querySelector('main');

    // Helpers for active menu persistence
    function setActiveLink(linkEl){
      if (!linkEl) return;
      document.querySelectorAll('#primary-nav a').forEach(a => a.classList.remove('active'));
      linkEl.classList.add('active');
      try{ localStorage.setItem('activeMenu', linkEl.getAttribute('href')); }catch(e){}
    }

    function setActiveByUrl(url){
      if (!url) return;
      const normalized = url.replace(/^\.\//, '');
      const match = document.querySelector(`#primary-nav a[href="${normalized}"]`) || document.querySelector(`#primary-nav a[href="${url}"]`);
      if (match) setActiveLink(match);
    }

    // Menu toggle behavior
    if (menuToggle) {
      menuToggle.addEventListener('click', (e) => {
        e.stopPropagation();
        const isOpen = document.body.classList.toggle('nav-open');
        nav && nav.classList.toggle('open');
        menuToggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
      });

      if (nav) {
        nav.addEventListener('click', (e) => {
          const a = e.target.closest('a');
          if (!a) return;
          setActiveLink(a);
          document.body.classList.remove('nav-open');
          nav.classList.remove('open');
          menuToggle.setAttribute('aria-expanded', 'false');
        });
      }

      document.addEventListener('click', (e) => {
        if (!e.target.closest('#primary-nav') && !e.target.closest('.menu-toggle')) {
          document.body.classList.remove('nav-open');
          nav && nav.classList.remove('open');
          menuToggle.setAttribute('aria-expanded', 'false');
        }
      });

      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
          document.body.classList.remove('nav-open');
          nav && nav.classList.remove('open');
          menuToggle.setAttribute('aria-expanded', 'false');
          menuToggle.focus();
        }
      });
    }

  if (!main) return;

    async function loadIntoMain(url, push = true) {
      try {
        const res = await fetch(url, {cache: 'no-store'});
        if (!res.ok) throw new Error(res.status + ' ' + res.statusText);
        const text = await res.text();
        const doc = new DOMParser().parseFromString(text, 'text/html');
        const newMain = doc.querySelector('main');
        if (newMain) {
          main.innerHTML = newMain.innerHTML;
        } else {
          main.innerHTML = doc.body.innerHTML;
        }
        const newTitle = doc.querySelector('title');
        if (newTitle) document.title = newTitle.textContent;
        if (push) history.pushState({url}, '', url);
      } catch (err) {
        console.error('Erro ao carregar conteúdo:', err);
      }
    }

    // Intercept nav clicks
    nav && nav.addEventListener('click', (e) => {
      const a = e.target.closest('a');
      if (!a) return;
      const href = a.getAttribute('href');
      if (!href) return;
      if (href.endsWith('.htm')) {
        e.preventDefault();
        loadIntoMain(href, true);
        setActiveByUrl(href);
      }
    });

    // Intercept clicks inside main (links to .htm)
    main.addEventListener('click', (e) => {
      const a = e.target.closest('a');
      if (!a) return;
      const href = a.getAttribute('href');
      if (!href) return;
      if (href.endsWith('.htm')) {
        e.preventDefault();
        loadIntoMain(href, true);
        setActiveByUrl(href);
      }
    });

    // popstate
    window.addEventListener('popstate', (e) => {
      const state = e.state;
      if (!state || !state.url) {
        // fallback to home
        loadIntoMain('index.htm', false);
        setActiveByUrl('index.htm');
        return;
      }
      loadIntoMain(state.url, false);
      setActiveByUrl(state.url);
    });

    // Initialize active menu from localStorage or current path
    try{
      const stored = localStorage.getItem('activeMenu');
      if (stored) setActiveByUrl(stored);
      else {
        const path = location.pathname.split('/').pop() || 'index.htm';
        setActiveByUrl(path);
      }
    }catch(e){ console.warn('localStorage unavailable', e); }
  }

  // bootstrap: wait for DOM and shell to be ready
  (async function bootstrap(){
    try{
      const [ , ] = await Promise.all([domReady(), loadShell()]);
      // shell loaded and DOM ready — initialize address link and app
      initAddressLink();
      initApp();
      // compute header/nav/footer heights and set CSS variables so main padding prevents overlap
      function updateOffsets(){
        try{
          const headerEl = document.querySelector('header');
          const navEl = document.getElementById('primary-nav');
          const footerEl = document.querySelector('footer');
          const headerH = headerEl ? headerEl.offsetHeight : 0;
          const navH = navEl ? navEl.offsetHeight : 0;
          const footerH = footerEl ? footerEl.offsetHeight : 0;
          const root = document.documentElement;
          root.style.setProperty('--header-height', headerH + 'px');
          root.style.setProperty('--nav-height', navH + 'px');
          root.style.setProperty('--footer-height', footerH + 'px');
          root.style.setProperty('--content-offset-top', (headerH + navH) + 'px');
          root.style.setProperty('--content-offset-bottom', footerH + 'px');
        }catch(e){console.warn('updateOffsets error', e)}
      }
      updateOffsets();
      window.addEventListener('resize', updateOffsets);
    }catch(err){
      console.error('Erro ao carregar shell ou inicializar app:', err);
    }
  })();

})();
