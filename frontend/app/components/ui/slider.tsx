"use client";

import { Slider as SliderPrimitive } from "radix-ui";
import * as React from "react";
import { cn } from "@/app/lib/utils";

function Slider({ className, defaultValue, value, min = 0, max = 100, ...props }: React.ComponentProps<typeof SliderPrimitive.Root>) {
  const values = React.useMemo(() => (Array.isArray(value) ? value : Array.isArray(defaultValue) ? defaultValue : [min, max]), [value, defaultValue, min, max]);
  return (
    <SliderPrimitive.Root
      data-slot="slider"
      defaultValue={defaultValue}
      value={value}
      min={min}
      max={max}
      className={cn("relative flex w-full touch-none select-none items-center data-[disabled]:opacity-50", className)}
      {...props}
    >
      <SliderPrimitive.Track data-slot="slider-track" className="relative h-1.5 w-full grow overflow-hidden rounded-full bg-muted">
        <SliderPrimitive.Range data-slot="slider-range" className="absolute h-full bg-brand" />
      </SliderPrimitive.Track>
      {Array.from({ length: values.length }, (_, i) => (
        <SliderPrimitive.Thumb key={i} data-slot="slider-thumb" className="block size-4 shrink-0 rounded-full border-2 border-brand bg-white shadow-sm transition-[box-shadow] hover:ring-4 hover:ring-brand/20 focus-visible:outline-hidden focus-visible:ring-4 focus-visible:ring-brand/30" />
      ))}
    </SliderPrimitive.Root>
  );
}

export { Slider };
