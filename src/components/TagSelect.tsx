import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { api } from "@/lib/api";
import type { Tag } from "@/lib/types";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const NEW_TAG = "__new__";
const NONE_TAG = "__none__";

export const useTags = () =>
  useQuery({
    queryKey: ["tags"],
    queryFn: async () => {
      try {
        return await api.get<Tag[]>("/tags");
      } catch {
        return [] as Tag[];
      }
    },
  });

type Props = {
  value?: string;
  onChange: (val: string | undefined) => void;
  allowNone?: boolean;
  placeholder?: string;
};

export const TagSelect = ({ value, onChange, allowNone = true, placeholder = "Select tag" }: Props) => {
  const qc = useQueryClient();
  const { data: tags = [] } = useTags();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");

  const create = useMutation({
    mutationFn: (n: string) => api.post<Tag>("/tags", { name: n }),
    onSuccess: (t) => {
      toast.success("Tag added");
      qc.invalidateQueries({ queryKey: ["tags"] });
      onChange(t.name);
      setOpen(false);
      setName("");
    },
  });

  return (
    <>
      <Select
        value={value ?? ""}
        onValueChange={(v) => {
          if (v === NEW_TAG) {
            setOpen(true);
            return;
          }
          if (v === NONE_TAG) {
            onChange(undefined);
            return;
          }
          onChange(v);
        }}
      >
        <SelectTrigger>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {allowNone && <SelectItem value={NONE_TAG}>— None —</SelectItem>}
          {tags.map((t) => (
            <SelectItem key={String(t.id ?? t.name)} value={t.name}>
              {t.name}
            </SelectItem>
          ))}
          <SelectItem value={NEW_TAG} className="text-primary font-medium">
            + Thêm tag mới
          </SelectItem>
        </SelectContent>
      </Select>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Thêm tag mới</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Label>Tên tag</Label>
            <Input
              value={name}
              autoFocus
              onChange={(e) => setName(e.target.value)}
              placeholder="VD: Nhà A"
            />
          </div>
          <DialogFooter>
            <Button
              onClick={() => name.trim() && create.mutate(name.trim())}
              disabled={!name.trim() || create.isPending}
            >
              {create.isPending ? "Saving…" : "Lưu"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
