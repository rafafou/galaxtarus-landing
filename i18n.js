/* GALAXTARUS LANDING — toggle FR/EN partagé */

function setLang(lang) {
  document.documentElement.lang = lang;
  document.querySelectorAll('[data-en], [data-fr]').forEach(function (el) {
    var key = 'data-' + lang;
    if (el.hasAttribute(key)) {
      el.innerHTML = el.getAttribute(key);
    }
  });
  var btnEn = document.getElementById('btn-en');
  var btnFr = document.getElementById('btn-fr');
  if (btnEn) btnEn.classList.toggle('active', lang === 'en');
  if (btnFr) btnFr.classList.toggle('active', lang === 'fr');
  try { localStorage.setItem('galaxtarus-lang', lang); } catch (e) {}
}

(function () {
  var saved = 'en';
  try { saved = localStorage.getItem('galaxtarus-lang') || 'en'; } catch (e) {}
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { setLang(saved); });
  } else {
    setLang(saved);
  }
})();
