#!/usr/bin/env bash
# Exit on error
set -o errexit

echo "Building frontend..."
cd frontend
npm install
npm run build

echo "Installing backend dependencies..."
cd ../backend
pip install -r requirements.txt
