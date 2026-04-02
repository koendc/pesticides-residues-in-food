const ORGANIC_LABELS = {
  0: "Conventional",
  1: "Organic",
};

const ORGANIC_CLASS = {
  0: "conventional",
  1: "organic",
};

const combinedMetricOptions = [
  { value: "median_combined_mrl_ratio", label: "Median pesticide load score", formatter: formatNumber },
  { value: "p90_combined_mrl_ratio",    label: "P90 pesticide load score",    formatter: formatNumber },
  { value: "p95_combined_mrl_ratio",    label: "P95 pesticide load score",    formatter: formatNumber },
  { value: "avg_combined_mrl_ratio",    label: "Average pesticide load score", formatter: formatNumber },
  { value: "median_substances_found",   label: "Median pesticides detected",   formatter: formatNumber },
  { value: "p90_substances_found",      label: "P90 pesticides detected",      formatter: formatNumber },
  { value: "p95_substances_found",      label: "P95 pesticides detected",      formatter: formatNumber },
  { value: "avg_substances_found",      label: "Average pesticides detected",  formatter: formatNumber },
];

const gapMetricOptions = [
  { value: "median_combined_mrl_ratio", label: "Median pesticide load score",  source: "combined", formatter: formatSignedNumber },
  { value: "p90_combined_mrl_ratio",    label: "P90 pesticide load score",     source: "combined", formatter: formatSignedNumber },
  { value: "p95_combined_mrl_ratio",    label: "P95 pesticide load score",     source: "combined", formatter: formatSignedNumber },
  { value: "avg_combined_mrl_ratio",    label: "Average pesticide load score", source: "combined", formatter: formatSignedNumber },
  { value: "median_substances_found",   label: "Median pesticides detected",   source: "combined", formatter: formatSignedNumber },
  { value: "p90_substances_found",      label: "P90 pesticides detected",      source: "combined", formatter: formatSignedNumber },
  { value: "p95_substances_found",      label: "P95 pesticides detected",      source: "combined", formatter: formatSignedNumber },
  { value: "avg_substances_found",      label: "Average pesticides detected",  source: "combined", formatter: formatSignedNumber },
  { value: "mean", label: "% above legal limit", source: "exceedances", formatter: formatSignedPercent },
];

const state = {
  combinedMetric: "median_combined_mrl_ratio",
  combinedOrganic: "all",
  combinedThreshold: 100,
  combinedSort: "desc",
  exceedanceOrganic: "all",
  exceedanceThreshold: 1000,
  exceedanceSort: "desc",
  gapMetric: "median_combined_mrl_ratio",
  gapThreshold: 10,
  gapSort: "asc",
  selectedProduct: "",
};

let dataset = null;

const tooltip = document.querySelector("#tooltip");
const errorNotice = document.querySelector("#error-notice");
const combinedChartEl = document.querySelector("#combined-chart");
const exceedanceChartEl = document.querySelector("#exceedance-chart");
const gapChartEl = document.querySelector("#gap-chart");
const productSummaryEl = document.querySelector("#product-summary");
const productPanelsEl = document.querySelector("#product-panels");
const productInput = document.querySelector("#product-search");
const productOptionsEl = document.querySelector("#product-options");

initControls();
loadData();

