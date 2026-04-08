import { useState } from "react";
import { useAuthStore } from "../store/authStore";

export default function LoginPage() {
  const login = useAuthStore((state) => state.login);
  const [user, setUser] = useState("");
  const [pass, setPass] = useState("");

  return (
    <div className="flex justify-center items-center h-screen bg-gray-100">
      <div className="p-6 bg-white rounded shadow-md w-80">
        <h2 className="text-xl font-bold mb-4 text-gray-800">Login</h2>
        <input
          className="w-full mb-2 p-2 border rounded text-gray-800"
          placeholder="Username"
          value={user}
          onChange={(e) => setUser(e.target.value)}
        />
        <input
          type="password"
          className="w-full mb-4 p-2 border rounded text-gray-800"
          placeholder="Password"
          value={pass}
          onChange={(e) => setPass(e.target.value)}
        />
        <button
          className="w-full p-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          onClick={() => login(user, pass)}
        >
          Login
        </button>
      </div>
    </div>
  );
}
