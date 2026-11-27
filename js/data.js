/* ==========================================================
   DATA: where the content comes from.
   - With Supabase connected (config.js): your dashboard content.
   - Without it: built-in text (defaults.js) and SAMPLE items.
   ========================================================== */

(function () {
  const Site = window.Site;
  const CONFIG = window.CONFIG || {};
  const DEFAULTS = window.DEFAULTS || {};
  const SUPABASE_SCRIPT =
    'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.js';

  /* ---------- Photos used by the strip ---------- */

  Site.photos = Array.from({ length: 17 }, function (_, i) {
    return 'assets/photos/' + String(i + 1).padStart(2, '0') + '.webp';
  });

  /* ---------- The three panels ---------- */

  Site.PANELS = {
    cyber: [
      'Cybersecurity: Ethical hacking',
      'Labs, CTF challenges and learning notes. Everything here is ' +
        'ethical and educational, done in legal practice environments.',
    ],
    software: [
      'Software engineering',
      'Websites and software I have built, what I learned, ' +
        'and what is still in progress.',
    ],
    pm: [
      'Project management',
      'Planning, milestones, teamwork and lessons learned. ' +
        'Confidential details are never shared.',
    ],
  };

  /* ---------- Supabase client (loaded only when configured) ---------- */

  let clientPromise = null;

  Site.client = function () {
    if (!CONFIG.SUPABASE_URL) return Promise.resolve(null);
    if (clientPromise) return clientPromise;

    clientPromise = new Promise(function (resolve, reject) {
      const script = document.createElement('script');
      script.src = SUPABASE_SCRIPT;
      script.onload = function () {
        resolve(
          window.supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY)
        );
      };
      script.onerror = reject;
      document.head.append(script);
    });

    return clientPromise;
  };

  /* ---------- Editable site text (about, skills, story ...) ---------- */

  Site.content = {};

  /* Saved text wins; otherwise the built-in text from defaults.js. */
  Site.text = function (key) {
    const saved = Site.content[key];
    if (saved !== undefined && saved !== null && saved !== '') return saved;
    return DEFAULTS[key] || '';
  };

  Site.loadContent = async function () {
    const sb = await Site.client();
    if (!sb) return;
    const result = await sb.from('site_content').select('*');
    (result.data || []).forEach(function (row) {
      Site.content[row.key] = row.value;
    });
  };

  /* ---------- Sample posts (shown until you add real ones) ---------- */

  function samplePost(panel, n, title, category, description, image, extra) {
    const base = {
      id: 'sample-' + panel + '-' + n,
      panel: panel,
      title: 'SAMPLE: ' + title,
      category: category,
      event_date: null,
      status: 'published',
      description:
        description +
        '\n\nThis is sample text. Replace it with your real content ' +
        'in the admin area.',
      media: [{ type: 'image', url: image, alt: 'Sample image (replace with your own)' }],
      links: [],
      tech: [],
    };
    return Object.assign(base, extra || {});
  }

  const SAMPLE_POSTS = [
    samplePost('cyber', 1, 'Write-up of a practice lab', 'Lab',
      'Describe the lab or room you completed, the goal, the tools you used, ' +
      'and what you learned. Only write about legal practice environments.',
      'assets/photos/06.webp'),
    samplePost('cyber', 2, 'My first CTF challenge', 'CTF',
      'Explain the challenge category, how you approached it, ' +
      'and what you would do differently next time.',
      'assets/photos/15.webp'),
    samplePost('cyber', 3, 'Notes: building software securely', 'Learning notes',
      'Share what you are learning about secure coding, such as input ' +
      'validation, authentication and safe dependencies.',
      'assets/photos/08.webp'),
    samplePost('software', 1, 'A website I built', 'Website',
      'Describe what the site does, who it helps, and what problem it solves. ' +
      'Add screenshots and a GitHub link.',
      'assets/photos/16.webp',
      {
        tech: ['HTML', 'CSS', 'JavaScript'],
        role: 'Developer',
        links: [{ label: 'My GitHub', url: 'https://github.com/kaypee-byte' }],
      }),
    samplePost('software', 2, 'A project in progress', 'In progress',
      'Mark work that is not finished yet and say what you are building next.',
      'assets/photos/12.webp',
      { tech: ['Add your stack'], role: 'Your role' }),
    samplePost('software', 3, 'Lessons learned', 'Reflection',
      'Write about a bug, a design decision or a skill you picked up while building.',
      'assets/photos/18.webp'),
    samplePost('pm', 1, 'Project coordination at Beacon Innovation Hub', 'Experience',
      'Describe your role, the team, the milestones you tracked and what you ' +
      'delivered. Do not include confidential details.',
      'assets/team.jpg',
      { role: 'Project coordinator' }),
    samplePost('pm', 2, 'Planning and milestones', 'Planning',
      'Show how you plan work: goals, tasks, timelines and how you keep ' +
      'the team on track.',
      'assets/photos/11.webp'),
    samplePost('pm', 3, 'Teamwork and lessons learned', 'Reflection',
      'Share what working with a team taught you about communication and delivery.',
      'assets/photos/07.webp'),
  ];

  /* One panel's posts, or a single post when an id is given. */
  Site.loadPosts = async function (panel, id) {
    const sb = await Site.client();

    if (!sb) {
      return SAMPLE_POSTS.filter(function (post) {
        return id ? post.id === id : post.panel === panel;
      });
    }

    let query = sb.from('posts').select('*').eq('status', 'published');

    if (id) {
      query = query.eq('id', id);
    } else {
      query = query
        .eq('panel', panel)
        .order('event_date', { ascending: false, nullsFirst: false });
    }

    const result = await query;
    if (result.error) throw result.error;
    return result.data;
  };

  /* ---------- Built-in moments (js/moments-data.js) ---------- */

  const BUILT_IN_MOMENTS = window.BUILTIN_MOMENTS || [];

  /* All published moments, or a single moment when an id is given. */
  Site.loadMoments = async function (id) {
    const sb = await Site.client();

    if (!sb) {
      if (!id) return BUILT_IN_MOMENTS;
      return BUILT_IN_MOMENTS.filter(function (moment) { return moment.id === id; });
    }

    let query = sb.from('moments').select('*').eq('status', 'published');

    if (id) {
      query = query.eq('id', id);
    } else {
      query = query.order('sort').order('event_date');
    }

    const result = await query;
    if (result.error) throw result.error;
    return result.data;
  };
})();
