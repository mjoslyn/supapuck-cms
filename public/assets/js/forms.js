// Forms: conditional logic (same rules as src/lib/forms/logic.ts), US phone formatting, character
// counters, and focus on the error summary or confirmation after a submission.
(function () {
  function values(form) {
    var out = {};
    new FormData(form).forEach(function (v, k) {
      var m = k.match(/^([a-z0-9]+)(?:\[(\w*)\])?$/i);
      if (!m) return;
      var id = m[1];
      if (m[2] === '') (out[id] = out[id] || []).push(String(v));
      else if (m[2]) out[id] = ((out[id] || '') + ' ' + v).trim();
      else out[id] = String(v);
    });
    return out;
  }

  function matches(op, actual, target) {
    var a = String(actual).trim().toLowerCase();
    var t = String(target || '').trim().toLowerCase();
    switch (op) {
      case 'is': return a === t;
      case 'isnot': return a !== t;
      case '>': return Number(actual) > Number(target);
      case '<': return Number(actual) < Number(target);
      case 'contains': return a.indexOf(t) !== -1;
      case 'starts_with': return a.indexOf(t) === 0;
      case 'ends_with': return a.slice(-t.length) === t;
    }
    return false;
  }

  function ruleMatches(rule, vals) {
    var v = vals[rule.field];
    var list = v == null ? [] : Array.isArray(v) ? v : [v];
    if (rule.op === 'isnot') return list.length ? list.every(function (x) { return matches('isnot', x, rule.value); }) : String(rule.value || '') !== '';
    return list.length ? list.some(function (x) { return matches(rule.op, x, rule.value); }) : matches(rule.op, '', rule.value);
  }

  function apply(form, logic) {
    var vals = values(form);
    var hidden = {};
    Object.keys(logic).forEach(function (id) {
      var l = logic[id];
      var results = l.rules.map(function (r) { return ruleMatches(r, vals); });
      var pass = l.match === 'any' ? results.some(Boolean) : results.every(Boolean);
      if ((l.action === 'show') !== pass) hidden[id] = true;
    });
    form.querySelectorAll('[data-field]').forEach(function (el) {
      var id = el.getAttribute('data-field');
      var section = el.getAttribute('data-section');
      var hide = !!hidden[id] || (section && !!hidden[section]);
      el.hidden = hide;
      // Hidden fields are not sent (the server ignores them either way).
      el.querySelectorAll('input, select, textarea').forEach(function (i) { i.disabled = hide; });
    });
  }

  function formatPhone(input) {
    var d = input.value.replace(/\D/g, '').slice(0, 10);
    var out = d;
    if (d.length > 6) out = '(' + d.slice(0, 3) + ') ' + d.slice(3, 6) + '-' + d.slice(6);
    else if (d.length > 3) out = '(' + d.slice(0, 3) + ') ' + d.slice(3);
    else if (d.length) out = '(' + d;
    input.value = out;
  }

  function counter(input) {
    var out = document.querySelector('[data-count-for="' + input.id + '"]');
    if (out) out.textContent = input.value.length + ' of ' + input.maxLength + ' characters';
  }

  function init() {
    document.querySelectorAll('.c-form__form').forEach(function (form) {
      var logic = form.getAttribute('data-logic');
      if (logic) {
        logic = JSON.parse(logic);
        var run = function () { apply(form, logic); };
        form.addEventListener('input', run);
        form.addEventListener('change', run);
        run();
      }
      form.querySelectorAll('[data-mask="us-phone"]').forEach(function (i) {
        i.addEventListener('input', function () { formatPhone(i); });
      });
      form.querySelectorAll('[data-count]').forEach(function (i) {
        i.addEventListener('input', function () { counter(i); });
        counter(i);
      });
    });
    var focus = document.querySelector('.c-form [data-focus]');
    if (focus) {
      focus.focus({ preventScroll: true });
      focus.scrollIntoView({ block: 'center' });
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
