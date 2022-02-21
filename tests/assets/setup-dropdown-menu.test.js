/* global window, document, MouseEvent */
const { buildHeader } = require('addons-frontend-blog-utils');

describe(__filename, () => {
  beforeAll(() => {
    document.body.innerHTML = `<body>${buildHeader()}</body>`;

    // This file has a side-effect.
    // eslint-disable-next-line global-require
    require('../../src/assets/js/setup-dropdown-menu');
  });

  beforeEach(() => {
    // Inject matchMedia into window to get media queries working, reseting
    // matches to true before each test since some of them are changing it.
    window.matchMedia = () => { return { matches: true } };
  });

  afterEach(() => {
    // Close the menu.
    document.querySelector('body').click();
  });

  it('opens the dropdown menu', () => {
    const menu = document.querySelector('.DropdownMenu');
    expect(menu.classList).not.toContain('DropdownMenu--active');

    // User clicks the "More..." button.
    menu.querySelector('.DropdownMenu-button').click();

    expect(menu.classList).toContain('DropdownMenu--active');
    expect(
      menu.querySelector('.DropdownMenu-items').getAttribute('aria-hidden')
    ).toEqual('false');
  });

  it('closes the menu when it is open', () => {
    const menu = document.querySelector('.DropdownMenu');

    // User clicks the "More..." button.
    menu.querySelector('.DropdownMenu-button').click();

    expect(menu.classList).toContain('DropdownMenu--active');

    // User clicks somewhere.
    document.querySelector('body').click();

    expect(menu.classList).not.toContain('DropdownMenu--active');
    expect(
      menu.querySelector('.DropdownMenu-items').getAttribute('aria-hidden')
    ).toEqual('true');
  });

  it('does nothing when menu is already closed', () => {
    const menu = document.querySelector('.DropdownMenu');

    document.querySelector('body').click();

    expect(menu.classList).not.toContain('DropdownMenu--active');
  });

  it('keeps the dropdown menu open when clicking on it', () => {
    const menu = document.querySelector('.DropdownMenu');
    expect(menu.classList).not.toContain('DropdownMenu--active');

    // User clicks the "More..." button.
    menu.querySelector('.DropdownMenu-button').click();

    expect(menu.classList).toContain('DropdownMenu--active');

    // User clicks somewhere on the submenu that is shown.
    menu.querySelector('.DropdownMenu-items').click();

    expect(menu.classList).toContain('DropdownMenu--active');
  });

  it('opens the dropdown menu on mouseover', () => {
    const menu = document.querySelector('.DropdownMenu');
    expect(menu.classList).not.toContain('DropdownMenu--active');

    // User moves cursor on the "More..." menu.
    menu.dispatchEvent(new MouseEvent('mouseover'));

    expect(menu.classList).toContain('DropdownMenu--active');
  });

  it('does not open the dropdown menu on mouseover if device does not support hover', () => {
    const menu = document.querySelector('.DropdownMenu');
    expect(menu.classList).not.toContain('DropdownMenu--active');

    window.matchMedia = () => { return { matches: false } };

    // User moves cursor on the "More..." menu.
    menu.dispatchEvent(new MouseEvent('mouseover'));

    expect(menu.classList).not.toContain('DropdownMenu--active');
  });

  it('closes the dropdown menu on mouseout', () => {
    const menu = document.querySelector('.DropdownMenu');
    // User clicks the "More..." button.
    menu.querySelector('.DropdownMenu-button').click();
    expect(menu.classList).toContain('DropdownMenu--active');

    // User moves cursor somewhere else.
    menu.dispatchEvent(new MouseEvent('mouseout'));

    expect(menu.classList).not.toContain('DropdownMenu--active');
  });

  it('does not close the dropdown menu on mouseout if device does not support hover', () => {
    const menu = document.querySelector('.DropdownMenu');

    window.matchMedia = () => { return { matches: false } };

    // User clicks the "More..." button.
    menu.querySelector('.DropdownMenu-button').click();
    expect(menu.classList).toContain('DropdownMenu--active');

    // User moves cursor somewhere else.
    menu.dispatchEvent(new MouseEvent('mouseout'));

    // Didn't change since device does not support hover: matchMedia returned no matches
    expect(menu.classList).toContain('DropdownMenu--active');
  });
});
