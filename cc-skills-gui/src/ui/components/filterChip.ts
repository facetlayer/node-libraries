/**
 * FilterChip component - a toggleable chip for filtering.
 *
 * Usage from frontend JS:
 *   FilterChip.render(id, label, checked) -> HTML string
 *   FilterChip.bind(id, onChange) - bind change handler after DOM insert
 */
export function filterChipJs(): string {
  return `
const FilterChip = {
  /**
   * Render a filter chip as an HTML string.
   * @param {string} id - Unique id for the chip
   * @param {string} label - Display label
   * @param {boolean} checked - Whether the chip is active
   * @returns {string} HTML string
   */
  render(id, label, checked) {
    const activeClasses = checked
      ? 'bg-[#2a3a5c] border-purple-400 text-gray-200'
      : 'border-[#2a2a4a] text-[#8888aa] hover:border-[#4a4a6a] hover:text-[#c0c0d0]';
    return '<label class="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] cursor-pointer border transition-all select-none ' + activeClasses + '" id="chip-' + id + '">'
      + '<input type="checkbox" class="hidden" id="filter-' + id + '"' + (checked ? ' checked' : '') + '>'
      + esc(label)
      + '</label>';
  },

  /**
   * Bind a change handler to a filter chip after it's in the DOM.
   * @param {string} id - The chip id (matches render id)
   * @param {function} onChange - Called with (checked: boolean)
   */
  bind(id, onChange) {
    const checkbox = document.getElementById('filter-' + id);
    const chip = document.getElementById('chip-' + id);
    if (!checkbox || !chip) return;
    checkbox.addEventListener('change', () => {
      onChange(checkbox.checked);
    });
  }
};
`;
}
