/* ==========================================================
   VIEWS: the pages reached through the address bar hash.
     #/                    home
     #/panel/cyber         a panel (also: software, pm)
     #/post/<id>           one post
     #/moment/<id>         one moment (full story)
     #about, #contact ...  scroll to a home section
   ========================================================== */

(function () {
  const Site = window.Site;
  const esc = Site.esc;
  const $ = Site.$;

  /* ---------- Small pieces of markup ---------- */

  function mediaHtml(items, keyImages) {
    return (items || [])
      .map(function (item) {
        const url = esc(item.url);

        if (item.type === 'video') {
          const poster = item.poster ? ' poster="' + esc(item.poster) + '"' : '';
          return '<video controls preload="metadata"' + poster + ' src="' + url + '"></video>';
        }

        const key = keyImages && item.keyBlack !== false ? ' data-key' : '';
        return (
          '<img loading="lazy" src="' + url + '" alt="' + esc(item.alt || '') + '"' + key + '>'
        );
      })
      .join('');
  }

  function linksHtml(links) {
    return (links || [])
      .map(function (link) {
        const label = esc(link.label || link.url);
        return '<a href="' + esc(Site.safeUrl(link.url)) + '" rel="noopener">' + label + '</a>';
      })
      .join('');
  }

  function postCard(post) {
    const first = post.media && post.media[0];
    const image =
      first && first.type === 'image'
        ? '<img loading="lazy" src="' + esc(first.url) + '" alt="' +
          esc(first.alt || post.title) + '">'
        : '';

    return (
      '<a class="post" href="#/post/' + esc(post.id) + '">' +
        '<h3>' + esc(post.title) + '</h3>' +
        '<p class="meta">' + esc(post.category) + ' ' + Site.whenText(post) + '</p>' +
        image +
      '</a>'
    );
  }

  /* ---------- Pages ---------- */

  async function showPanel(view, key) {
    const info = Site.PANELS[key] || ['Not found', ''];
    const posts = await Site.loadPosts(key);

    document.body.dataset.panel = key;
    view.className = 'wrap ' + key;

    const list = posts.length
      ? '<div class="posts">' + posts.map(postCard).join('') + '</div>'
      : '<p>No posts yet. Check back soon.</p>';

    view.innerHTML =
      '<p><a href="#/">Back home</a></p>' +
      '<h1>' + esc(info[0]) + '</h1>' +
      '<p class="note">' + esc(info[1]) + '</p>' +
      list;
  }

  async function showPost(view, id) {
    const posts = await Site.loadPosts(null, id);
    const post = posts[0];

    if (!post) {
      view.innerHTML = '<p>This post was not found. <a href="#/">Back home</a></p>';
      return;
    }

    document.body.dataset.panel = post.panel;
    view.className = 'wrap ' + post.panel;

    const role = post.role ? '· Role: ' + esc(post.role) : '';
    const badges = (post.tech || []).map(function (name) {
      return '<span class="badge">' + esc(name) + '</span>';
    });
    const tech = badges.length ? '<p>' + badges.join(' ') + '</p>' : '';

    view.innerHTML =
      '<p><a href="#/panel/' + esc(post.panel) + '">Back to ' +
        esc(Site.PANELS[post.panel][0]) + '</a></p>' +
      '<h1>' + esc(post.title) + '</h1>' +
      '<p class="meta">' + esc(post.category) + ' ' + Site.whenText(post) + ' ' + role + '</p>' +
      tech +
      '<p>' + esc(post.description).replace(/\n/g, '<br>') + '</p>' +
      '<div class="media">' + mediaHtml(post.media, false) + '</div>' +
      '<p class="links">' + linksHtml(post.links) + '</p>';
  }

  async function showMoment(view, id) {
    const list = await Site.loadMoments(id);
    const moment = list[0];

    if (!moment) {
      view.innerHTML = '<p>This moment was not found. <a href="#/">Back home</a></p>';
      return;
    }

    delete document.body.dataset.panel;
    view.className = 'wrap';

    view.innerHTML =
      '<p><a href="#timeline">Back to my story</a></p>' +
      '<h1>' + esc(moment.title) + '</h1>' +
      '<p class="meta">' + Site.whenText(moment) + '</p>' +
      '<div class="media">' + mediaHtml(moment.media, true) + '</div>' +
      '<div class="story">' + Site.paras(moment.story) + '</div>' +
      '<p class="links">' + linksHtml(moment.links) + '</p>';

    Site.keyOut(view);
  }

  function showHome(hash) {
    $('#home').hidden = false;
    $('#view').hidden = true;
    delete document.body.dataset.panel;

    const id = hash.slice(1);
    if (id && !id.startsWith('/')) {
      const target = document.getElementById(id);
      if (target) target.scrollIntoView();
    }
  }

  /* ---------- Router ---------- */

  async function route() {
    const hash = location.hash;
    const match = hash.match(/^#\/(panel|post|moment)\/(.+)$/);
    const view = $('#view');

    if (!match) {
      showHome(hash);
      return;
    }

    $('#home').hidden = true;
    view.hidden = false;
    view.innerHTML = '<p>Loading…</p>';
    scrollTo(0, 0);

    try {
      if (match[1] === 'panel') await showPanel(view, match[2]);
      else if (match[1] === 'post') await showPost(view, match[2]);
      else await showMoment(view, match[2]);
    } catch (error) {
      view.innerHTML = '<p role="alert">Could not load content. Please refresh and try again.</p>';
      console.error(error);
    }

    if (Site.updateToolbar) Site.updateToolbar();
  }

  Site.startRouter = function () {
    addEventListener('hashchange', route);
    route();
  };
})();
