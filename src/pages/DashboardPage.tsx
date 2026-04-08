import CameraGrid from "../components/CameraGrid";
import { useAuthStore } from "../store/authStore";

export default function DashboardPage() {
  const logout = useAuthStore((state) => state.logout);

  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-xl font-bold">Dashboard</h1>
        <button
          className="p-2 bg-red-600 text-white rounded hover:bg-red-700"
          onClick={logout}
        >
          Logout
        </button>
      </div>
      <CameraGrid />
    </div>
  );
}
