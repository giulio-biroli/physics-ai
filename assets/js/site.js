/* Physics in the Age of AI — small progressive enhancements.
   Everything here is optional: pages are complete without JavaScript. */
(function () {
  'use strict';

  var now = Date.now();

  /* Mobile navigation. */
  var navToggle = document.querySelector('[data-nav-toggle]');
  var nav = document.getElementById('site-nav');
  if (navToggle && nav) {
    navToggle.addEventListener('click', function () {
      var open = navToggle.getAttribute('aria-expanded') === 'true';
      navToggle.setAttribute('aria-expanded', String(!open));
      nav.classList.toggle('is-open', !open);
    });
  }

  /* The site is static and is only rebuilt when content changes, so sessions
     that have ended since the last build are moved to "Past" in the browser. */
  var upcomingList = document.querySelector('[data-events-upcoming]');
  var pastList = document.querySelector('[data-events-past]');
  if (upcomingList) {
    var rows = Array.prototype.slice.call(upcomingList.querySelectorAll('[data-end]'));
    rows.reverse().forEach(function (row) {
      if (Date.parse(row.getAttribute('data-end')) < now) {
        if (pastList && !row.classList.contains('event-row--notice')) pastList.insertBefore(row, pastList.firstChild);
        else row.parentNode.removeChild(row);
      }
    });
    toggleEmpty(upcomingList, '[data-empty-upcoming]');
    if (pastList) toggleEmpty(pastList, '[data-empty-past]');
  }
  function toggleEmpty(list, selector) {
    var empty = document.querySelector(selector);
    if (empty) empty.hidden = list.querySelectorAll('[data-end]').length > 0;
  }

  /* Home page: show the first session that has not ended yet. */
  var cards = Array.prototype.slice.call(document.querySelectorAll('[data-next-card]'));
  if (cards.length) {
    var shown = false;
    cards.forEach(function (card) {
      var ended = Date.parse(card.getAttribute('data-end')) < now;
      card.hidden = shown || ended;
      if (!card.hidden) shown = true;
    });
    var nextEmpty = document.querySelector('[data-next-empty]');
    if (nextEmpty) nextEmpty.hidden = shown;
  }

  /* "in 12 days", "tomorrow", "today". */
  document.querySelectorAll('[data-countdown]').forEach(function (el) {
    var start = new Date(el.getAttribute('data-countdown'));
    var today = new Date(); today.setHours(0, 0, 0, 0);
    var day = new Date(start); day.setHours(0, 0, 0, 0);
    var days = Math.round((day - today) / 86400000);
    el.textContent = days > 1 ? 'in ' + days + ' days' : days === 1 ? 'tomorrow' : days === 0 ? 'today' : '';
  });

  /* Programme: filter sessions by strand (also via ?theme=results). */
  var filters = Array.prototype.slice.call(document.querySelectorAll('[data-filter]'));
  if (filters.length) {
    var apply = function (key) {
      filters.forEach(function (f) { f.setAttribute('aria-pressed', String(f.getAttribute('data-filter') === key)); });
      document.querySelectorAll('.event-row').forEach(function (row) {
        row.hidden = key !== 'all' && row.getAttribute('data-theme') !== key;
      });
      var filterEmpty = document.querySelector('[data-empty-filter]');
      if (filterEmpty && upcomingList) {
        var shown = upcomingList.querySelectorAll('.event-row:not([hidden])').length;
        filterEmpty.hidden = key === 'all' || shown > 0;
      }
    };
    filters.forEach(function (f) {
      f.addEventListener('click', function () {
        var key = f.getAttribute('data-filter');
        apply(key);
        if (window.history && history.replaceState) {
          history.replaceState(null, '', key === 'all' ? location.pathname : '?theme=' + key);
        }
      });
    });
    var initial = new URLSearchParams(location.search).get('theme');
    if (initial && filters.some(function (f) { return f.getAttribute('data-filter') === initial; })) apply(initial);
  }

  /* Copy buttons (mailing-list address, calendar URL). */
  document.querySelectorAll('[data-copy]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var text = btn.getAttribute('data-copy');
      var label = btn.textContent;
      var done = function () { btn.textContent = 'Copied'; setTimeout(function () { btn.textContent = label; }, 1600); };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(done, function () {});
      }
    });
  });

  /* "Add to calendar" for one session: build the .ics file in the browser. */
  var VTIMEZONE = ['BEGIN:VTIMEZONE', 'TZID:Europe/Paris',
    'BEGIN:DAYLIGHT', 'TZOFFSETFROM:+0100', 'TZOFFSETTO:+0200', 'TZNAME:CEST', 'DTSTART:19700329T020000', 'RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=-1SU', 'END:DAYLIGHT',
    'BEGIN:STANDARD', 'TZOFFSETFROM:+0200', 'TZOFFSETTO:+0100', 'TZNAME:CET', 'DTSTART:19701025T030000', 'RRULE:FREQ=YEARLY;BYMONTH=10;BYDAY=-1SU', 'END:STANDARD',
    'END:VTIMEZONE'];
  function icsText(s) { return String(s).replace(/\\/g, '\\\\').replace(/;/g, '\;').replace(/,/g, '\\,').replace(/\n/g, '\\n'); }
  document.querySelectorAll('[data-ics]').forEach(function (link) {
    link.addEventListener('click', function (event) {
      if (!window.Blob || !window.URL) return;
      event.preventDefault();
      var d = link.dataset;
      var stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+/, '');
      var lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Physics in the Age of AI//Seminar//EN', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH']
        .concat(VTIMEZONE, [
          'BEGIN:VEVENT', 'UID:' + d.icsUid, 'DTSTAMP:' + stamp,
          'DTSTART;TZID=Europe/Paris:' + d.icsStart, 'DTEND;TZID=Europe/Paris:' + d.icsEnd,
          'SUMMARY:' + icsText(d.icsTitle), 'LOCATION:' + icsText(d.icsLocation),
          'DESCRIPTION:' + icsText('Speaker: ' + d.icsSpeaker + '\n' + d.icsUrl), 'URL:' + d.icsUrl,
          'END:VEVENT', 'END:VCALENDAR']);
      var a = document.createElement('a');
      a.href = URL.createObjectURL(new Blob([lines.join('\r\n') + '\r\n'], { type: 'text/calendar;charset=utf-8' }));
      a.download = d.icsFile || 'session.ics';
      document.body.appendChild(a);
      a.click();
      setTimeout(function () { URL.revokeObjectURL(a.href); a.parentNode.removeChild(a); }, 1000);
    });
  });

  /* Until the mailing list exists, explain instead of following the links. */
  var listNotice = document.querySelector('[data-list-notice]');
  document.querySelectorAll('[data-list-action][data-list-live="false"]').forEach(function (link) {
    link.addEventListener('click', function (event) {
      event.preventDefault();
      if (listNotice) { listNotice.hidden = false; listNotice.focus(); }
    });
  });
})();
