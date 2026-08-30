"use client";

import * as React from "react";
import Papa from "papaparse";
import { toast } from "sonner";
import { Upload, Loader2, FileUp, CheckCircle2, AlertCircle } from "lucide-react";
import { importTransactionsAction, type ImportResultRow } from "@/actions/import";
import { Button } from "@/components/ui/button";
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
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

type FieldKey = "date" | "type" | "amount" | "category" | "paymentMethod" | "description" | "note";

const FIELD_OPTIONS: { value: FieldKey | ""; label: string }[] = [
  { value: "", label: "Ignore column" },
  { value: "date", label: "Date" },
  { value: "type", label: "Type (EXPENSE/INCOME)" },
  { value: "amount", label: "Amount (₹)" },
  { value: "category", label: "Category" },
  { value: "paymentMethod", label: "Payment method" },
  { value: "description", label: "Description" },
  { value: "note", label: "Note" },
];

function toIsoDate(value: string): string {
  const v = value.trim();
  if (!v) return "";
  // Try DD-MM-YYYY / DD/MM/YYYY first (most common for exports)
  const dmy = v.match(/^(\d{1,2})[-\/](\d{1,2})[-\/](\d{4})$/);
  if (dmy) {
    const [, d, m, y] = dmy;
    return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }
  // ISO YYYY-MM-DD
  const iso = v.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (iso) return `${iso[1]}-${iso[2].padStart(2, "0")}-${iso[3].padStart(2, "0")}`;
  return v;
}

