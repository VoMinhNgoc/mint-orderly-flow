import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Trash2, Plus, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { calcTotal, type CartItem, type Product } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ProductIdLink } from "@/components/ProductIdLink";
import { NumberInput } from "@/components/NumberInput";
import { TagSelect, useTags } from "@/components/TagSelect";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type DraftItem = Omit<CartItem, "id">;

const blank = (p?: Product): DraftItem => ({
  product_id: p?.id ?? "",
  product_name: p?.name ?? "",
  simple_description: "",
  base_sets: 1,
  split_sets: 1,
  units_per_set: 1,
  product_price: p?.base_price ?? 0,
  markup_fee: 0,
  expiry_date: new Date().toISOString().slice(0, 10),
  tag: p?.tag,
});

const ALL = "__all__";

const Cart = () => {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<DraftItem>(blank());
  const [filterTag, setFilterTag] = useState<string>(ALL);

  const { data: items = [], isLoading } = useQuery({
    queryKey: ["cart"],
    queryFn: () => api.get<CartItem[]>("/cart"),
  });
  const { data: products = [] } = useQuery({
    queryKey: ["products"],
    queryFn: () => api.get<Product[]>("/products"),
  });
  const { data: tags = [] } = useTags();

  const addItem = useMutation({
    mutationFn: (d: DraftItem) => api.post<CartItem>("/cart", d),
    onSuccess: () => {
      toast.success("Added to cart");
      qc.invalidateQueries({ queryKey: ["cart"] });
      setOpen(false);
      setDraft(blank());
    },
  });

  const delItem = useMutation({
    mutationFn: (id: CartItem["id"]) => api.del<void>(`/cart/${id}`),
    onSuccess: () => {
      toast.success("Removed");
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
      toast.success("Moved to Processing");
      qc.invalidateQueries({ queryKey: ["cart"] });
      qc.invalidateQueries({ queryKey: ["orders"] });
    },
  });

  const onPickProduct = (id: string) => {
    const p = products.find((x) => x.id === id);
    if (p) setDraft({ ...draft, product_id: p.id, product_name: p.name, product_price: p.base_price, tag: p.tag ?? draft.tag });
  };

  const filtered = useMemo(
    () => (filterTag === ALL ? items : items.filter((it) => (it.tag ?? "") === filterTag)),
    [items, filterTag]
  );

  const filteredTotal = useMemo(
    () =>
      filtered.reduce(
        (sum, it) =>
          sum +
          (Number(it.product_price) + Number(it.markup_fee)) *
            Number(it.base_sets) *
            Number(it.split_sets) *
            Number(it.units_per_set),
        0
      ),
    [filtered]
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Shopping Cart</h1>
          <p className="text-muted-foreground">Draft orders before transaction.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-1" /> Add Item
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Add Cart Item</DialogTitle>
            </DialogHeader>
            <div className="grid gap-3 py-2">
              <div className="space-y-1.5">
                <Label>Product</Label>
                <Select value={draft.product_id} onValueChange={onPickProduct}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a product" />
                  </SelectTrigger>
                  <SelectContent>
                    {products.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.id} — {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Simple Description</Label>
                <Input
                  value={draft.simple_description}
                  onChange={(e) => setDraft({ ...draft, simple_description: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div className="space-y-1.5">
                  <Label>Base Sets</Label>
                  <NumberInput value={draft.base_sets} onChange={(n) => setDraft({ ...draft, base_sets: n })} />
                </div>
                <div className="space-y-1.5">
                  <Label>Split Sets</Label>
                  <NumberInput value={draft.split_sets} onChange={(n) => setDraft({ ...draft, split_sets: n })} />
                </div>
                <div className="space-y-1.5">
                  <Label>Units / Set</Label>
                  <NumberInput value={draft.units_per_set} onChange={(n) => setDraft({ ...draft, units_per_set: n })} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1.5">
                  <Label>Product Price (VNĐ)</Label>
                  <NumberInput
                    format="thousand"
                    value={draft.product_price}
                    onChange={(n) => setDraft({ ...draft, product_price: n })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Markup Fee (VNĐ)</Label>
                  <NumberInput
                    format="thousand"
                    value={draft.markup_fee}
                    onChange={(n) => setDraft({ ...draft, markup_fee: n })}
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Expiry Date</Label>
                <Input
                  type="date"
                  value={draft.expiry_date}
                  onChange={(e) => setDraft({ ...draft, expiry_date: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Tag</Label>
                <TagSelect value={draft.tag} onChange={(t) => setDraft({ ...draft, tag: t })} />
              </div>
            </div>
            <DialogFooter>
              <Button
                onClick={() => addItem.mutate(draft)}
                disabled={!draft.product_id || addItem.isPending}
              >
                {addItem.isPending ? "Adding…" : "Add"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
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
                <th className="text-left p-3 font-medium">Description</th>
                <th className="text-right p-3 font-medium">Base Sets</th>
                <th className="text-right p-3 font-medium">Split Sets</th>
                <th className="text-right p-3 font-medium">Units/Set</th>
                <th className="text-right p-3 font-medium">Price</th>
                <th className="text-right p-3 font-medium">Markup</th>
                <th className="text-left p-3 font-medium">Expiry</th>
                <th className="p-3"></th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={11} className="p-6 text-center text-muted-foreground">Loading…</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={11} className="p-6 text-center text-muted-foreground">Không có sản phẩm.</td></tr>
              ) : (
                filtered.map((it) => (
                  <tr key={it.id} className="border-t border-border">
                    <td className="p-3"><ProductIdLink id={it.product_id} /></td>
                    <td className="p-3">{it.product_name}</td>
                    <td className="p-3">{it.tag ? <Badge variant="secondary">{it.tag}</Badge> : <span className="text-muted-foreground">—</span>}</td>
                    <td className="p-3">{it.simple_description}</td>
                    <td className="p-3 text-right">{it.base_sets}</td>
                    <td className="p-3 text-right">{it.split_sets}</td>
                    <td className="p-3 text-right">{it.units_per_set}</td>
                    <td className="p-3 text-right">{Number(it.product_price).toLocaleString('vi-VN')}</td>
                    <td className="p-3 text-right">{Number(it.markup_fee).toLocaleString('vi-VN')}</td>
                    <td className="p-3">{it.expiry_date}</td>
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