function initControls() {
  populateSelect(
    "#combined-metric",
    combinedMetricOptions.map((item) => ({ value: item.value, label: item.label })),
    state.combinedMetric,
    (value) => {
      state.combinedMetric = value;
      if (dataset) renderCombinedChart();
    },
  );
  populateSelect(
    "#combined-organic",
    [
      { value: "all", label: "Both production types" },
      { value: "0", label: "Conventional only" },
      { value: "1", label: "Organic only" },
    ],
    state.combinedOrganic,
    (value) => {
      state.combinedOrganic = value;
      if (dataset) renderCombinedChart();
    },
  );
  populateSelect(
    "#combined-threshold",
    [10, 25, 50, 100, 250, 500].map((value) => ({ value: String(value), label: atLeastLabel(value) })),
    String(state.combinedThreshold),
    (value) => {
      state.combinedThreshold = Number(value);
      if (dataset) renderCombinedChart();
    },
  );
  populateSelect(
    "#combined-sort",
    [
      { value: "desc", label: "Highest first" },
      { value: "asc", label: "Lowest first" },
    ],
    state.combinedSort,
    (value) => {
      state.combinedSort = value;
      if (dataset) renderCombinedChart();
    },
  );
  populateSelect(
    "#exceedance-organic",
    [
      { value: "all", label: "Both production types" },
      { value: "0", label: "Conventional only" },
      { value: "1", label: "Organic only" },
    ],
    state.exceedanceOrganic,
    (value) => {
      state.exceedanceOrganic = value;
      if (dataset) renderExceedanceChart();
    },
  );
  populateSelect(
    "#exceedance-threshold",
    [100, 500, 1000, 5000, 10000].map((value) => ({ value: String(value), label: atLeastLabel(value) })),
    String(state.exceedanceThreshold),
    (value) => {
      state.exceedanceThreshold = Number(value);
      if (dataset) renderExceedanceChart();
    },
  );
  populateSelect(
    "#exceedance-sort",
    [
      { value: "desc", label: "Highest first" },
      { value: "asc", label: "Lowest first" },
    ],
    state.exceedanceSort,
    (value) => {
      state.exceedanceSort = value;
      if (dataset) renderExceedanceChart();
    },
  );
  populateSelect(
    "#gap-metric",
    gapMetricOptions.map((item) => ({ value: item.value, label: item.label })),
    state.gapMetric,
    (value) => {
      state.gapMetric = value;
      if (dataset) renderGapChart();
    },
  );
  populateSelect(
    "#gap-threshold",
    [10, 25, 50, 100, 250, 500].map((value) => ({ value: String(value), label: atLeastLabel(value) })),
    String(state.gapThreshold),
    (value) => {
      state.gapThreshold = Number(value);
      if (dataset) renderGapChart();
    },
  );
  populateSelect(
    "#gap-sort",
    [
      { value: "desc", label: "Highest first" },
      { value: "asc", label: "Lowest first" },
    ],
    state.gapSort,
    (value) => {
      state.gapSort = value;
      if (dataset) renderGapChart();
    },
  );

  productInput.addEventListener("input", (event) => {
    const value = event.target.value.trim();
    if (dataset && dataset.products.includes(value)) {
      state.selectedProduct = value;
      renderProductExplorer();
    }
  });
}

async function loadData() {
  hideError();
  try {
    const [combinedText, exceedanceText] = await Promise.all([
      fetchCsvText("combined_mrl_by_product.csv"),
      fetchCsvText("mrl_exceeded_by_product.csv"),
    ]);

    dataset = buildDataset(combinedText, exceedanceText);
    if (!state.selectedProduct || !dataset.products.includes(state.selectedProduct)) {
      state.selectedProduct = dataset.products.includes("Apples") ? "Apples" : dataset.products[0];
      productInput.value = state.selectedProduct;
    }
    renderAll();
  } catch (error) {
    showError(error);
  }
}

function buildDataset(combinedText, exceedanceText) {
  const combined = parseCsv(combinedText).map((row) => ({
    product: row.product,
    organic: Number(row.organic),
    avg_combined_mrl_ratio: Number(row.avg_combined_mrl_ratio),
    median_combined_mrl_ratio: Number(row.median_combined_mrl_ratio),
    p90_combined_mrl_ratio: Number(row.p90_combined_mrl_ratio),
    p95_combined_mrl_ratio: Number(row.p95_combined_mrl_ratio),
    avg_substances_found: Number(row.avg_substances_found),
    median_substances_found: Number(row.median_substances_found),
    p90_substances_found: Number(row.p90_substances_found),
    p95_substances_found: Number(row.p95_substances_found),
    samples: Number(row.samples),
  }));

  const exceedances = parseCsv(exceedanceText).map((row) => ({
    product: row["sampMatCode.base.building.DESC"],
    organic: Number(row.organic),
    mean: Number(row.mean),
    sum: Number(row.sum),
    count: Number(row.count),
  }));

  const products = [...new Set([...combined, ...exceedances].map((row) => row.product))].sort();

  // Pre-sort values per metric and organic group for percentile lookup.
  const rankings = buildRankings(combined, exceedances);

  return {
    combined,
    exceedances,
    products,
    combinedLookup: buildLookup(combined),
    exceedanceLookup: buildLookup(exceedances),
    rankings,
    productSamples: buildProductSamples(combined, exceedances),
  };
}

