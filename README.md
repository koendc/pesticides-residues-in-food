# Pesticide residues in food

## Overview

This repository generates a [web page](https://koendc.github.io/pesticides-residues-in-food/) that analyzes pesticide residues in food
from multiple angles:
* Foods with the most MRL exceedances
* How big is the total pesticide load in certain foods? While none of the pesticide levels might exceed the legal limits, the total
  amount of pesticides might still be considerable
* What is the difference between organic and conventional?

## How to generate the data

1. Download the source data from [APPENDIX B of the 2023 EU Report on Pesticide Residues in Food](https://zenodo.org/records/14765085).
2. Extract the zip file and place AR2023.csv in the `input/` directory.
3. Run `python3 generate_csvs.py`.
