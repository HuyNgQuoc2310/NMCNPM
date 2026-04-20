import React from "react";
import { Link } from "react-router-dom";

function ForbiddenPage() {
  return (
    <section className="content-card forbidden-card">
      <span className="eyebrow">403</span>
      <h1 style={{ margin: "16px 0 10px", fontSize: "2rem" }}>Ban khong co quyen vao khu vuc nay.</h1>
      <p style={{ marginBottom: 20 }}>
        Role hien tai khong phu hop voi route duoc yeu cau. Quay lai dashboard hoac dang nhap bang tai khoan khac.
      </p>
      <Link to="/" className="primary-button" style={{ display: "inline-flex", textDecoration: "none" }}>
        Ve dashboard
      </Link>
    </section>
  );
}

export default ForbiddenPage;
