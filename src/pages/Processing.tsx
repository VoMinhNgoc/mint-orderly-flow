import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Trash2, ShoppingBag, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import type { Customer, CustomerProduct, Order, OrderAssignment } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ProductIdLink } from "@/components/ProductIdLink";
import { NumberInput } from "@/components/NumberInput";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const Processing = () => {
  const qc = useQueryClient();
  const [buyOrder, setBuyOrder] = useState<Order | null>(null);
  const [form, setForm] = useState({
    name: "",
    contact_info: "",
    tracking_number: "",
    quantity: 1,
  });

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ["orders"],
    queryFn: () => api.get<Order[]>("/orders"),
  });
  const { data: customers = [] } = useQuery({
    queryKey: ["customers"],
    queryFn: () => api.get<Customer[]>("/customers"),
  });

  const visible = orders.filter((o) => o.status !== "canceled");

  const assigned = (o: Order) =>
    (o.assignments ?? []).reduce((s, a) => s + Number(a.quantity || 0), 0);
  const remaining = (o: Order) => Number(o.split_sets) - assigned(o);

  const del = useMutation({
    mutationFn: (id: Order["id"]) => api.del<void>(`/orders/${id}`),
    onSuccess: () => {
      toast.success("Order canceled");
      qc.invalidateQueries({ queryKey: ["orders"] });
    },
  });

  const buy = useMutation({
    mutationFn: async () => {
      if (!buyOrder) return;
      const order = buyOrder;
      const qty = Number(form.quantity);
      const left = remaining(order);
      if (qty <= 0) throw new Error("Số lượng phải > 0");
      if (qty > left) throw new Error(`Vượt giới hạn. Còn lại ${left}.`);

      await api.post("/assign-customer", {
        order_id: order.id,
        product_id: order.product_id,
        product_name: order.product_name,
        product_price: Number(order.product_price),
        markup_fee: Number(order.markup_fee),
        customer_name: form.name.trim(),
        contact_info: form.contact_info.trim(),
        tracking_number: form.tracking_number.trim(),
        quantity: qty,
      });
    },
    onSuccess: () => {
      toast.success("Đã gán khách hàng");
      qc.invalidateQueries({ queryKey: ["orders"] });
      qc.invalidateQueries({ queryKey: ["customers"] });
      setBuyOrder(null);
      setForm({ name: "", contact_info: "", tracking_number: "", quantity: 1 });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const openBuy = (o: Order) => {
    setBuyOrder(o);
    setForm({ name: "", contact_info: "", tracking_number: "", quantity: Math.max(1, remaining(o)) });
  };

  const dialogRemaining = useMemo(
    () => (buyOrder ? remaining(buyOrder) : 0),
    [buyOrder, orders]
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Processing Orders</h1>
        <p className="text-muted-foreground">Gán nhiều khách cho một đơn. Tổng số lượng ≤ Split Sets.</p>
      </div>

      {isLoading ? (
        <p className="text-muted-foreground">Loading…</p>
      ) : visible.length === 0 ? (
        <p className="text-muted-foreground">No orders in processing.</p>
      ) : (
        <div className="space-y-4">
          {visible.map((o) => {
            const assignedQty = assigned(o);
            const left = remaining(o);
            const list = o.assignments ?? [];
            return (
              <Card key={o.id} className="rounded-2xl shadow-[var(--shadow-card)] overflow-hidden">
                <div className="grid lg:grid-cols-[1fr_320px]">
                  <div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-secondary text-secondary-foreground">
                          <tr>
                            <th className="text-left p-3 font-medium">ID</th>
                            <th className="text-left p-3 font-medium">Name</th>
                            <th className="text-left p-3 font-medium">Description</th>
                            <th className="text-right p-3 font-medium">Split</th>
                            <th className="text-right p-3 font-medium">Price</th>
                            <th className="text-right p-3 font-medium">Markup</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr>
                            <td className="p-3"><ProductIdLink id={o.product_id} /></td>
                            <td className="p-3">{o.product_name}</td>
                            <td className="p-3">{o.simple_description}</td>
                            <td className="p-3 text-right">{o.split_sets}</td>
                            <td className="p-3 text-right">{Number(o.product_price).toLocaleString("vi-VN")}</td>
                            <td className="p-3 text-right">{Number(o.markup_fee).toLocaleString("vi-VN")}</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                    <div className="p-3 flex flex-wrap gap-2 items-center justify-between border-t border-border">
                      <div className="text-sm text-muted-foreground">
                        Đã gán: <span className="font-semibold text-foreground">{assignedQty}</span> /{" "}
                        {o.split_sets} · Còn lại:{" "}
                        <span className={left > 0 ? "font-semibold text-primary" : "text-muted-foreground"}>
                          {left}
                        </span>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" onClick={() => openBuy(o)} disabled={left <= 0}>
                          <UserPlus className="h-4 w-4 mr-1" />
                          {left <= 0 ? "Đã đủ" : "Buy"}
                        </Button>
                        <Button size="sm" variant="destructive" onClick={() => del.mutate(o.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                  <aside className="bg-accent/40 p-4 border-t lg:border-t-0 lg:border-l border-border">
                    <div className="text-xs uppercase tracking-wide text-muted-foreground mb-2 flex items-center gap-2">
                      <ShoppingBag className="h-3 w-3" /> Khách hàng đã gán
                    </div>
                    {list.length === 0 ? (
                      <p className="text-sm text-muted-foreground">Chưa có khách.</p>
                    ) : (
                      <ul className="space-y-2">
                        {list.map((a, i) => (
                          <li key={i} className="text-sm bg-background rounded-md p-2 border border-border">
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-medium truncate">{a.customer_name}</span>
                              <Badge variant="secondary">×{a.quantity}</Badge>
                            </div>
                            <div className="text-xs text-muted-foreground truncate">
                              {a.tracking_number || "—"}
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                  </aside>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={!!buyOrder} onOpenChange={(o) => !o && setBuyOrder(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Gán khách hàng</DialogTitle>
          </DialogHeader>
          {buyOrder && (
            <div className="grid gap-3 py-2">
              <div className="text-sm text-muted-foreground">
                {buyOrder.product_name} · Còn lại{" "}
                <span className="font-semibold text-foreground">{dialogRemaining}</span> / {buyOrder.split_sets}
              </div>
              <div className="space-y-1.5">
                <Label>Tên khách hàng</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Thông tin liên lạc</Label>
                <Input
                  value={form.contact_info}
                  onChange={(e) => setForm({ ...form, contact_info: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Mã vận đơn (Tracking)</Label>
                <Input
                  value={form.tracking_number}
                  onChange={(e) => setForm({ ...form, tracking_number: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Số lượng (≤ {dialogRemaining})</Label>
                <NumberInput
                  value={form.quantity}
                  onChange={(n) => setForm({ ...form, quantity: n })}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button
              onClick={() => buy.mutate()}
              disabled={!form.name || form.quantity <= 0 || form.quantity > dialogRemaining || buy.isPending}
            >
              {buy.isPending ? "Saving…" : "Xác nhận"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Processing;
