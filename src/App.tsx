import RouterProvider from "./pages/Router";
import { ToastContainer } from "react-toastify";

export default function App() {
  return (
    <>
      <RouterProvider />
      <ToastContainer position="top-right" />
    </>
  );
}
