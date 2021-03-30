/* global document, AddonsFrontendCard */
(function addonCards(document, AddonsFrontendCard) {
  if (typeof AddonsFrontendCard === 'undefined') {
    // eslint-disable-next-line no-console
    console.log(`AddonsFrontendCard does not exist.`);
    return;
  }

  document.querySelectorAll('.addon-card').forEach(async (card) => {
    const { addonId } = card.dataset;

    if (!addonId) {
      return;
    }

    try {
      // eslint-disable-next-line no-param-reassign
      card.outerHTML = await AddonsFrontendCard.buildStaticAddonCard({
        addonId,
      });
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error(
        `Error while trying to build card for addonId=${addonId}: ${
          e.message || e
        }`
      );
    }
  });
})(document, AddonsFrontendCard);
