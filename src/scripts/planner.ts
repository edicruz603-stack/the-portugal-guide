/** Sintra day planner — DOM wiring only. Rules live in src/lib/planner/legacy-plan.ts. */
import { buildPlan, renderPlanHtml } from '../lib/planner/legacy-plan.ts';

const buildButton = document.querySelector("#sc-build");
const result = document.querySelector<HTMLElement>("#sc-result");
if (buildButton && result) {
  buildButton.addEventListener("click", () => {
    const value = (id: string): string => document.querySelector<HTMLSelectElement>(id)?.value || "";
    const plan = buildPlan({
      days: value("#sc-days"), interest: value("#sc-interest"), pace: value("#sc-pace"),
      mobility: value("#sc-mobility"), transport: value("#sc-transport"), company: value("#sc-company"),
    });
    result.hidden = false;
    result.innerHTML = renderPlanHtml(plan);
    result.scrollIntoView({ behavior: "smooth", block: "nearest" });
  });
}
export {};
