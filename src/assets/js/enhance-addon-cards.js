/* global document, fetch, UAParser, navigator */
/* eslint no-console: 0 */
(function enhanceAddonCards() {
  const convertToInstallButton = ({ button, downloadURL }) => {
    button.classList.remove('Button--confirm');
    button.classList.add('Button--action');
    // eslint-disable-next-line no-param-reassign
    button.innerText = 'Add to Firefox';
    button.setAttribute('href', downloadURL);
  };

  const convertToUnavailableCard = ({ card }) => {
    card.classList.add('StaticAddonCard--is-unavailable');
  };

  const parser = new UAParser();
  const { name: browserName } = parser.getBrowser();
  const { name: osName } = parser.getOS();

  const couldInstallAddons = browserName === 'Firefox' && osName !== 'iOS';
  const clientApp = osName === 'Android' ? 'android' : 'firefox';

  document.querySelectorAll('.StaticAddonCard').forEach(async (card) => {
    const { addonId } = card.dataset;

    if (!addonId) {
      console.log(`found an add-on card without an addonId`);
      return;
    }

    try {
      const response = await fetch(
        `https://addons.mozilla.org/api/v5/addons/addon/${addonId}/?app=${clientApp}`
      );

      if (!response.ok) {
        console.log(`failed to fetch add-on with addonId=${addonId}`);
        convertToUnavailableCard({ card });

        return;
      }

      if (couldInstallAddons) {
        const button = card.querySelector('.GetFirefoxButton');

        if (button) {
          const { current_version, promoted } = await response.json();

          let disabled = false;
          if (!current_version || !current_version.files) {
            console.log(`invalid current version for addonId=${addonId}`);
            disabled = true;
          }

          const file = current_version.files[0];
          const downloadURL = file && file.url;

          if (!downloadURL) {
            disabled = true;
          }

          convertToInstallButton({ button, downloadURL });

          if (clientApp === 'android') {
            const isRecommended =
              promoted && promoted.apps.includes(clientApp)
                ? promoted.category === 'recommended'
                : false;

            if (
              !isRecommended ||
              !current_version ||
              !current_version.compatibility[clientApp]
            ) {
              console.log(
                `add-on with addonId=${addonId} is not installable on Android`
              );
              disabled = true;
            }
          }

          // TODO: check min-version

          if (disabled) {
            button.classList.add('Button--disabled');
            button.setAttribute('disabled', true);
          } else {
            button.addEventListener('click', async (event) => {
              const mozAddonManager = navigator && navigator.mozAddonManager;

              if (mozAddonManager) {
                event.preventDefault();

                const installObj = await mozAddonManager.createInstall({
                  url: downloadURL,
                  hash: file && file.hash,
                });

                try {
                  await installObj.install();
                } catch (e) {
                  console.log(
                    `Failed to install add-on with addonId=${addonId}`
                  );
                }
              }
            });
          }
        } else {
          console.log(`could not find Firefox button for addonId=${addonId}`);
        }
      }
    } catch (e) {
      console.log(`Error caught for addonId=${addonId}: ${e.message}`);
      convertToUnavailableCard({ card });
    }
  });
})();