function buildProductSamples(combined, exceedances) {
  const map = new Map();
  for (const row of combined) {
    map.set(row.product, (map.get(row.product) || 0) + row.samples);
  }
  // Fall back to exceedance count for products not in combined
  for (const row of exceedances) {
    if (!map.has(row.product)) {
      map.set(row.product, (map.get(row.product) || 0) + row.count);
    }
  }
  return map;
}

/**
 * For each metric + organic combination, build a sorted array of values so that
 * renderProductPanel can quickly compute where a given value sits in the distribution.
 */
function buildRankings(combined, exceedances) {
  const rankings = {};
  const combinedMetrics = [
    "median_combined_mrl_ratio",
    "p90_combined_mrl_ratio",
    "p95_combined_mrl_ratio",
    "avg_combined_mrl_ratio",
    "median_substances_found",
    "p90_substances_found",
    "p95_substances_found",
    "avg_substances_found",
  ];
  for (const organic of [0, 1]) {
    const rows = combined.filter((row) => row.organic === organic);
    for (const metric of combinedMetrics) {
      rankings[`${metric}_${organic}`] = rows.map((row) => row[metric]).sort((a, b) => a - b);
    }
    const excRows = exceedances.filter((row) => row.organic === organic);
    rankings[`mean_${organic}`] = excRows.map((row) => row.mean).sort((a, b) => a - b);
  }
  return rankings;
}

/** Returns the fraction (0–1) of values strictly below `value` in a sorted array. */
function computePercentile(value, sortedValues) {
  if (!sortedValues || sortedValues.length === 0) return null;
  let lo = 0;
  let hi = sortedValues.length;
  while (lo < hi) {
    const mid = (lo + hi) >>> 1;
    if (sortedValues[mid] < value) lo = mid + 1;
    else hi = mid;
  }
  return lo / sortedValues.length;
}

/** Returns null when value is zero (percentile would be trivially 0 and misleading). */
function percentileOrNull(value, sortedValues) {
  if (value === 0) return null;
  return computePercentile(value, sortedValues);
}

function renderAll() {
  renderSummaryCards();
  renderCombinedChart();
  renderExceedanceChart();
  renderGapChart();
  renderProductOptions();
  renderProductExplorer();
}

function renderSummaryCards() {
  const combinedSamples = dataset.combined.reduce((total, row) => total + row.samples, 0);
  const exceedanceMeasurements = dataset.exceedances.reduce((total, row) => total + row.count, 0);
  const cards = [
    {
      label: "Foods monitored",
      value: formatInteger(dataset.products.length),
      note: "Distinct foods across all data shown on this page.",
    },
    {
      label: "Samples tested",
      value: formatInteger(combinedSamples),
      note: "Food samples tested and used to calculate pesticide load scores.",
    },
    {
      label: "Individual residue tests",
      value: formatInteger(exceedanceMeasurements),
      note: "Total individual pesticide-substance measurements across all samples.",
    },
    {
      label: "Foods with organic & conventional data",
      value: formatInteger(countComparableProducts()),
      note: "Foods where both organic and conventionally grown versions were tested.",
    },
  ];

  document.querySelector("#summary-cards").innerHTML = cards
    .map(
      (card) => `
        <article class="metric-card">
          <p class="metric-card__label">${card.label}</p>
          <p class="metric-card__value">${card.value}</p>
          <p class="metric-card__note">${card.note}</p>
        </article>
      `,
    )
    .join("");
}

