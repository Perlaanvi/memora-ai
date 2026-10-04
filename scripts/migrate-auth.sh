#!/usr/bin/env bash
set -e

echo "================================================================"
echo "    MEMORA AI — FIREBASE AUTHENTICATION USERS MIGRATION        "
echo "================================================================"

OLD_PROJECT="crested-alloy-lcjpc"
NEW_PROJECT="memora-ai-6ebfd"

echo "Source Project: $OLD_PROJECT"
echo "Dest Project:   $NEW_PROJECT"
echo ""

# Step 1: Export Auth Users from OLD project
echo "[STEP 1] Exporting users from $OLD_PROJECT..."
echo "Command:"
echo "  firebase auth:export old_users.json --project $OLD_PROJECT --format=json"
echo ""
echo "Note: If running as project owner, execute:"
echo "  firebase auth:export old_users.json --project $OLD_PROJECT --format=json"
echo ""

# Step 2: Import Auth Users into NEW project
echo "[STEP 2] Importing users into $NEW_PROJECT..."
echo "Command:"
echo "  firebase auth:import old_users.json --project $NEW_PROJECT --hash-algo=SCRYPT --rounds=8 --mem-cost=14"
echo ""
echo "Preserves:"
echo "  - User UID (100% invariant matching Firestore request.auth.uid)"
echo "  - Email addresses"
echo "  - Display names and avatars"
echo "  - Password hashes & salt parameters"
echo "================================================================"
