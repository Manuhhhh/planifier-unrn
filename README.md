# Planificador de cursada UNRN

Web app to plan the order in which to take the courses of the **Licenciatura en Sistemas (Plan 2022, UNRN Sede Atlántica)**, respecting the official correlatives. The interface is in Spanish.

- `packages/planner`: pure TypeScript domain. The 38 courses and their correlatives, the manual plan model (add, remove, step through cuatrimestres, coherence checks), the search over course contents and the relations between courses.
- `apps/website`: React + Tailwind UI.

## How it works

- You build one or more plans by hand. Each plan starts in a cuatrimestre you choose; `◀ Anterior` / `Siguiente ▶` move through them, and a cuatrimestre can stay empty.
- The list only shows the courses you can take in the selected cuatrimestre ("Solo habilitadas", on by default). Turn it off to see the rest, each with what it is missing; adding one anyway marks it with a warning.
- Anything in the plan that does not fit where it sits is flagged: a missing correlative, a correlative that is only planned later, a course not offered in that cuatrimestre.
- "Ya aprobadas" holds what you have already passed. Everything in an earlier cuatrimestre counts as approved by the next one, so it is assumed you pass each final.
- Hovering a course shows, fixed at the bottom-left, what it needs and what it enables (solid arrow: cursada aprobada, dashed: final aprobado). It moves to the other corner only if the course is right there.
- Search matches names and contents, ignoring accents and word endings, and understands related concepts ("nube" finds Cloud Computing). It is not an AI model: it works offline on a fixed vocabulary.
- Each course in a cuatrimestre has a button to mark it as failed. A failed course stays where it was taken but no longer counts as approved, so what depends on it is flagged. "Reacomodar" plans it again: everything up to the failure stays, and from there each course goes to the earliest cuatrimestre where it is given and its correlatives are passed. Nothing is pulled earlier, and no cuatrimestre gets more courses than the fullest one you had planned. The course that unlocks the longest chain goes first when a cuatrimestre is full.
- The graph view can be saved as SVG, PNG, JPG or as an interactive HTML page: one self-contained, read-only file with light and dark themes, one or several rows, hover to see a course's correlatives and click for the animated chain of one step.
- Preferences (theme, animations) and plans are kept in `localStorage`.

## Data notes

- Correlatives come from the "Mapa de correlatividades" of Res. CSDEyVE 015/22. There are three kinds: regular (cursada aprobada) to enroll, approved final to enroll, and approved final to sit a final.
- The official map has no correlatives for the Práctica Profesional Supervisada; it is only considered coherent after fourth year, as the plan intends.
- The plan PDF prints 672 h for year 2 and 3224 h in total, but its own rows add up to 656 h and 3208 h, the figure in the resolution.
- Optativas I and II have no contents in the PDF, so search only sees their names.

## Development

```bash
vp install
vp run ready   # check, test and build everything
vp run dev     # start the website
```
