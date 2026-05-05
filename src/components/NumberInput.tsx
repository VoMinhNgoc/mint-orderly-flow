import * as React from "react";
import { Input } from "@/components/ui/input";

type Props = Omit<React.ComponentProps<typeof Input>, "value" | "onChange" | "type"> & {
  value: number;
  onChange: (n: number) => void;
  /** "thousand" formats with vi-VN dots (1.000.000). "plain" shows raw number. */
  format?: "thousand" | "plain";
};

const formatVN = (n: number) => new Intl.NumberFormat("vi-VN").format(n);

const toDisplay = (value: number, format: "thousand" | "plain") => {
  if (value === 0 || value === undefined || value === null || Number.isNaN(value)) return "";
  const n = Number(value); // strips leading zeros
  return format === "thousand" ? formatVN(n) : String(n);
};

/**
 * Controlled numeric text input.
 * - type="text" + inputMode="numeric" (no native number quirks).
 * - Strips all non-digits as the user types via replace(/\D/g, "").
 * - Number() coercion removes leading zeros (002 -> 2).
 * - Optional vi-VN thousand-separator display (1.000.000) for currency.
 * - Handles IME composition correctly (avoids double-fire / duplicated chars).
 * - Selects content on focus for fast overwrite.
 */
export const NumberInput = React.forwardRef<HTMLInputElement, Props>(
  ({ value, onChange, format = "plain", inputMode, onFocus, onBlur, ...rest }, ref) => {
    // Local string state lets us show exactly what the user typed mid-edit
    // (prevents cursor jumps and the "11" duplication bug from formatter races).
    const [text, setText] = React.useState<string>(() => toDisplay(value, format));
    const [focused, setFocused] = React.useState(false);
    const composingRef = React.useRef(false);

    // Re-sync from parent when not focused (e.g. external reset).
    React.useEffect(() => {
      if (!focused) setText(toDisplay(value, format));
    }, [value, format, focused]);

    const commit = (raw: string) => {
      const digits = raw.replace(/\D/g, "");
      const n = digits === "" ? 0 : Number(digits); // removes leading zeros
      // Reflect the cleaned value back into the visible input.
      const next = digits === "" ? "" : format === "thousand" ? formatVN(n) : String(n);
      setText(next);
      if (n !== value) onChange(n);
    };

    return (
      <Input
        {...rest}
        ref={ref}
        type="text"
        inputMode={inputMode ?? "numeric"}
        autoComplete="off"
        value={text}
        onCompositionStart={() => {
          composingRef.current = true;
        }}
        onCompositionEnd={(e) => {
          composingRef.current = false;
          commit((e.target as HTMLInputElement).value);
        }}
        onChange={(e) => {
          if (composingRef.current) {
            // Show raw value during IME composition, commit on end.
            setText(e.target.value);
            return;
          }
          commit(e.target.value);
        }}
        onFocus={(e) => {
          setFocused(true);
          e.target.select();
          onFocus?.(e);
        }}
        onBlur={(e) => {
          setFocused(false);
          // Normalize display on blur.
          setText(toDisplay(value, format));
          onBlur?.(e);
        }}
      />
    );
  }
);
NumberInput.displayName = "NumberInput";
