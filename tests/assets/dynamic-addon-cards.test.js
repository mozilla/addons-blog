/**
 * @jest-environment jsdom
 */
/* global document, window, navigator */
const nodeCrypto = require('crypto');

const { buildStaticAddonCard } = require('addons-frontend-blog-utils/web');
const UAParser = require('ua-parser-js');
const { mozCompare } = require('addons-moz-compare');

const {
  convertToUnavailableCard,
  updateAddonCard,
} = require('../../src/assets/js/dynamic-addon-cards');
const tabbyAddon = require('../fixtures/amo-api-response-tabby');

describe(__filename, () => {
  // A polyfill for `crypto.getRandomValues()` needed by the `uuid` library
  // (embedded in `addons-frontend-blog-utils`). Major browsers implement this
  // API already, it is only a problem with jsdom.
  //
  // See: https://github.com/jsdom/jsdom/issues/1612
  global.crypto = {
    getRandomValues: (buffer) => {
      return nodeCrypto.randomFillSync(buffer);
    },
  };

  const mockFetch = ({ ok = true, jsonData = {} } = {}) => {
    return jest.spyOn(global, 'fetch').mockResolvedValue({
      ok,
      json: jest.fn().mockResolvedValue(jsonData),
    });
  };

  // The code we want to test in this file requires some HTML with static
  // add-on cards. We can reuse the code that we are using at build time here,
  // except that we mock the API call to generate a static add-on card in a
  // predictable manner.
  const loadStaticAddonCardInDocument = async ({
    addon = tabbyAddon,
    baseApiUrl,
  } = {}) => {
    const fetch = mockFetch({ jsonData: addon });
    const staticCard = await buildStaticAddonCard({ addonId: addon.id });
    fetch.mockRestore();

    // Inject mozCompare implementation.
    window.mozCompare = mozCompare;
    // Inject a fake amoTracking object.
    window.amoTracking = { sendEvent: jest.fn() };

    document.body.innerHTML = `<div>${staticCard}</div>`;
    if (baseApiUrl) {
      document.body.dataset.baseApiUrl = baseApiUrl;
    }

    return document.querySelector('.StaticAddonCard');
  };

  // This is used when we need to wait for all promises, e.g., when promises
  // are executed in an event handler (which we cannot `await` directly).
  const flushPromises = () =>
    new Promise((resolve) => {
      setTimeout(resolve, 0);
    });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('convertToUnavailableCard', () => {
    it('changes the state of a card to "unavailable"', async () => {
      const card = await loadStaticAddonCardInDocument();
      expect(card.classList).not.toContain('StaticAddonCard--is-unavailable');

      convertToUnavailableCard(card);

      expect(card.classList).toContain('StaticAddonCard--is-unavailable');
    });
  });

  describe('updateAddonCard', () => {
    const devAPIUrl = 'https://addons-dev.allizom.org';
    const prodAPIUrl = 'https://addons.mozilla.org';
    const userAgentsByPlatform = {
      android: {
        firefox130:
          'Mozilla/5.0 (Android 9; Mobile; rv:130.0) Gecko/70.0 Firefox/130.0',
      },
      mac: {
        chrome41:
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_10_1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/41.0.2227.1 Safari/537.36',
        firefox129:
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.13; rv:129.0) Gecko/20100101 Firefox/129.0',
      },
      ios: {
        firefox1iPad:
          'Mozilla/5.0 (iPad; CPU iPhone OS 8_3 like Mac OS X) AppleWebKit/600.1.4 (KHTML, like Gecko) FxiOS/1.0 Mobile/12F69 Safari/600.1.4',
      },
    };

    const _updateAddonCard = (
      card,
      { userAgent = userAgentsByPlatform.mac.chrome41 } = {}
    ) => {
      const parsedUserAgent = new UAParser(userAgent);

      return updateAddonCard(card, { parsedUserAgent });
    };

    const expectDisabledInstallButton = ({ getFirefoxButton, downloadURL }) => {
      const button = getFirefoxButton.querySelector('.GetFirefoxButton-button');

      expect(button.classList).toContain('Button--disabled');
      expect(button.getAttribute('aria-disabled')).toEqual('true');
      expect(button.getAttribute('href')).toEqual(downloadURL);

      const event = new window.MouseEvent('click');
      const preventDefaultSpy = jest.spyOn(event, 'preventDefault');
      button.dispatchEvent(event);
      expect(preventDefaultSpy).toHaveBeenCalled();
    };

    const expectEnabledInstallButton = ({ getFirefoxButton }) => {
      const button = getFirefoxButton.querySelector('.GetFirefoxButton-button');
      expect(button.classList).not.toContain('Button--disabled');
    };

    it('calls the AMO API', async () => {
      const addon = { ...tabbyAddon };
      const card = await loadStaticAddonCardInDocument({
        addon,
        baseApiUrl: prodAPIUrl,
      });
      const fetch = mockFetch({ jsonData: addon });

      await _updateAddonCard(card);

      expect(fetch).toHaveBeenCalledWith(
        `https://addons.mozilla.org/api/v5/addons/addon/${addon.id}/?lang=en-US&app=firefox`
      );
    });

    it(`calls the API as configured on the document's body tag for dev`, async () => {
      const addon = { ...tabbyAddon };
      const card = await loadStaticAddonCardInDocument({
        addon,
        baseApiUrl: devAPIUrl,
      });
      const fetch = mockFetch({ jsonData: addon });

      await _updateAddonCard(card);

      expect(fetch).toHaveBeenCalledWith(
        `${devAPIUrl}/api/v5/addons/addon/${addon.id}/?lang=en-US&app=firefox`
      );
    });

    it('sets the app to firefox when OS is not Android', async () => {
      const card = await loadStaticAddonCardInDocument();
      const fetch = mockFetch();

      await _updateAddonCard(card, {
        userAgent: userAgentsByPlatform.mac.firefox129,
      });

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('?lang=en-US&app=firefox')
      );
    });

    it('sets the app to android when OS is Android', async () => {
      const card = await loadStaticAddonCardInDocument();
      const fetch = mockFetch();

      await _updateAddonCard(card, {
        userAgent: userAgentsByPlatform.android.firefox130,
      });

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('?lang=en-US&app=android')
      );
    });

    it('changes the state of a card to "unavailable" when the addonId is missing', async () => {
      const card = await loadStaticAddonCardInDocument();
      delete card.dataset.addonId;
      const fetch = mockFetch();

      await _updateAddonCard(card);

      expect(fetch).not.toHaveBeenCalled();
      expect(card.classList).toContain('StaticAddonCard--is-unavailable');
    });

    it('changes the state of a card to "unavailable" when the response is not OK', async () => {
      const card = await loadStaticAddonCardInDocument();
      mockFetch({ ok: false });

      await _updateAddonCard(card);

      expect(card.classList).toContain('StaticAddonCard--is-unavailable');
    });

    it('sends a GA event when the "download FF" button is clicked', async () => {
      const guid = 'some guid';
      const addon = {
        ...tabbyAddon,
        guid,
      };
      const card = await loadStaticAddonCardInDocument({ addon });
      mockFetch({ jsonData: addon });
      await _updateAddonCard(card);
      const getFirefoxButton = card.querySelector('.GetFirefoxButton-button');

      getFirefoxButton.click();
      await flushPromises();

      expect(window.amoTracking.sendEvent).toHaveBeenCalledWith({
        action: 'download-firefox-click',
        category: 'AMO Download Firefox',
        label: guid,
      });
    });

    it('converts the "GetFirefox" button to an install button when UserAgent is Firefox', async () => {
      const downloadURL = 'https://example.org/addon.xpi';
      const addon = {
        ...tabbyAddon,
        current_version: {
          ...tabbyAddon.current_version,
          file: { ...tabbyAddon.current_version.file, url: downloadURL },
        },
      };
      const card = await loadStaticAddonCardInDocument({ addon });
      const getFirefoxButton = card.querySelector('.GetFirefoxButton');
      mockFetch({ jsonData: addon });

      expect(
        getFirefoxButton.querySelector('.GetFirefoxButton-callout')
      ).not.toBeNull();

      await _updateAddonCard(card, {
        userAgent: userAgentsByPlatform.mac.firefox129,
      });

      expect(
        getFirefoxButton.querySelector('.GetFirefoxButton-callout')
      ).toBeNull();

      const button = getFirefoxButton.querySelector('.GetFirefoxButton-button');
      expect(button.classList).toContain('Button--action');
      expect(button.innerText).toEqual('Add to Firefox');
      expect(button.getAttribute('href')).toEqual(downloadURL);
    });

    it('sets a different button name when add-on is a static theme', async () => {
      const addon = { ...tabbyAddon, type: 'statictheme' };
      const card = await loadStaticAddonCardInDocument({ addon });
      const getFirefoxButton = card.querySelector('.GetFirefoxButton');
      mockFetch({ jsonData: addon });

      await _updateAddonCard(card, {
        userAgent: userAgentsByPlatform.mac.firefox129,
      });

      const button = getFirefoxButton.querySelector('.GetFirefoxButton-button');
      expect(button.innerText).toEqual('Install Theme');
    });

    it('disables the install button for Firefox for iOS', async () => {
      const card = await loadStaticAddonCardInDocument();
      const getFirefoxButton = card.querySelector('.GetFirefoxButton');
      mockFetch();

      await _updateAddonCard(card, {
        userAgent: userAgentsByPlatform.ios.firefox1iPad,
      });

      expectDisabledInstallButton({ getFirefoxButton, downloadURL: '' });
    });

    it('disables the install button when there is no current version', async () => {
      const addon = { ...tabbyAddon, current_version: null };
      const card = await loadStaticAddonCardInDocument({ addon });
      const getFirefoxButton = card.querySelector('.GetFirefoxButton');
      mockFetch({ jsonData: addon });

      await _updateAddonCard(card, {
        userAgent: userAgentsByPlatform.mac.firefox129,
      });

      expectDisabledInstallButton({ getFirefoxButton, downloadURL: '' });
    });

    it('disables the install button when there is no download URL', async () => {
      const addon = {
        ...tabbyAddon,
        current_version: {
          ...tabbyAddon.current_version,
          file: { ...tabbyAddon.current_version.file, url: null },
        },
      };
      const card = await loadStaticAddonCardInDocument({ addon });
      const getFirefoxButton = card.querySelector('.GetFirefoxButton');
      mockFetch({ jsonData: addon });

      await _updateAddonCard(card, {
        userAgent: userAgentsByPlatform.mac.firefox129,
      });

      expectDisabledInstallButton({ getFirefoxButton, downloadURL: '' });
    });

    it('disables the install button when there is no file hash', async () => {
      const addon = {
        ...tabbyAddon,
        current_version: {
          ...tabbyAddon.current_version,
          file: { ...tabbyAddon.current_version.file, hash: null },
        },
      };
      const card = await loadStaticAddonCardInDocument({ addon });
      const getFirefoxButton = card.querySelector('.GetFirefoxButton');
      mockFetch({ jsonData: addon });

      await _updateAddonCard(card, {
        userAgent: userAgentsByPlatform.mac.firefox129,
      });

      expectDisabledInstallButton({
        getFirefoxButton,
        downloadURL: addon.current_version.file.url,
      });
    });

    it('enables the install button when add-on is recommended for Firefox', async () => {
      const addon = {
        ...tabbyAddon,
        promoted: [
          {
            apps: ['firefox'],
            category: 'recommended',
          },
        ],
      };
      const card = await loadStaticAddonCardInDocument({ addon });
      const getFirefoxButton = card.querySelector('.GetFirefoxButton');
      mockFetch({ jsonData: addon });

      await _updateAddonCard(card, {
        userAgent: userAgentsByPlatform.mac.firefox129,
      });

      expectEnabledInstallButton({ getFirefoxButton });
    });

    describe('Firefox for Android', () => {
      it('enables the install button when add-on is not promoted', async () => {
        const addon = { ...tabbyAddon, promoted: null };
        const card = await loadStaticAddonCardInDocument({ addon });
        const getFirefoxButton = card.querySelector('.GetFirefoxButton');
        mockFetch({ jsonData: addon });

        await _updateAddonCard(card, {
          userAgent: userAgentsByPlatform.android.firefox130,
        });

        expectEnabledInstallButton({ getFirefoxButton });
      });

      it('enables the install button when add-on is not recommended for Android', async () => {
        const addon = {
          ...tabbyAddon,
          promoted: [
            {
              apps: ['firefox'],
              category: 'recommended',
            },
          ],
        };
        const card = await loadStaticAddonCardInDocument({ addon });
        const getFirefoxButton = card.querySelector('.GetFirefoxButton');
        mockFetch({ jsonData: addon });

        await _updateAddonCard(card, {
          userAgent: userAgentsByPlatform.android.firefox130,
        });

        expectEnabledInstallButton({ getFirefoxButton });
      });

      it('enables the install button when add-on is promoted for Android but not recommended', async () => {
        const addon = {
          ...tabbyAddon,
          promoted: [
            {
              apps: ['android'],
              category: 'line',
            },
          ],
        };
        const card = await loadStaticAddonCardInDocument({ addon });
        const getFirefoxButton = card.querySelector('.GetFirefoxButton');
        mockFetch({ jsonData: addon });

        await _updateAddonCard(card, {
          userAgent: userAgentsByPlatform.android.firefox130,
        });

        expectEnabledInstallButton({ getFirefoxButton });
      });

      it('disables the install button when add-on is recommended for Android but there is no compatibility data', async () => {
        const addon = {
          ...tabbyAddon,
          current_version: {
            ...tabbyAddon.current_version,
            compatibility: {},
          },
          promoted: [
            {
              apps: ['android'],
              category: 'recommended',
            },
          ],
        };
        const card = await loadStaticAddonCardInDocument({ addon });
        const getFirefoxButton = card.querySelector('.GetFirefoxButton');
        mockFetch({ jsonData: addon });

        await _updateAddonCard(card, {
          userAgent: userAgentsByPlatform.android.firefox130,
        });

        expectDisabledInstallButton({
          getFirefoxButton,
          downloadURL: addon.current_version.file.url,
        });
      });

      it('disables the install button when add-on is recommended but there is no compatibility data', async () => {
        const addon = {
          ...tabbyAddon,
          current_version: {
            ...tabbyAddon.current_version,
            compatibility: {},
          },
        };
        const card = await loadStaticAddonCardInDocument({ addon });
        const getFirefoxButton = card.querySelector('.GetFirefoxButton');
        mockFetch({ jsonData: addon });

        await _updateAddonCard(card, {
          userAgent: userAgentsByPlatform.mac.firefox129,
        });

        expectDisabledInstallButton({
          getFirefoxButton,
          downloadURL: addon.current_version.file.url,
        });
      });

      it('disables the install button when add-on is recommended for Android but not an extension', async () => {
        const addon = {
          ...tabbyAddon,
          type: 'statictheme',
          promoted: [
            {
              apps: ['android'],
              category: 'recommended',
            },
          ],
        };
        const card = await loadStaticAddonCardInDocument({ addon });
        const getFirefoxButton = card.querySelector('.GetFirefoxButton');
        mockFetch({ jsonData: addon });

        await _updateAddonCard(card, {
          userAgent: userAgentsByPlatform.android.firefox130,
        });

        expectDisabledInstallButton({
          getFirefoxButton,
          downloadURL: addon.current_version.file.url,
        });
      });

      it('enables the install button when add-on is recommended for Android', async () => {
        const addon = {
          ...tabbyAddon,
          promoted: [
            {
              apps: ['android'],
              category: 'recommended',
            },
          ],
        };
        const card = await loadStaticAddonCardInDocument({ addon });
        const getFirefoxButton = card.querySelector('.GetFirefoxButton');
        mockFetch({ jsonData: addon });

        await _updateAddonCard(card, {
          userAgent: userAgentsByPlatform.android.firefox130,
        });

        expectEnabledInstallButton({ getFirefoxButton });
      });
    });

    describe('mozAddonManager', () => {
      let fakeInstallObj;
      let fakeMozAddonManager;
      let originalNavigator;

      beforeEach(() => {
        originalNavigator = { ...navigator };
        fakeInstallObj = { install: jest.fn() };
        fakeMozAddonManager = {
          createInstall: jest.fn().mockReturnValue(fakeInstallObj),
        };
        navigator.mozAddonManager = fakeMozAddonManager;
      });

      afterEach(() => {
        global.navigator = originalNavigator;
      });

      const loadAndUpdateAddonCard = async ({
        url = 'some url',
        hash = 'some hash',
        ...addonProps
      } = {}) => {
        const addon = {
          ...tabbyAddon,
          ...addonProps,
          current_version: {
            ...tabbyAddon.current_version,
            file: {
              ...tabbyAddon.current_version.file,
              url,
              hash,
            },
          },
          promoted: [
            {
              apps: ['android'],
              category: 'recommended',
            },
          ],
        };
        // Render the static addon-card card, which makes 1 API call.
        const card = await loadStaticAddonCardInDocument({ addon });

        // Mock `fech` again for the 2nd API call made by the JavaScript code
        // tested in this file (which updates the static card).
        mockFetch({ jsonData: addon });

        // Update the add-on card.
        await _updateAddonCard(card, {
          userAgent: userAgentsByPlatform.mac.firefox129,
        });

        return {
          getFirefoxButton: card.querySelector('.GetFirefoxButton'),
          installButton: card.querySelector('.GetFirefoxButton-button'),
        };
      };

      it('calls mozAddonManager to install an add-on when compatible', async () => {
        const url = 'https://example.org/addon.xpi';
        const hash = 'some hash';
        const { installButton } = await loadAndUpdateAddonCard({
          url,
          hash,
        });
        const event = new window.MouseEvent('click');
        const preventDefaultSpy = jest.spyOn(event, 'preventDefault');
        const stopPropagationSpy = jest.spyOn(event, 'stopPropagation');

        // User clicks the install button to install the add-on.
        installButton.dispatchEvent(event);
        await flushPromises();

        expect(preventDefaultSpy).toHaveBeenCalled();
        expect(stopPropagationSpy).toHaveBeenCalled();
        expect(fakeMozAddonManager.createInstall).toHaveBeenCalledWith({
          url,
          hash,
        });
        expect(fakeInstallObj.install).toHaveBeenCalled();
      });

      it('sends a GA event when an extension is installed', async () => {
        const guid = 'some-guid';
        const { installButton } = await loadAndUpdateAddonCard({ guid });

        // User clicks the install button to install the add-on.
        installButton.click();
        await flushPromises();

        expect(window.amoTracking.sendEvent).toHaveBeenCalledWith({
          action: 'addon',
          category: 'AMO Addon Installs',
          label: guid,
        });
      });

      it('sends a GA event when a static theme is installed', async () => {
        const guid = 'some-guid';
        const type = 'statictheme';
        const { installButton } = await loadAndUpdateAddonCard({ guid, type });

        // User clicks the install button to install the add-on.
        installButton.click();
        await flushPromises();

        expect(window.amoTracking.sendEvent).toHaveBeenCalledWith({
          action: type,
          category: 'AMO Theme Installs',
          label: guid,
        });
      });

      it('does not create a listener when navigator is not available', async () => {
        delete global.navigator;

        const { getFirefoxButton } = await loadAndUpdateAddonCard();

        expectEnabledInstallButton({ getFirefoxButton });
      });

      it('does not create a listener when mozAddonManager is not available', async () => {
        delete navigator.mozAddonManager;

        const { getFirefoxButton } = await loadAndUpdateAddonCard();

        expectEnabledInstallButton({ getFirefoxButton });
      });

      it('handles install errors', async () => {
        expect.assertions(1);
        jest.spyOn(console, 'debug').mockImplementation((e) => {
          expect(e).toEqual(
            'failed to install add-on with addonId=502774: an error'
          );
        });
        navigator.mozAddonManager.createInstall = jest.fn().mockResolvedValue({
          install: () => Promise.reject(new Error('an error')),
        });
        const { installButton } = await loadAndUpdateAddonCard();

        installButton.click();
        await flushPromises();
      });
    });

    describe('compatibility', () => {
      it('disables the install button when Firefox version is under min version', async () => {
        const addon = {
          ...tabbyAddon,
          current_version: {
            ...tabbyAddon.current_version,
            compatibility: {
              firefox: {
                min: '130.0',
                max: '*',
              },
            },
          },
        };
        const card = await loadStaticAddonCardInDocument({ addon });
        const getFirefoxButton = card.querySelector('.GetFirefoxButton');
        mockFetch({ jsonData: addon });

        await _updateAddonCard(card, {
          userAgent: userAgentsByPlatform.mac.firefox129,
        });

        expectDisabledInstallButton({
          getFirefoxButton,
          downloadURL: addon.current_version.file.url,
        });
      });

      it('disables the install button when there is no compatibility data', async () => {
        const addon = {
          ...tabbyAddon,
          current_version: {
            ...tabbyAddon.current_version,
            compatibility: {},
          },
        };
        const card = await loadStaticAddonCardInDocument({ addon });
        const getFirefoxButton = card.querySelector('.GetFirefoxButton');
        mockFetch({ jsonData: addon });

        await _updateAddonCard(card, {
          userAgent: userAgentsByPlatform.mac.firefox129,
        });

        expectDisabledInstallButton({
          getFirefoxButton,
          downloadURL: addon.current_version.file.url,
        });
      });

      it('enables the install button when Firefox version is above min version', async () => {
        const addon = {
          ...tabbyAddon,
          current_version: {
            ...tabbyAddon.current_version,
            compatibility: {
              firefox: {
                min: '60.0',
                max: '*',
              },
            },
          },
        };
        const card = await loadStaticAddonCardInDocument({ addon });
        const getFirefoxButton = card.querySelector('.GetFirefoxButton');
        mockFetch({ jsonData: addon });

        await _updateAddonCard(card, {
          userAgent: userAgentsByPlatform.mac.firefox129,
        });

        expectEnabledInstallButton({ getFirefoxButton });
      });
    });
  });
});
