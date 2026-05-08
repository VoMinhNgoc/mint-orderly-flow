import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Pencil, Trash2, ShoppingCart } from "lucide-react";
import { api } from "@/lib/api";
import type { Product, CartItem } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { NumberInput } from "@/components/NumberInput";
import { TagSelect } from "@/components/TagSelect";
import { ProductIdLink } from "@/components/ProductIdLink";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const today = () => new Date().toISOString().slice(0, 10);
const empty: Product = { id: "", name: "", description: "", image_url: "", base_price: 0, tag: undefined, expiry_date: today() };

const Products = () => {
  const qc = useQueryClient();
  const [form, setForm] = useState<Product>(empty);
  const [isEditing, setIsEditing] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { data: products = [], isLoading } = useQuery({
    queryKey: ["products"],
    queryFn: () => api.get<Product[]>("/products"),
  });

  const resetForm = () => {
    setForm(empty);
    setIsEditing(false);
  };

  const create = useMutation({
    mutationFn: (p: Product) => api.post<Product>("/products", p),
    onSuccess: () => {
      toast.success("Product saved");
      resetForm();
      qc.invalidateQueries({ queryKey: ["products"] });
      qc.invalidateQueries({ queryKey: ["tags"] });
    },
  });

  const update = useMutation({
    mutationFn: (p: Product) => api.put<Product>(`/products/${p.id}`, p),
    onSuccess: () => {
      toast.success("Product updated");
      resetForm();
      qc.invalidateQueries({ queryKey: ["products"] });
      qc.invalidateQueries({ queryKey: ["tags"] });
    },
  });

  const remove = useMutation({
    mutationFn: (id: string) => api.del<void>(`/products/${id}`),
    onSuccess: () => {
      toast.success("Product deleted");
      setDeleteId(null);
      qc.invalidateQueries({ queryKey: ["products"] });
    },
  });

  const addToCart = useMutation({
    mutationFn: (p: Product) => {
      const item: Omit<CartItem, "id"> = {
        product_id: p.id,
        product_name: p.name,
        simple_description: "",
        base_sets: 1,
        split_sets: 1,
        units_per_set: 1,
        product_price: p.base_price,
        markup_fee: 0,
        expiry_date: p.expiry_date || today(),
        tag: p.tag,
      };
      return api.post<CartItem>("/cart", item);
    },
    onSuccess: () => {
      toast.success("Added to cart");
      qc.invalidateQueries({ queryKey: ["cart"] });
    },
  });

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.id.trim() || !form.name.trim()) {
      toast.error("Product ID and Name are required");
      return;
    }
    if (isEditing) update.mutate(form);
    else create.mutate(form);
  };

  const onEdit = (p: Product) => {
    setForm(p);
    setIsEditing(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const pending = create.isPending || update.isPending;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Product Catalog</h1>
        <p className="text-muted-foreground">Add and browse products. IDs are clickable everywhere.</p>
      </div>

      <Card className="p-6 rounded-2xl shadow-[var(--shadow-card)]">
        <form onSubmit={onSubmit} className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="id">Product ID (e.g. yt09)</Label>
            <Input
              id="id"
              value={form.id}
              onChange={(e) => setForm({ ...form, id: e.target.value })}
              placeholder="yt09"
              disabled={isEditing}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="image_url">Image URL</Label>
            <Input
              id="image_url"
              value={form.image_url}
              onChange={(e) => setForm({ ...form, image_url: e.target.value })}
              placeholder="https://…"
            />
            {form.image_url && (
              <div className="mt-2 aspect-square w-32 overflow-hidden rounded-lg border bg-muted">
                <img
                  src={form.image_url.replace("github.com", "raw.githubusercontent.com").replace("/blob/", "/").split("?")[0]}
                  alt="Preview"
                  className="h-full w-full object-cover"
                  onError={(e) => (e.currentTarget.style.display = "none")}
                />
              </div>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="base_price">Base Price (VNĐ)</Label>
            <NumberInput
              id="base_price"
              format="thousand"
              value={form.base_price}
              onChange={(n) => setForm({ ...form, base_price: n })}
              placeholder="0"
            />
          </div>
          <div className="space-y-2">
            <Label>Tag</Label>
            <TagSelect value={form.tag} onChange={(t) => setForm({ ...form, tag: t })} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="expiry_date">Expiry Date</Label>
            <Input
              id="expiry_date"
              type="date"
              value={form.expiry_date ?? ""}
              onChange={(e) => setForm({ ...form, expiry_date: e.target.value })}
            />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="description">Long Description</Label>
            <Textarea
              id="description"
              rows={4}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </div>
          <div className="md:col-span-2 flex gap-2">
            <Button type="submit" disabled={pending}>
              {pending ? "Saving…" : isEditing ? "Update Product" : "Save Product"}
            </Button>
            {isEditing && (
              <Button type="button" variant="outline" onClick={resetForm}>
                Cancel
              </Button>
            )}
          </div>
        </form>
      </Card>

      <section>
        <h2 className="text-xl font-semibold mb-4 text-foreground">Catalog</h2>
        {isLoading ? (
          <p className="text-muted-foreground">Loading…</p>
        ) : products.length === 0 ? (
          <p className="text-muted-foreground">No products yet.</p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {products.map((p) => (
              <Card
                key={p.id}
                className="overflow-hidden rounded-2xl shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-soft)] transition-shadow flex flex-col"
              >
                <div className="aspect-square bg-muted">
                  {p.image_url ? (
                    <img src={p.image_url} alt={p.name} className="h-full w-full object-cover" loading="lazy" />
                  ) : (
                    <div className="h-full w-full flex items-center justify-center text-muted-foreground text-sm">
                      No image
                    </div>
                  )}
                </div>
                <div className="p-4 space-y-2 flex-1 flex flex-col">
                  <div className="flex items-center justify-between gap-2">
                    <ProductIdLink id={p.id} />
                    {p.tag && <Badge variant="secondary">{p.tag}</Badge>}
                  </div>
                  <div className="font-semibold text-foreground line-clamp-1">{p.name}</div>
                  <div className="text-sm text-muted-foreground">
                    {Number(p.base_price).toLocaleString("vi-VN")} VNĐ
                  </div>
                  {p.expiry_date && (
                    <div className="text-xs text-muted-foreground">HSD: {p.expiry_date}</div>
                  )}
                  <Button
                    size="sm"
                    className="w-full mt-2"
                    onClick={() => addToCart.mutate(p)}
                    disabled={addToCart.isPending}
                  >
                    <ShoppingCart className="h-4 w-4 mr-1" /> Add to Cart
                  </Button>
                  <div className="flex gap-2 pt-2 mt-auto">
                    <Button size="sm" variant="outline" className="flex-1" onClick={() => onEdit(p)}>
                      <Pencil className="h-4 w-4" /> Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      className="flex-1"
                      onClick={() => setDeleteId(p.id)}
                    >
                      <Trash2 className="h-4 w-4" /> Delete
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </section>

      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xóa sản phẩm?</AlertDialogTitle>
            <AlertDialogDescription>
              Hành động này không thể hoàn tác. Sản phẩm <span className="font-mono">{deleteId}</span> sẽ bị xóa vĩnh viễn.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Hủy</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteId && remove.mutate(deleteId)}
              disabled={remove.isPending}
            >
              {remove.isPending ? "Deleting…" : "Xóa"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Products;
