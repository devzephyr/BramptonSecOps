import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./app/globals.css";
import { PreviewApp } from "./preview/PreviewApp";

const root = document.getElementById("root");
if (!root) throw new Error("Missing #root");

createRoot(root).render(
  <StrictMode>
    <PreviewApp />
  </StrictMode>,
);
