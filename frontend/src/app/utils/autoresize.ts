// frontend/src/app/utils/autoresize.ts
// Grows a <textarea> to fit its content (like this chat box), capped at
// maxHeight so a long paste doesn't take over the screen — scrolls inside
// itself past that point instead.

export function autoResizeTextarea(el: HTMLTextAreaElement, maxHeight = 120) {
  el.style.height = 'auto';
  el.style.height = `${Math.min(el.scrollHeight, maxHeight)}px`;
}