function renderCombinedChart() {
  const option = combinedMetricOptions.find((item) => item.value === state.combinedMetric);
  let rows = dataset.combined.filter((row) => row.samples >= state.combinedThreshold);
  if (state.combinedOrganic !== "all") {
    rows = rows.filter((row) => String(row.organic) === state.combinedOrganic);
  }

  rows = rows
    .map((row) => ({
      ...row,
      value: row[state.combinedMetric],
      label:
        state.combinedOrganic === "all"
          ? `${row.product} — ${ORGANIC_LABELS[row.organic]}`
          : row.product,
    }))
    .sort((left, right) =>
      state.combinedSort === "desc" ? right.value - left.value : left.value - right.value,
    )

  const sortLabel = state.combinedSort === "desc" ? "highest" : "lowest";
  document.querySelector("#combined-chart-title").textContent = `Foods ranked by ${sortLabel} ${option.label.toLowerCase()}`;
  document.querySelector("#combined-chart-caption").textContent =
    state.combinedOrganic === "all"
      ? `All results with at least ${state.combinedThreshold} samples tested.`
      : `All ${ORGANIC_LABELS[Number(state.combinedOrganic)].toLowerCase()} foods with at least ${state.combinedThreshold} samples tested.`;

  renderHorizontalBarChart({
    element: combinedChartEl,
    rows,
    valueFormatter: option.formatter,
    tooltipFormatter: (row) =>
      `
        <strong>${escapeHtml(row.product)}</strong>
        ${ORGANIC_LABELS[row.organic]}<br>
        ${option.label}: ${option.formatter(row.value)}<br>
        Samples tested: ${formatInteger(row.samples)}
      `,
    colorAccessor: (row) => colorForOrganic(row.organic),
  });
}

function renderExceedanceChart() {
  let rows = dataset.exceedances.filter((row) => row.count >= state.exceedanceThreshold);
  if (state.exceedanceOrganic !== "all") {
    rows = rows.filter((row) => String(row.organic) === state.exceedanceOrganic);
  }

  rows = rows
    .map((row) => ({
      ...row,
      value: row.mean,
      label:
        state.exceedanceOrganic === "all"
          ? `${row.product} — ${ORGANIC_LABELS[row.organic]}`
          : row.product,
    }))
    .sort((left, right) =>
      state.exceedanceSort === "desc" ? right.value - left.value : left.value - right.value,
    );

  document.querySelector("#exceedance-chart-title").textContent = "Foods most often exceeding the legal limit";
  document.querySelector("#exceedance-chart-caption").textContent =
    state.exceedanceOrganic === "all"
      ? `Foods with at least ${formatInteger(state.exceedanceThreshold)} individual residue tests.`
      : `${ORGANIC_LABELS[Number(state.exceedanceOrganic)]} foods with at least ${formatInteger(state.exceedanceThreshold)} individual residue tests.`;

  renderHorizontalBarChart({
    element: exceedanceChartEl,
    rows,
    valueFormatter: formatPercent,
    tooltipFormatter: (row) =>
      `
        <strong>${escapeHtml(row.product)}</strong>
        ${ORGANIC_LABELS[row.organic]}<br>
        Tests above legal limit: ${formatPercent(row.mean)}<br>
        ${formatInteger(row.sum)} of ${formatInteger(row.count)} tests exceeded the limit
      `,
    colorAccessor: (row) => colorForOrganic(row.organic),
    secondaryLabel: (row) => `${formatInteger(row.sum)} of ${formatInteger(row.count)}`,
  });
}

function renderGapChart() {
  const option = gapMetricOptions.find((item) => item.value === state.gapMetric);
  const rows = buildGapRows(option)
    .filter((row) => row.minSamples >= state.gapThreshold)
    .sort((left, right) =>
      state.gapSort === "desc" ? right.value - left.value : left.value - right.value,
    );

  document.querySelector("#gap-chart-title").textContent = `${option.label}: organic compared to conventional`;
  document.querySelector("#gap-chart-caption").textContent =
    `All foods with data for both production methods and at least ${state.gapThreshold} samples on each side.`;

  renderDivergingBarChart({
    element: gapChartEl,
    rows,
    valueFormatter: option.formatter,
    tooltipFormatter: (row) =>
      `
        <strong>${escapeHtml(row.product)}</strong>
        Difference: ${option.formatter(row.value)}<br>
        Organic: ${row.baseFormatter(row.organicValue)}<br>
        Conventional: ${row.baseFormatter(row.conventionalValue)}
      `,
  });
}

function renderProductOptions() {
  productOptionsEl.innerHTML = dataset.products
    .map((product) => {
      const n = dataset.productSamples.get(product);
      const label = n ? `${product} (${formatInteger(n)} samples)` : product;
      return `<option value="${escapeHtml(product)}">${escapeHtml(label)}</option>`;
    })
    .join("");
}

