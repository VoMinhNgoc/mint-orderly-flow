import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Trash2, Plus, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import type { CartItem, Product } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { ProductIdLink } from "@/components/ProductIdLink";
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
});

const Cart = () => {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<DraftItem>(blank());

  const { data: items = [], isLoading } = useQuery({
    queryKey: ["cart"],
    queryFn: () => api.get<CartItem[]>("/cart"),
  });
  const { data: products = [] } = useQuery({
    queryKey: ["products"],
    queryFn: () => api.get<Product[]>("/products"),
  });

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
    if (p) setDraft({ ...draft, product_id: p.id, product_name: p.name, product_price: p.base_price });
  };

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
                  <Input
                    type="number"
                    value={draft.base_sets}
                    onChange={(e) => setDraft({ ...draft, base_sets: Number(e.target.value) })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Split Sets</Label>
                  <Input
                    type="number"
                    value={draft.split_sets}
                    onChange={(e) => setDraft({ ...draft, split_sets: Number(e.target.value) })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Units / Set</Label>
                  <Input
                    type="number"
                    value={draft.units_per_set}
                    onChange={(e) => setDraft({ ...draft, units_per_set: Number(e.target.value) })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1.5">
                  <Label>Product Price</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={draft.product_price}
                    onChange={(e) => setDraft({ ...draft, product_price: Number(e.target.value) })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Markup Fee</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={draft.markup_fee}
                    onChange={(e) => setDraft({ ...draft, markup_fee: Number(e.target.value) })}
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

      <Card className="rounded-2xl shadow-[var(--shadow-card)] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-secondary text-secondary-foreground">
              <tr>
                <th className="text-left p-3 font-medium">Product ID</th>
                <th className="text-left p-3 font-medium">Name</th>
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
                <tr><td colSpan={10} className="p-6 text-center text-muted-foreground">Loading…</td></tr>
              ) : items.length === 0 ? (
                <tr><td colSpan={10} className="p-6 text-center text-muted-foreground">Cart is empty.</td></tr>
              ) : (
                items.map((it) => (
                  <tr key={it.id} className="border-t border-border">
                    <td className="p-3"><ProductIdLink id={it.product_id} /></td>
                    <td className="p-3">{it.product_name}</td>
                    <td className="p-3">{it.simple_description}</td>
                    <td className="p-3 text-right">{it.base_sets}</td>
                    <td className="p-3 text-right">{it.split_sets}</td>
                    <td className="p-3 text-right">{it.units_per_set}</td>
                    <td className="p-3 text-right">${Number(it.product_price).toFixed(2)}</td>
                    <td className="p-3 text-right">${Number(it.markup_fee).toFixed(2)}</td>
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
