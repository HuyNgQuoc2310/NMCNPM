import React from "react";
import { formatDateLabel } from "../utils/reportDateRange";

function ReportFilterPanel({
  description,
  loading,
  onRangeChange,
  onReset,
  onSubmit,
  range,
  statusText,
  title
}) {
  return (
    <div className="filter-panel reports-filter-panel">
      <div className="filter-panel-header reports-filter-header">
        <div className="section-heading">
          <h3>{title}</h3>
          <p>{description}</p>
        </div>

        <div className="reports-filter-status">
          <span>Có dữ liệu</span>
          <strong>{statusText}</strong>
        </div>
      </div>

      <div className="filter-chip-row reports-filter-chip-row">
        <div className="filter-chip reports-filter-chip">
          <span>Khoảng đang xem</span>
          <strong>
            {formatDateLabel(range.start_date)} - {formatDateLabel(range.end_date)}
          </strong>
        </div>

        <div className="filter-chip reports-filter-chip">
          <span>Trạng thái báo cáo</span>
          <strong>{statusText}</strong>
        </div>
      </div>

      <form className="reports-filter-form" onSubmit={onSubmit}>
        <div className="reports-filter-bar">
          <label className="filter-field reports-filter-field reports-filter-segment">
            <span>Ngày bắt đầu</span>
            <input
              type="date"
              name="start_date"
              className="form-control"
              value={range.start_date}
              onChange={onRangeChange}
              required
            />
          </label>

          <label className="filter-field reports-filter-field reports-filter-segment">
            <span>Ngày kết thúc</span>
            <input
              type="date"
              name="end_date"
              className="form-control"
              value={range.end_date}
              onChange={onRangeChange}
              required
            />
          </label>

          <div className="filter-field reports-filter-field reports-filter-segment reports-filter-segment-actions">
            <span>Hành động</span>
            <div className="reports-filter-actions">
              <button type="submit" className="primary-button" disabled={loading}>
                {loading ? "Đang tải..." : "Thống kê"}
              </button>

              <button type="button" className="ghost-button" onClick={onReset} disabled={loading}>
                Mặc định
              </button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}

export default ReportFilterPanel;