function renderProductExplorer() {
  const product = state.selectedProduct;
  if (!product) {
    productSummaryEl.innerHTML = "<p>Select a product to see its details.</p>";
    productPanelsEl.innerHTML = "";
    return;
  }

  const combinedRows = dataset.combinedLookup.get(product) || new Map();
  const exceedanceRows = dataset.exceedanceLookup.get(product) || new Map();
  const organicCombined = combinedRows.get(1);
  const conventionalCombined = combinedRows.get(0);
  const organicExceedance = exceedanceRows.get(1);
  const conventionalExceedance = exceedanceRows.get(0);


  const summaryParts = [];
  if (organicCombined && conventionalCombined) {
    const diff = organicCombined.median_combined_mrl_ratio - conventionalCombined.median_combined_mrl_ratio;
    summaryParts.push(
      `Data is available for both organic and conventional ${product}. The median pesticide load score is ${diff >= 0 ? "higher" : "lower"} for organic by ${formatSignedNumber(diff)}.`,
    );
  }
  if (organicExceedance && conventionalExceedance) {
    const diff = organicExceedance.mean - conventionalExceedance.mean;
    summaryParts.push(
      `Organic samples exceed the legal limit at a rate that is ${diff >= 0 ? "higher" : "lower"} by ${formatSignedPercent(diff)}.`,
    );
  }
  if (!summaryParts.length) {
    summaryParts.push(`Only limited data is available for ${product}, so a full organic vs conventional comparison isn't possible.`);
  }

  productSummaryEl.innerHTML = `<p>${summaryParts.join(" ")}</p>`;
  productPanelsEl.innerHTML = [0, 1].map((organic) => renderProductPanel(product, organic)).join("");
}

function renderProductPanel(product, organic) {
  const combined = dataset.combinedLookup.get(product)?.get(organic);
  const exceedance = dataset.exceedanceLookup.get(product)?.get(organic);
  const hasData = Boolean(combined || exceedance);

  if (!hasData) {
    return `
      <article class="product-panel product-panel--${ORGANIC_CLASS[organic]}">
        <h3>${ORGANIC_LABELS[organic]}</h3>
        <p>No data available for this production type.</p>
      </article>
    `;
  }

  const cards = [];
  if (combined) {
    cards.push(detailCard("Median pesticide load score", formatNumber(combined.median_combined_mrl_ratio),
      percentileOrNull(combined.median_combined_mrl_ratio, dataset.rankings[`median_combined_mrl_ratio_${organic}`]), organic));
    cards.push(detailCard("P90 pesticide load score", formatNumber(combined.p90_combined_mrl_ratio),
      percentileOrNull(combined.p90_combined_mrl_ratio, dataset.rankings[`p90_combined_mrl_ratio_${organic}`]), organic));
    cards.push(detailCard("P95 pesticide load score", formatNumber(combined.p95_combined_mrl_ratio),
      percentileOrNull(combined.p95_combined_mrl_ratio, dataset.rankings[`p95_combined_mrl_ratio_${organic}`]), organic));
    cards.push(detailCard("Average pesticide load score", formatNumber(combined.avg_combined_mrl_ratio),
      percentileOrNull(combined.avg_combined_mrl_ratio, dataset.rankings[`avg_combined_mrl_ratio_${organic}`]), organic));
    cards.push(detailCard("Median pesticides detected", formatNumber(combined.median_substances_found),
      percentileOrNull(combined.median_substances_found, dataset.rankings[`median_substances_found_${organic}`]), organic, combined.median_substances_found === 0 ? "None detected in a typical sample" : null));
    cards.push(detailCard("P90 pesticides detected", formatNumber(combined.p90_substances_found),
      percentileOrNull(combined.p90_substances_found, dataset.rankings[`p90_substances_found_${organic}`]), organic, combined.p90_substances_found === 0 ? "None detected in 90% of samples" : null));
    cards.push(detailCard("P95 pesticides detected", formatNumber(combined.p95_substances_found),
      percentileOrNull(combined.p95_substances_found, dataset.rankings[`p95_substances_found_${organic}`]), organic, combined.p95_substances_found === 0 ? "None detected in 95% of samples" : null));
    cards.push(detailCard("Samples tested", formatInteger(combined.samples), null, organic));
  }
  if (exceedance) {
    cards.push(detailCard("Tests above legal limit", formatPercent(exceedance.mean),
      percentileOrNull(exceedance.mean, dataset.rankings[`mean_${organic}`]), organic, exceedance.mean === 0 ? "No tests exceeded the legal limit" : null));
    cards.push(detailCard("Tests exceeding the limit", formatInteger(exceedance.sum), null, organic));
    cards.push(detailCard("Total individual tests", formatInteger(exceedance.count), null, organic));
  }

  return `
    <article class="product-panel product-panel--${ORGANIC_CLASS[organic]}">
      <h3>${ORGANIC_LABELS[organic]}</h3>
      <div class="detail-grid">
        ${cards.join("")}
      </div>
    </article>
  `;
}

