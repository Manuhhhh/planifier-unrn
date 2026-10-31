import { useEffect, useState } from "react";
import { CURRICULUM } from "planner";
import type { StudyPlan } from "planner";
import { load, save } from "../storage.ts";
import type { Store } from "../storage.ts";

/** The saved plans, which one is selected, and the ways to change them. Persists on every change. */
export function usePlans() {
  const [store, setStore] = useState<Store>(() => load(CURRICULUM));
  useEffect(() => save(store), [store]);

  const plan = store.plans.find((entry) => entry.id === store.selectedId) ?? store.plans[0]!;

  return {
    plans: store.plans,
    plan,
    update: (next: StudyPlan) =>
      setStore((current) => ({
        ...current,
        plans: current.plans.map((entry) => (entry.id === next.id ? next : entry)),
      })),
    select: (selectedId: string) => setStore((current) => ({ ...current, selectedId })),
    add: (next: StudyPlan) =>
      setStore((current) => ({ plans: [...current.plans, next], selectedId: next.id })),
    remove: (id: string) =>
      setStore((current) => {
        if (current.plans.length <= 1) return current;
        const plans = current.plans.filter((entry) => entry.id !== id);
        return { plans, selectedId: plans[0]!.id };
      }),
  };
}
