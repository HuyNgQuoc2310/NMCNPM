import React from "react";
import ReportFilterPanel from "../../components/ReportFilterPanel";
import ReportsModuleStrip from "../../components/ReportsModuleStrip";
import { useReportModule } from "../../hooks/useReportModule";
import { formatCurrency } from "../../utils/formatters";

function HourlyGuestReportPage() {
  const {
    data: slots,
    feedback,
    handleRangeChange,
    handleSubmit,
    loading,
    range,
    resetRange
  } = useReportModule("/reports/hourly-guests", "slots");

  const busiestSlot = slots[0] || null;
  const totalRevenue = slots.reduce((sum, slot) => sum + Number(slot.total_revenue || 0), 0);
  const totalSessions = slots.reduce((sum, slot) => sum + Number(slot.total_sessions || 0), 0);
  const averageGuests = slots.length
    ? (slots.reduce((sum, slot) => sum + Number(slot.avg_guests || 0), 0) / slots.length).toFixed(2)
    : "--";

  return (
    <section className="page-shell">
      <div className="page-intro-grid">
        <article className="page-intro-card">
          <div>
            <span className="page-kicker">Báo cáo 2</span>
            <h1 className="page-intro-title">Thống kê lượng khách theo khung giờ</h1>
          </div>

          <div className="page-mini-grid">
            <article className="page-mini-card">
              <span>Khung giờ phát sinh</span>
              <strong>{slots.length}</strong>
              <small>Số khung giờ có doanh thu trong giai đoạn thống kê.</small>
            </article>

            <article className="page-mini-card">
              <span>Tổng số phiên</span>
              <strong>{totalSessions}</strong>
              <small>Các phiên phục vụ đã đóng góp vào thống kê theo giờ.</small>
            </article>

            <article className="page-mini-card">
              <span>TB khách / khung giờ</span>
              <strong>{averageGuests}</strong>
              <small>Trung bình số khách của các khung giờ có phát sinh doanh thu.</small>
            </article>
          </div>
        </article>

        <aside className="page-side-card">
          <div className="page-side-list">
            <article className="page-side-item">
              <strong>Khung giờ mạnh nhất</strong>
              <span>{busiestSlot ? busiestSlot.time_slot : "Chưa có dữ liệu khung giờ."}</span>
            </article>

            <article className="page-side-item">
              <strong>Tổng doanh thu</strong>
              <span>{formatCurrency(totalRevenue)}</span>
            </article>

            <article className="page-side-item">
              <strong>Doanh thu / khách cao nhất</strong>
              <span>{busiestSlot ? formatCurrency(busiestSlot.revenue_per_guest) : "Chưa có dữ liệu."}</span>
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
          description="Chọn khoảng ngày để xem lượng khách trung bình, doanh thu trên đầu khách và tổng doanh thu theo giờ."
          range={range}
          onRangeChange={handleRangeChange}
          onSubmit={handleSubmit}
          onReset={resetRange}
          loading={loading}
          statusText={slots.length ? `${slots.length} khung giờ có dữ liệu` : "Chưa có dữ liệu"}
        />

        <div className="content-card stack-card">
          <div className="table-toolbar reports-table-toolbar">
            <div className="section-heading">
              <h3>Danh sách khung giờ</h3>
            </div>

            <div className="table-toolbar-meta align-end">
              <strong>{slots.length} khung giờ</strong>
              <span>{busiestSlot ? `Hot: ${busiestSlot.time_slot}` : "Chưa có dữ liệu."}</span>
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
                  {slots.length ? (
                    slots.map((slot) => (
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
      </div>
    </section>
  );
}

export default HourlyGuestReportPage;
