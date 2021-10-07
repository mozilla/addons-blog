/* eslint no-console: 0 */
/* global window, document, fetch, UAParser, navigator, mozCompare */
(function dynamicAddonCards() {
  const AMO_BASE_URL = 'https://addons.mozilla.org';
  // For amoTracking:
  const GET_FIREFOX_BUTTON_CLICK_ACTION = 'download-firefox-click';
  const GET_FIREFOX_BUTTON_CLICK_CATEGORY = 'AMO Download Firefox';
  const INSTALL_EXTENSION_CATEGORY = 'AMO Addon Installs';
  const INSTALL_THEME_CATEGORY = 'AMO Theme Installs';

  // `StaticAddonCard` elements can be marked as unavailable by adding a
  // special CSS class. The style as well as the content is already embedded.
  const convertToUnavailableCard = (card) => {
    card.classList.add('StaticAddonCard--is-unavailable');
  };

  const convertToInstallButton = ({
    addon,
    downloadURL,
    fileHash,
    getFirefoxButton,
    isIncompatible,
  }) => {
    getFirefoxButton.querySelector('.GetFirefoxButton-callout').remove();

    const button = getFirefoxButton.querySelector('.GetFirefoxButton-button');
    const isStaticTheme = addon.type === 'statictheme';

    button.classList.add('Button--action');
    // eslint-disable-next-line no-param-reassign
    button.innerText = isStaticTheme ? 'Install Theme' : 'Add to Firefox';
    button.setAttribute('href', downloadURL || '');

    if (isIncompatible) {
      button.classList.add('Button--disabled');
      button.setAttribute('aria-disabled', true);
      // We don't want to remove the URL pointing to the XPI in `href` (so that
      // power users can still download the XPI). This is why we have to abort
      // `click` events with a listener.
      button.addEventListener('click', (event) => {
        event.preventDefault();
      });
    } else if (
      typeof navigator !== 'undefined' &&
      typeof navigator.mozAddonManager !== 'undefined'
    ) {
      button.addEventListener('click', async (event) => {
        event.preventDefault();
        event.stopPropagation();

        try {
          const installObj = await navigator.mozAddonManager.createInstall({
            url: downloadURL,
            hash: fileHash,
          });

          await installObj.install();

          window.amoTracking.sendEvent({
            action: isStaticTheme ? 'statictheme' : 'addon',
            category: isStaticTheme
              ? INSTALL_THEME_CATEGORY
              : INSTALL_EXTENSION_CATEGORY,
            label: addon.guid,
          });
        } catch (e) {
          console.debug(
            `failed to install add-on with addonId=${addon.id}: ${e.message}`
          );
        }
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

      const addon = await response.json();

      const { name: browserName, version: browserVersion } =
        parsedUserAgent.getBrowser();
      const isFirefox = browserName === 'Firefox';

      const getFirefoxButton = card.querySelector('.GetFirefoxButton');

      if (isFirefox) {
        let isIncompatible = false;
        let downloadURL;
        let fileHash;

        // Firefox for iOS does not support add-ons.
        if (osName === 'iOS') {
          console.debug(
            `disabling install button for addonId=${addonId} because Firefox for iOS does not support add-ons`
          );
          isIncompatible = true;
        } else {
          const { current_version, promoted } = addon;

          if (!current_version || !current_version.file) {
            console.debug(`invalid current version for addonId=${addonId}`);
            isIncompatible = true;
          }

          if (!isIncompatible) {
            const file = current_version.file;
            downloadURL = file && file.url;
            fileHash = file && file.hash;

            if (!downloadURL) {
              console.debug(`no download URL for addonId=${addonId}`);
              isIncompatible = true;
            }

            if (!fileHash) {
              console.debug(`no file hash for addonId=${addonId}`);
              isIncompatible = true;
            }
          }

          if (!isIncompatible && clientApp === 'android') {
            const isInstallable =
              addon.type === 'extension' &&
              promoted &&
              promoted.apps.includes(clientApp) &&
              promoted.category === 'recommended';

            if (!isInstallable || !current_version.compatibility[clientApp]) {
              console.debug(
                `add-on with addonId=${addonId} is not installable on Android`
              );
              isIncompatible = true;
            }
          }

          if (!isIncompatible) {
            const compatibility =
              current_version.compatibility &&
              current_version.compatibility[clientApp];

            if (compatibility) {
              const { min: minVersion } = compatibility;

              // TODO: check maxVersion when `is_strict_compatibility_enabled: true`?

              // A result of `-1` means the first argument is a lower version
              // than the second.
              if (minVersion && mozCompare(browserVersion, minVersion) === -1) {
                console.debug(
                  `add-on with addonId=${addonId} is incompatible (under min version)`
                );
                isIncompatible = true;
              }
            } else {
              console.debug(
                `no compatibility data for clientApp=${clientApp} and addonId=${addonId}`
              );
              isIncompatible = true;
            }
          }
        }

        convertToInstallButton({
          addon,
          downloadURL,
          fileHash,
          getFirefoxButton,
          isIncompatible,
        });
      } else {
        getFirefoxButton
          .querySelector('.GetFirefoxButton-button')
          .addEventListener('click', () => {
            window.amoTracking.sendEvent({
              action: GET_FIREFOX_BUTTON_CLICK_ACTION,
              category: GET_FIREFOX_BUTTON_CLICK_CATEGORY,
              label: addon.guid,
            });
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
