import React, { useEffect, useState } from "react";

function TableManager() {
  const [tables, setTables] = useState([]);
  const [formData, setFormData] = useState({
    table_name: "",
    capacity: "",
    description: ""
  });

  function fetchTables() {
    fetch("http://localhost:5000/api/tables")
      .then(res => res.json())
      .then(data => setTables(data))
      .catch(err => console.log(err));
  }

  useEffect(() => {
    fetchTables();
  }, []);

  function handleChange(e) {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  }

  function handleSubmit(e) {
    e.preventDefault();

    fetch("http://localhost:5000/api/tables", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(formData)
    })
      .then(res => res.json())
      .then(() => {
        fetchTables();

        setFormData({
          table_name: "",
          capacity: "",
          description: ""
        });
      });
  }

  return (
    <div>
      <h3 className="mb-4">Quản lý bàn ăn</h3>

      <form onSubmit={handleSubmit} className="row g-3 mb-4">
        <div className="col-md-4">
          <input
            type="text"
            name="table_name"
            className="form-control"
            placeholder="Tên bàn"
            value={formData.table_name}
            onChange={handleChange}
          />
        </div>

        <div className="col-md-3">
          <input
            type="number"
            name="capacity"
            className="form-control"
            placeholder="Số khách"
            value={formData.capacity}
            onChange={handleChange}
          />
        </div>

        <div className="col-md-4">
          <input
            type="text"
            name="description"
            className="form-control"
            placeholder="Mô tả"
            value={formData.description}
            onChange={handleChange}
          />
        </div>

        <div className="col-md-1">
          <button className="btn btn-success w-100">
            +
          </button>
        </div>
      </form>

      <table className="table table-striped table-hover table-bordered align-middle">
        <thead className="table-dark">
          <tr>
            <th>Tên bàn</th>
            <th>Sức chứa</th>
            <th>Mô tả</th>
          </tr>
        </thead>

        <tbody>
          {tables.map(table => (
            <tr key={table.table_id}>
              <td>{table.table_name}</td>
              <td>{table.capacity} khách</td>
              <td>{table.description}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default TableManager;