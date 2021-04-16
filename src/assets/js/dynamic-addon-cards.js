/* eslint no-console: 0 */
/* global document, fetch, UAParser */
(function dynamicAddonCards() {
  const AMO_BASE_URL = 'https://addons.mozilla.org';

  // `StaticAddonCard` elements can be marked as unavailable by adding a
  // special CSS class. The style as well as the content is already embedded.
  const convertToUnavailableCard = (card) => {
    card.classList.add('StaticAddonCard--is-unavailable');
  };

  const updateAddonCard = async (card, { parsedUserAgent }) => {
    const { addonId } = card.dataset;

    try {
      if (!addonId) {
        throw new Error('addonId is missing');
      }

      const { name: osName } = parsedUserAgent.getOS();
      const clientApp = osName === 'Android' ? 'android' : 'firefox';

      const response = await fetch(
        `${AMO_BASE_URL}/api/v5/addons/addon/${addonId}/?lang=en-US&app=${clientApp}`
      );

      if (!response.ok) {
        throw new Error('add-on not found');
      }
    } catch (e) {
      console.debug(`Error caught for addonId=${addonId}: ${e.message}`);
      convertToUnavailableCard(card);
    }
  };

  if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
    module.exports = {
      convertToUnavailableCard,
      updateAddonCard,
    };
  } else {
    const parsedUserAgent = new UAParser();

    document
      .querySelectorAll('.StaticAddonCard')
      .forEach((card) => updateAddonCard(card, { parsedUserAgent }));
  }
})();
