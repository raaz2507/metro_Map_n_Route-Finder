#!/usr/bin/env bash

# ==============================================================================
# 🚇 Metro Route & Fare Test Runner (Bash Script)
# ==============================================================================
# Usage:
#   ./run.sh                  -> Interactive menu (multiple numbers enter kar sakte ho)
#   ./run.sh 1 3 5            -> Directly runs cities 1, 3, and 5
#   ./run.sh 17               -> Runs ALL 16 cities
#   ./run.sh 18               -> Runs Data & Fare Audit only
# ==============================================================================

# Script directory locate karein
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR/.." || exit 1

# Node binary resolution (Git Bash / Windows / Linux)
if command -v node >/dev/null 2>&1; then
  NODE_CMD="node"
elif [ -f "/c/Program Files/nodejs/node.exe" ]; then
  NODE_CMD="/c/Program Files/nodejs/node.exe"
elif [ -f "C:/Program Files/nodejs/node.exe" ]; then
  NODE_CMD="C:/Program Files/nodejs/node.exe"
else
  NODE_CMD="node"
fi

# City Array Mapping (1-based index)
CITIES=(
  "delhi_ncr"
  "bengaluru"
  "mumbai"
  "kolkata"
  "chennai"
  "hyderabad"
  "ahmedabad_gandhinagar"
  "pune"
  "nagpur"
  "kochi"
  "lucknow"
  "jaipur"
  "kanpur"
  "agra"
  "bhopal"
  "indore"
)

print_menu() {
  echo "=================================================================="
  echo "  🚇 METRO MAP & ROUTE FINDER - MULTI-CITY TEST RUNNER"
  echo "=================================================================="
  echo "   1) Delhi NCR                  9) Nagpur"
  echo "   2) Bengaluru (Namma Metro)   10) Kochi"
  echo "   3) Mumbai & Monorail         11) Lucknow"
  echo "   4) Kolkata                   12) Jaipur"
  echo "   5) Chennai                   13) Kanpur"
  echo "   6) Hyderabad                 14) Agra"
  echo "   7) Ahmedabad-Gandhinagar     15) Bhopal"
  echo "   8) Pune                      16) Indore"
  echo "------------------------------------------------------------------"
  echo "  17) 🚀 ALL CITIES (Master Test)"
  echo "  18) 🔍 AUDIT ONLY (Data & Fare Rules Integrity Check)"
  echo "   0) Exit"
  echo "=================================================================="
}

run_city() {
  local num=$1
  if [[ "$num" -ge 1 && "$num" -le 16 ]]; then
    local idx=$((num - 1))
    local city="${CITIES[$idx]}"
    echo ""
    echo "▶ Running test for: $city (Option $num)..."
    node tester/run.js --city="$city"
  elif [[ "$num" -eq 17 ]]; then
    echo ""
    echo "▶ Running master test suite for ALL 16 CITIES..."
    node tester/run.js --all
  elif [[ "$num" -eq 18 ]]; then
    echo ""
    echo "▶ Running Data & Fare Integrity AUDIT..."
    node tester/run.js --audit
  elif [[ "$num" -eq 0 ]]; then
    echo "Exiting."
    exit 0
  else
    echo "⚠️  Invalid option: $num (Allowed: 0 to 18)"
  fi
}

# Agar command line arguments diye gaye hain (e.g. ./run.sh 1 3 5 ya ./run.sh "1 3 5")
if [ "$#" -gt 0 ]; then
  for arg in "$@"; do
    for num in $arg; do
      run_city "$num"
    done
  done
  exit 0
fi

# Interactive Mode: Input maange
print_menu
echo -n "Enter numbers separated by spaces (e.g. 1 3 5 ya 17 for all): "
read -r user_input

if [ -z "$user_input" ]; then
  echo "No selection made. Exiting."
  exit 0
fi

for num in $user_input; do
  run_city "$num"
done
