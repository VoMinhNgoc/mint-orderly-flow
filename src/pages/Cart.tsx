import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Trash2, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import type { CartItem } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ProductIdLink } from "@/components/ProductIdLink";
import { NumberInput } from "@/components/NumberInput";
import { useTags } from "@/components/TagSelect";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const ALL = "__all__";

const lineTotal = (it: CartItem) =>
  (Number(it.product_price) + Number(it.markup_fee)) * Number(it.split_sets);

const Cart = () => {
  const qc = useQueryClient();
  const [filterTag, setFilterTag] = useState<string>(ALL);

  const { data: serverItems = [], isLoading } = useQuery({
    queryKey: ["cart"],
    queryFn: () => api.get<CartItem[]>("/cart"),
  });
  const { data: tags = [] } = useTags();

  // Local optimistic state for inline edits
  const [items, setItems] = useState<CartItem[]>([]);
  useEffect(() => setItems(serverItems), [serverItems]);

  const delItem = useMutation({
    mutationFn: (id: CartItem["id"]) => api.del<void>(`/cart/${id}`),
    onSuccess: () => {
      toast.success("Đã xóa");
      qc.invalidateQueries({ queryKey: ["cart"] });
    },
  });

  const proceed = useMutation({
    mutationFn: async (item: CartItem) => {
      await api.post("/orders", {
        product_id: item.product_id,
        product_name: item.product_name,
        simple_description: item.simple_description,
        base_sets: item.base_sets,
        split_sets: item.split_sets,
        units_per_set: item.units_per_set,
        product_price: item.product_price,
        markup_fee: item.markup_fee,
        tag: item.tag,
        status: "pending",
      });
      await api.del(`/cart/${item.id}`);
    },
    onSuccess: () => {
      toast.success("Chuyển sang Processing");
      qc.invalidateQueries({ queryKey: ["cart"] });
      qc.invalidateQueries({ queryKey: ["orders"] });
    },
  });

  // Debounced PUT per row
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const patchRow = (id: CartItem["id"], patch: Partial<CartItem>) => {
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, ...patch } : it)));
    const key = String(id);
    if (timers.current[key]) clearTimeout(timers.current[key]);
    timers.current[key] = setTimeout(() => {
      const current = (items.find((x) => x.id === id) ?? {}) as CartItem;
      const next = { ...current, ...patch };
      api.put<CartItem>(`/cart/${id}`, next).catch(() => {
        // toast already shown by api layer; refetch to sync
        qc.invalidateQueries({ queryKey: ["cart"] });
      });
    }, 500);
  };

  const filtered = useMemo(
    () => (filterTag === ALL ? items : items.filter((it) => (it.tag ?? "") === filterTag)),
    [items, filterTag]
  );

  const filteredTotal = useMemo(
    () => filtered.reduce((sum, it) => sum + lineTotal(it), 0),
    [filtered]
  );

  const proceedAll = async () => {
    for (const it of filtered) await proceed.mutateAsync(it);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Shopping Cart</h1>
          <p className="text-muted-foreground">Chỉnh trực tiếp trên dòng. Tự động lưu.</p>
        </div>
        {filtered.length > 0 && (
          <Button onClick={proceedAll} disabled={proceed.isPending}>
            <ArrowRight className="h-4 w-4 mr-1" /> Proceed All ({filtered.length})
          </Button>
        )}
      </div>

      <Card className="p-4 rounded-2xl shadow-[var(--shadow-card)] flex flex-wrap items-center gap-3">
        <Label className="text-sm">Lọc theo tag:</Label>
        <div className="min-w-[200px]">
          <Select value={filterTag} onValueChange={setFilterTag}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Tất cả</SelectItem>
              {tags.map((t) => (
                <SelectItem key={String(t.id ?? t.name)} value={t.name}>
                  {t.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="ml-auto text-sm">
          <span className="text-muted-foreground">Tổng ({filtered.length} mục): </span>
          <span className="font-bold text-primary">
            {filteredTotal.toLocaleString("vi-VN")} VNĐ
          </span>
        </div>
      </Card>

      <Card className="rounded-2xl shadow-[var(--shadow-card)] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-secondary text-secondary-foreground">
              <tr>
                <th className="text-left p-3 font-medium">Product ID</th>
                <th className="text-left p-3 font-medium">Name</th>
                <th className="text-left p-3 font-medium">Tag</th>
                <th className="text-right p-3 font-medium w-24">Base Sets</th>
                <th className="text-right p-3 font-medium w-24">Split Sets</th>
                <th className="text-right p-3 font-medium w-24">Units/Set</th>
                <th className="text-right p-3 font-medium w-32">Price</th>
                <th className="text-right p-3 font-medium w-32">Markup</th>
                <th className="text-left p-3 font-medium">Expiry</th>
                <th className="text-right p-3 font-medium">Total</th>
                <th className="p-3"></th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={11} className="p-6 text-center text-muted-foreground">Loading…</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={11} className="p-6 text-center text-muted-foreground">Giỏ hàng trống. Thêm từ trang Products.</td></tr>
              ) : (
                filtered.map((it) => (
                  <tr key={it.id} className="border-t border-border align-middle">
                    <td className="p-3"><ProductIdLink id={it.product_id} /></td>
                    <td className="p-3">{it.product_name}</td>
                    <td className="p-3">{it.tag ? <Badge variant="secondary">{it.tag}</Badge> : <span className="text-muted-foreground">—</span>}</td>
                    <td className="p-2">
                      <NumberInput
                        className="text-right"
                        value={it.base_sets}
                        onChange={(n) => patchRow(it.id, { base_sets: n })}
                      />
                    </td>
                    <td className="p-2">
                      <NumberInput
                        className="text-right"
                        value={it.split_sets}
                        onChange={(n) => patchRow(it.id, { split_sets: n })}
                      />
                    </td>
                    <td className="p-2">
                      <NumberInput
                        className="text-right"
                        value={it.units_per_set}
                        onChange={(n) => patchRow(it.id, { units_per_set: n })}
                      />
                    </td>
                    <td className="p-2">
                      <NumberInput
                        className="text-right"
                        format="thousand"
                        value={it.product_price}
                        onChange={(n) => patchRow(it.id, { product_price: n })}
                      />
                    </td>
                    <td className="p-2">
                      <NumberInput
                        className="text-right"
                        format="thousand"
                        value={it.markup_fee}
                        onChange={(n) => patchRow(it.id, { markup_fee: n })}
                      />
                    </td>
                    <td className="p-3">
                      <Input type="date" value={it.expiry_date} readOnly className="bg-muted cursor-not-allowed" />
                    </td>
                    <td className="p-3 text-right font-semibold text-primary whitespace-nowrap">
                      {lineTotal(it).toLocaleString("vi-VN")}
                    </td>
                    <td className="p-3">
                      <div className="flex gap-2 justify-end">
                        <Button
                          size="sm"
                          variant="default"
                          onClick={() => proceed.mutate(it)}
                          disabled={proceed.isPending}
                        >
                          <ArrowRight className="h-4 w-4 mr-1" /> Proceed
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => delItem.mutate(it.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};

export default Cart;
