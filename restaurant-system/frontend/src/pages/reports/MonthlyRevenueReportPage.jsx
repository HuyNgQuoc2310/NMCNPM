import React from "react";
import ReportFilterPanel from "../../components/ReportFilterPanel";
import ReportsModuleStrip from "../../components/ReportsModuleStrip";
import { useReportModule } from "../../hooks/useReportModule";
import { formatCurrency } from "../../utils/formatters";

function MonthlyRevenueReportPage() {
  const {
    data: months,
    feedback,
    handleRangeChange,
    handleSubmit,
    loading,
    range,
    resetRange
  } = useReportModule("/reports/monthly-revenue", "months");

  const peakMonth = months[0] || null;
  const totalRevenue = months.reduce((sum, month) => sum + Number(month.total_revenue || 0), 0);
  const totalPayments = months.reduce((sum, month) => sum + Number(month.total_payments || 0), 0);
  const averagePaymentValue = totalPayments ? totalRevenue / totalPayments : 0;

  return (
    <section className="page-shell">
      <div className="page-intro-grid">
        <article className="page-intro-card">
          <div>
            <span className="page-kicker">Báo cáo 3</span>
            <h1 className="page-intro-title">Báo cáo doanh thu theo tháng</h1>
          </div>

          <div className="page-mini-grid">
            <article className="page-mini-card">
              <span>Số tháng có dữ liệu</span>
              <strong>{months.length}</strong>
              <small>Số tháng có giao dịch hoàn tất trong giai đoạn thống kê.</small>
            </article>

            <article className="page-mini-card">
              <span>Tổng giao dịch</span>
              <strong>{totalPayments}</strong>
              <small>Số lượng giao dịch hoàn thành được cộng dồn theo tháng.</small>
            </article>

            <article className="page-mini-card">
              <span>Tổng doanh thu</span>
              <strong>{formatCurrency(totalRevenue)}</strong>
              <small>Giá trị thu về từ toàn bộ hóa đơn hoàn tất trong kỳ lọc.</small>
            </article>
          </div>
        </article>

        <aside className="page-side-card">
          <div className="page-side-list">
            <article className="page-side-item">
              <strong>Tháng mạnh nhất</strong>
              <span>{peakMonth ? peakMonth.month_label : "Chưa có dữ liệu theo tháng."}</span>
            </article>

            <article className="page-side-item">
              <strong>Doanh thu tháng cao nhất</strong>
              <span>{peakMonth ? formatCurrency(peakMonth.total_revenue) : "Chưa có dữ liệu."}</span>
            </article>

            <article className="page-side-item">
              <strong>Giá trị TB / giao dịch</strong>
              <span>{formatCurrency(averagePaymentValue)}</span>
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
          description="Chọn khoảng ngày để xem tổng thu, số giao dịch và giá trị trung bình theo từng tháng."
          range={range}
          onRangeChange={handleRangeChange}
          onSubmit={handleSubmit}
          onReset={resetRange}
          loading={loading}
          statusText={months.length ? `${months.length} tháng có dữ liệu` : "Chưa có dữ liệu"}
        />

        <div className="content-card stack-card">
          <div className="table-toolbar reports-table-toolbar">
            <div className="section-heading">
              <h3>Danh sách doanh thu theo tháng</h3>
            </div>

            <div className="table-toolbar-meta align-end">
              <strong>{months.length} tháng</strong>
              <span>{peakMonth ? `Cao nhất: ${peakMonth.month_label}` : "Chưa có dữ liệu."}</span>
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
                  {months.length ? (
                    months.map((month) => (
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

export default MonthlyRevenueReportPage;
