#!/bin/bash
# E2E test setup — clean state before running Maestro
# Usage: .maestro/setup.sh

set -e

echo "=== E2E Test Setup ==="

# Delete test user from Convex (if exists)
echo "Cleaning Convex test user..."
bunx convex run users:deleteUserByPhone '{"phone": "+15555550100"}' 2>/dev/null || true

echo "=== Setup complete ==="
echo ""
echo "NOTE: If the test user also exists in Clerk, delete them from the"
echo "Clerk Dashboard before running the test. Otherwise, the sign-up"
echo "flow will hit an existing Clerk user and follow the sign-in path."
