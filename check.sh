#!/usr/bin/env bash
# The one verb. Builds, then holds dist/ to CLAUDE.md's invariants. ~1s, offline.
set -euo pipefail
cd "$(dirname "$0")"
node --test 'tests/*.test.js'
