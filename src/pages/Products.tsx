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

const empty: Product = { id: "", name: "", description: "", image_url: "", base_price: 0 };

// Biến số thành chuỗi có dấu phẩy: 3000 -> "3,000"
const formatDisplayPrice = (val: number | string) => {
  if (val === "" || val === 0) return "";
  const num = parseFloat(val.toString().replace(/,/g, ""));
  return isNaN(num) ? "" : new Intl.NumberFormat('en-US').format(num);
};

// Biến chuỗi có dấu phẩy thành số thuần: "3,000" -> 3000
const parseRawPrice = (val: string) => {
  return val.replace(/,/g, "");
};

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
    },
  });

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.id.trim() || !form.name.trim()) {
      toast.error("Product ID and Name are required");
      return;
    }
    create.mutate({ ...form, base_price: Number(parseRawPrice(form.base_price.toString())) });
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
            <Label htmlFor="base_price">Base Price</Label>
            <Input
              id="base_price"
              type="text" // Đổi thành text để hiện dấu phẩy
              value={formatDisplayPrice(form.base_price)} // Gọi hàm format hiển thị
              onChange={(e) => {
                const raw = parseRawPrice(e.target.value); // Lấy số thuần túy
                // Chỉ cập nhật nếu là số hoặc chuỗi rỗng
                if (!isNaN(Number(raw)) || raw === "") {
                  setForm({ ...form, base_price: raw as any }); 
                }
              }}
              placeholder="0"
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
                    <div className="font-mono text-xs text-primary">{p.id}</div>
                    <div className="font-semibold text-foreground line-clamp-1">{p.name}</div>
                    <div className="text-sm text-muted-foreground">
                      ${Number(p.base_price).toLocaleString('en-US', { minimumFractionDigits: 2 })}
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
