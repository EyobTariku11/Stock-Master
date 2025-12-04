import { Navigate } from "react-router-dom";

export default function AdminRoute({ children }) {
  // Get user from localStorage
  const user = JSON.parse(localStorage.getItem("loggedInUser"));

  // If no user or user is not Admin, redirect to login
  if (!user || user.role !== "Admin") {
    return <Navigate to="/login" replace />;
  }

  // If Admin, render the protected page
  return children;
}
