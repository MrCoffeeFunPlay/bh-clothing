import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { CurrencyProvider } from "./currency";
import "./styles.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <CurrencyProvider><App /></CurrencyProvider>
  </StrictMode>,
);