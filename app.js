(function () {
  'use strict';

  /* ── Configuration ── */
  var CONFIG = {
    WORDS_PER_MINUTE: 200,
    SCROLL_COMPLETE_THRESHOLD: 90,
    SCROLL_SHOW_COMPLETE_THRESHOLD: 95,
    SCROLL_THROTTLE_MS: 500,
    STORAGE_PREFIX: 'humanOS_'
  };

  var STORAGE = {
    BOOKMARK: CONFIG.STORAGE_PREFIX + 'bookmark',
    READ_STATE: CONFIG.STORAGE_PREFIX + 'readState',
    DARK_MODE: CONFIG.STORAGE_PREFIX + 'darkMode'
  };

  var manifest = null;
  var flatArticles = [];

  /* ── Utilities ── */

  function throttle(fn, ms) {
    var last = 0;
    return function () {
      var now = Date.now();
      if (now - last >= ms) {
        last = now;
        fn.apply(this, arguments);
      }
    };
  }

  function getUrlParams() {
    var params = new URLSearchParams(window.location.search);
    return { section: params.get('section'), slug: params.get('slug') };
  }

  function articleKey(section, slug) {
    return section + '/' + slug;
  }

  function escapeHtml(str) {
    var div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  function parseFrontMatter(markdown) {
    var match = markdown.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
    if (!match) return { meta: {}, content: markdown };
    var meta = {};
    match[1].split('\n').forEach(function (line) {
      var i = line.indexOf(':');
      if (i > 0) {
        var key = line.slice(0, i).trim();
        var val = line.slice(i + 1).trim().replace(/^["']|["']$/g, '');
        meta[key] = val;
      }
    });
    return { meta: meta, content: match[2] };
  }

  function calculateReadingTime(text) {
    var words = text.trim().split(/\s+/).length;
    return Math.max(1, Math.ceil(words / CONFIG.WORDS_PER_MINUTE));
  }

  function getScrollPercent() {
    var docH = document.documentElement.scrollHeight - window.innerHeight;
    if (docH <= 0) return 100;
    return Math.min(100, Math.round((window.scrollY / docH) * 100));
  }

  /* ── localStorage helpers ── */

  function storageGet(key) {
    try { var v = localStorage.getItem(key); return v ? JSON.parse(v) : null; }
    catch (e) { return null; }
  }

  function storageSet(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) { /* full */ }
  }

  function getBookmark()    { return storageGet(STORAGE.BOOKMARK); }
  function setBookmark(d)   { storageSet(STORAGE.BOOKMARK, d); }
  function getReadState()   { return storageGet(STORAGE.READ_STATE) || {}; }

  function markVisited(key) {
    var s = getReadState();
    if (!s[key]) s[key] = {};
    s[key].visited = true;
    if (!s[key].visitedAt) s[key].visitedAt = Date.now();
    storageSet(STORAGE.READ_STATE, s);
  }

  function markCompleted(key) {
    var s = getReadState();
    if (!s[key]) s[key] = {};
    s[key].visited = true;
    s[key].completed = true;
    s[key].completedAt = Date.now();
    storageSet(STORAGE.READ_STATE, s);
  }

  /* ── Dark Mode ── */

  function moonIcon() {
    return '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>';
  }

  function sunIcon() {
    return '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>';
  }

  function applyDarkMode(isDark) {
    document.documentElement.classList.toggle('dark', isDark);
    var btn = document.getElementById('dark-mode-toggle');
    if (btn) {
      btn.innerHTML = isDark ? sunIcon() : moonIcon();
      btn.setAttribute('aria-label', isDark ? 'Switch to light mode' : 'Switch to dark mode');
    }
  }

  function initDarkMode() {
    var saved = storageGet(STORAGE.DARK_MODE);
    var isDark = saved !== null
      ? saved
      : (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches);
    applyDarkMode(isDark);

    var btn = document.getElementById('dark-mode-toggle');
    if (btn) {
      btn.addEventListener('click', function () {
        var nowDark = !document.documentElement.classList.contains('dark');
        applyDarkMode(nowDark);
        storageSet(STORAGE.DARK_MODE, nowDark);
      });
    }
  }

  /* ── Manifest ── */

  function loadManifest() {
    return fetch('manifest.json').then(function (r) {
      if (!r.ok) throw new Error('manifest fetch failed');
      return r.json();
    });
  }

  function flattenArticles(m) {
    var list = [];
    m.sections.forEach(function (sec) {
      sec.articles.forEach(function (art) {
        list.push({
          sectionId: sec.id,
          sectionTitle: sec.title,
          slug: art.slug,
          title: art.title,
          summary: art.summary,
          path: art.path,
          readingTime: art.readingTimeMinutes || null
        });
      });
    });
    return list;
  }

  function findArticleIndex(section, slug) {
    for (var i = 0; i < flatArticles.length; i++) {
      if (flatArticles[i].sectionId === section && flatArticles[i].slug === slug) return i;
    }
    return -1;
  }

  function getAdjacentArticles(section, slug) {
    var idx = findArticleIndex(section, slug);
    return {
      prev: idx > 0 ? flatArticles[idx - 1] : null,
      current: idx >= 0 ? flatArticles[idx] : null,
      next: idx >= 0 && idx < flatArticles.length - 1 ? flatArticles[idx + 1] : null
    };
  }

  /* ── TOC Page ── */

  function initTOC() {
    renderContinueReading();
    renderSections();
    renderProgress();
    initSearch();
  }

  function renderContinueReading() {
    var card = document.getElementById('continue-reading');
    var bm = getBookmark();
    if (!bm || !bm.lastArticle) { card.hidden = true; return; }
    if (bm.scrollPercent >= CONFIG.SCROLL_SHOW_COMPLETE_THRESHOLD) { card.hidden = true; return; }

    var a = bm.lastArticle;
    card.hidden = false;
    card.innerHTML =
      '<div class="continue-inner">' +
        '<p class="continue-label">Continue reading</p>' +
        '<a href="article.html?section=' + encodeURIComponent(a.section) +
          '&slug=' + encodeURIComponent(a.slug) + '" class="continue-title">' +
          escapeHtml(a.title) + '</a>' +
        '<div class="continue-progress"><div class="continue-progress-bar" style="width:' +
          bm.scrollPercent + '%"></div></div>' +
        '<p class="continue-percent">' + bm.scrollPercent + '% complete</p>' +
      '</div>';
  }

  function renderProgress() {
    var bar = document.getElementById('progress-bar');
    var rs  = getReadState();
    var total = flatArticles.length;
    var done  = flatArticles.filter(function (a) {
      var k = articleKey(a.sectionId, a.slug);
      return rs[k] && rs[k].completed;
    }).length;
    if (total === 0) { bar.hidden = true; return; }

    bar.hidden = false;
    var pct = Math.round((done / total) * 100);
    bar.innerHTML =
      '<div class="progress-inner">' +
        '<div class="progress-track"><div class="progress-fill" style="width:' + pct + '%"></div></div>' +
        '<span class="progress-text">' + done + ' / ' + total + ' articles completed</span>' +
      '</div>';
  }

  function renderSections() {
    var container = document.getElementById('toc-sections');
    var rs = getReadState();

    container.innerHTML = manifest.sections.map(function (sec) {
      var arts = sec.articles.map(function (art) {
        var key = articleKey(sec.id, art.slug);
        var state = rs[key] || {};
        var icon;
        if (state.completed) icon = '<span class="status-icon completed" title="Completed">✓</span>';
        else if (state.visited) icon = '<span class="status-icon visited" title="Started">○</span>';
        else icon = '<span class="status-icon unread"></span>';

        var cls = 'article-item';
        if (state.completed) cls += ' article-completed';
        else if (state.visited) cls += ' article-visited';

        return '<a href="article.html?section=' + encodeURIComponent(sec.id) +
          '&slug=' + encodeURIComponent(art.slug) + '" class="' + cls + '" ' +
          'data-title="' + escapeHtml(art.title).toLowerCase() + '" ' +
          'data-summary="' + escapeHtml(art.summary || '').toLowerCase() + '">' +
          '<div class="article-item-main">' + icon +
            '<div class="article-item-text">' +
              '<span class="article-item-title">' + escapeHtml(art.title) + '</span>' +
              '<span class="article-item-summary">' + escapeHtml(art.summary || '') + '</span>' +
            '</div>' +
          '</div>' +
          '<span class="article-item-time">' + (art.readingTimeMinutes || '–') + ' min</span>' +
        '</a>';
      }).join('');

      return '<section class="toc-section" data-section="' + sec.id + '">' +
        '<h2 class="section-title"><span class="section-number">' + sec.order + '</span>' +
          escapeHtml(sec.title) + '</h2>' +
        '<div class="section-articles">' + arts + '</div></section>';
    }).join('');
  }

  function initSearch() {
    var input = document.getElementById('search-input');
    if (!input) return;
    input.addEventListener('input', function () {
      var q = input.value.toLowerCase().trim();
      var items    = document.querySelectorAll('.article-item');
      var sections = document.querySelectorAll('.toc-section');

      items.forEach(function (el) {
        var t = el.getAttribute('data-title') || '';
        var s = el.getAttribute('data-summary') || '';
        el.style.display = (!q || t.indexOf(q) !== -1 || s.indexOf(q) !== -1) ? '' : 'none';
      });

      sections.forEach(function (sec) {
        var any = false;
        sec.querySelectorAll('.article-item').forEach(function (a) {
          if (a.style.display !== 'none') any = true;
        });
        sec.style.display = any ? '' : 'none';
      });
    });
  }

  /* ── Article Page ── */

  function initArticle() {
    var p = getUrlParams();
    if (!p.section || !p.slug) {
      showError('No article specified. <a href="index.html">Go to Table of Contents</a>');
      return;
    }
    loadArticleContent(p.section, p.slug);
  }

  function showError(html) {
    var el = document.getElementById('article-loading');
    el.innerHTML = '<p class="error">' + html + '</p>';
  }

  function loadArticleContent(section, slug) {
    var nav = getAdjacentArticles(section, slug);
    if (!nav.current) {
      showError('Article not found. <a href="index.html">Go to Table of Contents</a>');
      return;
    }

    fetch(nav.current.path).then(function (r) {
      if (!r.ok) throw new Error('fetch failed');
      return r.text();
    }).then(function (raw) {
      var parsed   = parseFrontMatter(raw);
      var readTime = calculateReadingTime(parsed.content);
      var html     = marked.parse(parsed.content);

      document.getElementById('article-loading').hidden = true;
      var artEl = document.getElementById('article-content');
      artEl.hidden = false;

      document.getElementById('article-section').textContent      = nav.current.sectionTitle;
      document.getElementById('article-reading-time').textContent = readTime + ' min read';
      document.getElementById('article-title').textContent        = nav.current.title;
      document.title = nav.current.title + ' — The Human OS';

      var bodyEl = document.getElementById('article-body');
      bodyEl.innerHTML = html;
      styleSources(bodyEl);
      renderNav(nav.prev, nav.next);

      var key = articleKey(section, slug);
      markVisited(key);
      initScrollTracking(section, slug, nav.current.title);
      restoreScrollPosition(section, slug);
    }).catch(function () {
      showError('Failed to load article. <a href="index.html">Go to Table of Contents</a>');
    });
  }

  function styleSources(bodyEl) {
    var headings = bodyEl.querySelectorAll('h2');
    for (var i = 0; i < headings.length; i++) {
      if (headings[i].textContent.trim().toLowerCase() === 'sources') {
        var wrapper = document.createElement('div');
        wrapper.className = 'sources-section';
        var el = headings[i];
        while (el) {
          var nxt = el.nextSibling;
          wrapper.appendChild(el);
          el = nxt;
        }
        bodyEl.appendChild(wrapper);
        break;
      }
    }
  }

  function renderNav(prev, next) {
    var nav = document.getElementById('article-nav');
    nav.hidden = false;
    var pLink = document.getElementById('prev-article');
    var nLink = document.getElementById('next-article');

    if (prev) {
      pLink.href = 'article.html?section=' + encodeURIComponent(prev.sectionId) +
        '&slug=' + encodeURIComponent(prev.slug);
      pLink.innerHTML = '&larr; ' + escapeHtml(prev.title);
      pLink.style.visibility = 'visible';
    } else {
      pLink.style.visibility = 'hidden';
    }

    if (next) {
      nLink.href = 'article.html?section=' + encodeURIComponent(next.sectionId) +
        '&slug=' + encodeURIComponent(next.slug);
      nLink.innerHTML = escapeHtml(next.title) + ' &rarr;';
      nLink.style.visibility = 'visible';
    } else {
      nLink.style.visibility = 'hidden';
    }
  }

  function initScrollTracking(section, slug, title) {
    var key = articleKey(section, slug);

    var saveProgress = throttle(function () {
      var pct = getScrollPercent();
      setBookmark({
        lastArticle: { section: section, slug: slug, title: title },
        scrollPercent: pct,
        timestamp: Date.now()
      });
      if (pct >= CONFIG.SCROLL_COMPLETE_THRESHOLD) markCompleted(key);
    }, CONFIG.SCROLL_THROTTLE_MS);

    window.addEventListener('scroll', saveProgress, { passive: true });
    window.addEventListener('beforeunload', function () {
      var pct = getScrollPercent();
      setBookmark({
        lastArticle: { section: section, slug: slug, title: title },
        scrollPercent: pct,
        timestamp: Date.now()
      });
      if (pct >= CONFIG.SCROLL_COMPLETE_THRESHOLD) markCompleted(key);
    });

    saveProgress();
  }

  function restoreScrollPosition(section, slug) {
    var bm = getBookmark();
    if (!bm || !bm.lastArticle) return;
    if (bm.lastArticle.section !== section || bm.lastArticle.slug !== slug) return;
    if (bm.scrollPercent >= CONFIG.SCROLL_SHOW_COMPLETE_THRESHOLD) return;

    requestAnimationFrame(function () {
      var docH = document.documentElement.scrollHeight - window.innerHeight;
      window.scrollTo(0, Math.round((bm.scrollPercent / 100) * docH));
    });
  }

  /* ── Init ── */

  function init() {
    initDarkMode();
    loadManifest().then(function (m) {
      manifest = m;
      flatArticles = flattenArticles(m);
      var page = document.body.dataset.page;
      if (page === 'toc') initTOC();
      else if (page === 'article') initArticle();
    }).catch(function (e) {
      console.error('Failed to load manifest:', e);
    });
  }

  document.addEventListener('DOMContentLoaded', init);
})();
