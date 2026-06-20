import ReactDOM from "react-dom/client";
import App from "./App";
import "./App.css";

// Note: StrictMode is intentionally omitted. It double-invokes effects in
// development, which would open two WebSocket connections (and two camera
// captures on the backend) for this hardware-bound app.
ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <App />,
);
