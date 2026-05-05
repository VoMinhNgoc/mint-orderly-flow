import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { api } from "@/lib/api";
import type { Product } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { NumberInput } from "@/components/NumberInput";
import { TagSelect } from "@/components/TagSelect";

const empty: Product = { id: "", name: "", description: "", image_url: "", base_price: 0, tag: undefined };

const Products = () => {
  const qc = useQueryClient();
  const [form, setForm] = useState<Product>(empty);

  const { data: products = [], isLoading } = useQuery({
    queryKey: ["products"],
    queryFn: () => api.get<Product[]>("/products"),
  });

  const create = useMutation({
    mutationFn: (p: Product) => api.post<Product>("/products", p),
    onSuccess: () => {
      toast.success("Product saved");
      setForm(empty);
      qc.invalidateQueries({ queryKey: ["products"] });
      qc.refetchQueries({ queryKey: ["tags"] });
    },
  });

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.id.trim() || !form.name.trim()) {
      toast.error("Product ID and Name are required");
      return;
    }
    create.mutate(form);
  };

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
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="description">Long Description</Label>
            <Textarea
              id="description"
              rows={4}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </div>
          <div className="md:col-span-2">
            <Button type="submit" disabled={create.isPending}>
              {create.isPending ? "Saving…" : "Save Product"}
            </Button>
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
              <Link key={p.id} to={`/products/${p.id}`}>
                <Card className="overflow-hidden rounded-2xl shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-soft)] transition-shadow">
                  <div className="aspect-square bg-muted">
                    {p.image_url ? (
                      <img
                        src={p.image_url}
                        alt={p.name}
                        className="h-full w-full object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <div className="h-full w-full flex items-center justify-center text-muted-foreground text-sm">
                        No image
                      </div>
                    )}
                  </div>
                  <div className="p-4 space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <div className="font-mono text-xs text-primary">{p.id}</div>
                      {p.tag && <Badge variant="secondary">{p.tag}</Badge>}
                    </div>
                    <div className="font-semibold text-foreground line-clamp-1">{p.name}</div>
                    <div className="text-sm text-muted-foreground">
                      {Number(p.base_price).toLocaleString('vi-VN')} VNĐ
                    </div>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};

export default Products;
