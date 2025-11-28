import { Link } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

export default function Navbar() {
  const { user, logout } = useAuth();

  return (
    <nav style={{ padding: "15px", background: "#eee" }}>
      <Link to="/">Home</Link> |{" "}
      {!user && <Link to="/login">Login</Link>} |{" "}
      {!user && <Link to="/signup">Signup</Link>} |{" "}
      {user && <Link to="/stock">Stock</Link>} |{" "}
      {user && <Link to="/admin">Admin</Link>} |{" "}

      {user && (
        <button onClick={logout} style={{ marginLeft: "10px" }}>
          Logout
        </button>
      )}
    </nav>
  );
}
