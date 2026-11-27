/* ==========================================================
   ADMIN POSTS: create, edit, publish, unpublish, delete posts
   in the three panels.
   ========================================================== */

(function () {
  const Admin = window.Admin;
  const $ = Admin.$;
  const say = Admin.say;

  let media = []; // media already attached to the post being edited

  function resetForm() {
    $('#f').reset();
    $('#id').value = '';
    $('#cur').textContent = '';
    $('#ft').textContent = 'New post';
    media = [];
  }

  function readForm() {
    return {
      panel: $('#panel').value,
      title: $('#title').value,
      description: $('#desc').value,
      category: $('#cat').value,
      role: $('#role').value,
      event_date: $('#date').value || null,
      tech: $('#tech').value.split(',').map(function (t) { return t.trim(); }).filter(Boolean),
      links: Admin.parseLinks($('#links').value),
      media: media,
      status: $('#status').value,
    };
  }

  function fillForm(post) {
    $('#id').value = post.id;
    $('#panel').value = post.panel;
    $('#title').value = post.title;
    $('#desc').value = post.description;
    $('#cat').value = post.category;
    $('#role').value = post.role;
    $('#date').value = post.event_date || '';
    $('#tech').value = (post.tech || []).join(', ');
    $('#links').value = Admin.linksToText(post.links);
    $('#status').value = post.status;
    media = post.media || [];
    $('#cur').textContent = media.length + ' media file(s) attached';
    $('#ft').textContent = 'Edit post';
    scrollTo(0, 0);
  }

  async function savePost(event) {
    event.preventDefault();

    try {
      await Admin.uploadFiles(Array.from($('#files').files), media);

      const row = readForm();
      const id = $('#id').value;
      const table = Admin.sb.from('posts');
      const result = id ? await table.update(row).eq('id', id) : await table.insert(row);
      if (result.error) throw result.error;

      say('Saved.');
      resetForm();
      Admin.loadPosts();
    } catch (error) {
      say('Could not save: ' + error.message);
    }
  }

  async function deletePost(post) {
    if (!confirm('Permanently delete "' + post.title + '" and its media?')) return;
    await Admin.removeMedia(post.media);
    await Admin.sb.from('posts').delete().eq('id', post.id);
    Admin.loadPosts();
  }

  async function togglePublished(post) {
    const next = post.status === 'published' ? 'draft' : 'published';
    await Admin.sb.from('posts').update({ status: next }).eq('id', post.id);
    Admin.loadPosts();
  }

  Admin.loadPosts = async function () {
    const result = await Admin.sb.from('posts').select('*').order('created_at', { ascending: false });
    if (result.error) return say(result.error.message);

    const list = $('#list');
    list.innerHTML = '';
    if (!result.data.length) list.textContent = 'No posts yet. Use the form above.';

    result.data.forEach(function (post) {
      const row = Admin.makeRow(post.title, post.panel + ' · ' + post.status);
      Admin.addButton(row, 'Edit', function () { fillForm(post); });
      Admin.addButton(row, post.status === 'published' ? 'Unpublish' : 'Publish', function () {
        togglePublished(post);
      });
      Admin.addButton(row, 'Delete', function () { deletePost(post); });
      list.append(row);
    });
  };

  Admin.initPosts = function () {
    $('#f').onsubmit = savePost;
    $('#new').onclick = resetForm;
  };
})();
