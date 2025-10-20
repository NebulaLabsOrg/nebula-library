#!/bin/bash

echo "🔧 Setting up Extended Trading environment..."

# Ensure script fails on unhandled errors
set -euo pipefail

# Check if Python 3.11 is available
if ! command -v python3.11 &> /dev/null; then
    echo "❌ Python 3.11 is required but not installed."
    echo "💡 Install with: brew install python@3.11"
    exit 1
fi

echo "✅ Python 3.11 is available"

# Path to requirements file (root)
REQ_FILE="requirements.txt"

# Verify requirements.txt exists
if [ ! -f "$REQ_FILE" ]; then
    echo "❌ Could not find $REQ_FILE in the repository root."
    echo "💡 Make sure $REQ_FILE exists or update REQ_FILE variable in this script."
    exit 1
fi

echo "📦 Installing Python dependencies from $REQ_FILE..."

# Install Python dependencies from requirements.txt using Python 3.11
python3.11 -m pip install -r "$REQ_FILE" || {
    echo "❌ Failed to install Python dependencies from $REQ_FILE"
    exit 1
}

echo "✅ Python dependencies installed successfully"

# Install Node.js dependencies
echo "📦 Installing Node.js dependencies..."
npm install || {
    echo "❌ Failed to install Node.js dependencies"
    exit 1
}

echo "✅ Setup completed successfully!"
echo "🚀 You can now run: npm test"