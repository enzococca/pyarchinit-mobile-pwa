#!/bin/bash
# Test script for user database management endpoints
# Replace YOUR_RAILWAY_URL with your actual Railway backend URL

RAILWAY_URL="https://your-app.railway.app"  # UPDATE THIS
TOKEN="your_jwt_token_here"  # UPDATE THIS after login

echo "=== Testing Database Management Endpoints ==="
echo ""

echo "1. Get database config:"
curl -X GET "$RAILWAY_URL/api/database/config" \
  -H "Authorization: Bearer $TOKEN" | jq

echo -e "\n\n2. Update to SQLite mode:"
curl -X PUT "$RAILWAY_URL/api/database/config" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"db_mode": "sqlite"}' | jq

echo -e "\n\n3. Initialize database:"
curl -X POST "$RAILWAY_URL/api/database/initialize" \
  -H "Authorization: Bearer $TOKEN" | jq

echo -e "\n\n4. Get database info:"
curl -X GET "$RAILWAY_URL/api/database/info" \
  -H "Authorization: Bearer $TOKEN" | jq

echo -e "\n\n=== Tests Complete ==="
