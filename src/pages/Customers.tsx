import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { RotateCcw, Save } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import type { Customer } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { NumberInput } from "@/components/NumberInput";
import { ProductIdLink } from "@/components/ProductIdLink";

type Edits = Record<string, { description: string; final_amount: number }>;

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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Customer List</h1>
        <p className="text-muted-foreground">Edit description and final payment amount.</p>
      </div>

      <Card className="rounded-2xl shadow-[var(--shadow-card)] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-secondary text-secondary-foreground">
              <tr>
                <th className="text-left p-3 font-medium">Name</th>
                <th className="text-left p-3 font-medium">Contact</th>
                <th className="text-left p-3 font-medium">Date</th>
                <th className="text-left p-3 font-medium">Products</th>
                <th className="text-left p-3 font-medium">Description</th>
                <th className="text-right p-3 font-medium">Suggested</th>
                <th className="text-left p-3 font-medium">Final Amount</th>
                <th className="p-3"></th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={8} className="p-6 text-center text-muted-foreground">Loading…</td></tr>
              ) : customers.length === 0 ? (
                <tr><td colSpan={8} className="p-6 text-center text-muted-foreground">No customers yet.</td></tr>
              ) : (
                customers.map((c) => {
                  const k = String(c.id);
                  const e = edits[k] ?? { description: "", final_amount: 0 };
                  return (
                    <tr key={c.id} className="border-t border-border align-top">
                      <td className="p-3 font-medium">{c.name}</td>
                      <td className="p-3">{c.contact_info}</td>
                      <td className="p-3">{c.purchase_date}</td>
                      <td className="p-3">
                        <div className="flex flex-wrap gap-2">
                          {(c.product_ids ?? []).map((pid) => (
                            <ProductIdLink key={pid} id={pid} />
                          ))}
                        </div>
                      </td>
                      <td className="p-3 min-w-[180px]">
                        <Input
                          value={e.description}
                          onChange={(ev) =>
                            setEdits({ ...edits, [k]: { ...e, description: ev.target.value } })
                          }
                        />
                      </td>
                      <td className="p-3 text-right text-muted-foreground">
                        {Number(c.suggested_amount ?? 0).toLocaleString('vi-VN')}
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
                                [k]: { ...e, final_amount: Number(c.suggested_amount ?? 0) },
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
