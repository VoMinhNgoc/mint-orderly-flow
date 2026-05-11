import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { RotateCcw, Save } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import type { Customer } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { NumberInput } from "@/components/NumberInput";

type Edits = Record<string, { description: string; final_amount: number }>;

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
      const customerId = String(c.id || c.name); // Fallback nếu id null
      next[customerId] = {
        description: c.description ?? "",
        final_amount: Number(c.final_amount ?? c.total_spent ?? 0),
      };
    }
    setEdits(next);
  }, [customers]);

  const update = useMutation({
    mutationFn: (c: Customer) => api.patch<Customer>(`/customers/${c.id}`, c),
    onSuccess: () => {
      toast.success("Cập nhật khách hàng thành công");
      qc.invalidateQueries({ queryKey: ["customers"] });
    },
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

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Customer List</h1>
          <p className="text-muted-foreground">Mỗi khách gộp tất cả sản phẩm đã mua.</p>
        </div>
        <div className="flex gap-3 text-sm">
          <Card className="px-4 py-2 rounded-xl border-[hsl(160_70%_45%)]/30">
            <div className="text-muted-foreground text-xs">Tổng doanh thu</div>
            <div className="font-bold text-[hsl(160_70%_38%)]">{fmtVND(totals.revenue)}</div>
          </Card>
          <Card className="px-4 py-2 rounded-xl border-[hsl(160_70%_45%)]/30">
            <div className="text-muted-foreground text-xs">Tổng lãi</div>
            <div className="font-bold text-[hsl(160_70%_38%)]">{fmtVND(totals.profit)}</div>
          </Card>
        </div>
      </div>

      <Card className="rounded-2xl shadow-[var(--shadow-card)] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-[hsl(160_60%_95%)] text-[hsl(160_70%_25%)]">
              <tr>
                <th className="text-left p-3 font-medium">Khách hàng</th>
                <th className="text-left p-3 font-medium">Liên lạc</th>
                <th className="text-left p-3 font-medium">Sản phẩm đã mua</th>
                <th className="text-left p-3 font-medium">Mã vận đơn</th>
                <th className="text-right p-3 font-medium">Tổng thanh toán</th>
                <th className="text-right p-3 font-medium">Tiền lời</th>
                <th className="text-left p-3 font-medium">Mô tả</th>
                <th className="p-3"></th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={8} className="p-6 text-center text-muted-foreground">Loading…</td></tr>
              ) : customers.length === 0 ? (
                <tr><td colSpan={8} className="p-6 text-center text-muted-foreground">Chưa có khách hàng.</td></tr>
              ) : (
                customers.map((c) => {
                  const k = String(c.id || c.name);
                  const e = edits[k] ?? { description: "", final_amount: 0 };
                  
                  const products = (c.purchased_products ?? "")
                    .split(",")
                    .map((s) => s.trim())
                    .filter(Boolean);

                  const trackings = (c.tracking_numbers ?? "")
                    .split(",")
                    .map((s) => s.trim())
                    .filter(Boolean);

                  return (
                    <tr key={k} className="border-t border-border align-top hover:bg-[hsl(160_60%_98%)]">
                      <td className="p-3 font-medium">
                        <div>{c.name}</div>
                      </td>
                      <td className="p-3 text-muted-foreground max-w-[200px] break-words">{c.contact_info}</td>
                      <td className="p-3">
                        <div className="flex flex-wrap gap-1">
                          {products.map((p, i) => (
                            <Badge key={i} variant="secondary" className="bg-[hsl(160_60%_92%)] text-[hsl(160_70%_25%)]">
                              {p}
                            </Badge>
                          ))}
                        </div>
                      </td>
                      <td className="p-3 min-w-[140px]">
                        <div className="flex flex-wrap gap-1">
                          {trackings.length === 0 ? "—" : trackings.map((t, i) => (
                            <Badge key={i} variant="outline" className="text-xs border-[hsl(160_70%_45%)]/40">
                              {t}
                            </Badge>
                          ))}
                        </div>
                      </td>
                      <td className="p-3 text-right font-semibold text-[hsl(160_70%_30%)]">
                        {fmtVND(c.total_spent)}
                      </td>
                      <td className="p-3 text-right font-semibold text-[hsl(160_70%_38%)]">
                        {fmtVND(c.total_profit)}
                      </td>
                      <td className="p-3">
                        <Input
                          className="min-w-[150px]"
                          value={e.description}
                          onChange={(ev) =>
                            setEdits({ ...edits, [k]: { ...e, description: ev.target.value } })
                          }
                        />
                      </td>
                      <td className="p-3">
                        <Button
                          size="sm"
                          onClick={() =>
                            update.mutate({
                              ...c,
                              description: e.description,
                              final_amount: e.final_amount,
                            })
                          }
                          disabled={update.isPending}
                        >
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
