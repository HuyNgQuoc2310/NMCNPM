import React from "react";

function ModulePlaceholderPage({ title, description, focusItems = [] }) {
  return (
    <section className="empty-card">
      <span className="eyebrow">Frontend next</span>
      <h1 style={{ margin: "16px 0 10px", fontSize: "2rem" }}>{title}</h1>
      <p>{description}</p>

      {focusItems.length ? (
        <ul>
          {focusItems.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}

export default ModulePlaceholderPage;
