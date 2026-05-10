import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { RotateCcw, Save } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import type { Customer, CustomerProduct } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { NumberInput } from "@/components/NumberInput";
import { ProductIdLink } from "@/components/ProductIdLink";

type Edits = Record<string, { description: string; final_amount: number }>;

const fmtVND = (n: number) =>
  Number(n || 0).toLocaleString("vi-VN", { style: "currency", currency: "VND", maximumFractionDigits: 0 });

const productTotal = (p: CustomerProduct) =>
  (Number(p.product_price) + Number(p.markup_fee)) * Number(p.quantity);
const productProfit = (p: CustomerProduct) =>
  Number(p.markup_fee) * Number(p.quantity);

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
      next[String(c.id)] = {
        description: c.description ?? "",
        final_amount: Number(c.final_amount ?? c.suggested_amount ?? 0),
      };
    }
    setEdits(next);
  }, [customers]);

  const update = useMutation({
    mutationFn: (c: Customer) => api.patch<Customer>(`/customers/${c.id}`, c),
    onSuccess: () => {
      toast.success("Customer updated");
      qc.invalidateQueries({ queryKey: ["customers"] });
    },
  });

  const totals = useMemo(() => {
    let revenue = 0;
    let profit = 0;
    for (const c of customers) {
      const r = Number(c.total_spent ?? 0)
        || (c.product_details ?? []).reduce((s, p) => s + productTotal(p), 0);
      const pr = Number(c.total_profit ?? 0)
        || (c.product_details ?? []).reduce((s, p) => s + productProfit(p), 0);
      revenue += r;
      profit += pr;
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
            <div className="text-muted-foreground text-xs">Tổng lời</div>
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
                <th className="text-left p-3 font-medium">Final Amount</th>
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
                  const k = String(c.id);
                  const e = edits[k] ?? { description: "", final_amount: 0 };
                  const details = c.product_details ?? [];
                  const totalPay = details.reduce((s, p) => s + productTotal(p), 0)
                    || Number(c.suggested_amount ?? 0);
                  const profit = details.reduce((s, p) => s + productProfit(p), 0);
                  return (
                    <tr key={c.id} className="border-t border-border align-top">
                      <td className="p-3 font-medium">
                        <div>{c.name}</div>
                        <div className="text-xs text-muted-foreground">{c.purchase_date}</div>
                      </td>
                      <td className="p-3 text-muted-foreground">{c.contact_info}</td>
                      <td className="p-3 min-w-[260px]">
                        {details.length > 0 ? (
                          <ul className="space-y-1.5">
                            {details.map((p, i) => (
                              <li key={i} className="text-xs flex items-center gap-2 flex-wrap">
                                <ProductIdLink id={p.product_id} />
                                <span className="font-medium">{p.product_name}</span>
                                <Badge variant="secondary">×{p.quantity}</Badge>
                                {p.tracking_number && (
                                  <span className="text-muted-foreground">[{p.tracking_number}]</span>
                                )}
                                <span className="text-muted-foreground">
                                  {productTotal(p).toLocaleString("vi-VN")}
                                </span>
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <div className="flex flex-wrap gap-2">
                            {(c.product_ids ?? []).map((pid) => (
                              <ProductIdLink key={pid} id={pid} />
                            ))}
                          </div>
                        )}
                      </td>
                      <td className="p-3 text-right font-semibold text-primary whitespace-nowrap">
                        {totalPay.toLocaleString("vi-VN")}
                      </td>
                      <td className="p-3 text-right font-semibold text-foreground whitespace-nowrap">
                        {profit.toLocaleString("vi-VN")}
                      </td>
                      <td className="p-3 min-w-[180px]">
                        <Input
                          value={e.description}
                          onChange={(ev) =>
                            setEdits({ ...edits, [k]: { ...e, description: ev.target.value } })
                          }
                        />
                      </td>
                      <td className="p-3 min-w-[180px]">
                        <div className="flex gap-1.5">
                          <NumberInput
                            format="thousand"
                            value={e.final_amount}
                            onChange={(n) =>
                              setEdits({ ...edits, [k]: { ...e, final_amount: n } })
                            }
                          />
                          <Button
                            size="icon"
                            variant="outline"
                            title="Reset to Suggested"
                            onClick={() =>
                              setEdits({
                                ...edits,
                                [k]: { ...e, final_amount: Number(c.suggested_amount ?? totalPay) },
                              })
                            }
                          >
                            <RotateCcw className="h-4 w-4" />
                          </Button>
                        </div>
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
                          <Save className="h-4 w-4 mr-1" /> Save
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
