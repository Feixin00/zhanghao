import React from "react";
import { createRoot } from "react-dom/client";
import { ToastProvider } from "@heroui/react/toast";
import DraftManagement from "../../src/features/content-library/DraftManagement.jsx";
import "../../src/styles.css";

createRoot(document.getElementById("root")).render(<>
  <main style={{ maxWidth: 1280, margin: "32px auto", padding: 16 }}>
    <DraftManagement />
  </main>
  <ToastProvider placement="bottom end" />
</>);
