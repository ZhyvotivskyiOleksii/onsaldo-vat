# Onsaldo · Rejestry i VAT

A responsive, interactive redesign of a Polish VAT register. Built with React, Vite, Motion and Radix Select. All records are fictional and all operations run in the browser.

**[Live demo](https://onsaldo-vat.vercel.app/)** · [Empty state](https://onsaldo-vat.vercel.app/?state=empty) · [Error and retry](https://onsaldo-vat.vercel.app/?state=error)

## Run locally

Requires Node.js 20.19+ or 22.12+.

```sh
npm ci
npm run dev
```

```sh
npm test       # domain logic: filtering, monetary arithmetic, CSV
npm run build # production static files: dist/client
npm run preview
```

## Design decisions

The palette uses #009A00 primary actions, white surfaces, dark neutral text and gray borders. Typography and rounded components take inspiration from [Symfonia](https://sklep.symfonia.pl/), with an original Onsaldo identity. Quicksand headings and Poppins body text are self-hosted. The redesign prioritizes reviewing and finding a document while keeping configuration within reach.

- A horizontal module navigation and organization header replace the oversized greeting and accounting overview. On small screens the navigation opens as a focused, scrollable drawer.
- The period, totals, sales/purchase tabs and document list remain visible. Advanced filters, VAT rates and configuration use progressive disclosure.
- Document details open in a focused panel. At mobile widths the table becomes a list of readable document cards; every field remains available in the detail panel.
- Motion animates entrance and exit of dialogs, popovers, tab selection and notifications. Registered CSS color tokens interpolate together at the root for 420 ms, avoiding nested color-transition delays. Skeletons appear during initial loading, period/register changes and retry. Reduced motion is respected.
- Custom Radix selects retain keyboard navigation and work inside native modal dialogs.
- Empty results explain how to recover. A failed load hides unreliable totals and provides a retry action.
- Column visibility, column order, document labels and theme are stored locally. No sign-in or external API is required.

## Brand identity

The original Onsaldo symbol combines a rounded O enclosing two register lines. Its SVG master is `public/brand/onsaldo-symbol.svg`; the matching green app tile is `public/brand/onsaldo-app-icon.svg`. The browser uses `public/favicon.svg` directly, so the mark remains sharp at small sizes without a font dependency.

Curved two-tone tiles identify modules and summary categories: blue for net/documents, violet for VAT and green for gross/current register. Primary actions carry a restrained matching arc. SVG geometry and CSS backgrounds are original and do not embed Symfonia logos or product names.

## Feature map

| Original field or action                            | Location in the redesign                                                               |
| --------------------------------------------------- | -------------------------------------------------------------------------------------- |
| Sales and purchase VAT registers                    | Sprzedaż / Zakupy tabs                                                                 |
| Year and month                                      | Period selector and adjacent month controls                                            |
| Search                                              | Search by contractor, invoice number, ID or KSeF status                                |
| Operation type and JPK V7                           | Filtry panel                                                                           |
| Document series                                     | Filtry panel; Eksportuj → Serie dokumentów                                             |
| Clear filters                                       | Removable chips and Wyczyść filtry                                                     |
| Net, VAT and gross totals                           | Summary of all filtered rows, across pages                                             |
| VAT rate breakdown (23%, np)                        | Podatek VAT / Zobacz stawki                                                            |
| Contractor, date, document number, KSeF, identifier | Table and document detail panel                                                        |
| Row expansion                                       | Contractor/document link or row chevron; mobile document card                          |
| Labels                                              | Select rows → Oznacz; detail panel; actions menu                                       |
| Print                                               | Actions menu, selected rows or document detail                                         |
| Download                                            | UTF-8 CSV for filtered rows, selected rows or one document                             |
| Table configuration                                 | Column visibility, ordering and sort controls; available in the actions menu on mobile |
| Pagination and page size                            | Table footer                                                                           |
| Organization, user, theme, notifications            | Header; mobile navigation                                                                    |
| Accounting period and area availability             | Header period action; Obszary księgowe with six disclosures                             |

## Demo scenarios

Open **Wersja demo** in the desktop header, or **Tryb demonstracyjny** in mobile navigation. Direct URLs:

- `/` — 14 sales and 8 purchase documents, October 2026.
- `/?state=empty` — empty register with a return action.
- `/?state=error` — simulated failed load; retry succeeds after a short loading state.

A non-matching search or a month without records also produces a real empty result. Summary calculations use integer grosze and include corrections. Selecting rows changes the export/print target, not the overall filtered summary.

## Assumptions

The reference does not show expanded rows, purchase data or open menus. Their contents use explicit fictional data and conventional interactions; unprovided product behavior is not claimed to be reproduced exactly. Other accounting modules show their availability, without inventing complete accounting workflows.

The supplied reference has inconsistent tax totals: 9,700.00 PLN net at 23% produces 2,231.00 PLN VAT, not 2,323.00 PLN. This prototype keeps the 9,700.00 PLN net total and derives VAT and gross from the sample records: 2,231.00 PLN VAT and 11,931.00 PLN gross.

CSV contains all fields, even if a column is hidden. Printing opens the browser's print dialog with a dedicated landscape layout. No document is sent to KSeF or an external accounting system.

## Accessibility and responsive behavior

Semantic tables and buttons, labelled inputs, keyboard-operable tabs, focus outlines, native modal focus containment, Escape dismissal, reduced-motion support, mobile navigation focus handling, and no page-level horizontal overflow at the tested widths (320, 375, 600, 768, 1024, 1280 and 1440 px). Desktop secondary columns move into document details as space narrows. Mobile search uses a 16 px input font to avoid automatic iOS zoom.

## Source

- `src/App.jsx` — register state, page sections and demo flows.
- `src/components.jsx` — reusable controls, popovers and dialogs.
- `src/data.js` — sample records, filtering, totals and CSV generation.
- `src/styles.css` — responsive layout, theme tokens, print and interaction styles.
- `tests/register.test.mjs` — focused checks of data behavior.
- `src/theme.css` — synchronized theme interpolation.

## Deployment

Hosted on Vercel Hobby at [onsaldo-vat.vercel.app](https://onsaldo-vat.vercel.app/), connected to [this GitHub repository](https://github.com/ZhyvotivskyiOleksii/onsaldo-vat). Commits to `main` deploy automatically.

`vercel.json` selects the Vite build and `dist/client` output. No environment variables are needed.

The `worker/`, `.openai/`, build helper and worker tests are retained from the prototype starter. They are not required to serve the static Vercel deployment.
