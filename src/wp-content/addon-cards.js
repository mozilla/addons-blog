/* global document, AddonsFrontendBlogUtils */
(function addonCards(document, AddonsFrontendBlogUtils) {
  if (typeof AddonsFrontendBlogUtils === 'undefined') {
    // eslint-disable-next-line no-console
    console.log(`AddonsFrontendBlogUtils does not exist.`);
    return;
  }

  document.querySelectorAll('.addon-card').forEach(async (card) => {
    const { addonId } = card.dataset;

    if (!addonId) {
      return;
    }

    try {
      // eslint-disable-next-line no-param-reassign
      card.outerHTML = await AddonsFrontendBlogUtils.buildStaticAddonCard({
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
})(document, AddonsFrontendBlogUtils);
