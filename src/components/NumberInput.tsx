import * as React from "react";
import { Input } from "@/components/ui/input";

type Props = Omit<React.ComponentProps<typeof Input>, "value" | "onChange" | "type"> & {
  value: number;
  onChange: (n: number) => void;
  /** "thousand" formats with vi-VN dots (1.000.000). "plain" shows raw number. */
  format?: "thousand" | "plain";
};

/**
 * Controlled numeric text input.
 * - Strips all non-digit characters as the user types.
 * - Leading zeros removed automatically (Number coercion).
 * - Optional vi-VN thousand-separator display for currency fields.
 */
export const NumberInput = React.forwardRef<HTMLInputElement, Props>(
  ({ value, onChange, format = "plain", inputMode, ...rest }, ref) => {
    const display = (() => {
      if (!value && value !== 0) return "";
      if (value === 0) return "";
      return format === "thousand"
        ? new Intl.NumberFormat("vi-VN").format(Number(value))
        : String(Number(value));
    })();

    return (
      <Input
        ref={ref}
        type="text"
        inputMode={inputMode ?? "numeric"}
        value={display}
        onChange={(e) => {
          const raw = e.target.value.replace(/\D/g, "");
          onChange(raw === "" ? 0 : Number(raw));
        }}
        {...rest}
      />
    );
  }
);
NumberInput.displayName = "NumberInput";
