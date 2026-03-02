#!/usr/bin/env bash
# Run build + unit tests and write a short summary to test-reports/summary.txt
set -e
cd "$(dirname "$0")/.."
mkdir -p test-reports

echo "=== Toyflix test run ==="
echo "Started: $(date -u +"%Y-%m-%dT%H:%M:%SZ")"
echo ""

echo "1. Build..."
if npm run build > test-reports/build.log 2>&1; then
  echo "   Build: PASS"
  BUILD=0
else
  echo "   Build: FAIL (see test-reports/build.log)"
  BUILD=1
fi

echo ""
echo "2. Unit tests..."
if npm test 2>&1 | tee test-reports/test-output.txt; then
  echo "   Unit tests: PASS"
  TESTS=0
else
  echo "   Unit tests: FAIL (see test-reports/test-output.txt)"
  TESTS=1
fi

echo ""
echo "=== Summary ==="
{
  echo "Date: $(date -u +"%Y-%m-%dT%H:%M:%SZ")"
  echo "Build: $([ $BUILD -eq 0 ] && echo PASS || echo FAIL)"
  echo "Unit tests: $([ $TESTS -eq 0 ] && echo PASS || echo FAIL)"
  echo ""
  echo "Manual/E2E: Run test cases from docs/TEST_PLAN.md and fill docs/TEST_REPORT.md"
} | tee test-reports/summary.txt

exit $((BUILD + TESTS))
