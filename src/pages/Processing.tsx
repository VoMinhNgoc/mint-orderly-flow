import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Trash2, ShoppingBag } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { calcTotal, type Order, type PaymentStatus } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ProductIdLink } from "@/components/ProductIdLink";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const Processing = () => {
  const qc = useQueryClient();
  const [buyOrder, setBuyOrder] = useState<Order | null>(null);
  const [form, setForm] = useState({
    name: "",
    contact_info: "",
    payment_status: "unpaid" as PaymentStatus,
  });

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ["orders"],
    queryFn: () => api.get<Order[]>("/orders"),
  });

  const visible = orders.filter((o) => o.status !== "canceled");

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
      const total = calcTotal(
        buyOrder.product_price,
        buyOrder.markup_fee,
        buyOrder.split_sets
      );
      const customer = await api.post<{ id: number | string }>("/customers", {
        name: form.name,
        contact_info: form.contact_info,
        purchase_date: new Date().toISOString().slice(0, 10),
        product_ids: [buyOrder.product_id],
        description: buyOrder.simple_description,
        payment_status: form.payment_status,
        suggested_amount: total,
        final_amount: total,
      });
      await api.patch(`/orders/${buyOrder.id}`, {
        status: "bought",
        customer_id: customer.id,
        customer_name: form.name,
      });
    },
    onSuccess: () => {
      toast.success("Order completed");
      qc.invalidateQueries({ queryKey: ["orders"] });
      qc.invalidateQueries({ queryKey: ["customers"] });
      setBuyOrder(null);
      setForm({ name: "", contact_info: "", payment_status: "unpaid" });
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Processing Orders</h1>
        <p className="text-muted-foreground">Confirm purchases and link customers.</p>
      </div>

      {isLoading ? (
        <p className="text-muted-foreground">Loading…</p>
      ) : visible.length === 0 ? (
        <p className="text-muted-foreground">No orders in processing.</p>
      ) : (
        <div className="space-y-4">
          {visible.map((o) => {
            const total = calcTotal(
              o.product_price,
              o.markup_fee,
              o.base_sets,
              o.split_sets,
              o.units_per_set
            );
            return (
              <Card key={o.id} className="rounded-2xl shadow-[var(--shadow-card)] overflow-hidden">
                <div className="grid lg:grid-cols-[1fr_300px]">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-secondary text-secondary-foreground">
                        <tr>
                          <th className="text-left p-3 font-medium">ID</th>
                          <th className="text-left p-3 font-medium">Name</th>
                          <th className="text-left p-3 font-medium">Description</th>
                          <th className="text-right p-3 font-medium">Base</th>
                          <th className="text-right p-3 font-medium">Split</th>
                          <th className="text-right p-3 font-medium">Units</th>
                          <th className="text-right p-3 font-medium">Price</th>
                          <th className="text-right p-3 font-medium">Markup</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td className="p-3"><ProductIdLink id={o.product_id} /></td>
                          <td className="p-3">{o.product_name}</td>
                          <td className="p-3">{o.simple_description}</td>
                          <td className="p-3 text-right">{o.base_sets}</td>
                          <td className="p-3 text-right">{o.split_sets}</td>
                          <td className="p-3 text-right">{o.units_per_set}</td>
                          <td className="p-3 text-right">{Number(o.product_price).toLocaleString('vi-VN')}</td>
                          <td className="p-3 text-right">{Number(o.markup_fee).toLocaleString('vi-VN')}</td>
                        </tr>
                      </tbody>
                    </table>
                    <div className="p-3 flex gap-2 justify-end border-t border-border">
                      <Button
                        size="sm"
                        onClick={() => setBuyOrder(o)}
                        disabled={o.status === "bought"}
                      >
                        <ShoppingBag className="h-4 w-4 mr-1" />
                        {o.status === "bought" ? "Bought" : "Buy"}
                      </Button>
                      <Button size="sm" variant="destructive" onClick={() => del.mutate(o.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <aside className="bg-accent/40 p-5 border-t lg:border-t-0 lg:border-l border-border">
                    <div className="text-xs uppercase tracking-wide text-muted-foreground mb-2">
                      Summary
                    </div>
                    <div className="space-y-1">
                      <div className="text-sm text-muted-foreground">Customer</div>
                      <div className="font-medium text-foreground">
                        {o.customer_name ?? "— not assigned —"}
                      </div>
                    </div>
                    <div className="mt-4 space-y-1">
                      <div className="text-sm text-muted-foreground">Total Due</div>
                      <div className="text-2xl font-bold text-primary">{total.toLocaleString('vi-VN')} VNĐ</div>
                      <div className="text-xs text-muted-foreground">
                        (Price + Markup) × Base × Split × Units
                      </div>
                    </div>
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
            <DialogTitle>Link Customer</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 py-2">
            <div className="space-y-1.5">
              <Label>Customer Name</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Contact Info</Label>
              <Input
                value={form.contact_info}
                onChange={(e) => setForm({ ...form, contact_info: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Payment Status</Label>
              <Select
                value={form.payment_status}
                onValueChange={(v) => setForm({ ...form, payment_status: v as PaymentStatus })}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="paid">Paid</SelectItem>
                  <SelectItem value="unpaid">Unpaid</SelectItem>
                  <SelectItem value="partial">Partial</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => buy.mutate()} disabled={!form.name || buy.isPending}>
              {buy.isPending ? "Saving…" : "Confirm Purchase"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Processing;
