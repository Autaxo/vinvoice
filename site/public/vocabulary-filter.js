// Optional filter for /vocabulary/. Without JavaScript the full tables stay visible.
(function () {
  var box = document.getElementById('filter');
  var q = document.getElementById('q');
  var out = document.getElementById('q-count');
  var rows = document.querySelectorAll('tr[data-search]');
  if (!box || !q) return;
  box.hidden = false;
  q.addEventListener('input', function () {
    var words = q.value.toLowerCase().trim().split(/\s+/).filter(Boolean);
    var shown = 0;
    rows.forEach(function (tr) {
      var hit = words.every(function (w) {
        return tr.dataset.search.indexOf(w) !== -1;
      });
      tr.hidden = !hit;
      if (hit) shown++;
    });
    document.querySelectorAll('[data-tier]').forEach(function (s) {
      s.hidden = !s.querySelector('tr[data-search]:not([hidden])');
    });
    out.textContent = words.length ? shown + ' of ' + rows.length + ' keys' : '';
  });
})();
