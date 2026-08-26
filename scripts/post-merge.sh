#!/usr/bin/env bash
set -euo pipefail

# Keep task merges reproducible without prompting for input.
npm ci --ignore-scripts --no-audit --no-fund
npm run prepare
npm run smoke