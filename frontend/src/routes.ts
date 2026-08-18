import { createBrowserRouter } from "react-router";
import JourZyApp from "./app/components/ui/jourzy-app";
import SharedTripView from "./app/pages/shared-trip-view";

export const router = createBrowserRouter([
  {
    path: "/",
    Component: JourZyApp,
  },
  {
    // Public, no-login recap a "Share trip" link actually opens — see
    // GET /api/trips/:tripId/public in the backend for what this reads.
    path: "/shared/:tripId",
    Component: SharedTripView,
  },
]);