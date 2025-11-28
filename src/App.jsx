import { Routes, Route } from 'react-router-dom';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Stock from './pages/Stock';
import AdminUsers from './pages/AdminUsers';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route path="/stock" element={<Stock />} />
      <Route path="/admin" element={<AdminUsers />} />
    </Routes>
  );
}
