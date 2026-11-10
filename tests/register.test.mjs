import { test } from "node:test";
import assert from "node:assert/strict";
import {
  INITIAL_RECORDS,
  DEFAULT_FILTERS,
  filterRecords,
  summarize,
  createCSV,
} from "../src/data.js";
const options = {
  kind: "sales",
  year: 2026,
  month: 9,
  filters: DEFAULT_FILTERS,
};
test("all sales rows have exact integer-grosz arithmetic and consistent totals", () => {
  const rows = filterRecords(INITIAL_RECORDS, options);
  assert.equal(rows.length, 14);
  assert.deepEqual(summarize(rows), {
    net: 970000,
    vat: 223100,
    gross: 1193100,
  });
  for (const r of rows) {
    assert.equal(r.net + r.vat, r.gross);
    assert.equal(r.vat, Math.round(r.net * 0.23));
  }
});
test("period, sales/purchases, search and advanced filters combine", () => {
  const rows = filterRecords(INITIAL_RECORDS, {
    ...options,
    search: "alfa",
    filters: {
      ...DEFAULT_FILTERS,
      operation: "correction",
      series: "KOR",
      jpk: "GTU_12",
    },
  });
  assert.equal(rows.length, 1);
  assert.equal(rows[0].id, "DEMO-S-12");
  assert.equal(
    filterRecords(INITIAL_RECORDS, { ...options, month: 10 }).length,
    0,
  );
  assert.equal(
    filterRecords(INITIAL_RECORDS, { ...options, kind: "purchase" }).length,
    8,
  );
  assert.equal(
    filterRecords(INITIAL_RECORDS, { ...options, search: "demo-s-14" })[0].id,
    "DEMO-S-14",
  );
});
test("empty and failed loads never masquerade as loaded records", () => {
  assert.equal(
    filterRecords(INITIAL_RECORDS, { ...options, state: "empty" }).length,
    0,
  );
  assert.equal(
    filterRecords(INITIAL_RECORDS, { ...options, state: "error" }).length,
    0,
  );
});
test("np purchase row has no VAT and tags participate in filtering", () => {
  const rows = INITIAL_RECORDS.map((r) =>
    r.id === "DEMO-Z-6" ? { ...r, tags: ["Sprawdzone"] } : r,
  );
  const result = filterRecords(rows, {
    ...options,
    kind: "purchase",
    filters: { ...DEFAULT_FILTERS, tag: "Sprawdzone" },
  });
  assert.equal(result.length, 1);
  assert.equal(result[0].vat, 0);
  assert.equal(result[0].gross, result[0].net);
});
test("CSV contains hidden fields, quoted cells, correction values and UTF-8 BOM", () => {
  const row = {
    ...INITIAL_RECORDS[2],
    contractor: 'Firma; "A"',
    tags: ["Sprawdzone"],
  };
  const csv = createCSV([row]);
  assert.ok(csv.startsWith("\uFEFF"));
  assert.ok(csv.includes('"Firma; ""A"""'));
  assert.ok(csv.includes('"DEMO-S-3"'));
  assert.ok(csv.includes('"-200,00"'));
  assert.ok(csv.includes('"Numer KSeF"'));
  assert.ok(csv.includes('"Kod JPK V7"'));
  assert.ok(csv.includes('"Sprawdzone"'));
  assert.equal(csv.split("\r\n").length, 2);
});
