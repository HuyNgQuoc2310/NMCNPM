import React, { useEffect, useState } from "react";

function MenuManager() {
  const [menu, setMenu] = useState([]);
  const [formData, setFormData] = useState({
    category: "",
    item_name: "",
    description: "",
    price: ""
  });

  function fetchMenu() {
    fetch("http://localhost:5000/api/menu")
      .then(res => res.json())
      .then(data => setMenu(data))
      .catch(err => console.log(err));
  }

  useEffect(() => {
    fetchMenu();
  }, []);

  function handleChange(e) {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  }

  function handleSubmit(e) {
    e.preventDefault();

    fetch("http://localhost:5000/api/menu", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(formData)
    })
      .then(res => res.json())
      .then(() => {
        fetchMenu();

        setFormData({
          category: "",
          item_name: "",
          description: "",
          price: ""
        });
      });
  }

  return (
    <div>
      <h3 className="mb-4">Quản lý món ăn</h3>

      <form onSubmit={handleSubmit} className="row g-3 mb-4">
        <div className="col-md-3">
          <input
            type="text"
            name="category"
            className="form-control"
            placeholder="Loại món"
            value={formData.category}
            onChange={handleChange}
          />
        </div>

        <div className="col-md-3">
          <input
            type="text"
            name="item_name"
            className="form-control"
            placeholder="Tên món"
            value={formData.item_name}
            onChange={handleChange}
          />
        </div>

        <div className="col-md-3">
          <input
            type="text"
            name="description"
            className="form-control"
            placeholder="Mô tả"
            value={formData.description}
            onChange={handleChange}
          />
        </div>

        <div className="col-md-2">
          <input
            type="number"
            name="price"
            className="form-control"
            placeholder="Giá"
            value={formData.price}
            onChange={handleChange}
          />
        </div>

        <div className="col-md-1">
          <button className="btn btn-primary w-100">
            +
          </button>
        </div>
      </form>

      <table className="table table-hover table-bordered align-middle">
        <thead className="table-dark">
          <tr>
            <th>Tên món</th>
            <th>Loại</th>
            <th>Mô tả</th>
            <th>Giá</th>
          </tr>
        </thead>

        <tbody>
          {menu.map(item => (
            <tr key={item.item_id}>
              <td>{item.item_name}</td>
              <td>{item.category}</td>
              <td>{item.description}</td>
              <td>{Number(item.price).toLocaleString()} VNĐ</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default MenuManager;