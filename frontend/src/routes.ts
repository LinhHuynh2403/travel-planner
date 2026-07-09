import { createBrowserRouter } from "react-router";
import Home from "./app/pages/home";
import Itinerary from "./app/pages/itinerary";
import Settings from "./app/pages/settings";

export const router = createBrowserRouter([
  {
    path: "/",
    Component: Home,
  },
  {
    path: "/itinerary",
    Component: Itinerary,
  },
  {
    path: "/settings",
    Component: Settings,
  },
]);