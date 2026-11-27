/* ==========================================================
   ADMIN COMMON: connection and helpers used by every admin file.
   ========================================================== */

window.Admin = window.Admin || {};

(function () {
  const Admin = window.Admin;
  const CONFIG = window.CONFIG || {};

  Admin.$ = function (selector) {
    return document.querySelector(selector);
  };

  Admin.say = function (text) {
    Admin.$('#msg').textContent = text;
  };

  Admin.connected = Boolean(CONFIG.SUPABASE_URL && window.supabase);

  Admin.sb = Admin.connected
    ? window.supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY)
    : null;

  /* "Label | https://url" lines -> [{label, url}] (web links only). */
  Admin.parseLinks = function (text) {
    return text
      .split('\n')
      .map(function (line) {
        return line.split('|').map(function (part) { return part.trim(); });
      })
      .filter(function (parts) {
        return /^https?:\/\//.test(parts[1] || parts[0]);
      })
      .map(function (parts) {
        return parts[1]
          ? { label: parts[0], url: parts[1] }
          : { label: parts[0], url: parts[0] };
      });
  };

  Admin.linksToText = function (links) {
    return (links || [])
      .map(function (link) { return link.label + ' | ' + link.url; })
      .join('\n');
  };

  /* Uploads files one by one, showing progress. Adds each to `list`. */
  Admin.uploadFiles = async function (files, list) {
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const isVideo = file.type.startsWith('video');
      Admin.say('Uploading ' + (i + 1) + ' of ' + files.length + ': ' + file.name);

      const safeName = file.name.replace(/[^\w.-]/g, '_');
      const path = crypto.randomUUID() + '-' + safeName;
      const result = await Admin.sb.storage.from('media').upload(path, file);
      if (result.error) throw result.error;

      const url = Admin.sb.storage.from('media').getPublicUrl(path).data.publicUrl;
      const kind = isVideo ? 'video' : 'photo';
      const alt = prompt('Describe this ' + kind + ' for visitors who cannot see it (' + file.name + ')', '');

      list.push({ type: isVideo ? 'video' : 'image', path: path, url: url, alt: alt || '' });
    }
  };

  /* One list row: title + small text on the left, buttons on the right. */
  Admin.makeRow = function (title, small) {
    const row = document.createElement('div');
    row.className = 'row';
    row.innerHTML = '<span><b></b> <small></small></span><span></span>';
    row.querySelector('b').textContent = title;
    row.querySelector('small').textContent = small;
    return row;
  };

  Admin.addButton = function (row, text, onClick) {
    const button = document.createElement('button');
    button.textContent = text;
    button.onclick = onClick;
    row.lastChild.append(button);
  };

  /* Removes uploaded files of an item from storage. */
  Admin.removeMedia = async function (media) {
    const paths = (media || [])
      .map(function (item) { return item.path; })
      .filter(Boolean);
    if (paths.length) await Admin.sb.storage.from('media').remove(paths);
  };
})();
