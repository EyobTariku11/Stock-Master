import ProductItem from "./ProductItem";

export default function ProductList() {
  const products = [
    { id: 1, name: "Laptop", createdBy: "Eyob" },
    { id: 2, name: "Keyboard", createdBy: "Admin" },
  ];

  return (
    <div>
      <h3>Products</h3>

      {products.map((p) => (
        <ProductItem key={p.id} product={p} />
      ))}
    </div>
  );
}
