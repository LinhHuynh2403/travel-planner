import { createBrowserRouter } from "react-router";
import Home from "./pages/home";
import Itinerary from "./pages/itinerary";

export const router = createBrowserRouter([
  {
    path: "/",
    Component: Home,
  },
  {
    path: "/itinerary",
    Component: Itinerary,
  },
]);
