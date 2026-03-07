/**
 * Dropdown component - renders a positioned dropdown menu.
 *
 * Usage from frontend JS:
 *   Dropdown.show(anchorEl, items)
 *   Dropdown.hide()
 *
 * Each item: { label: string, onClick: () => void }
 */
export function dropdownJs(): string {
  return `
const Dropdown = {
  _el: null,
  _outsideHandler: null,

  _getEl() {
    if (!this._el) {
      this._el = document.getElementById('dropdown-root');
    }
    return this._el;
  },

  /**
   * Show a dropdown menu anchored to an element.
   * @param {HTMLElement} anchorEl - Element to anchor the dropdown to
   * @param {Array<{label: string, onClick: function}>} items - Menu items
   */
  show(anchorEl, items) {
    this.hide();
    const root = this._getEl();
    const rect = anchorEl.getBoundingClientRect();

    let itemsHtml = '';
    items.forEach((item, i) => {
      itemsHtml += '<button data-dropdown-idx="' + i + '" class="w-full text-left px-3 py-1.5 text-xs text-gray-300 hover:bg-[#2a3a5c] hover:text-white transition-colors">'
        + esc(item.label) + '</button>';
    });

    root.innerHTML = '<div class="fixed inset-0 z-40" id="dropdown-backdrop"></div>'
      + '<div class="fixed z-50 bg-[#1e2940] border border-[#2a2a4a] rounded-md shadow-lg py-1 min-w-[140px]" '
      + 'style="top:' + rect.bottom + 'px; left:' + Math.min(rect.left, window.innerWidth - 160) + 'px;">'
      + itemsHtml + '</div>';

    root.classList.remove('hidden');

    // Bind item clicks
    root.querySelectorAll('[data-dropdown-idx]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const idx = parseInt(btn.dataset.dropdownIdx);
        this.hide();
        items[idx].onClick();
      });
    });

    // Close on backdrop click
    document.getElementById('dropdown-backdrop').addEventListener('click', (e) => {
      e.stopPropagation();
      this.hide();
    });
  },

  hide() {
    const root = this._getEl();
    root.classList.add('hidden');
    root.innerHTML = '';
  }
};
`;
}
