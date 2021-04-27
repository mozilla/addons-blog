/* global document, navigator, window, ga */
(function analytics() {
  const GA_TRACKING_ID = 'UA-36116321-7';

  const amoTracking = {
    isEnabled() {
      return !(
        window.doNotTrack === '1' ||
        navigator.doNotTrack === '1' ||
        navigator.doNotTrack === 'yes' ||
        navigator.msDoNotTrack === '1'
      );
    },
    ga(method, data) {
      if (this.isEnabled()) {
        window.ga(method, data);
      }
    },
    sendEvent({ category, action, label }) {
      const data = {
        hitType: 'event',
        eventCategory: category,
        eventAction: action,
        eventLabel: label,
      };

      // eslint-disable-next-line no-console
      console.debug(
        `[GA: ${this.isEnabled() ? 'ON' : 'OFF'}] sendEvent(${JSON.stringify(
          data
        )})`
      );
      this.ga('send', data);
    },
  };

  /* istanbul ignore else */
  if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
    module.exports = { amoTracking };
  } else {
    window.amoTracking = amoTracking;

    // Only include the GA code if tracking is enabled.
    if (window.amoTracking.isEnabled()) {
      /* eslint-disable */
      (function (i, s, o, g, r, a, m) {
        i.GoogleAnalyticsObject = r;
        (i[r] =
          i[r] ||
          function () {
            (i[r].q = i[r].q || []).push(arguments);
          }),
          (i[r].l = 1 * new Date());
        (a = s.createElement(o)), (m = s.getElementsByTagName(o)[0]);
        a.async = 1;
        a.src = g;
        m.parentNode.insertBefore(a, m);
      })(
        window,
        document,
        'script',
        'https://www.google-analytics.com/analytics.js',
        'ga'
      );
      /* eslint-enable */
      ga('create', GA_TRACKING_ID, 'auto');
      ga('set', 'transport', 'beacon');
      ga('send', 'pageview');
    }
  }
})();
