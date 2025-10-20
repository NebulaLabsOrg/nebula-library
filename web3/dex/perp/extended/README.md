# Extended trading client

##  Prerequisites

- **Node.js**: ≥16.0.0
- **Python**: ≥3.11.0
- **npm**: Latest stable version
- **pip**: Python package installer

## 🛠️ Setup

### 1. Create Requirements File

Create a `requirements.txt` file in the project root with the following content:

```txt
# Requirements for Extended Trading Python dependencies
# Tested with Python 3.11
x10-python-trading-starknet
```

### 2. Create Setup Script

Create a `setup.sh` file in the project root:

```bash
#!/bin/bash

echo "🔧 Setting up project environment..."

# Install Python dependencies
echo "📦 Installing Python dependencies..."
pip install -r requirements.txt

# Install Node.js dependencies  
echo "📦 Installing Node.js dependencies..."
npm install

echo "🎉 Setup completed successfully!"
```

### 3. Run Setup

Execute the setup script:

```bash
sh ./setup.sh
```

## � Usage

After setup, you can use the library modules as needed. Each module is located in its respective directory with examples provided.

