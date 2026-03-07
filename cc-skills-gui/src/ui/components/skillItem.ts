/**
 * SkillItem component - renders a skill entry in the sidebar list.
 *
 * Usage from frontend JS:
 *   SkillItem.render(skill, isActive) -> HTML string
 */
export function skillItemJs(): string {
  return `
const SkillItem = {
  /**
   * Render a skill list item as an HTML string.
   * @param {object} skill - The skill object
   * @param {boolean} isActive - Whether this skill is currently selected
   * @returns {string} HTML string
   */
  render(skill, isActive) {
    const key = skillKey(skill);
    const baseCls = 'group flex items-center justify-between px-4 py-2 cursor-pointer text-[13px] transition-colors';
    const activeCls = isActive
      ? ' bg-[#2a3a5c] text-white border-l-[3px] border-purple-400 pl-[13px]'
      : ' text-[#c0c0d0] hover:bg-[#1f2b47]';

    return '<div class="' + baseCls + activeCls + '" data-key="' + escAttr(key) + '">'
      + '<div class="min-w-0 flex-1">'
      + '  <div class="font-medium truncate">' + esc(skill.name) + '</div>'
      + '  <div class="text-[11px] text-gray-500 truncate mt-0.5">' + esc(skill.dirName) + '</div>'
      + '</div>'
      + '<button class="skill-menu-btn opacity-0 group-hover:opacity-100 shrink-0 ml-2 p-1 rounded hover:bg-[#2a2a4a] text-gray-500 hover:text-gray-300 transition-all" data-menu-key="' + escAttr(key) + '" title="Actions">'
      + '  <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor"><circle cx="8" cy="3" r="1.5"/><circle cx="8" cy="8" r="1.5"/><circle cx="8" cy="13" r="1.5"/></svg>'
      + '</button>'
      + '</div>';
  }
};
`;
}
