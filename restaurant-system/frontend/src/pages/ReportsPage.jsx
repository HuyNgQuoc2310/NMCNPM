import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "../context/useAuth";
import { apiFetch } from "../services/apiClient";
import { formatCurrency, getTodayDateValue } from "../utils/formatters";

function getMonthStartValue() {
  const date = new Date();
  date.setDate(1);
  return date.toISOString().slice(0, 10);
}

function ReportsPage() {
  const { logout, token } = useAuth();
  const initialRange = useMemo(() => ({
    start_date: getMonthStartValue(),
    end_date: getTodayDateValue()
  }), []);
  const [feedback, setFeedback] = useState({ type: "", message: "" });
  const [range, setRange] = useState(initialRange);
  const [reports, setReports] = useState({
    items: [],
    slots: [],
    months: []
  });
  const [loading, setLoading] = useState(true);

  const handleAuthError = useCallback((error) => {
    if (error.status === 401) {
      logout();
      return true;
    }

    return false;
  }, [logout]);

  const fetchReports = useCallback(async (nextRange) => {
    try {
      setLoading(true);
      setFeedback({ type: "", message: "" });
      const params = new URLSearchParams(nextRange);
      const query = params.toString();

      const [itemsResponse, hourlyResponse, monthlyResponse] = await Promise.all([
        apiFetch(`/reports/best-selling-items?${query}`, { token }),
        apiFetch(`/reports/hourly-guests?${query}`, { token }),
        apiFetch(`/reports/monthly-revenue?${query}`, { token })
      ]);

      setReports({
        items: itemsResponse.items || [],
        slots: hourlyResponse.slots || [],
        months: monthlyResponse.months || []
      });
    } catch (error) {
      if (!handleAuthError(error)) {
        setFeedback({ type: "error", message: error.message });
      }
    } finally {
      setLoading(false);
    }
  }, [handleAuthError, token]);

  useEffect(() => {
    async function bootstrapReports() {
      await fetchReports(initialRange);
    }

    void bootstrapReports();
  }, [fetchReports, initialRange]);

  const topItem = reports.items[0] || null;
  const busiestSlot = useMemo(() => {
    if (!reports.slots.length) {
      return null;
    }

    return reports.slots.reduce((bestValue, currentValue) =>
      Number(currentValue.total_revenue || 0) > Number(bestValue.total_revenue || 0) ? currentValue : bestValue
    );
  }, [reports.slots]);
  const peakMonth = useMemo(() => {
    if (!reports.months.length) {
      return null;
    }

    return reports.months.reduce((bestValue, currentValue) =>
      Number(currentValue.total_revenue || 0) > Number(bestValue.total_revenue || 0) ? currentValue : bestValue
    );
  }, [reports.months]);
  const totalRevenue = reports.months.reduce((sum, month) => sum + Number(month.total_revenue || 0), 0);
  const totalSoldQuantity = reports.items.reduce((sum, item) => sum + Number(item.total_quantity || 0), 0);

  function handleRangeChange(event) {
    setRange((currentValue) => ({
      ...currentValue,
      [event.target.name]: event.target.value
    }));
  }

  function resetRange() {
    const nextRange = {
      start_date: getMonthStartValue(),
      end_date: getTodayDateValue()
    };

    setRange(nextRange);
    void fetchReports(nextRange);
  }

  async function handleSubmit(event) {
    event.preventDefault();
    await fetchReports(range);
  }

  return (
    <section className="page-shell">
      <div className="page-intro-grid">
        <article className="page-intro-card">
          <div>
            <span className="page-kicker">Reports workspace</span>
            <h1 className="page-intro-title">Thống kê và báo cáo</h1>
            <p className="page-intro-copy">
              Một màn tổng hợp cho quản lý xem nhanh món ăn bán chạy, lượng khách theo khung giờ và doanh thu theo
              tháng trong cùng một khoảng thời gian, không bị trải dài trên desktop.
            </p>
          </div>

          <div className="page-mini-grid">
            <article className="page-mini-card">
              <span>Doanh thu gộp</span>
              <strong>{formatCurrency(totalRevenue)}</strong>
              <small>Cộng từ các giao dịch hoàn tất trong khoảng thời gian đang lọc.</small>
            </article>

            <article className="page-mini-card">
              <span>Món bán ra</span>
              <strong>{totalSoldQuantity}</strong>
              <small>Tổng số lượng món đã bán ở các order đã thanh toán.</small>
            </article>

            <article className="page-mini-card">
              <span>Khung giờ nổi bật</span>
              <strong>{busiestSlot?.time_slot || "--"}</strong>
              <small>{busiestSlot ? formatCurrency(busiestSlot.total_revenue) : "Chưa có dữ liệu."}</small>
            </article>
          </div>
        </article>

        <aside className="page-side-card">
          <div>
            <h3>Trọng tâm demo</h3>
            <p>Màn báo cáo này được tách thành các khối rõ vai trò để khi mở trên desktop không bị rỗng và hụt mắt.</p>
          </div>

          <div className="page-side-list">
            <article className="page-side-item">
              <strong>Top món</strong>
              <span>{topItem ? `${topItem.item_name} đang dẫn đầu theo doanh thu.` : "Chưa có món nào phát sinh."}</span>
            </article>

            <article className="page-side-item">
              <strong>Khung giờ mạnh</strong>
              <span>
                {busiestSlot
                  ? `${busiestSlot.time_slot} là khung giờ đang tạo doanh thu tốt nhất.`
                  : "Không có dữ liệu khung giờ trong bộ lọc hiện tại."}
              </span>
            </article>

            <article className="page-side-item">
              <strong>Tháng cao nhất</strong>
              <span>{peakMonth ? `${peakMonth.month_label} đang có tổng thu cao nhất.` : "Chưa có dữ liệu theo tháng."}</span>
            </article>
          </div>
        </aside>
      </div>

      {feedback.message ? (
        <div className={`alert-message ${feedback.type === "error" ? "alert-error" : "alert-success"}`}>
          {feedback.message}
        </div>
      ) : null}

      <div className="flow-strip">
        <article className={`flow-step${reports.items.length ? " active" : ""}`}>
          <span>Báo cáo 1</span>
          <strong>Món ăn bán chạy</strong>
          <small>Xem tổng số lượng, doanh thu và số khách liên quan theo từng món.</small>
        </article>

        <article className={`flow-step${reports.slots.length ? " active" : ""}`}>
          <span>Báo cáo 2</span>
          <strong>Lượng khách theo giờ</strong>
          <small>Xác định khung giờ có doanh thu cao và doanh thu trên mỗi khách.</small>
        </article>

        <article className={`flow-step${reports.months.length ? " active" : ""}`}>
          <span>Báo cáo 3</span>
          <strong>Doanh thu theo tháng</strong>
          <small>Theo dõi tổng thu và giá trị trung bình theo từng tháng.</small>
        </article>
      </div>

      <div className="content-card stack-card">
        <div className="filter-panel">
          <div className="filter-panel-header">
            <div className="section-heading">
              <h3>Khoảng thời gian thống kê</h3>
              <p>Cả ba báo cáo dùng chung một khoảng ngày để đối chiếu và trình chiếu dễ hơn.</p>
            </div>

            <div className="table-toolbar-meta align-end">
              <strong>Khoảng đang xem</strong>
              <span>
                {range.start_date} đến {range.end_date}
              </span>
            </div>
          </div>

          <div className="filter-chip-row">
            <div className="filter-chip">
              <span>Từ ngày</span>
              <strong>{range.start_date}</strong>
            </div>

            <div className="filter-chip">
              <span>Đến ngày</span>
              <strong>{range.end_date}</strong>
            </div>

            <div className="filter-chip">
              <span>Có dữ liệu</span>
              <strong>{[reports.items.length, reports.slots.length, reports.months.length].filter(Boolean).length}/3 báo cáo</strong>
            </div>
          </div>

          <form className="filter-panel-grid" onSubmit={handleSubmit}>
            <label className="filter-field filter-col-4">
              <span>Ngày bắt đầu</span>
              <input
                type="date"
                name="start_date"
                className="form-control"
                value={range.start_date}
                onChange={handleRangeChange}
                required
              />
            </label>

            <label className="filter-field filter-col-4">
              <span>Ngày kết thúc</span>
              <input
                type="date"
                name="end_date"
                className="form-control"
                value={range.end_date}
                onChange={handleRangeChange}
                required
              />
            </label>

            <div className="filter-field filter-col-4">
              <span>Hành động</span>
              <div className="filter-action-stack">
                <button type="submit" className="primary-button" disabled={loading}>
                  {loading ? "Đang tải..." : "Thống kê"}
                </button>

                <button type="button" className="ghost-button" onClick={resetRange} disabled={loading}>
                  Mặc định
                </button>
              </div>
            </div>
          </form>
        </div>

        <div className="summary-grid">
          <div className={`summary-box${topItem ? " summary-box-accent" : ""}`}>
            <span>Món nổi bật</span>
            <strong>{topItem?.item_name || "Chưa có dữ liệu"}</strong>
            <small>{topItem ? formatCurrency(topItem.total_revenue) : "Hãy chọn khoảng thời gian có giao dịch."}</small>
          </div>

          <div className={`summary-box${busiestSlot ? " summary-box-accent" : ""}`}>
            <span>Khung giờ doanh thu cao</span>
            <strong>{busiestSlot?.time_slot || "--"}</strong>
            <small>{busiestSlot ? `${busiestSlot.avg_guests} khách trung bình` : "Chưa có dữ liệu."}</small>
          </div>

          <div className={`summary-box${peakMonth ? " summary-box-accent" : ""}`}>
            <span>Tháng cao nhất</span>
            <strong>{peakMonth?.month_label || "--"}</strong>
            <small>{peakMonth ? formatCurrency(peakMonth.total_revenue) : "Chưa có dữ liệu."}</small>
          </div>
        </div>
      </div>

      <div className="content-card stack-card">
        <div className="table-toolbar">
          <div className="section-heading">
            <h3>Thống kê món ăn bán chạy</h3>
            <p>Danh sách được sắp xếp giảm dần theo tổng doanh thu để quản lý nhìn nhanh món chủ lực.</p>
          </div>

          <div className="table-toolbar-meta align-end">
            <strong>{reports.items.length} món có phát sinh</strong>
            <span>{topItem ? `Top 1: ${topItem.item_name}` : "Chưa có dữ liệu."}</span>
          </div>
        </div>

        {loading ? (
          <div className="screen-state" style={{ minHeight: 220 }}>
            Đang tải báo cáo món ăn...
          </div>
        ) : (
          <div className="table-shell">
            <table className="table table-hover align-middle">
              <thead>
                <tr>
                  <th>Mã món</th>
                  <th>Tên món</th>
                  <th>Loại</th>
                  <th>SL đã bán</th>
                  <th>Số khách liên quan</th>
                  <th>Số order</th>
                  <th>Tổng doanh thu</th>
                </tr>
              </thead>

              <tbody>
                {reports.items.length ? (
                  reports.items.map((item) => (
                    <tr key={item.item_id}>
                      <td>{item.item_code}</td>
                      <td>
                        <strong>{item.item_name}</strong>
                      </td>
                      <td>{item.category}</td>
                      <td>{item.total_quantity}</td>
                      <td>{item.total_guest_count}</td>
                      <td>{item.order_count}</td>
                      <td>{formatCurrency(item.total_revenue)}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="7" className="text-center py-4">
                      Không có dữ liệu món ăn trong khoảng thời gian này.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="report-split-grid">
        <div className="content-card stack-card">
          <div className="table-toolbar">
            <div className="section-heading">
              <h3>Thống kê lượng khách theo khung giờ</h3>
              <p>Tìm khung giờ tạo doanh thu tốt nhất để bố trí nhân sự và chuẩn bị món hợp lý hơn.</p>
            </div>

            <div className="table-toolbar-meta align-end">
              <strong>{reports.slots.length} khung giờ</strong>
              <span>{busiestSlot ? `${busiestSlot.time_slot} đang dẫn đầu` : "Chưa có dữ liệu."}</span>
            </div>
          </div>

          {loading ? (
            <div className="screen-state" style={{ minHeight: 220 }}>
              Đang tải báo cáo khung giờ...
            </div>
          ) : (
            <div className="table-shell">
              <table className="table table-hover align-middle">
                <thead>
                  <tr>
                    <th>Khung giờ</th>
                    <th>Số phiên</th>
                    <th>TB khách</th>
                    <th>Doanh thu / khách</th>
                    <th>Tổng doanh thu</th>
                  </tr>
                </thead>

                <tbody>
                  {reports.slots.length ? (
                    reports.slots.map((slot) => (
                      <tr key={slot.time_slot}>
                        <td>{slot.time_slot}</td>
                        <td>{slot.total_sessions}</td>
                        <td>{slot.avg_guests}</td>
                        <td>{formatCurrency(slot.revenue_per_guest)}</td>
                        <td>{formatCurrency(slot.total_revenue)}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="5" className="text-center py-4">
                        Không có dữ liệu khung giờ trong khoảng thời gian này.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="content-card stack-card">
          <div className="table-toolbar">
            <div className="section-heading">
              <h3>Báo cáo doanh thu theo tháng</h3>
              <p>Theo dõi tổng thu, số giao dịch và giá trị hóa đơn trung bình trên mỗi tháng.</p>
            </div>

            <div className="table-toolbar-meta align-end">
              <strong>{reports.months.length} tháng</strong>
              <span>{peakMonth ? `${peakMonth.month_label} là tháng cao nhất` : "Chưa có dữ liệu."}</span>
            </div>
          </div>

          {loading ? (
            <div className="screen-state" style={{ minHeight: 220 }}>
              Đang tải báo cáo doanh thu...
            </div>
          ) : (
            <div className="table-shell">
              <table className="table table-hover align-middle">
                <thead>
                  <tr>
                    <th>Tháng</th>
                    <th>Số giao dịch</th>
                    <th>Giá trị TB / giao dịch</th>
                    <th>Tổng doanh thu</th>
                  </tr>
                </thead>

                <tbody>
                  {reports.months.length ? (
                    reports.months.map((month) => (
                      <tr key={month.month_label}>
                        <td>{month.month_label}</td>
                        <td>{month.total_payments}</td>
                        <td>{formatCurrency(month.avg_payment_value)}</td>
                        <td>{formatCurrency(month.total_revenue)}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="4" className="text-center py-4">
                        Không có dữ liệu doanh thu trong khoảng thời gian này.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

export default ReportsPage;
