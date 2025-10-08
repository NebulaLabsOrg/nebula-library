#!/bin/bash

echo "🔧 Setting up Extended Trading environment..."

# Check if Python 3.11 is available
if ! command -v python3.11 &> /dev/null; then
    echo "❌ Python 3.11 is required but not installed."
    echo "💡 Install with: brew install python@3.11"
    exit 1
fi

echo "✅ Python 3.11 is available"

# Install required Python packages
echo "📦 Installing Python dependencies..."

# Install x10-python-trading-starknet with Python 3.11
python3.11 -m pip install x10-python-trading-starknet || {
    echo "❌ Failed to install Python dependencies"
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