"use client";

import { useState } from "react";
import { Eye, EyeOff, Plus, Trash2, ClipboardPaste } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { parseDotEnv, type EnvVarRow } from "@/lib/env-vars";

interface EnvVarEditorProps {
  rows: EnvVarRow[];
  onChange: (rows: EnvVarRow[]) => void;
  disabled?: boolean;
}

// Shared by the import form and project settings. Values are masked; settings
// renders `stored` rows the server never sends back, where empty = keep the secret.
export function EnvVarEditor({ rows, onChange, disabled }: EnvVarEditorProps) {
  const [revealed, setRevealed] = useState<Set<number>>(new Set());
  const [pasteOpen, setPasteOpen] = useState(false);
  const [pasteText, setPasteText] = useState("");

  const update = (index: number, patch: Partial<EnvVarRow>) => {
    onChange(rows.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  };

  const remove = (index: number) => {
    onChange(rows.filter((_, i) => i !== index));
    setRevealed(new Set());
  };

  const toggleReveal = (index: number) => {
    setRevealed((current) => {
      const next = new Set(current);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  /** Merge a pasted `.env` in: existing keys are overwritten, new ones appended. */
  const applyPaste = () => {
    const parsed = parseDotEnv(pasteText);
    if (!parsed.length) {
      setPasteOpen(false);
      setPasteText("");
      return;
    }

    const merged = [...rows.filter((row) => row.key.trim() || row.value)];
    for (const { key, value } of parsed) {
      const existing = merged.findIndex((row) => row.key.trim() === key);
      if (existing >= 0) merged[existing] = { key, value };
      else merged.push({ key, value });
    }

    onChange(merged);
    setPasteText("");
    setPasteOpen(false);
  };

  return (
    <div className="space-y-3">
      {rows.length > 0 && (
        <div className="space-y-2">
          {rows.map((row, index) => (
            <div key={index} className="flex items-start gap-2">
              <Input
                aria-label={`Variable name ${index + 1}`}
                placeholder="VITE_API_URL"
                className="font-mono text-sm"
                value={row.key}
                disabled={disabled}
                onChange={(e) => update(index, { key: e.target.value })}
              />
              <div className="relative flex-1">
                <Input
                  aria-label={`Value for ${row.key || `variable ${index + 1}`}`}
                  type={revealed.has(index) ? "text" : "password"}
                  autoComplete="off"
                  spellCheck={false}
                  placeholder={row.stored ? "•••••• (unchanged)" : "value"}
                  className="pr-9 font-mono text-sm"
                  value={row.value}
                  disabled={disabled}
                  onChange={(e) => update(index, { value: e.target.value })}
                />
                <button
                  type="button"
                  onClick={() => toggleReveal(index)}
                  disabled={disabled}
                  className="text-muted-foreground hover:text-foreground absolute top-1/2 right-2 -translate-y-1/2"
                  aria-label={revealed.has(index) ? "Hide value" : "Show value"}
                >
                  {revealed.has(index) ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                disabled={disabled}
                onClick={() => remove(index)}
                aria-label={`Remove ${row.key || `variable ${index + 1}`}`}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      )}

      {pasteOpen && (
        <div className="space-y-2">
          <Textarea
            aria-label="Paste .env contents"
            rows={5}
            className="font-mono text-xs"
            placeholder={
              "VITE_API_URL=https://api.example.com\nVITE_ANALYTICS_ID=abc123"
            }
            value={pasteText}
            onChange={(e) => setPasteText(e.target.value)}
          />
          <div className="flex gap-2">
            <Button type="button" size="sm" onClick={applyPaste}>
              Add variables
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => {
                setPasteOpen(false);
                setPasteText("");
              }}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={disabled}
          onClick={() => onChange([...rows, { key: "", value: "" }])}
        >
          <Plus className="mr-2 h-4 w-4" />
          Add variable
        </Button>
        {!pasteOpen && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={disabled}
            onClick={() => setPasteOpen(true)}
          >
            <ClipboardPaste className="mr-2 h-4 w-4" />
            Paste .env
          </Button>
        )}
      </div>
    </div>
  );
}
