(function () {
  "use strict";
  if (window.TerasJagat && window.TerasJagat.__version >= 2.2) return;
  var CACHE_PREFIX  = "tj_feed_";
  var DEFAULT_TTL   = 5 * 60 * 1000;
  var memoryCache   = new Map();
  function buildCacheKey(label, maxResults, startIndex) {
    return CACHE_PREFIX + encodeURIComponent(label) + "_" + maxResults + "_" + startIndex;
  }
  function cacheGet(key, ttl) {
    var now = Date.now();
    if (memoryCache.has(key)) {
      var m = memoryCache.get(key);
      if (now - m.t < ttl) return m.v;
      memoryCache.delete(key);
    }
    try {
      var raw = sessionStorage.getItem(key);
      if (!raw) return null;
      var obj = JSON.parse(raw);
      if (!obj || typeof obj.t !== "number") return null;
      if (now - obj.t > ttl) {
        sessionStorage.removeItem(key);
        return null;
      }
      memoryCache.set(key, { v: obj.v, t: obj.t });
      return obj.v;
    } catch (e) {
      return null;
    }
  }
  function cacheSet(key, value) {
    var entry = { v: value, t: Date.now() };
    memoryCache.set(key, entry);
    try {
      sessionStorage.setItem(key, JSON.stringify(entry));
    } catch (e) {
      try {
        cacheClearOld();
        sessionStorage.setItem(key, JSON.stringify(entry));
      } catch (e2) {  }
    }
  }
  function cacheClearOld() {
    try {
      var now = Date.now();
      for (var i = sessionStorage.length - 1; i >= 0; i--) {
        var k = sessionStorage.key(i);
        if (!k || k.indexOf(CACHE_PREFIX) !== 0) continue;
        try {
          var obj = JSON.parse(sessionStorage.getItem(k));
          if (!obj || now - obj.t > DEFAULT_TTL) sessionStorage.removeItem(k);
        } catch (e) { sessionStorage.removeItem(k); }
      }
    } catch (e) {}
  }
  function cacheClear(prefix) {
    var p = prefix || CACHE_PREFIX;
    memoryCache.forEach(function (_, k) {
      if (k.indexOf(p) === 0) memoryCache.delete(k);
    });
    try {
      for (var i = sessionStorage.length - 1; i >= 0; i--) {
        var k = sessionStorage.key(i);
        if (k && k.indexOf(p) === 0) sessionStorage.removeItem(k);
      }
    } catch (e) {}
  }
  function initRecentPosts(settings) {
    var container = (typeof settings.container === "string")
      ? document.querySelector(settings.container)
      : settings.container;
    if (!container) return false;
    if (container.getAttribute("data-tj-initialized") === "1") return false;
    container.setAttribute("data-tj-initialized", "1");
    var maxPosts        = settings.maxPosts || 5;
    var loadMoreCount   = settings.loadMoreCount || maxPosts;
    var showLoadMore    = settings.showLoadMore === true;
    var loadMoreText    = settings.loadMoreText || "Muat Lebih Banyak";
    var loadMoreLoading = settings.loadMoreLoadingText || "Memuat...";
    var order           = settings.order || "recent";
    var showEndOfList  = settings.showEndOfList !== false;
    var endOfListText  = settings.endOfListText || "Tidak ada post lagi";
    var endOfListClass = settings.endOfListClass || "loadMoreEnd";
    var cacheOn  = settings.cache !== false;
    var cacheTTL = settings.cacheTTL || DEFAULT_TTL;
    var excludeUrl = (function () {
      try { return location.origin + location.pathname; }
      catch (e) { return ""; }
    })();
    var state = {
      entries: [],
      renderedCount: 0,
      rawFetched: 0,
      hasMore: true,
      isLoading: false
    };
    var seenLinks = new Set();
    container.innerHTML = ''
      + '<div class="postFeatured"></div>'
      + '<div class="postNormal"></div>'
      + (showLoadMore ? '<div class="loadMoreWrap"><button type="button" class="loadMoreBtn mt-4 md:mt-6 skeleton ripple ripple-target overflow-hidden relative block w-full bg-primary text-on-primary rounded-full py-2.5 px-6 transition-transform duration-500 cursor-pointer active:rounded-m3-md before:content-[] before:absolute before:top-0 before:bottom-0 before:left-0 before:right-0 before:rounded-m3-full before:bg-white/10 before:opacity-0 hover:before:opacity-[0.3]"><div class="flex items-center justify-center gap-2 relative text-on-primary text-m3-label-lg"><span class="material-symbols-outlined">expand_more</span><span>' + loadMoreText + '</span></div></button></div>' : '')
      + (showEndOfList ? '<div class="' + endOfListClass + ' mt-4 md:mt-6 skeleton ripple ripple-target overflow-hidden relative block w-full bg-surface-container-low text-on-surface rounded-full py-2.5 px-6 transition-transform duration-500 cursor-not-allowed active:rounded-m3-md before:content-[] before:absolute before:top-0 before:bottom-0 before:left-0 before:right-0 before:rounded-m3-full before:bg-white/10 before:opacity-0 hover:before:opacity-[0.3]" style="display:none"><div class="flex items-center justify-center gap-2 relative text-on-surface text-m3-label-lg"><span class="material-symbols-outlined">do_not_disturb_on</span><span>' + endOfListText + '</span></div></div>' : '');
    var featuredEl   = container.querySelector(".postFeatured");
    var normalEl     = container.querySelector(".postNormal");
    var loadMoreWrap = container.querySelector(".loadMoreWrap");
    var loadMoreBtn  = container.querySelector(".loadMoreBtn");
    var endOfListEl  = container.querySelector("." + endOfListClass);
    function shuffle(arr) {
      for (var i = arr.length - 1; i > 0; i--) {
        var j = Math.floor(Math.random() * (i + 1));
        var tmp = arr[i]; arr[i] = arr[j]; arr[j] = tmp;
      }
    }
    function buildPostHTML(entry, isFeatured) {
      var link     = entry.link.find(function(l){ return l.rel === "alternate"; }).href;
      var postBody = (entry.content && entry.content.$t) || "";
      var tempDiv  = document.createElement("div");
      if (postBody.indexOf("<") !== -1) tempDiv.innerHTML = postBody;
      var titleEl = tempDiv.querySelector(".title");
      var title   = titleEl ? titleEl.textContent.trim() : entry.title.$t;
      var imgEl = tempDiv.querySelector(".img");
      var thumb = "";
      var tnSize = settings.featuredPost && isFeatured ? settings.thumbnailFeatured :
                   (settings.featuredPost ? settings.thumbnailNormal : settings.thumbnail);
      if (imgEl && imgEl.src) {
        thumb = imgEl.src;
      } else if (entry.media$thumbnail && entry.media$thumbnail.url) {
        thumb = entry.media$thumbnail.url;
      } else {
        thumb = settings.featuredPost && isFeatured ? settings.thumbnailDefaultFeatured :
                (settings.featuredPost ? settings.thumbnailDefaultNormal : settings.thumbnailDefault);
      }
      if (tnSize && tnSize.size) {
        thumb = thumb
          .replace(/(\/s\d+(-[a-z])?(\/|$|\?))/, "/s" + tnSize.size + "-rw$3")
          .replace(/(=s\d+(-[a-z])?)/, "=s" + tnSize.size + "-rw");
      } else if (tnSize) {
        thumb = thumb
          .replace(/(\/s\d+(-[a-z])?(\/|$|\?))/, "/w" + tnSize.width + "-h" + tnSize.height + "-c-rw$3")
          .replace(/(=s\d+(-[a-z])?)/, "=w" + tnSize.width + "-h" + tnSize.height + "-c-rw");
      }
      var publishedDate = new Date(entry.published.$t);
      var formattedDate = publishedDate.getDate() + "/" + (publishedDate.getMonth() + 1) + "/" + publishedDate.getFullYear();
      var snippetEl = tempDiv.querySelector(".snippet");
      var snippet = "";
      if (snippetEl) {
        snippet = snippetEl.innerHTML.trim();
      } else {
        var paragraphs = Array.prototype.slice.call(tempDiv.querySelectorAll("p"))
          .map(function(p){ return p.textContent.trim(); })
          .filter(function(t){ return t.length > 30; });
        if (paragraphs.length > 0) {
          var longestParagraph = paragraphs.sort(function(a,b){ return b.length - a.length; })[0];
          var snLength = settings.featuredPost
            ? (isFeatured ? settings.snippetLengthFeatured : settings.snippetLengthNormal)
            : settings.snippetLength;
          snippet = longestParagraph.length > snLength
            ? longestParagraph.substring(0, snLength) + "..."
            : longestParagraph;
        } else if (entry.summary && entry.summary.$t) {
          var rawSnippet = entry.summary.$t.replace(/<[^>]*>/g, "");
          var snLength2 = settings.featuredPost
            ? (isFeatured ? settings.snippetLengthFeatured : settings.snippetLengthNormal)
            : settings.snippetLength;
          snippet = rawSnippet.length > snLength2
            ? rawSnippet.substring(0, snLength2) + "..."
            : rawSnippet;
        }
      }
      var showThumbnail = settings.featuredPost ? (isFeatured ? settings.showThumbnailFeatured : settings.showThumbnailNormal) : settings.showThumbnail;
      var showDate      = settings.featuredPost ? (isFeatured ? settings.showDateFeatured      : settings.showDateNormal)      : settings.showDate;
      var showSnippet   = settings.featuredPost ? (isFeatured ? settings.showSnippetFeatured   : settings.showSnippetNormal)   : settings.showSnippet;
      var showButton    = settings.featuredPost ? (isFeatured ? settings.showButtonFeatured    : settings.showButtonNormal)    : settings.showButton;
      var buttonText    = settings.buttonText || "Selengkapnya";
      var snippetToRender = "";
      if (showSnippet && snippet) {
        snippetToRender = snippet.charAt(0) === "<" ? snippet : '<p class="ket text-m3-body text-on-surface">' + snippet + '</p>';
      }
      return ''
        + '<div class="art">'
        +   '<figure>'
        +     '<a href="' + link + '" title="' + title + '">'
        +       (showThumbnail ? '<img class="w-full" src="' + thumb + '" alt="' + title + '">' : '')
        +     '</a>'
        +   '</figure>'
        +   '<section>'
        +     '<p class="jud text-m3-title text-on-surface"><a href="' + link + '">' + title + '</a></p>'
        +     (showDate ? '<time class="text-m3-label text-on-surface">' + formattedDate + '</time>' : '')
        +     snippetToRender
        +     (showButton ? '<a href="' + link + '" class="ripple text-m3-label h-12 flex items-center text-primary active:scale-90"><span>' + buttonText + '</span></a>' : '')
        +   '</section>'
        + '</div>';
    }
    function fetchMore(needed) {
      if (state.isLoading) return Promise.resolve();
      if (!state.hasMore) return Promise.resolve();
      if (state.entries.length >= needed) return Promise.resolve();
      state.isLoading = true;
      return (async function () {
        try {
          while (state.entries.length < needed && state.hasMore) {
            var batchSize  = Math.max(needed - state.entries.length, maxPosts + loadMoreCount, 25);
            var startIndex = state.rawFetched + 1;
            var feedUrl    = "/feeds/posts/default/-/" + settings.label
                           + "?alt=json&max-results=" + batchSize
                           + "&start-index=" + startIndex;
            var data    = null;
            var cKey    = buildCacheKey(settings.label, batchSize, startIndex);
            var cached  = cacheOn ? cacheGet(cKey, cacheTTL) : null;
            if (cached) {
              data = cached;
            } else {
              var response = await fetch(feedUrl);
              data = await response.json();
              if (cacheOn) cacheSet(cKey, data);
            }
            var entries = (data.feed && data.feed.entry) || [];
            if (entries.length === 0) {
              state.hasMore = false;
              break;
            }
            state.rawFetched += entries.length;
            entries.forEach(function (entry) {
              var l = entry.link.find(function(x){ return x.rel === "alternate"; }).href.split("?")[0].split("#")[0];
              if (l !== excludeUrl && !seenLinks.has(l)) {
                seenLinks.add(l);
                state.entries.push(entry);
              }
            });
            if (entries.length < batchSize) state.hasMore = false;
          }
        } catch (error) {
          console.error("Error fetching feed:", error);
        } finally {
          state.isLoading = false;
        }
      })();
    }
    function renderNext(count) {
      var start = state.renderedCount;
      if (order === "random") {
        var rendered   = state.entries.slice(0, start);
        var unrendered = state.entries.slice(start);
        shuffle(unrendered);
        state.entries = rendered.concat(unrendered);
      }
      var end = Math.min(start + count, state.entries.length);
      var featuredHTML = "";
      var normalHTML   = "";
      for (var i = start; i < end; i++) {
        var isFeatured = settings.featuredPost && i === 0;
        var html = buildPostHTML(state.entries[i], isFeatured);
        if (isFeatured) featuredHTML += html;
        else            normalHTML   += html;
      }
      if (featuredHTML) featuredEl.innerHTML += featuredHTML;
      if (normalHTML)   normalEl.innerHTML   += normalHTML;
      state.renderedCount = end;
      return end - start;
    }
    function updateLoadMoreUI() {
      var remaining = state.entries.length - state.renderedCount;
      if (loadMoreWrap) {
        if (!state.hasMore && remaining <= 0) {
          loadMoreWrap.style.display = "none";
        } else {
          loadMoreWrap.style.display = "";
        }
      }
      if (endOfListEl) {
        if (!state.hasMore && remaining <= 0 && state.renderedCount > 0) {
          endOfListEl.style.display = "";
        } else {
          endOfListEl.style.display = "none";
        }
      }
    }
    function initialLoad() {
      fetchMore(maxPosts).then(function () {
        renderNext(maxPosts);
        updateLoadMoreUI();
        if (showLoadMore && state.hasMore) {
          fetchMore(state.renderedCount + loadMoreCount).then(updateLoadMoreUI);
        }
      });
    }
    if (loadMoreBtn) {
      loadMoreBtn.addEventListener("click", function () {
        if (loadMoreBtn.disabled) return;
        loadMoreBtn.disabled = true;
        var originalText = loadMoreBtn.textContent;
        loadMoreBtn.textContent = loadMoreLoading;
        fetchMore(state.renderedCount + loadMoreCount).then(function () {
          renderNext(loadMoreCount);
          updateLoadMoreUI();
          loadMoreBtn.disabled = false;
          loadMoreBtn.textContent = originalText;
        });
      });
    }
    initialLoad();
    return true;
  }
  function autoScan() {
    var els = document.querySelectorAll("[data-tj-label]:not([data-tj-initialized='1'])");
    for (var i = 0; i < els.length; i++) {
      var el = els[i];
      var d  = el.dataset;
      initRecentPosts({
        container: el,
        label: d.tjLabel,
        order: d.tjOrder || "recent",
        maxPosts: parseInt(d.tjMaxPosts, 10) || 5,
        showLoadMore: d.tjLoadMore === "true",
        loadMoreCount: parseInt(d.tjLoadMoreCount, 10) || parseInt(d.tjMaxPosts, 10) || 5,
        loadMoreText: d.tjLoadMoreText || "Muat Lebih Banyak",
        loadMoreLoadingText: d.tjLoadMoreLoadingText || "Memuat...",
        showEndOfList: d.tjShowEnd !== "false",
        endOfListText: d.tjEndText || "Tidak ada post lagi",
        endOfListClass: d.tjEndClass || "loadMoreEnd",
        featuredPost: d.tjFeatured === "true",
        thumbnail: d.tjThumbWidth
          ? { width: parseInt(d.tjThumbWidth, 10), height: parseInt(d.tjThumbHeight, 10) || parseInt(d.tjThumbWidth, 10) }
          : undefined,
        thumbnailDefault: d.tjThumbDefault,
        snippetLength: parseInt(d.tjSnippetLength, 10) || 150,
        showThumbnail: d.tjShowThumb !== "false",
        showDate:      d.tjShowDate  !== "false",
        showSnippet:   d.tjShowSnippet !== "false",
        showButton:    d.tjShowButton !== "false",
        buttonText:    d.tjButtonText || "Selengkapnya",
        cache: d.tjCache !== "false",
        cacheTTL: parseInt(d.tjCacheTtl, 10) || undefined
      });
    }
  }
  window.TerasJagat = {
    __version: 2.2,
    init: initRecentPosts,
    autoScan: autoScan,
    clearCache: cacheClear,
    getCacheSize: function () {
      try { return sessionStorage.length; } catch (e) { return memoryCache.size; }
    }
  };
  window.loadRecentPerLabelTerasJagat = initRecentPosts;
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", autoScan);
  } else {
    autoScan();
  }
  if (window.MutationObserver && document.body) {
    new MutationObserver(function () { autoScan(); })
      .observe(document.body, { childList: true, subtree: true });
  }
})();
