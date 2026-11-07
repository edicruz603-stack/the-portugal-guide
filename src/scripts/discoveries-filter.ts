/** Filter + search for the Sintra discoveries directory. Logic unchanged from the legacy page; typed and announced politely. */
const buttons = document.querySelectorAll<HTMLButtonElement>('[data-filter]');
const items = [...document.querySelectorAll<HTMLElement>('.place')];
const search = document.getElementById('search') as HTMLInputElement | null;
const count = document.getElementById('count');
let filter = 'all';

function apply(): void {
  if (!search || !count) return;
  const q = search.value.trim().toLowerCase();
  let n = 0;
  items.forEach((el) => {
    const ok = (filter === 'all' || el.dataset.type === filter) && (el.dataset.search ?? '').includes(q);
    el.hidden = !ok;
    if (ok) n++;
  });
  count.textContent = n + ' curated stops shown';
}

buttons.forEach((b) =>
  b.addEventListener('click', () => {
    filter = b.dataset.filter ?? 'all';
    buttons.forEach((x) => {
      x.classList.toggle('active', x === b);
      x.setAttribute('aria-pressed', String(x === b));
    });
    apply();
  }),
);
search?.addEventListener('input', apply);
count?.setAttribute('aria-live', 'polite');
