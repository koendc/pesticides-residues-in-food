#!/usr/bin/env python3
"""
Generate pesticide residue summary CSVs from the raw EU monitoring dataset.

Usage:
    python generate_csvs.py [INPUT_CSV] [OUTPUT_DIR]

Defaults:
    INPUT_CSV  – input/AR2023.CSV
    OUTPUT_DIR – current directory (where this script lives)

Output files:
    combined_mrl_by_product.csv   – per-product pesticide load and detection counts
    mrl_exceeded_by_product.csv   – per-product legal-limit exceedance rates
"""

import sys
from pathlib import Path

import pandas as pd

# 90th Percentile
def q90(x):
    return x.quantile(0.9)

# 95th Percentile
def q95(x):
    return x.quantile(0.95)


def main(input_path: Path, output_dir: Path) -> None:
    print(f"Loading samples from {input_path} …")
    samples = pd.read_csv(input_path)

    # Keep only randomised samples with a valid MRL reference value
    random_samples = samples[
        (samples["sampStrategy.DESC"] != "Suspect sampling")
        & (samples["MRLPesticides_ugkg"] != 0)
    ]
    print(f"  {len(random_samples):,} randomised samples retained "
          f"(of {len(samples):,} total)")

    # Normalise residue values to µg/kg, then compute per-substance MRL ratio
    unit_factors = {
        "Milligram/kilogram": 1_000,
        "Microgram/kilogram": 1,
        "Gram/litre": 1_000_000,
        "Microgram/litre": 1,
    }
    random_samples = random_samples.assign(
        resUnit_ConversionFactor=random_samples["resUnit.DESC"].map(unit_factors),
        resVal_normalized=lambda df: df["resUnit_ConversionFactor"] * df["resVal"],
    )
    random_samples = random_samples.assign(
        resVal_mrl_ratio=random_samples["resVal_normalized"]
        / random_samples["MRLPesticides_ugkg"]
    )

    # ── mrl_exceeded_by_product.csv ──────────────────────────────────────────
    random_samples = random_samples.assign(
        mrl_exceeded=random_samples["resVal_mrl_ratio"] > 1
    )
    mrl_exceeded = random_samples.groupby(
        ["sampMatCode.base.building.DESC", "organic"]
    )["mrl_exceeded"].agg(["mean", "sum", "count"])

    out1 = output_dir / "mrl_exceeded_by_product.csv"
    mrl_exceeded.to_csv(out1)
    print(f"Written: {out1}")

    # ── combined_mrl_by_product.csv ──────────────────────────────────────────
    grouped = random_samples.groupby(
        ["sampMatCode.base.building.DESC", "organic", "sampId_A"]
    )["resVal_mrl_ratio"].agg(
        combined_mrl_ratio="sum",
        substances_found=lambda x: (x.ne(0) & x.notna()).sum(),
        substances_tested="size",
    )

    combined = (
        grouped.groupby(["sampMatCode.base.building.DESC", "organic"])
        .agg(
            avg_combined_mrl_ratio=("combined_mrl_ratio", "mean"),
            median_combined_mrl_ratio=("combined_mrl_ratio", "median"),
            p90_combined_mrl_ratio=("combined_mrl_ratio", q90),
            p95_combined_mrl_ratio=("combined_mrl_ratio", q95),
            avg_substances_found=("substances_found", "mean"),
            median_substances_found=("substances_found", "median"),
            p90_substances_found=("substances_found", q90),
            p95_substances_found=("substances_found", q95),
            samples=("substances_found", "size"),
        )
        .query("samples > 10")
        .rename_axis(["product", "organic"])
    )

    out2 = output_dir / "combined_mrl_by_product.csv"
    combined.to_csv(out2)
    print(f"Written: {out2}")


if __name__ == "__main__":
    script_dir = Path(__file__).parent

    input_csv = Path(sys.argv[1]) if len(sys.argv) > 1 else script_dir / "input" / "AR2023.CSV"
    output_dir = Path(sys.argv[2]) if len(sys.argv) > 2 else script_dir

    if not input_csv.exists():
        print(f"Error: input file not found: {input_csv}", file=sys.stderr)
        sys.exit(1)

    output_dir.mkdir(parents=True, exist_ok=True)
    main(input_csv, output_dir)
