import { useState } from "react";

export default function ProductForm() {
  const [name, setName] = useState("");

  const submit = (e) => {
    e.preventDefault();
    alert("Product Created (backend later) → " + name);
  };

  return (
    <form onSubmit={submit} style={{ marginBottom: "20px" }}>
      <input
        type="text"
        placeholder="Product name"
        onChange={(e) => setName(e.target.value)}
      />{" "}
      <button>Add Product</button>
    </form>
  );
}
