// Values point at the CSS custom properties defined in tailwind.css's
// @theme block (redefined under .dark for dark mode) instead of literal hex
// — that's what makes every component using C.xxx via inline styles react
// to the Settings dark-mode toggle without each file needing its own
// dark: variant. hanko has no themed token (danger/badge accent) and stays
// static; it reads fine unchanged on both palettes.
export const C = {
  ink: "var(--color-jz-ink)", paper: "var(--color-jz-bg)", card: "var(--color-jz-card)",
  green: "var(--color-jz-teal)", greenSoft: "var(--color-jz-tealTint)", hanko: "#C43A2F",
  amber: "var(--color-jz-gold)", line: "var(--color-jz-line)", sub: "var(--color-jz-soft)",
};
export const font = { fontFamily: "'DM Sans','Helvetica Neue',system-ui,sans-serif" };
export const display = { fontFamily: "'Fraunces',Georgia,serif" };
