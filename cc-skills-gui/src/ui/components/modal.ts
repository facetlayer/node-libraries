/**
 * Modal component - renders a centered modal dialog with backdrop.
 *
 * Usage from frontend JS:
 *   Modal.show({ title, body, onConfirm, confirmLabel, onCancel })
 *   Modal.hide()
 */
export function modalJs(): string {
  return `
const Modal = {
  _el: null,

  _getEl() {
    if (!this._el) {
      this._el = document.getElementById('modal-root');
    }
    return this._el;
  },

  /**
   * Show a modal dialog.
   * @param {object} opts
   * @param {string} opts.title - Modal title
   * @param {string} opts.body - HTML content for the modal body
   * @param {string} [opts.confirmLabel] - Label for the confirm button (default: "Confirm")
   * @param {function} [opts.onConfirm] - Called when confirm is clicked
   * @param {function} [opts.onCancel] - Called when cancel/backdrop is clicked
   */
  show(opts) {
    const root = this._getEl();
    root.innerHTML = ''
      + '<div class="fixed inset-0 z-50 flex items-center justify-center">'
      + '  <div class="fixed inset-0 bg-black/60" id="modal-backdrop"></div>'
      + '  <div class="relative z-10 bg-[#1e2940] border border-[#2a2a4a] rounded-lg shadow-xl w-full max-w-md mx-4">'
      + '    <div class="px-5 py-4 border-b border-[#2a2a4a]">'
      + '      <h2 class="text-sm font-semibold text-gray-200">' + esc(opts.title || '') + '</h2>'
      + '    </div>'
      + '    <div class="px-5 py-4" id="modal-body">' + (opts.body || '') + '</div>'
      + '    <div class="px-5 py-3 border-t border-[#2a2a4a] flex justify-end gap-2">'
      + '      <button id="modal-cancel" class="px-3 py-1.5 text-xs font-medium text-gray-400 hover:text-gray-200 rounded border border-[#2a2a4a] hover:border-[#4a4a6a] transition-colors">Cancel</button>'
      + '      <button id="modal-confirm" class="px-3 py-1.5 text-xs font-medium text-white bg-purple-500 hover:bg-purple-600 rounded transition-colors">' + esc(opts.confirmLabel || 'Confirm') + '</button>'
      + '    </div>'
      + '  </div>'
      + '</div>';

    root.classList.remove('hidden');

    const hide = () => this.hide();

    document.getElementById('modal-backdrop').addEventListener('click', () => {
      if (opts.onCancel) opts.onCancel();
      hide();
    });
    document.getElementById('modal-cancel').addEventListener('click', () => {
      if (opts.onCancel) opts.onCancel();
      hide();
    });
    document.getElementById('modal-confirm').addEventListener('click', () => {
      if (opts.onConfirm) opts.onConfirm();
    });

    // Focus first input if present
    const firstInput = root.querySelector('input');
    if (firstInput) firstInput.focus();

    // ESC to close
    this._escHandler = (e) => {
      if (e.key === 'Escape') {
        if (opts.onCancel) opts.onCancel();
        hide();
      }
    };
    document.addEventListener('keydown', this._escHandler);
  },

  hide() {
    const root = this._getEl();
    root.classList.add('hidden');
    root.innerHTML = '';
    if (this._escHandler) {
      document.removeEventListener('keydown', this._escHandler);
      this._escHandler = null;
    }
  }
};
`;
}
