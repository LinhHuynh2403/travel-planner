import { createBrowserRouter } from "react-router";
import Home from "./pages/home";
import Itinerary from "./pages/itinerary";
import Login from "./pages/login";

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
    path: "/login",
    Component: Login,
  },
]);
