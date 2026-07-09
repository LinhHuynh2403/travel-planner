import { createBrowserRouter } from "react-router";
import JourZyApp from "./app/components/ui/jourzy-app";

export const router = createBrowserRouter([
  {
    path: "/",
    Component: JourZyApp,
  },
]);