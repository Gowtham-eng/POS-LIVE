
import type { RouteObject } from "react-router-dom";
import NotFound from "../pages/NotFound";
import Home from "../pages/home/page";
import Login from "../pages/login/page";
import Dashboard from "../pages/dashboard/page";
import Billing from "../pages/billing/page";
import Master from "../pages/master/page";
import Reports from "../pages/reports/page";

const routes: RouteObject[] = [
  {
    path: "/",
    element: <Login />,
  },
  {
    path: "/login",
    element: <Login />,
  },
  {
    path: "/dashboard",
    element: <Dashboard />,
  },
  {
    path: "/billing",
    element: <Billing />,
  },
  {
    path: "/master",
    element: <Master />,
  },
  {
    path: "/reports",
    element: <Reports />,
  },
  {
    path: "/home",
    element: <Home />,
  },
  {
    path: "*",
    element: <NotFound />,
  },
];

export default routes;
