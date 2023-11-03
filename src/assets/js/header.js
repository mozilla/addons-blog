/* global window, document, UAParser */
(function header() {
  const setupDropdownMenu = () => {
    const openDropDownMenu = (menu) => {
      menu.classList.add('DropdownMenu--active');
      menu
        .querySelector('.DropdownMenu-items')
        .setAttribute('aria-hidden', false);
    };

    const closeDropDownMenu = (menu) => {
      menu.classList.remove('DropdownMenu--active');
      menu
        .querySelector('.DropdownMenu-items')
        .setAttribute('aria-hidden', true);
    };

    const dropdownMenu = document.querySelector('.DropdownMenu');

    if (dropdownMenu) {
      document.addEventListener('click', (event) => {
        const { target } = event;
        const { parentElement } = target;

        if (
          (target.matches('.DropdownMenu-button') ||
            parentElement.matches('.DropdownMenu-button')) &&
          !dropdownMenu.classList.contains('DropdownMenu--active')
        ) {
          openDropDownMenu(dropdownMenu);
        } else if (
          target.getAttribute('aria-label') !== 'submenu' &&
          parentElement.getAttribute('aria-label') !== 'submenu' &&
          dropdownMenu.classList.contains('DropdownMenu--active')
        ) {
          closeDropDownMenu(dropdownMenu);
        }
      });

      dropdownMenu.addEventListener('mouseover', () => {
        if (
          window &&
          window.matchMedia('(hover)').matches &&
          !dropdownMenu.classList.contains('DropdownMenu--active')
        ) {
          openDropDownMenu(dropdownMenu);
        }
      });

      dropdownMenu.addEventListener('mouseout', () => {
        if (
          window &&
          window.matchMedia('(hover)').matches &&
          dropdownMenu.classList.contains('DropdownMenu--active')
        ) {
          closeDropDownMenu(dropdownMenu);
        }
      });
    }
  };

  const updateHeader = ({ parsedUserAgent }) => {
    const { name: osName } = parsedUserAgent.getOS();

    if (osName !== 'Android') {
      setupDropdownMenu();
    } else {
      const $header = document.querySelector('.Header');

      if ($header) {
        $header.classList.add('Header--no-section-links');
        $header.querySelector('.Header-SectionLinks').remove();
      }
    }
  };

  /* istanbul ignore else */
  if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
    module.exports = {
      updateHeader,
    };
  } else {
    updateHeader({ parsedUserAgent: new UAParser() });
  }
})();
