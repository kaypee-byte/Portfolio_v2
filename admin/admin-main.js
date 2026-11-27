/* ==========================================================
   ADMIN MAIN: sign in, check this person is the administrator,
   then load every section.
   ========================================================== */

(function () {
  const Admin = window.Admin;
  const $ = Admin.$;

  if (!Admin.connected) {
    Admin.say('Backend not connected yet. Follow the README setup steps, then reload.');
    $('#login').hidden = true;
    return;
  }

  async function showDashboardIfAdmin() {
    const session = await Admin.sb.auth.getSession();
    if (!session.data.session) return;

    /* Only users listed in the "admins" table can read this row. */
    const check = await Admin.sb.from('admins').select('user_id').maybeSingle();
    if (!check.data) {
      await Admin.sb.auth.signOut();
      Admin.say('This account is not an administrator.');
      return;
    }

    $('#login').hidden = true;
    $('#app').hidden = false;
    Admin.say('');
    Admin.loadPosts();
    Admin.loadMoments();
    Admin.loadSite();
  }

  $('#login').onsubmit = async function (event) {
    event.preventDefault();
    const result = await Admin.sb.auth.signInWithPassword({
      email: $('#em').value,
      password: $('#pw').value,
    });

    if (result.error) Admin.say('Sign-in failed: ' + result.error.message);
    else showDashboardIfAdmin();
  };

  $('#out').onclick = async function () {
    await Admin.sb.auth.signOut();
    location.reload();
  };

  Admin.initPosts();
  Admin.initMoments();
  Admin.initSite();
  showDashboardIfAdmin();
})();
