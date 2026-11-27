/* ==========================================================
   ADMIN MOMENTS: the template cards around the half globe,
   each with its own long story page.
   ========================================================== */

(function () {
  const Admin = window.Admin;
  const $ = Admin.$;
  const say = Admin.say;

  let media = [];

  function resetForm() {
    $('#mf').reset();
    $('#mid').value = '';
    $('#mc').value = 'Read the story';
    $('#mcur').textContent = '';
    media = [];
  }

  function readForm() {
    /* The checkbox is stored on each media item; originals are never touched. */
    const keyBlack = $('#mkey').checked;
    media.forEach(function (item) { item.keyBlack = keyBlack; });

    return {
      title: $('#mt').value,
      cta: $('#mc').value || 'Read the story',
      event_date: $('#md').value || null,
      sort: Number($('#mo').value) || 0,
      story: $('#ms').value,
      links: Admin.parseLinks($('#ml').value),
      media: media,
      status: $('#mst').value,
    };
  }

  function fillForm(moment) {
    $('#mid').value = moment.id;
    $('#mt').value = moment.title;
    $('#mc').value = moment.cta;
    $('#md').value = moment.event_date || '';
    $('#mo').value = moment.sort;
    $('#ms').value = moment.story;
    $('#ml').value = Admin.linksToText(moment.links);
    $('#mst').value = moment.status;

    media = moment.media || [];
    $('#mkey').checked = !media.some(function (item) { return item.keyBlack === false; });
    $('#mcur').textContent =
      media.length + ' media file(s) attached (adding new files keeps these)';
    scrollTo(0, $('#mf').offsetTop - 20);
  }

  async function saveMoment(event) {
    event.preventDefault();

    try {
      await Admin.uploadFiles(Array.from($('#mfiles').files), media);

      const row = readForm();
      const id = $('#mid').value;
      const table = Admin.sb.from('moments');
      const result = id ? await table.update(row).eq('id', id) : await table.insert(row);
      if (result.error) throw result.error;

      say('Moment saved.');
      resetForm();
      Admin.loadMoments();
    } catch (error) {
      say('Could not save: ' + error.message);
    }
  }

  async function deleteMoment(moment) {
    if (!confirm('Permanently delete "' + moment.title + '" and its media?')) return;
    await Admin.removeMedia(moment.media);
    await Admin.sb.from('moments').delete().eq('id', moment.id);
    Admin.loadMoments();
  }

  async function togglePublished(moment) {
    const next = moment.status === 'published' ? 'draft' : 'published';
    await Admin.sb.from('moments').update({ status: next }).eq('id', moment.id);
    Admin.loadMoments();
  }

  Admin.loadMoments = async function () {
    const result = await Admin.sb.from('moments').select('*').order('sort');
    if (result.error) return say(result.error.message);

    const list = $('#mlist');
    list.innerHTML = '';
    if (!result.data.length) list.textContent = 'No moments yet. Use the form above.';

    result.data.forEach(function (moment) {
      const row = Admin.makeRow(moment.title, '#' + moment.sort + ' · ' + moment.status);
      Admin.addButton(row, 'Edit', function () { fillForm(moment); });
      Admin.addButton(row, moment.status === 'published' ? 'Unpublish' : 'Publish', function () {
        togglePublished(moment);
      });
      Admin.addButton(row, 'Delete', function () { deleteMoment(moment); });
      list.append(row);
    });
  };

  Admin.initMoments = function () {
    $('#mf').onsubmit = saveMoment;
    $('#mnew').onclick = resetForm;
  };
})();
