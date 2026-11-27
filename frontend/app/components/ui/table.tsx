import * as React from "react";
import { cn } from "@/app/lib/utils";

function Table({ className, ...props }: React.ComponentProps<"table">) {
  return (
    <div data-slot="table-container" className="relative w-full overflow-x-auto">
      <table data-slot="table" className={cn("w-full caption-bottom text-[13px]", className)} {...props} />
    </div>
  );
}
const TableHeader = ({ className, ...props }: React.ComponentProps<"thead">) => <thead data-slot="table-header" className={cn("[&_tr]:border-b", className)} {...props} />;
const TableBody = ({ className, ...props }: React.ComponentProps<"tbody">) => <tbody data-slot="table-body" className={cn("[&_tr:last-child]:border-0", className)} {...props} />;
const TableRow = ({ className, ...props }: React.ComponentProps<"tr">) => <tr data-slot="table-row" className={cn("border-b transition-colors hover:bg-accent/40 data-[state=selected]:bg-accent", className)} {...props} />;
const TableHead = ({ className, ...props }: React.ComponentProps<"th">) => <th data-slot="table-head" className={cn("h-9 whitespace-nowrap px-3 text-left align-middle text-[11px] font-medium uppercase tracking-wide text-subtle-foreground", className)} {...props} />;
const TableCell = ({ className, ...props }: React.ComponentProps<"td">) => <td data-slot="table-cell" className={cn("whitespace-nowrap px-3 py-2.5 align-middle", className)} {...props} />;

export { Table, TableBody, TableCell, TableHead, TableHeader, TableRow };
