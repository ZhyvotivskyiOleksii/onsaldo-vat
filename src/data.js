export const MONTHS = [
  "styczeń",
  "luty",
  "marzec",
  "kwiecień",
  "maj",
  "czerwiec",
  "lipiec",
  "sierpień",
  "wrzesień",
  "październik",
  "listopad",
  "grudzień",
];
export const money = (value) =>
  new Intl.NumberFormat("pl-PL", { style: "currency", currency: "PLN" }).format(
    value / 100,
  );
export const dateLabel = (value) => value.split("-").reverse().join(".");
export const DEFAULT_FILTERS = {
  operation: "all",
  jpk: "all",
  series: "all",
  tag: "all",
};
export const TAGS = ["Do sprawdzenia", "Sprawdzone", "Ważne"];

function makeRecords(kind, values) {
  return values.map((net, index) => {
    const number = index + 1;
    const correction = number === 3 || number === 12;
    const series = correction ? "KOR" : "FV";
    const vatRate = kind === "purchase" && number === 6 ? "np" : "23";
    const netCents = Math.round(net * 100);
    const vatCents = vatRate === "np" ? 0 : Math.round((netCents * 23) / 100);
    return {
      id: `DEMO-${kind === "sales" ? "S" : "Z"}-${number}`,
      kind,
      contractor: `Demo ${kind === "sales" ? "Alfa" : "Beta"} ${String(number).padStart(2, "0")}`,
      date: `2026-10-${String(number).padStart(2, "0")}`,
      number: `${series}/${number}/10/2026/DEMO`,
      ksef: "Brak potwierdzenia",
      operation: correction ? "correction" : "invoice",
      series,
      jpk: number % 4 === 0 ? "GTU_12" : number % 5 === 0 ? "TP" : "none",
      net: netCents,
      vat: vatCents,
      gross: netCents + vatCents,
      vatRate,
      tags: [],
    };
  });
}

export const INITIAL_RECORDS = [
  ...makeRecords(
    "sales",
    [1200, 850, -200, 1500, 680, 420, 950, 1100, 720, 580, 650, -150, 800, 600],
  ),
  ...makeRecords("purchase", [850, 320, -120, 1400, 480, 550, 780, 620]),
];

export function filterRecords(
  records,
  {
    kind,
    year,
    month,
    search = "",
    filters = DEFAULT_FILTERS,
    state = "filled",
  },
) {
  if (state !== "filled") return [];
  const query = search.trim().toLocaleLowerCase("pl");
  return records.filter(
    (record) =>
      record.kind === kind &&
      record.date.startsWith(`${year}-${String(month + 1).padStart(2, "0")}`) &&
      (!query ||
        [record.contractor, record.number, record.id, record.ksef].some(
          (value) => value.toLocaleLowerCase("pl").includes(query),
        )) &&
      (filters.operation === "all" || record.operation === filters.operation) &&
      (filters.jpk === "all" || record.jpk === filters.jpk) &&
      (filters.series === "all" || record.series === filters.series) &&
      (filters.tag === "all" || record.tags.includes(filters.tag)),
  );
}

export function summarize(records) {
  return records.reduce(
    (total, record) => ({
      net: total.net + record.net,
      vat: total.vat + record.vat,
      gross: total.gross + record.gross,
    }),
    { net: 0, vat: 0, gross: 0 },
  );
}

function csvCell(value) {
  let text = String(value ?? "");
  // Keep spreadsheet formula-like text inert when a user adds a label.
  if (/^[=+@\t\r]/.test(text)) text = `'${text}`;
  return `"${text.replaceAll('"', '""')}"`;
}

export function createCSV(records) {
  const headers = [
    "Kontrahent",
    "Data",
    "Numer dokumentu",
    "Numer KSeF",
    "Identyfikator",
    "Rodzaj operacji",
    "Kod JPK V7",
    "Seria dokumentów",
    "Stawka VAT",
    "Netto PLN",
    "VAT PLN",
    "Brutto PLN",
    "Oznaczenia",
  ];
  return (
    "\uFEFF" +
    [
      headers,
      ...records.map((r) => [
        r.contractor,
        r.date,
        r.number,
        r.ksef,
        r.id,
        r.operation === "correction" ? "Korekta" : "Faktura",
        r.jpk === "none" ? "Brak" : r.jpk,
        r.series,
        r.vatRate,
        (r.net / 100).toFixed(2).replace(".", ","),
        (r.vat / 100).toFixed(2).replace(".", ","),
        (r.gross / 100).toFixed(2).replace(".", ","),
        r.tags.join(", "),
      ]),
    ]
      .map((row) => row.map(csvCell).join(";"))
      .join("\r\n")
  );
}
