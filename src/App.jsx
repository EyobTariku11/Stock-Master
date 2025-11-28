import { Routes, Route } from "react-router-dom";
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import AdminUsers from "./pages/AdminUsers";
import Stock from "./pages/Stock";
import Navbar from "./components/Navbar";
import { useAuth } from "./contexts/AuthContext";

function App() {
  const { user } = useAuth();

  return (
    <>
      <Navbar />

      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />

        {user && (
          <>
            <Route path="/admin" element={<AdminUsers />} />
            <Route path="/stock" element={<Stock />} />
          </>
        )}
      </Routes>
    </>
  );
}

export default App;
