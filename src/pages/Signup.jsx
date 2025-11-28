import { useState } from "react";

export default function Signup() {
  const [email, setEmail] = useState("");

  const onSubmit = (e) => {
    e.preventDefault();
    alert("Account created! (Backend later)");
  };

  return (
    <div style={{ padding: "40px" }}>
      <h2>Signup</h2>
      <form onSubmit={onSubmit}>
        <input
          type="email"
          placeholder="Email"
          onChange={(e) => setEmail(e.target.value)}
        /><br/><br/>

        <input type="password" placeholder="Password" /><br/><br/>

        <button>Create Account</button>
      </form>
    </div>
  );
}
