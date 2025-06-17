#!/bin/bash

# Test Vision Understanding API with artistic style detection

echo "🧪 Testing Vision Understanding API"
echo "=================================="
echo ""

# Test 1: Japanese water painting style
echo "Test 1: Japanese water painting style"
echo "-------------------------------------"

curl -X POST http://localhost:3000/api/vision-only \
  -H "Content-Type: application/json" \
  -d '{
    "concept": "A mystical journey through Japanese sumi-e water painting landscapes where mountains dissolve into mist",
    "style": "artistic",
    "pacing": "contemplative",
    "duration": 30,
    "contentType": "general"
  }' | jq '.'

echo ""
echo ""

# Test 2: Van Gogh style
echo "Test 2: Van Gogh style"
echo "----------------------"

curl -X POST http://localhost:3000/api/vision-only \
  -H "Content-Type: application/json" \
  -d '{
    "concept": "The night sky swirls with van Gogh Post-Impressionist style, stars dancing in thick brushstrokes",
    "style": "artistic", 
    "pacing": "dynamic",
    "duration": 30,
    "contentType": "general"
  }' | jq '.'