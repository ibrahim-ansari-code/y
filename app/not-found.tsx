export default function NotFound() {
  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "system-ui" }}>
      <div style={{ textAlign: "center" }}>
        <h1 style={{ fontSize: "1.5rem", fontWeight: 600 }}>Page not found</h1>
        <a href="/" style={{ marginTop: "1rem", display: "inline-block", color: "#2563eb" }}>Go home</a>
      </div>
    </div>
  );
}
