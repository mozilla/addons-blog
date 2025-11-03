/* global document, navigator, window, ga */
(function analytics() {
  const GA_TRACKING_ID = 'UA-36116321-7';
  const GA4_TRACKING_ID = 'G-B9CY1C9VBC';

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
    gtag() {
      if (this.isEnabled()) {
        // Google Tag Manager expects dataLayer to contain objects looking like
        // arrays, not actual arrays (i.e. Arguments objects), we can't just
        // use ...args rest params.
        // eslint-disable-next-line prefer-rest-params
        window.dataLayer.push(arguments);
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
      this.gtag('event', data.eventCategory, data);
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
        ((i[r] =
          i[r] ||
          function () {
            (i[r].q = i[r].q || []).push(arguments);
          }),
          (i[r].l = 1 * new Date()));
        ((a = s.createElement(o)), (m = s.getElementsByTagName(o)[0]));
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

      const lastScriptElm = document.getElementsByTagName('script')[0];
      const scriptElm = document.createElement('script');
      scriptElm.async = 1;
      scriptElm.src = `https://www.googletagmanager.com/gtag/js?id=${GA4_TRACKING_ID}`;
      lastScriptElm.parentNode.insertBefore(scriptElm, lastScriptElm);
      window.dataLayer = window.dataLayer || [];

      /* eslint-enable */
      window.amoTracking.gtag('js', new Date());
      window.amoTracking.gtag('config', GA4_TRACKING_ID);
      ga('create', GA_TRACKING_ID, 'auto');
      ga('set', 'transport', 'beacon');
      ga('send', 'pageview');
    }
  }
})();
