import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { installApiFetchRewriter } from "./lib/api";

installApiFetchRewriter();

createRoot(document.getElementById("root")!).render(<App />);
