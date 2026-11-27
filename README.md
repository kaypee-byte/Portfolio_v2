# Kwanele P. Ntshalintshali: Portfolio

A static website (HTML, CSS, JavaScript, no build step) plus Supabase for
administrator sign-in, posts, moments and media uploads.

## Folder structure

```
index.html              The public site
config.js               Supabase URL + public key (empty = sample content)
.env.example            Names of the settings used at deploy time
css/
  base.css              Colours, typography, buttons
  background.css        Slow seamless background drift
  nav.css               Top bar, phone toolbar and menu sheet
  hero.css              Hero, spinning globe, photo strip
  sections.css          Panel cards, about, experience, contact
  panels.css            Panel, post and moment pages
  story.css             Rolling half globe and moment cards
  mobile.css            Tablet and phone adjustments
  admin.css             Dashboard styles
js/
  utils.js              Shared helpers (loaded first)
  data.js               Where content comes from + sample content
  defaults.js           Built-in text (your story, about, CV details)
  transparent.js        Transparent black backgrounds for template media
  photo-strip.js        Photo strip
  hero-globe.js         Spinning 3D hero globe (three.js)
  profile.js            Fills About, skills, experience, education
  moments-data.js       Your 19 built-in moments (photos and videos)
  moments.js            Template cards (arc carousel and phone strip)
  story-dome.js         The rolling half globe
  journey.js            "My story" section controller
  views.js              Panel, post and moment pages
  toolbar.js            Phone navigation toolbar and menu
  main.js               Starts everything
admin/                  Dashboard (index.html + one JS file per section)
supabase/schema.sql     Tables, security rules and storage rules
scripts/make-config.mjs Writes config.js from environment variables
assets/                 Your photos, team photo, three.js, optional video
```

## 1. Run locally (works immediately, sample content)
Double-click `index.html`. To use your own video on the hero globe or to test
transparent video, use a local server instead:
`python3 -m http.server 8000`, then open http://localhost:8000

## 2. Your video on the hero globe
Save it as `assets/video/hero.mp4` (H.264, about 720p, under 10 MB). In
`index.html`, remove the comment markers around the `SITE_VIDEO` line.

## 3. Connect Supabase (admin, posts, moments, uploads)
1. Create a free project at supabase.com.
2. SQL Editor: paste and run all of `supabase/schema.sql`.
3. Authentication > Providers > Email: turn OFF "Allow new users to sign up".
4. Authentication > Users > Add user: create your email and a strong password.
5. SQL Editor: `insert into public.admins select id from auth.users where email = 'kpmalekwanele@gmail.com';`
6. Project Settings > API: copy the Project URL and the `anon` public key into
   `config.js`. Never use or commit the `service_role` key.
7. Open `/admin/`, sign in, and add content.

Security: the admin page URL is not secret. Protection comes from sign-in plus
Row Level Security: only users in `admins` can write or read drafts, and
visitors can only read published items. Media uses unguessable file names, but
anyone with a direct file link can open it, so never upload confidential files.

## 4. Everything is edited from the dashboard
- **Posts**: the three panels.
- **My story: moments**: the cards around the half globe. Each has a title,
  button text, date, order, a long story, photos or videos, and links.
  The tick box "Make a solid black background transparent" never changes your
  original file; it only changes how the card is shown.
- **Site content**: the text on the half globe, About, skills, languages,
  interests, experience and education.

## 5. Your photos and videos (moments)
All 12 photos and 7 videos are in `assets/moments/` (compressed for the web)
and listed in `js/moments-data.js`, so the cards work straight away.
After connecting Supabase, run `supabase/seed-moments.sql` once in the SQL
Editor. It copies the 19 moments into your dashboard, where you can rename
them, write each story, reorder them, unpublish or delete them.

## 6. Deploy from GitHub
1. `git init && git add . && git commit -m "Portfolio"`, then push to GitHub
   (`.env` is git-ignored).
2. Cloudflare Pages, Netlify or Vercel: build command
   `node scripts/make-config.mjs`, output directory `.`.
3. Add environment variables `SUPABASE_URL` and `SUPABASE_ANON_KEY` there.
4. Supabase > Authentication > URL Configuration: set your deployed address.
