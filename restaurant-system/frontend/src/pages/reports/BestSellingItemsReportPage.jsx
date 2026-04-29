import React from "react";
import ReportFilterPanel from "../../components/ReportFilterPanel";
import ReportsModuleStrip from "../../components/ReportsModuleStrip";
import { useReportModule } from "../../hooks/useReportModule";
import { formatCurrency } from "../../utils/formatters";

function BestSellingItemsReportPage() {
  const {
    data: items,
    feedback,
    handleRangeChange,
    handleSubmit,
    loading,
    range,
    resetRange
  } = useReportModule("/reports/best-selling-items", "items");

  const topItem = items[0] || null;
  const totalRevenue = items.reduce((sum, item) => sum + Number(item.total_revenue || 0), 0);
  const totalQuantity = items.reduce((sum, item) => sum + Number(item.total_quantity || 0), 0);
  const totalOrders = items.reduce((sum, item) => sum + Number(item.order_count || 0), 0);

  return (
    <section className="page-shell">
      <div className="page-intro-grid">
        <article className="page-intro-card">
          <div>
            <span className="page-kicker">Báo cáo 1</span>
            <h1 className="page-intro-title">Thống kê món ăn bán chạy</h1>
          </div>

          <div className="page-mini-grid">
            <article className="page-mini-card">
              <span>Món có doanh thu</span>
              <strong>{items.length}</strong>
              <small>Số món phát sinh doanh thu trong khoảng thời gian đang chọn.</small>
            </article>

            <article className="page-mini-card">
              <span>Số lượng đã bán</span>
              <strong>{totalQuantity}</strong>
              <small>Tổng số phần món đã bán ra từ các order đã thanh toán.</small>
            </article>

            <article className="page-mini-card">
              <span>Tổng doanh thu</span>
              <strong>{formatCurrency(totalRevenue)}</strong>
              <small>Cộng dồn doanh thu của toàn bộ món phát sinh trong kỳ lọc.</small>
            </article>
          </div>
        </article>

        <aside className="page-side-card">
          <div className="page-side-list">
            <article className="page-side-item">
              <strong>Top món</strong>
              <span>{topItem ? `${topItem.item_name} đang đứng đầu.` : "Chưa có món nào phát sinh doanh thu."}</span>
            </article>

            <article className="page-side-item">
              <strong>Số order liên quan</strong>
              <span>{totalOrders ? `${totalOrders} order đã đóng góp vào báo cáo này.` : "Chưa có order đã thanh toán."}</span>
            </article>

            <article className="page-side-item">
              <strong>Doanh thu cao nhất</strong>
              <span>{topItem ? formatCurrency(topItem.total_revenue) : "Chưa có dữ liệu."}</span>
            </article>
          </div>
        </aside>
      </div>

      {feedback.message ? (
        <div className={`alert-message ${feedback.type === "error" ? "alert-error" : "alert-success"}`}>
          {feedback.message}
        </div>
      ) : null}

      <ReportsModuleStrip />

      <div className="content-card stack-card">
        <ReportFilterPanel
          title="Khoảng thời gian thống kê"
          description="Chọn khoảng ngày để xem danh sách món ăn bán chạy và doanh thu tương ứng."
          range={range}
          onRangeChange={handleRangeChange}
          onSubmit={handleSubmit}
          onReset={resetRange}
          loading={loading}
          statusText={items.length ? `${items.length} món có doanh thu` : "Chưa có dữ liệu"}
        />

        <div className="content-card stack-card">
          <div className="table-toolbar reports-table-toolbar">
            <div className="section-heading">
              <h3>Danh sách món ăn bán chạy</h3>
            </div>

            <div className="table-toolbar-meta align-end">
              <strong>{items.length} món</strong>
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
                  {items.length ? (
                    items.map((item) => (
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
      </div>
    </section>
  );
}

export default BestSellingItemsReportPage;
