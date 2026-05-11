import * as XLSX from "xlsx";
import { Download, Save } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { api } from "@/lib/api";
import type { Customer } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

type Edits = Record<string, { 
  contact_info: string; 
  tracking_numbers: string;
  description: string; 
}>;

const fmtVND = (n: number) =>
  Number(n || 0).toLocaleString("vi-VN", { style: "currency", currency: "VND", maximumFractionDigits: 0 });

const Customers = () => {
  const qc = useQueryClient();
  const [edits, setEdits] = useState<Edits>({});

  const { data: customers = [], isLoading } = useQuery({
    queryKey: ["customers"],
    queryFn: () => api.get<Customer[]>("/customers"),
  });

  useEffect(() => {
    const next: Edits = {};
    for (const c of customers) {
      const key = c.name;
      next[key] = {
        contact_info: c.contact_info ?? "",
        tracking_numbers: c.tracking_numbers ?? "",
        description: c.description ?? "",
      };
    }
    setEdits(next);
  }, [customers]);

  const update = useMutation({
    mutationFn: async (updatedData: any) => {
      return api.patch(`/customers/${encodeURIComponent(updatedData.name)}`, updatedData);
    },
    onSuccess: () => {
      toast.success("Đã cập nhật thông tin khách hàng!");
      qc.invalidateQueries({ queryKey: ["customers"] });
    },
    onError: (e: any) => toast.error("Lỗi cập nhật: " + e.message),
  });

  const totals = useMemo(() => {
    let revenue = 0;
    let profit = 0;
    for (const c of customers) {
      revenue += Number(c.total_spent ?? 0);
      profit += Number(c.total_profit ?? 0);
    }
    return { revenue, profit };
  }, [customers]);

  const exportToExcel = () => {
    if (customers.length === 0) {
      toast.error("Không có dữ liệu để xuất!");
      return;
    }
    const exportData = customers.map((c) => ({
      "Tên khách hàng": c.name,
      "Thông tin liên lạc": c.contact_info || "Chưa có",
      "Tên sản phẩm": c.purchased_products || "Chưa có",
      "Mã vận đơn": c.tracking_numbers || "Chưa có",
      "Tổng thanh toán": c.total_spent,
      "Tiền lãi": c.total_profit
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Khách hàng");
    worksheet["!cols"] = [{ wch: 20 }, { wch: 40 }, { wch: 40 }, { wch: 25 }, { wch: 15 }, { wch: 15 }];
    XLSX.writeFile(workbook, `Danh_sach_khach_hang_${new Date().toLocaleDateString("vi-VN")}.xlsx`);
    toast.success("Đã xuất file Excel thành công!");
  };

  return (
    <div className="space-y-6 p-2">
      {/* HEADER SECTION - Sửa lại bố cục cực kỳ rõ ràng */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white/50 p-4 rounded-2xl border border-dashed border-[hsl(160_70%_45%)]/30">
        <div>
          <h1 className="text-3xl font-bold text-foreground"><h1>CUSTOMER NGOC TEST</h1></h1>
          <p className="text-muted-foreground">Quản lý và xuất dữ liệu ra Excel</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* NÚT EXCEL TƯƠI MỚI */}
          <Button 
            variant="default" 
            className="bg-[hsl(160_70%_45%)] hover:bg-[hsl(160_70%_35%)] text-white shadow-md"
            onClick={exportToExcel}
          >
            <Download className="h-4 w-4 mr-2" />
            Xuất Excel
          </Button>
        
          <div className="flex gap-2">
            <Card className="px-4 py-2 border-[hsl(160_70%_45%)]/20 shadow-none bg-white">
              <div className="text-muted-foreground text-[10px] uppercase">Doanh thu</div>
              <div className="font-bold text-[hsl(160_70%_38%)]">{fmtVND(totals.revenue)}</div>
            </Card>
            <Card className="px-4 py-2 border-[hsl(160_70%_45%)]/20 shadow-none bg-white">
              <div className="text-muted-foreground text-[10px] uppercase">Tổng lãi</div>
              <div className="font-bold text-[hsl(160_70%_38%)]">{fmtVND(totals.profit)}</div>
            </Card>
          </div>
        </div>
      </div>

      <Card className="rounded-2xl shadow-sm overflow-hidden border-border">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-[hsl(160_60%_95%)] text-[hsl(160_70%_25%)]">
              <tr>
                <th className="p-3 text-left font-medium">Khách hàng</th>
                <th className="p-3 text-left font-medium">Liên lạc</th>
                <th className="p-3 text-left font-medium">Mã vận đơn</th>
                <th className="p-3 text-left font-medium">Sản phẩm</th>
                <th className="p-3 text-right font-medium">Tổng tiền</th>
                <th className="p-3 text-right font-medium">Lãi</th>
                <th className="p-3 text-center">Lưu</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={7} className="p-6 text-center">Đang tải...</td></tr>
              ) : customers.length === 0 ? (
                <tr><td colSpan={7} className="p-6 text-center">Trống.</td></tr>
              ) : (
                customers.map((c) => {
                  const k = c.name;
                  const e = edits[k] ?? { contact_info: "", tracking_numbers: "", description: "" };
                  const products = (c.purchased_products ?? "").split(",").map((s) => s.trim()).filter(Boolean);
                  return (
                    <tr key={k} className="border-t hover:bg-[hsl(160_60%_98%)]">
                      <td className="p-3 font-bold">{c.name}</td>
                      <td className="p-3">
                        <Input className="h-8 text-xs" value={e.contact_info} onChange={(ev) => setEdits({...edits, [k]: {...e, contact_info: ev.target.value}})} />
                      </td>
                      <td className="p-3">
                        <Input className="h-8 text-xs" value={e.tracking_numbers} onChange={(ev) => setEdits({...edits, [k]: {...e, tracking_numbers: ev.target.value}})} />
                      </td>
                      <td className="p-3">
                        <div className="flex flex-wrap gap-1">
                          {products.map((p, i) => <Badge key={i} variant="secondary" className="text-[10px] bg-emerald-50 text-emerald-700">{p}</Badge>)}
                        </div>
                      </td>
                      <td className="p-3 text-right font-semibold">{fmtVND(c.total_spent)}</td>
                      <td className="p-3 text-right font-semibold text-emerald-600">{fmtVND(c.total_profit)}</td>
                      <td className="p-3 text-center">
                        <Button size="sm" className="h-8 w-8 p-0 bg-emerald-500" onClick={() => update.mutate({ name: c.name, contact_info: e.contact_info, tracking_number: e.tracking_numbers })}>
                          <Save className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};

export default Customers;
