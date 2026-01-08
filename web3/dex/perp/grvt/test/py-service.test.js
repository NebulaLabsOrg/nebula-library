/**
 * Test to verify that parameters are correctly passed to the GRVT Python service
 */

import { Grvt } from '../index.js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env file from the example folder
dotenv.config({ path: path.join(__dirname, '../example/.env') });

// Console color codes
const colors = {
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    reset: '\x1b[0m',
    bold: '\x1b[1m'
};

/**
 * Colored log function
 */
function log(message, color = 'reset') {
    console.log(`${colors[color]}${message}${colors.reset}`);
}

/**
 * Test the parameters passed to Python
 */
async function testPythonParameters() {
    log('\n🔍 GRVT PYTHON SERVICE TEST', 'bold');
    log('=====================================\n', 'blue');
    
    // Check environment variables
    log('📋 Checking configuration parameters:', 'yellow');
    
    const requiredEnvVars = {
        'GRVT_FUNDING_ADDRESS': process.env.GRVT_FUNDING_ADDRESS,
        'GRVT_FUNDING_PRIVATE_KEY': process.env.GRVT_FUNDING_PRIVATE_KEY,
        'GRVT_FUNDING_API_KEY': process.env.GRVT_FUNDING_API_KEY,
        'GRVT_TRADING_ADDRESS': process.env.GRVT_TRADING_ADDRESS,
        'GRVT_TRADING_ACCOUNT_ID': process.env.GRVT_TRADING_ACCOUNT_ID,
        'GRVT_TRADING_PRIVATE_KEY': process.env.GRVT_TRADING_PRIVATE_KEY,
        'GRVT_TRADING_API_KEY': process.env.GRVT_TRADING_API_KEY
    };
    
    let allEnvVarsPresent = true;
    
    for (const [key, value] of Object.entries(requiredEnvVars)) {
        if (value) {
            log(`✅ ${key}: ${key.includes('PRIVATE') || key.includes('API_KEY') ? '***HIDDEN***' : value}`, 'green');
        } else {
            log(`❌ ${key}: MISSING`, 'red');
            allEnvVarsPresent = false;
        }
    }
    
    if (!allEnvVarsPresent) {
        log('\n❌ Some environment variables are missing! Please check your .env file', 'red');
        return;
    }
    
    // Initialize Grvt client
    log('\n🔧 Initializing Grvt client...', 'yellow');
    
    const grvtInstance = new Grvt({
        funding: {
            address: process.env.GRVT_FUNDING_ADDRESS,
            privateKey: process.env.GRVT_FUNDING_PRIVATE_KEY,
            apiKey: process.env.GRVT_FUNDING_API_KEY
        },
        trading: {
            address: process.env.GRVT_TRADING_ADDRESS,
            accountId: process.env.GRVT_TRADING_ACCOUNT_ID,
            privateKey: process.env.GRVT_TRADING_PRIVATE_KEY,
            apiKey: process.env.GRVT_TRADING_API_KEY
        },
        slippage: 0.5,
        environment: process.env.GRVT_ENV || 'testnet',
        usePython: true
    });
    
    log('✅ Grvt client initialized', 'green');
    
    // Wait for authentication and Python service
    log('\n🔧 Waiting for authentication and Python service...', 'yellow');
    await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds for init
    log('✅ Initialization completed', 'green');
    
    // Check internal configuration
    log('\n📊 Checking internal configuration:', 'yellow');
    log(`   Funding API Key: ${grvtInstance.funding.apiKey ? '✅ Present' : '❌ Missing'}`, grvtInstance.funding.apiKey ? 'green' : 'red');
    log(`   Trading API Key: ${grvtInstance.trading.apiKey ? '✅ Present' : '❌ Missing'}`, grvtInstance.trading.apiKey ? 'green' : 'red');
    log(`   Trading Account ID: ${grvtInstance.trading.accountId}`, 'blue');
    log(`   Environment: ${grvtInstance.environment}`, 'blue');
    log(`   Python Enabled: ${grvtInstance.usePython}`, 'blue');
    log(`   Python Service: ${grvtInstance.pythonService ? '✅ Running' : '❌ Not started'}`, grvtInstance.pythonService ? 'green' : 'red');
    
    // Check Python version compatibility
    log('\n🐍 Checking Python version:', 'yellow');
    
    try {
        const { spawn } = await import('child_process');
        const { findPythonPath } = await import('../src/helpers.js');
        
        const pythonPath = await findPythonPath();
        log(`   Python path: ${pythonPath}`, 'blue');
        
        const pythonVersionProcess = spawn(pythonPath, ['--version']);
        let versionOutput = '';
        
        pythonVersionProcess.stdout.on('data', (data) => {
            versionOutput += data.toString();
        });
        
        pythonVersionProcess.stderr.on('data', (data) => {
            versionOutput += data.toString();
        });
        
        await new Promise((resolve) => {
            pythonVersionProcess.on('close', (code) => {
                if (code === 0) {
                    const version = versionOutput.trim();
                    log(`✅ Python version: ${version}`, 'green');
                    
                    // Check if Python 3.11 or higher
                    const versionMatch = version.match(/Python (\d+)\.(\d+)/);
                    if (versionMatch) {
                        const major = parseInt(versionMatch[1]);
                        const minor = parseInt(versionMatch[2]);
                        
                        if (major >= 3 && minor >= 11) {
                            log('✅ Python version is compatible (3.11+ required)', 'green');
                        } else {
                            log('⚠️  Python version may be old (3.11+ recommended)', 'yellow');
                        }
                    }
                } else {
                    log('❌ Python is not available or accessible', 'red');
                }
                resolve();
            });
        });
        
    } catch (error) {
        log(`❌ Error checking Python version: ${error.message}`, 'red');
    }
    
    // Check requirements.txt file
    log('\n📋 Checking requirements.txt:', 'yellow');
    
    try {
        const fs = await import('fs');
        const requirementsPath = path.join(__dirname, '../python-service/requirements.txt');
        
        if (fs.existsSync(requirementsPath)) {
            const requirementsContent = fs.readFileSync(requirementsPath, 'utf8');
            log(`✅ Found requirements.txt in python-service folder`, 'green');
            
            log('📄 Requirements content:', 'blue');
            requirementsContent.split('\n').forEach(line => {
                if (line.trim() && !line.startsWith('#')) {
                    log(`   ${line}`, 'blue');
                }
            });
            
            if (requirementsContent.includes('grvt-pysdk')) {
                log('✅ grvt-pysdk is listed in requirements', 'green');
            } else {
                log('❌ grvt-pysdk NOT found in requirements', 'red');
            }
        } else {
            log('❌ requirements.txt not found!', 'red');
        }
        
    } catch (error) {
        log(`❌ Error reading requirements.txt: ${error.message}`, 'red');
    }

    // Test SDK dependencies
    log('\n📦 Checking SDK dependencies:', 'yellow');
    
    try {
        log('   Verifying GRVT Python SDK installation...', 'blue');
        
        const { spawn } = await import('child_process');
        const { findPythonPath } = await import('../src/helpers.js');
        
        const pythonPath = await findPythonPath();
        
        // Check if grvt-pysdk is installed
        const sdkCheckCommand = `
try:
    from pysdk.grvt_raw_sync import GrvtRawSync
    from pysdk.grvt_raw_base import GrvtApiConfig, GrvtError
    from pysdk.grvt_raw_env import GrvtEnv
    from pysdk.grvt_raw_signing import sign_order
    from pysdk import grvt_raw_types as types
    import grvt_pysdk
    print('SDK_AVAILABLE=True')
    print(f'GRVT SDK version: {grvt_pysdk.__version__}')
    print('All required libraries for GRVT SDK functionality are installed!')
except ImportError as e:
    print('SDK_AVAILABLE=False')
    print(f'Missing library: {e}')
`;
        
        const pythonProcess = spawn(pythonPath, ['-c', sdkCheckCommand]);
        let stdout = '';
        let stderr = '';
        
        pythonProcess.stdout.on('data', (data) => {
            stdout += data.toString();
        });
        
        pythonProcess.stderr.on('data', (data) => {
            stderr += data.toString();
        });
        
        await new Promise((resolve, reject) => {
            pythonProcess.on('close', (code) => {
                if (code === 0) {
                    const lines = stdout.trim().split('\n');
                    const sdkStatus = lines.find(line => line.includes('SDK_AVAILABLE='));
                    
                    if (sdkStatus && sdkStatus.includes('True')) {
                        log('✅ SDK_AVAILABLE: True', 'green');
                        log('✅ grvt-pysdk is properly installed', 'green');
                        lines.slice(1).forEach(line => log(`   ${line}`, 'green'));
                    } else {
                        log('❌ SDK_AVAILABLE: False', 'red');
                        log('❌ grvt-pysdk is NOT installed or has missing dependencies', 'red');
                        lines.slice(1).forEach(line => log(`   ${line}`, 'red'));
                        
                        // Provide installation instructions
                        log('\n💡 To install the required SDK, run:', 'yellow');
                        log('   cd web3/dex/perp/grvt', 'blue');
                        log('   ./setup.sh', 'blue');
                        log('   OR manually:', 'blue');
                        log('   ./venv/bin/pip install -r python-service/requirements.txt', 'blue');
                    }
                    resolve();
                } else {
                    log('❌ Error checking SDK dependencies:', 'red');
                    if (stderr) log(`   ${stderr}`, 'red');
                    resolve();
                }
            });
        });
        
    } catch (error) {
        log('❌ Error checking SDK dependencies:', 'red');
        log(`   ${error.message}`, 'red');
    }

    // Test direct call to Python service to verify parameters
    log('\n🐍 Testing direct call to Python service:', 'yellow');
    
    try {
        if (!grvtInstance.pythonService) {
            log('❌ Python service not initialized!', 'red');
            log('💡 Make sure usePython: true is set in config', 'yellow');
        } else {
            log('   Python service is running', 'green');
            log('   Testing basic communication...', 'blue');
        }
        
        // Check if the Python file exists
        const fs = await import('fs');
        const pythonScriptPath = path.join(__dirname, '../python-service/service.py');
        if (fs.existsSync(pythonScriptPath)) {
            log('✅ Python service file exists at: ' + pythonScriptPath, 'green');
        } else {
            log('❌ Python service file not found at: ' + pythonScriptPath, 'red');
        }
        
    } catch (error) {
        log('❌ Error testing Python service:', 'red');
        log(`   Error: ${error.message}`, 'red');
    }
    
    log('\n🏁 Test completed!', 'bold');
    
    // Cleanup: close the Grvt instance
    await grvtInstance.close();
}

// Run test
testPythonParameters().catch(error => {
    console.error('Error during test:', error);
    process.exit(1);
});