export function ImportCsvDialog({
  open,
  onOpenChange,
  onImported,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImported: () => void;
}) {
  const [columns, setColumns] = React.useState<string[]>([]);
  const [rows, setRows] = React.useState<Record<string, string>[]>([]);
  const [mapping, setMapping] = React.useState<Record<number, FieldKey | "">>({});
  const [submitting, setSubmitting] = React.useState(false);
  const [results, setResults] = React.useState<ImportResultRow[] | null>(null);
  const [parsedName, setParsedName] = React.useState("");

  React.useEffect(() => {
    if (open) {
      /* eslint-disable react-hooks/set-state-in-effect */
      setColumns([]);
      setRows([]);
      setMapping({});
      setResults(null);
      setParsedName("");
      /* eslint-enable react-hooks/set-state-in-effect */
    }
  }, [open]);

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setParsedName(file.name);
    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (result) => {
        if (!result.meta.fields || result.meta.fields.length === 0) {
          toast.error("No header row found in CSV");
          return;
        }
        setColumns(result.meta.fields);
        const auto: Record<number, FieldKey | ""> = {};
        result.meta.fields.forEach((f, idx) => {
          const key = f.toLowerCase().trim();
          let field: FieldKey | "" = "";
          if (/^date/i.test(key)) field = "date";
          else if (/^type/i.test(key)) field = "type";
          else if (/amt|amount|price|value|rs/i.test(key)) field = "amount";
          else if (/^cat|category/i.test(key)) field = "category";
          else if (/pay|method|mode/i.test(key)) field = "paymentMethod";
          else if (/desc|narr|particular|detail/i.test(key)) field = "description";
          else if (/^note/i.test(key)) field = "note";
          auto[idx] = field;
        });
        setMapping(auto);
        setRows((result.data as Record<string, string>[]).slice(0, 500));
      },
      error: () => toast.error("Failed to parse CSV"),
    });
  }

  function buildPayload(): { row: Record<string, string>; index: number }[] {
    const mappedCols = columns.map((_, i) => mapping[i] ?? "");
    return rows.map((r, index) => {
      const out: Record<string, string> = {};
      mappedCols.forEach((field, colIdx) => {
        if (!field) return;
        const val = r[columns[colIdx]] ?? "";
        if (field === "amount") out.amount = val;
        else if (field === "date") out.date = toIsoDate(val);
        else out[field] = val;
      });
      return { row: out, index };
    });
  }

  const preview = buildPayload().slice(0, 8);
  const mappedCount = Object.values(mapping).filter(Boolean).length;

  async function handleImport() {
    const payload = buildPayload().filter((p) => {
      const a = parseFloat(p.row.amount ?? "");
      return !isNaN(a) && p.row.category;
    });
    if (payload.length === 0) {
      toast.error("No valid rows to import (need amount and category)");
      return;
    }
    setSubmitting(true);
    const result = await importTransactionsAction(payload.map((p) => ({ ...p.row, amount: parseFloat(p.row.amount ?? "0") })));
    setSubmitting(false);
    if (result.ok) {
      setResults(result.results);
      toast.success(`Imported ${result.imported} transaction${result.imported === 1 ? "" : "s"}`);
      if (result.failed > 0) toast.warning(`${result.failed} row${result.failed === 1 ? "" : "s"} skipped`);
      onImported();
    } else {
      toast.error(result.error ?? "Import failed");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Import Transactions from CSV</DialogTitle>
          <DialogDescription>
            Upload a CSV, map the columns, and import your transactions.
          </DialogDescription>
        </DialogHeader>

        {columns.length === 0 ? (
          <div className="rounded-xl border-2 border-dashed border-border p-8 text-center">
            <FileUp className="mx-auto h-8 w-8 text-muted-foreground" />
            <p className="mt-2 text-sm text-muted-foreground">
              Choose a CSV file with a header row (date, amount, category…).
            </p>
            <label className="mt-4 inline-flex cursor-pointer items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
              <Upload className="h-4 w-4" /> Choose CSV
              <input type="file" accept=".csv,text/csv" className="hidden" onChange={onFile} />
            </label>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {parsedName} · {rows.length} rows · map your columns below.
            </p>

            <div className="grid gap-2">
              {columns.map((col, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="w-40 truncate text-xs font-medium text-muted-foreground">{col}</span>
                  <Select
                    value={mapping[i] ?? ""}
                    onValueChange={(v) => setMapping((m) => ({ ...m, [i]: v as FieldKey | "" }))}
                  >
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="Ignore column" />
                    </SelectTrigger>
                    <SelectContent>
                      {FIELD_OPTIONS.map((o) => (
                        <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>

            {preview.length > 0 && (
              <div>
                <p className="mb-1 text-xs font-medium text-muted-foreground">Preview (first rows)</p>
                <div className="overflow-x-auto rounded-lg border border-border">
                  <table className="w-full text-left text-xs">
                    <thead className="border-b border-border bg-muted/50">
                      <tr>
                        <th className="px-2 py-1.5 font-medium">Date</th>
                        <th className="px-2 py-1.5 font-medium">Type</th>
                        <th className="px-2 py-1.5 font-medium">Amount</th>
                        <th className="px-2 py-1.5 font-medium">Category</th>
                        <th className="px-2 py-1.5 font-medium">Payment</th>
                        <th className="px-2 py-1.5 font-medium">Description</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {preview.map((p, i) => (
                        <tr key={i}>
                          <td className="px-2 py-1.5">{p.row.date || "—"}</td>
                          <td className="px-2 py-1.5">{p.row.type || "—"}</td>
                          <td className="px-2 py-1.5">{p.row.amount || "—"}</td>
                          <td className="px-2 py-1.5">{p.row.category || "—"}</td>
                          <td className="px-2 py-1.5">{p.row.paymentMethod || "—"}</td>
                          <td className="px-2 py-1.5">{p.row.description || "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {results && (
              <div className="rounded-lg border border-border p-3">
                <p className={cn("text-sm font-medium", results.some((r) => !r.ok) ? "text-warning" : "text-success")}>
                  <CheckCircle2 className="mr-1 inline h-4 w-4" />
                  {results.filter((r) => r.ok).length} imported, {results.filter((r) => !r.ok).length} failed
                </p>
                {results.some((r) => !r.ok) && (
                  <ul className="mt-2 max-h-28 space-y-1 overflow-y-auto text-xs text-destructive">
                    {results.filter((r) => !r.ok).slice(0, 20).map((r) => (
                      <li key={r.index}>
                        <AlertCircle className="mr-1 inline h-3 w-3" /> Row {r.index + 1}: {r.error}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>
        )}

        <DialogFooter className="gap-2">
          {columns.length > 0 && (
            <>
              <Button variant="ghost" onClick={() => { setColumns([]); setRows([]); setResults(null); }}>
                <Upload className="h-4 w-4" /> New file
              </Button>
              <Button onClick={handleImport} disabled={submitting || mappedCount === 0}>
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                Import
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
