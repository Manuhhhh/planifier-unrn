import "@fontsource/poppins/400.css";
import "@fontsource/poppins/500.css";
import "@fontsource/poppins/600.css";
import "@fontsource/poppins/700.css";
import { StrictMode, Suspense, lazy } from "react";
import { createRoot } from "react-dom/client";
import { AppSkeleton } from "./components/AppSkeleton.tsx";
import "./style.css";

// The app (motion, curriculum, planner) loads on its own so the skeleton paints first.
const App = lazy(() => import("./App.tsx").then((module) => ({ default: module.App })));

createRoot(document.getElementById("app")!).render(
  <StrictMode>
    <Suspense fallback={<AppSkeleton />}>
      <App />
    </Suspense>
  </StrictMode>,
);
