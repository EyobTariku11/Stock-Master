import { Navigate } from "react-router-dom";

export default function ProtectedRoute({ children, adminOnly = false }) {
  const user = JSON.parse(sessionStorage.getItem("loggedInUser"));

  // 1. If not logged in → redirect to login
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // 2. Admin Check Logic
  if (adminOnly) {
    const role = (user.role || "").toLowerCase().trim();

    // Allow if role is "admin", "superadmin", or "super admin"
    const isAuthorized = 
      role === "admin" || 
      role === "superadmin" || 
      role === "super admin";

    // If NOT authorized, kick them to stock page
    if (!isAuthorized) {
      return <Navigate to="/stock" replace />;
    }
  }

  return children;
}