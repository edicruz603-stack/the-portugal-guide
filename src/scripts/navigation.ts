/** Mobile navigation disclosure. Behaviour matches the legacy script, plus Escape and focus return. */
export function initNavigation(doc: Document = document): void {
  const button = doc.querySelector<HTMLButtonElement>('.menu-toggle');
  const nav = doc.querySelector<HTMLElement>('.main-nav');
  if (!button || !nav) return;
  const icon = button.querySelector('span');

  const set = (open: boolean) => {
    nav.classList.toggle('open', open);
    button.setAttribute('aria-expanded', String(open));
    button.setAttribute('aria-label', open ? 'Close navigation' : 'Open navigation');
    if (icon) icon.textContent = open ? '×' : '☰';
  };

  button.addEventListener('click', () => set(!nav.classList.contains('open')));
  nav.querySelectorAll('a').forEach((a) => a.addEventListener('click', () => set(false)));
  doc.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && nav.classList.contains('open')) {
      set(false);
      button.focus();
    }
  });
}