function buildGapRows(option) {
  if (option.source === "combined") {
    const grouped = new Map();
    for (const row of dataset.combined) {
      const entry = grouped.get(row.product) || {};
      entry[row.organic] = row;
      grouped.set(row.product, entry);
    }
    return [...grouped.entries()]
      .filter(([, entry]) => entry[0] && entry[1])
      .map(([product, entry]) => ({
        product,
        value: entry[1][option.value] - entry[0][option.value],
        organicValue: entry[1][option.value],
        conventionalValue: entry[0][option.value],
        minSamples: Math.min(entry[0].samples, entry[1].samples),
        baseFormatter: formatNumber,
      }));
  }

  const grouped = new Map();
  for (const row of dataset.exceedances) {
    const entry = grouped.get(row.product) || {};
    entry[row.organic] = row;
    grouped.set(row.product, entry);
  }
  return [...grouped.entries()]
    .filter(([, entry]) => entry[0] && entry[1])
    .map(([product, entry]) => ({
      product,
      value: entry[1].mean - entry[0].mean,
      organicValue: entry[1].mean,
      conventionalValue: entry[0].mean,
      minSamples: Math.min(entry[0].count, entry[1].count),
      baseFormatter: formatPercent,
    }));
}

function renderHorizontalBarChart({ element, rows, valueFormatter, tooltipFormatter, colorAccessor, secondaryLabel }) {
  if (!rows.length) {
    element.innerHTML = "<p>No rows match the current filters.</p>";
    return;
  }

  const width = 900;
  const margin = { top: 12, right: 120, bottom: 28, left: 250 };
  const rowHeight = 30;
  const barHeight = 18;
  const innerWidth = width - margin.left - margin.right;
  const height = margin.top + margin.bottom + rowHeight * rows.length;
  const maxValue = Math.max(...rows.map((row) => row.value)) || 1;

  const items = rows
    .map((row, index) => {
      const y = margin.top + index * rowHeight;
      const barWidth = (row.value / maxValue) * innerWidth;
      const tooltipHtml = tooltipFormatter(row);
      const secondary = secondaryLabel
        ? `<text x="${margin.left + barWidth + 8}" y="${y + 24}" class="chart-note">${secondaryLabel(row)}</text>`
        : "";
      return `
        <g class="chart-row" data-tooltip="${escapeAttribute(tooltipHtml)}">
          <text x="${margin.left - 10}" y="${y + 14}" text-anchor="end" class="axis-label">${escapeHtml(row.label)}</text>
          <rect x="${margin.left}" y="${y}" width="${barWidth}" height="${barHeight}" rx="9" fill="${colorAccessor(row)}"></rect>
          <text x="${margin.left + barWidth + 8}" y="${y + 14}" class="bar-label">${valueFormatter(row.value)}</text>
          ${secondary}
        </g>
      `;
    })
    .join("");

  element.innerHTML = `
    <svg viewBox="0 0 ${width} ${height}" role="img" aria-label="Bar chart">
      ${items}
    </svg>
  `;
  wireTooltips(element);
}

