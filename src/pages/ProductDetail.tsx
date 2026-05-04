import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { api } from "@/lib/api";
import type { Product } from "@/lib/types";
import { Card } from "@/components/ui/card";

const ProductDetail = () => {
  const { id = "" } = useParams();
  const { data, isLoading, error } = useQuery({
    queryKey: ["product", id],
    queryFn: () => api.get<Product>(`/products/${id}`),
    enabled: !!id,
  });

  return (
    <div className="space-y-6">
      <Link
        to="/products"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary"
      >
        <ArrowLeft className="h-4 w-4" /> Back to catalog
      </Link>

      {isLoading ? (
        <p className="text-muted-foreground">Loading…</p>
      ) : error || !data ? (
        <p className="text-muted-foreground">Product not found.</p>
      ) : (
        <Card className="overflow-hidden rounded-3xl shadow-[var(--shadow-soft)]">
          <div className="grid md:grid-cols-2 gap-0">
            <div className="aspect-square bg-muted">
              {data.image_url ? (
                <img src={data.image_url} alt={data.name} className="h-full w-full object-cover" />
              ) : (
                <div className="h-full w-full flex items-center justify-center text-muted-foreground">
                  No image
                </div>
              )}
            </div>
            <div className="p-8 space-y-4">
              <div className="font-mono text-sm text-primary">{data.id}</div>
              <h1 className="text-3xl font-bold text-foreground">{data.name}</h1>
              <div className="text-2xl font-semibold text-primary">
                ${Number(data.base_price).toFixed(2)}
              </div>
              <p className="text-foreground/80 whitespace-pre-wrap leading-relaxed">
                {data.description}
              </p>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
};

export default ProductDetail;
