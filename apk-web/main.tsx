import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { ZelApp } from "../src/components/ZelApp";

const container = document.getElementById("root");
if (container) {
  createRoot(container).render(
    <StrictMode>
      <ZelApp />
    </StrictMode>,
  );
}
