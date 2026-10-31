import { useEffect, useRef, useState } from "react";
import { CURRICULUM, clearPlan } from "planner";
import type { StudyPlan } from "planner";
import { downloadText } from "../download.ts";
import { MAX_PLAN_FILE_BYTES, parsePlanFile, planFileName, serializePlan } from "../planFile.ts";
import { newId } from "../storage.ts";
import { useConfirm } from "./Confirm.tsx";
import { StartPicker } from "./StartPicker.tsx";
import { Button, fieldClass, mutedClass, problemClass } from "./ui.tsx";

interface Props {
  plan: StudyPlan;
  canRemove: boolean;
  onChange: (plan: StudyPlan) => void;
  onDuplicate: (plan: StudyPlan) => void;
  onImport: (plan: StudyPlan) => void;
  onRemove: (id: string) => void;
}

const labelClass = `flex flex-col gap-1 text-sm ${mutedClass}`;

type Notice = { text: string; failed: boolean };

export function PlanToolbar({ plan, canRemove, onChange, onDuplicate, onImport, onRemove }: Props) {
  const confirm = useConfirm();
  const fileInput = useRef<HTMLInputElement>(null);
  const [notice, setNotice] = useState<Notice>();
  useEffect(() => {
    if (notice === undefined) return;
    const timer = setTimeout(() => setNotice(undefined), 6000);
    return () => clearTimeout(timer);
  }, [notice]);

  const importFile = async (file: File | undefined) => {
    if (file === undefined) return;
    if (file.size > MAX_PLAN_FILE_BYTES) {
      setNotice({ text: "El archivo es demasiado grande para ser un plan.", failed: true });
      return;
    }
    const result = parsePlanFile(await file.text(), CURRICULUM);
    if (!result.ok) {
      setNotice({ text: result.error, failed: true });
      return;
    }
    onImport(result.plan);
    const omitted =
      result.dropped > 0
        ? ` Se omitieron ${result.dropped} ${result.dropped === 1 ? "materia" : "materias"} que no existen en el plan de estudios.`
        : "";
    setNotice({
      text: `Se importó «${result.plan.name}» como un plan nuevo.${omitted}`,
      failed: false,
    });
  };

  const courseCount = plan.approved.length + plan.terms.reduce((sum, term) => sum + term.length, 0);
  const isEmpty = courseCount === 0 && plan.terms.length === 1;

  // Uncontrolled inputs keyed by the saved value: typing is free, the plan changes on blur.
  return (
    <form onSubmit={(event) => event.preventDefault()} className="flex flex-wrap items-end gap-4">
      <label className={labelClass}>
        Nombre
        <input
          key={`${plan.id}-${plan.name}`}
          type="text"
          maxLength={40}
          defaultValue={plan.name}
          onBlur={(event) => onChange({ ...plan, name: event.target.value.trim() || plan.name })}
          className={fieldClass}
        />
      </label>

      <div className={labelClass}>
        <span>Empieza en</span>
        <StartPicker plan={plan} onChange={onChange} />
      </div>

      <span className="flex gap-2">
        <Button
          onClick={() =>
            onDuplicate({
              ...plan,
              id: newId(),
              name: `${plan.name} (copia)`,
              approved: [...plan.approved],
              terms: plan.terms.map((courses) => [...courses]),
            })
          }
        >
          Duplicar
        </Button>
        <Button onClick={() => downloadText(planFileName(plan), serializePlan(plan))}>
          Exportar
        </Button>
        <Button onClick={() => fileInput.current?.click()}>Importar</Button>
        <Button
          disabled={isEmpty}
          onClick={async () => {
            const confirmed = await confirm({
              title: `¿Vaciar «${plan.name}»?`,
              message:
                courseCount > 0
                  ? `Se quitan las ${courseCount} ${courseCount === 1 ? "materia" : "materias"} del plan y se vuelve al primer cuatrimestre. No se puede deshacer.`
                  : "Se quitan los cuatrimestres y se vuelve al primero.",
              confirmLabel: "Vaciar plan",
            });
            if (confirmed) onChange(clearPlan(plan));
          }}
        >
          Vaciar
        </Button>
        <Button
          disabled={!canRemove}
          onClick={async () => {
            const confirmed = await confirm({
              title: `¿Eliminar «${plan.name}»?`,
              message: "Se pierde el plan con todos sus cuatrimestres. No se puede deshacer.",
              confirmLabel: "Eliminar plan",
            });
            if (confirmed) onRemove(plan.id);
          }}
        >
          Eliminar plan
        </Button>
      </span>

      <input
        ref={fileInput}
        type="file"
        accept=".json,application/json"
        hidden
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = "";
          void importFile(file);
        }}
      />
      {notice && (
        <p
          role={notice.failed ? "alert" : "status"}
          className={`basis-full text-sm ${notice.failed ? problemClass : mutedClass}`}
        >
          {notice.text}
        </p>
      )}
    </form>
  );
}
