#!/bin/bash

echo "🔧 Setting up GRVT Trading environment..."

# Ensure script fails on unhandled errors
set -euo pipefail

# Determine the best Python version to use
PYTHON_CMD=""

echo "🔍 Checking for Python installation..."

# Check for Python versions in order of preference
if command -v python3.13 &> /dev/null; then
    PYTHON_CMD="python3.13"
    echo "✅ Found Python 3.13"
elif command -v python3.12 &> /dev/null; then
    PYTHON_CMD="python3.12"
    echo "✅ Found Python 3.12"
elif command -v python3.11 &> /dev/null; then
    PYTHON_CMD="python3.11"
    echo "✅ Found Python 3.11"
elif command -v python3 &> /dev/null; then
    # Check if Python 3 version is 3.11 or higher
    if python3 -c "import sys; exit(0 if sys.version_info >= (3, 11) else 1)" 2>/dev/null; then
        PYTHON_CMD="python3"
        PYTHON_VERSION=$(python3 --version 2>&1 | grep -oE '[0-9]+\.[0-9]+' | head -1)
        echo "✅ Found Python $PYTHON_VERSION"
    else
        PYTHON_VERSION=$(python3 --version 2>&1 | grep -oE '[0-9]+\.[0-9]+' | head -1)
        echo "❌ Python 3.11+ is required but found Python $PYTHON_VERSION"
        echo "💡 Upgrade Python or install a newer version:"
        echo "   macOS: brew install python@3.11"
        echo "   Ubuntu: sudo apt install python3.11"
        echo "   Windows: Download from https://python.org"
        exit 1
    fi
else
    echo "❌ NO PYTHON INSTALLATION FOUND!"
    echo ""
    echo "🚨 Python 3.11 or higher is required to run this project."
    echo "   Python is NOT installed on your system."
    echo ""
    echo "📥 How to install Python:"
    echo "   macOS:"
    echo "     brew install python@3.11"
    echo "     OR download from: https://python.org"
    echo ""
    echo "   Ubuntu/Debian:"
    echo "     sudo apt update"
    echo "     sudo apt install python3.11 python3.11-venv python3.11-pip"
    echo ""
    echo "   Windows:"
    echo "     Download from: https://python.org"
    echo "     Make sure to check 'Add Python to PATH' during installation"
    echo ""
    echo "   After installation, restart your terminal and run this script again."
    exit 1
fi

# Verify Python can actually run
echo "🧪 Testing Python installation..."
if ! $PYTHON_CMD --version &> /dev/null; then
    echo "❌ Python command '$PYTHON_CMD' exists but cannot run properly"
    echo "💡 Try reinstalling Python or check your system configuration"
    exit 1
fi

# Test if venv module is available
echo "🧪 Testing Python venv module..."
if ! $PYTHON_CMD -m venv --help &> /dev/null; then
    echo "❌ Python venv module is not available"
    echo "💡 Install venv module:"
    echo "   Ubuntu/Debian: sudo apt install python3-venv"
    echo "   Others: Python venv should be included by default"
    exit 1
fi

echo "✅ Python installation verified: $PYTHON_CMD"

# Path to requirements file (root)
REQ_FILE="requirements.txt"

# Verify requirements.txt exists
if [ ! -f "$REQ_FILE" ]; then
    echo "❌ Could not find $REQ_FILE in the repository root."
    echo "💡 Make sure $REQ_FILE exists or update REQ_FILE variable in this script."
    exit 1
fi

echo "📦 Preparing Python dependencies installation..."
echo "🐍 Using Python command: $PYTHON_CMD"
echo "🔒 All Python packages will be installed ONLY in virtual environment (not system-wide)"

# Create virtual environment if it doesn't exist
VENV_DIR="venv"
if [ ! -d "$VENV_DIR" ]; then
    echo "🔧 Creating Python virtual environment..."
    $PYTHON_CMD -m venv "$VENV_DIR" || {
        echo "❌ Failed to create virtual environment"
        exit 1
    }
    echo "✅ Virtual environment created"
else
    echo "✅ Virtual environment already exists"
fi

# Activate virtual environment and install dependencies
echo "🔧 Activating virtual environment and installing dependencies..."
source "$VENV_DIR/bin/activate" || {
    echo "❌ Failed to activate virtual environment"
    echo "💡 The virtual environment may be corrupted. Try deleting './venv' folder and run setup again."
    exit 1
}

# Verify pip is available in virtual environment
if ! command -v pip &> /dev/null; then
    echo "❌ pip is not available in virtual environment"
    echo "💡 Virtual environment setup may have failed"
    deactivate
    exit 1
fi

echo "✅ Virtual environment activated successfully"

# Verify we're using virtual environment pip
ACTIVE_PYTHON=$(which python)
ACTIVE_PIP=$(which pip)
echo "🔍 Active Python: $ACTIVE_PYTHON"
echo "🔍 Active pip: $ACTIVE_PIP"

# Verify we're in virtual environment
if [[ "$ACTIVE_PYTHON" == *"/venv/"* ]]; then
    echo "✅ Confirmed: Using virtual environment Python"
else
    echo "⚠️  Warning: May not be using virtual environment Python"
fi

# Install Python dependencies in virtual environment
echo "📥 Installing Python packages from $REQ_FILE..."
pip install -r "$REQ_FILE" || {
    echo "❌ Failed to install Python dependencies from $REQ_FILE"
    echo "💡 Check your internet connection and requirements.txt file"
    deactivate
    exit 1
}

# Install Python service requirements
if [ -f "python-service/requirements.txt" ]; then
    echo "📥 Installing Python service requirements..."
    pip install -r python-service/requirements.txt || {
        echo "❌ Failed to install Python service dependencies"
        echo "💡 Check your internet connection and python-service/requirements.txt file"
        deactivate
        exit 1
    }
    echo "✅ Python service dependencies installed"
fi

# Deactivate virtual environment
deactivate

echo "✅ Python dependencies installed successfully"

# Install Node.js dependencies
echo "📦 Installing Node.js dependencies..."
npm install || {
    echo "❌ Failed to install Node.js dependencies"
    exit 1
}

echo "✅ Setup completed successfully!"
echo ""
echo "📁 What was created:"
echo "   • Virtual environment in: ./venv"
echo "   • Python packages installed in virtual environment"
echo "   • Node.js dependencies installed"
echo ""
echo "🚀 You can now run: npm run example"
echo ""
echo "🐍 Python Information:"
echo "   • Base Python: $PYTHON_CMD"
echo "   • Virtual Environment: ./venv/bin/python"
echo "   • The GRVT service will automatically use the virtual environment"
echo ""
echo "💡 Notes:"
echo "   • The 'venv' folder contains your Python dependencies"
echo "   • Don't delete the 'venv' folder (it's ignored by git)"
echo "   • If you have Python issues, delete 'venv' and run setup again"
echo ""
echo "⚙️  Configuration:"
echo "   • Copy .env.example to .env and configure your credentials"
echo "   • Required: GRVT_TRADING_ADDRESS, GRVT_TRADING_ACCOUNT_ID"
echo "   • Required: GRVT_TRADING_PRIVATE_KEY, GRVT_TRADING_API_KEY"
echo "   • Set GRVT_ENV to 'testnet' or 'mainnet'"
echo ""
echo "⚠️  IMPORTANT: Always test on testnet first!"
echo "⚠️  Never commit your .env file to version control!"
