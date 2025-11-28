import ProductList from "../components/ProductList";
import ProductForm from "../components/ProductForm";

export default function Stock() {
  return (
    <div style={{ padding: "40px" }}>
      <h2>Stock Management</h2>
      <ProductForm />
      <ProductList />
    </div>
  );
}
