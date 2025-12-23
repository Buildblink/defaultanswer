import type { ReactNode } from "react";
import { ReportLayout } from "@/components/report/ReportLayout";

export default function ReportsLayout({ children }: { children: ReactNode }) {
  return <ReportLayout>{children}</ReportLayout>;
}
