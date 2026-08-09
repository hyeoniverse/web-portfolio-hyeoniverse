import ReportsList from "./_components/ReportsList";

/** /admin/reports — 독립 신고 관리 페이지. 실제 목록은 공통 ReportsList(알림 "신고" 탭과 공용). */
export default function ReportsPage() {
  return <ReportsList showTitle />;
}