function renderDivergingBarChart({ element, rows, valueFormatter, tooltipFormatter }) {
  if (!rows.length) {
    element.innerHTML = "<p>No products meet the paired-sample requirement.</p>";
    return;
  }

  const width = 980;
  const margin = { top: 12, right: 130, bottom: 28, left: 270 };
  const rowHeight = 30;
  const barHeight = 18;
  const innerWidth = width - margin.left - margin.right;
  const height = margin.top + margin.bottom + rowHeight * rows.length;
  const centerX = margin.left + innerWidth / 2;
  const maxAbs = Math.max(...rows.map((row) => Math.abs(row.value))) || 1;

  const items = rows
    .map((row, index) => {
      const y = margin.top + index * rowHeight;
      const scaledWidth = (Math.abs(row.value) / maxAbs) * (innerWidth / 2);
      const isPositive = row.value >= 0;
      const x = isPositive ? centerX : centerX - scaledWidth;
      const fill = isPositive ? "var(--organic)" : "var(--conventional)";

      // For negative bars, the natural label position (x - 8) can overlap the product
      // name when the bar is long. Clamp it inside the bar in that case, with white text.
      let labelX, labelAnchor, labelFill;
      if (isPositive) {
        labelX = x + scaledWidth + 8;
        labelAnchor = "start";
        labelFill = "var(--text)";
      } else {
        const outsideX = x - 8;
        if (outsideX >= margin.left + 4) {
          labelX = outsideX;
          labelAnchor = "end";
          labelFill = "var(--text)";
        } else {
          // Bar is long — show label inside, near the bar's left edge
          labelX = x + 6;
          labelAnchor = "start";
          labelFill = "white";
        }
      }

      return `
        <g class="chart-row" data-tooltip="${escapeAttribute(tooltipFormatter(row))}">
          <text x="${margin.left - 10}" y="${y + 14}" text-anchor="end" class="axis-label">${escapeHtml(row.product)}</text>
          <rect x="${x}" y="${y}" width="${scaledWidth}" height="${barHeight}" rx="9" fill="${fill}"></rect>
          <text x="${labelX}" y="${y + 14}" text-anchor="${labelAnchor}" fill="${labelFill}" class="bar-label">${valueFormatter(row.value)}</text>
        </g>
      `;
    })
    .join("");

  element.innerHTML = `
    <svg viewBox="0 0 ${width} ${height}" role="img" aria-label="Diverging bar chart">
      <line x1="${centerX}" y1="0" x2="${centerX}" y2="${height}" stroke="#c9c2b7" stroke-dasharray="4 4"></line>
      <text x="${centerX - 10}" y="${height - 6}" text-anchor="end" class="chart-note">← Conventional higher</text>
      <text x="${centerX + 10}" y="${height - 6}" class="chart-note">Organic higher →</text>
      ${items}
    </svg>
  `;
  wireTooltips(element);
}

function wireTooltips(element) {
  element.querySelectorAll(".chart-row").forEach((row) => {
    row.addEventListener("mousemove", (event) => showTooltip(event, row.dataset.tooltip));
    row.addEventListener("mouseleave", hideTooltip);
  });
}

function showTooltip(event, html) {
  tooltip.hidden = false;
  tooltip.innerHTML = html;
  tooltip.style.left = `${event.clientX + 16}px`;
  tooltip.style.top = `${event.clientY + 16}px`;
}

function hideTooltip() {
  tooltip.hidden = true;
}

async function fetchCsvText(filename) {
  const response = await fetch(filename, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`Failed to load ${filename} (${response.status}).`);
  }
  return response.text();
}

function parseCsv(text) {
  const rows = [];
  const lines = text.trim().split(/\r?\n/);
  if (!lines.length) return rows;
  const headers = splitCsvLine(lines[0]);
  for (let index = 1; index < lines.length; index += 1) {
    if (!lines[index].trim()) continue;
    const values = splitCsvLine(lines[index]);
    const row = {};
    headers.forEach((header, headerIndex) => {
      row[header] = values[headerIndex] ?? "";
    });
    rows.push(row);
  }
  return rows;
}

