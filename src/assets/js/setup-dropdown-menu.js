/* global document */
(function setupDropdownMenu() {
  if (document.querySelector('.DropdownMenu')) {
    document.addEventListener('click', (event) => {
      const dropdownMenu = document.querySelector('.DropdownMenu');

      const { target } = event;
      const { parentElement } = target;

      if (
        (target.matches('.DropdownMenu-button') ||
          parentElement.matches('.DropdownMenu-button')) &&
        !dropdownMenu.classList.contains('DropdownMenu--active')
      ) {
        dropdownMenu.classList.add('DropdownMenu--active');
        dropdownMenu
          .querySelector('.DropdownMenu-items')
          .setAttribute('aria-hidden', false);
      } else if (
        target.getAttribute('aria-label') !== 'submenu' &&
        parentElement.getAttribute('aria-label') !== 'submenu' &&
        dropdownMenu.classList.contains('DropdownMenu--active')
      ) {
        dropdownMenu.classList.remove('DropdownMenu--active');
        dropdownMenu
          .querySelector('.DropdownMenu-items')
          .setAttribute('aria-hidden', true);
      }
    });
  }
})();
