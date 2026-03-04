import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import App from "./App";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: "#1a2235",
            color: "#f1f5f9",
            border: "1px solid #1f2937",
            fontSize: "14px",
          },
          success: { iconTheme: { primary: "#22c55e", secondary: "#1a2235" } },
          error: { iconTheme: { primary: "#ef4444", secondary: "#1a2235" } },
        }}
      />
    </BrowserRouter>
  </React.StrictMode>
);
