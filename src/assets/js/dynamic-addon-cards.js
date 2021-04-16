/* eslint no-console: 0 */
/* global document, fetch, UAParser */
(function dynamicAddonCards() {
  const AMO_BASE_URL = 'https://addons.mozilla.org';

  // `StaticAddonCard` elements can be marked as unavailable by adding a
  // special CSS class. The style as well as the content is already embedded.
  const convertToUnavailableCard = (card) => {
    card.classList.add('StaticAddonCard--is-unavailable');
  };

  const convertToInstallButton = ({
    getFirefoxButton,
    downloadURL,
    disableButton,
  }) => {
    getFirefoxButton.classList.remove('GetFirefoxButton--new');
    getFirefoxButton.querySelector('.GetFirefoxButton-callout').remove();

    const button = getFirefoxButton.querySelector('.GetFirefoxButton-button');

    button.classList.add('Button--action');
    // eslint-disable-next-line no-param-reassign
    button.innerText = 'Add to Firefox';
    button.setAttribute('href', downloadURL || '');

    if (disableButton) {
      button.classList.add('Button--disabled');
      button.setAttribute('aria-disabled', true);
      // We don't want to remove the URL pointing to the XPI in `href` (so that
      // power users can still download the XPI). This is why we have to abort
      // `click` events with a listener.
      button.addEventListener('click', (event) => {
        event.preventDefault();
      });
    }
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

      const { name: browserName } = parsedUserAgent.getBrowser();
      const isFirefox = browserName === 'Firefox';

      if (isFirefox) {
        let downloadURL;
        let disableButton;

        // Firefox for iOS does not support add-ons.
        if (osName === 'iOS') {
          console.debug(
            `disabling install button for addonId=${addonId} because Firefox for iOS does not support add-ons`
          );
          disableButton = true;
        } else {
          const { current_version, promoted } = await response.json();

          if (!current_version || !current_version.files) {
            console.debug(`invalid current version for addonId=${addonId}`);
            disableButton = true;
          }

          if (!disableButton) {
            const file = current_version.files[0];
            downloadURL = file && file.url;

            if (!downloadURL) {
              console.debug(`no download URL for addonId=${addonId}`);
              disableButton = true;
            }
          }

          if (!disableButton && clientApp === 'android') {
            const isRecommended =
              promoted && promoted.apps.includes(clientApp)
                ? promoted.category === 'recommended'
                : false;

            if (!isRecommended || !current_version.compatibility[clientApp]) {
              console.debug(
                `add-on with addonId=${addonId} is not installable on Android`
              );
              disableButton = true;
            }
          }

          // TODO: we will need to check the min version since the max version
          // is usually not a problem (AMO does not disable the install button
          // when we are over the max version).
        }

        const getFirefoxButton = card.querySelector('.GetFirefoxButton');

        convertToInstallButton({
          getFirefoxButton,
          downloadURL,
          disableButton,
        });
      }
    } catch (e) {
      console.debug(`Error caught for addonId=${addonId}: ${e.message}`);
      convertToUnavailableCard(card);
    }
  };

  /* istanbul ignore else */
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
