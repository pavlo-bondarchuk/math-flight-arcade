import React from "react";
import { createRoot } from "react-dom/client";
import ArithmeticFlyCollectGame from "../ArithmeticFlyCollectGame.jsx";
import "./styles.css";

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <ArithmeticFlyCollectGame />
  </React.StrictMode>
);