function splitCsvLine(line) {
  const values = [];
  let current = "";
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    const next = line[index + 1];

    if (character === '"') {
      if (inQuotes && next === '"') {
        current += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (character === "," && !inQuotes) {
      values.push(current);
      current = "";
    } else {
      current += character;
    }
  }

  values.push(current);
  return values;
}

function populateSelect(selector, options, selectedValue, onChange) {
  const select = document.querySelector(selector);
  select.innerHTML = options
    .map((option) => `<option value="${escapeAttribute(option.value)}">${escapeHtml(option.label)}</option>`)
    .join("");
  select.value = selectedValue;
  select.addEventListener("change", (event) => onChange(event.target.value));
}

function buildLookup(rows) {
  const lookup = new Map();
  for (const row of rows) {
    if (!lookup.has(row.product)) {
      lookup.set(row.product, new Map());
    }
    lookup.get(row.product).set(row.organic, row);
  }
  return lookup;
}

function countComparableProducts() {
  const comparable = new Set();
  for (const rows of [dataset.combined, dataset.exceedances]) {
    const grouped = new Map();
    for (const row of rows) {
      const existing = grouped.get(row.product) || {};
      existing[row.organic] = true;
      grouped.set(row.product, existing);
    }
    for (const [product, entry] of grouped.entries()) {
      if (entry[0] && entry[1]) {
        comparable.add(product);
      }
    }
  }
  return comparable.size;
}

function detailCard(label, value, percentile, organic, zeroNote) {
  const groupLabel = ORGANIC_LABELS[organic]?.toLowerCase() ?? "monitored";
  let contextHtml = "";
  if (zeroNote) {
    contextHtml = `<p class="detail-card__percentile-label">${zeroNote}</p>`;
  } else if (percentile !== null && percentile !== undefined) {
    contextHtml = `
      <div class="detail-card__percentile">
        <div class="detail-card__percentile-bar" style="--pct:${Math.round(percentile * 100)}%;--pct-color:${colorForPercentile(percentile)}">
          <span class="detail-card__percentile-marker" style="left:${Math.round(percentile * 100)}%;background:${colorForPercentile(percentile)}"></span>
        </div>
        <p class="detail-card__percentile-label">Higher than ${Math.round(percentile * 100)}% of all ${groupLabel} foods monitored</p>
      </div>
    `;
  }
  return `
    <article class="detail-card">
      <p class="detail-card__label">${label}</p>
      <p class="detail-card__value">${value}</p>
      ${contextHtml}
    </article>
  `;
}

function colorForOrganic(organic) {
  return organic === 1 ? "var(--organic)" : "var(--conventional)";
}

/** Returns a CSS colour string for a 0–1 percentile: green → amber → red. */
function colorForPercentile(percentile) {
  if (percentile < 0.33) return "var(--pct-low)";
  if (percentile < 0.67) return "var(--pct-mid)";
  return "var(--pct-high)";
}

function atLeastLabel(value) {
  return `At least ${formatInteger(value)}`;
}

function showError(error) {
  errorNotice.hidden = false;
  errorNotice.innerHTML = `
    <strong>Could not load the data files.</strong>
    <p>${escapeHtml(error.message)}</p>
    <p>If you opened the page with a <code>file://</code> URL, serve this folder locally so the browser can fetch the data.</p>
  `;
}

function hideError() {
  errorNotice.hidden = true;
  errorNotice.innerHTML = "";
}

function formatInteger(value) {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(value);
}

function formatNumber(value) {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(value);
}

function formatPercent(value) {
  if (value === 0) return "0%";
  const pct = Math.abs(value) * 100;
  // Determine how many decimal places are needed to show at least one significant digit.
  // e.g. 0.003% needs 3 dp; 0.04% needs 2 dp; 5% needs 0 dp.
  const fractionDigits = pct >= 1 ? 1 : Math.min(Math.max(Math.ceil(-Math.log10(pct)) + 1, 1), 4);
  const formatted = new Intl.NumberFormat("en-US", { style: "percent", maximumFractionDigits: fractionDigits }).format(value);
  // If the value is so tiny it still rounds to "0%", show a floor label instead.
  if (formatted === "0%" || formatted === "-0%") return value > 0 ? "<0.001%" : ">-0.001%";
  return formatted;
}

function formatSignedNumber(value) {
  const prefix = value > 0 ? "+" : "";
  return `${prefix}${formatNumber(value)}`;
}

function formatSignedPercent(value) {
  const prefix = value > 0 ? "+" : "";
  return `${prefix}${formatPercent(value)}`;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function escapeAttribute(value) {
  return escapeHtml(value).replaceAll("'", "&#39;");
}
