export default function ProductItem({ product }) {
    return (
      <div
        style={{
          padding: "10px",
          marginBottom: "10px",
          border: "1px solid #ccc",
        }}
      >
        <strong>{product.name}</strong>  
        <br />
        Created by: {product.createdBy}
      </div>
    );
  }
  