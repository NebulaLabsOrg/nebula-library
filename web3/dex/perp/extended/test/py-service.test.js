/**
 * Test to verify that parameters are correctly passed to the Python service
 */

import { Extended } from '../index.js';
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
    log('\n🔍 PYTHON SERVICE TEST', 'bold');
    log('=====================================\n', 'blue');
    
    // Check environment variables
    log('📋 Checking configuration parameters:', 'yellow');
    
    const requiredEnvVars = {
        'API_KEY': process.env.API_KEY,
        'STARK_KEY_PRIVATE': process.env.STARK_KEY_PRIVATE,
        'STARK_KEY_PUBLIC': process.env.STARK_KEY_PUBLIC,
        'VAULT_NUMBER': process.env.VAULT_NUMBER
    };
    
    let allEnvVarsPresent = true;
    
    for (const [key, value] of Object.entries(requiredEnvVars)) {
        if (value) {
            log(`✅ ${key}: ${key.includes('PRIVATE') ? '***HIDDEN***' : value}`, 'green');
        } else {
            log(`❌ ${key}: MISSING`, 'red');
            allEnvVarsPresent = false;
        }
    }
    
    if (!allEnvVarsPresent) {
        log('\n❌ Some environment variables are missing! Please check your .env file', 'red');
        return;
    }
    
    // Initialize Extended client
    log('\n🔧 Initializing Extended client...', 'yellow');
    
    const extendedInstance = new Extended({
        apiKey: process.env.API_KEY,
        privateKey: process.env.STARK_KEY_PRIVATE,
        publicKey: process.env.STARK_KEY_PUBLIC,
        vault: parseInt(process.env.VAULT_NUMBER),
        slippage: 0.1,
        environment: process.env.ENVIRONMENT || 'testnet'
    });
    
    log('✅ Extended client initialized', 'green');
    
    // Ensure Python path is properly initialized
    log('\n🔧 Ensuring Python path initialization...', 'yellow');
    await extendedInstance.ensurePythonPathInitialized();
    log('✅ Python path initialization completed', 'green');
    
    // Check internal configuration
    log('\n📊 Checking internal configuration:', 'yellow');
    log(`   API Key: ${extendedInstance.apiKey ? '✅ Present' : '❌ Missing'}`, extendedInstance.apiKey ? 'green' : 'red');
    log(`   Stark Private Key: ${extendedInstance.account.starkKeyPrv ? '✅ Present' : '❌ Missing'}`, extendedInstance.account.starkKeyPrv ? 'green' : 'red');
    log(`   Stark Public Key: ${extendedInstance.account.starkKeyPub ? '✅ Present' : '❌ Missing'}`, extendedInstance.account.starkKeyPub ? 'green' : 'red');
    log(`   Vault Number: ${extendedInstance.account.vaultNr}`, 'blue');
    log(`   Environment: ${extendedInstance.environment}`, 'blue');
    log(`   Python Path: ${extendedInstance.pythonPath}`, 'blue');
    log(`   Script Path: ${extendedInstance.scriptPath}`, 'blue');
    
    // Check Python version compatibility
    log('\n🐍 Checking Python version:', 'yellow');
    
    try {
        const { spawn } = await import('child_process');
        const pythonVersionProcess = spawn(extendedInstance.pythonPath, ['--version']);
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
                            log('❌ Python version is too old (3.11+ required)', 'red');
                            log('💡 Install Python 3.11+ with: brew install python@3.11', 'yellow');
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
        const requirementsPath = path.join(__dirname, '../requirements.txt');
        const rootRequirementsPath = path.join(__dirname, '../../../../requirements.txt');
        
        let requirementsFound = false;
        let requirementsContent = '';
        
        if (fs.existsSync(requirementsPath)) {
            requirementsContent = fs.readFileSync(requirementsPath, 'utf8');
            requirementsFound = true;
            log(`✅ Found requirements.txt in extended folder`, 'green');
        } else if (fs.existsSync(rootRequirementsPath)) {
            requirementsContent = fs.readFileSync(rootRequirementsPath, 'utf8');
            requirementsFound = true;
            log(`✅ Found requirements.txt in root folder`, 'green');
        }
        
        if (requirementsFound) {
            log('📄 Requirements content:', 'blue');
            requirementsContent.split('\n').forEach(line => {
                if (line.trim() && !line.startsWith('#')) {
                    log(`   ${line}`, 'blue');
                }
            });
            
            if (requirementsContent.includes('x10-python-trading-starknet')) {
                log('✅ x10-python-trading-starknet is listed in requirements', 'green');
            } else {
                log('❌ x10-python-trading-starknet NOT found in requirements', 'red');
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
        log('   Verifying Python SDK libraries installation...', 'blue');
        
        const { spawn } = await import('child_process');
        const { promisify } = await import('util');
        const execFile = promisify(spawn);
        
        // Check if x10-python-trading-starknet is installed
        const sdkCheckCommand = `
try:
    from x10.perpetual.accounts import StarkPerpetualAccount
    from x10.perpetual.configuration import TESTNET_CONFIG, MAINNET_CONFIG
    from x10.perpetual.order_object import create_order_object
    from x10.perpetual.orders import OrderSide, OrderType
    from x10.perpetual.markets import MarketModel
    from x10.perpetual.assets import Asset
    from x10.perpetual.fees import TradingFeeModel, DEFAULT_FEES
    from x10.perpetual.trading_client import PerpetualTradingClient
    from x10.utils.date import utc_now
    from fast_stark_crypto import get_public_key
    print('SDK_AVAILABLE=True')
    print('All required libraries for SDK functionality are installed!')
except ImportError as e:
    print('SDK_AVAILABLE=False')
    print(f'Missing library: {e}')
`;
        
        const pythonProcess = spawn(extendedInstance.pythonPath, ['-c', sdkCheckCommand]);
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
                        log('✅ x10-python-trading-starknet SDK is properly installed', 'green');
                        lines.slice(1).forEach(line => log(`   ${line}`, 'green'));
                    } else {
                        log('❌ SDK_AVAILABLE: False', 'red');
                        log('❌ x10-python-trading-starknet SDK is NOT installed or has missing dependencies', 'red');
                        lines.slice(1).forEach(line => log(`   ${line}`, 'red'));
                        
                        // Provide installation instructions
                        log('\n💡 To install the required SDK, run:', 'yellow');
                        log('   pip install x10-python-trading-starknet', 'blue');
                        log('   OR run the setup script:', 'blue');
                        log('   cd /Users/samuelslongo/Documents/GitHub/test/web3/dex/perp/extended', 'blue');
                        log('   sh setup.sh', 'blue');
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
        log('   Calling checkPythonService() ...', 'blue');

        const testResult = await extendedInstance.checkPythonService();

        log('✅ Call to Python service succeeded!', 'green');
        log('📄 Response from Python:', 'yellow');
        console.log(JSON.stringify(testResult, null, 2));
        
    } catch (error) {
        log('❌ Error calling Python service:', 'red');
        log(`   Error: ${error.message}`, 'red');
        
        // Check if the Python file exists
        const fs = await import('fs');
        if (fs.existsSync(extendedInstance.scriptPath)) {
            log('✅ Python file exists', 'green');
        } else {
            log('❌ Python file not found!', 'red');
        }
        
        // Check if Python is installed
        const { spawn } = await import('child_process');
        try {
            const pythonCheck = spawn(extendedInstance.pythonPath, ['--version']);
            pythonCheck.on('close', (code) => {
                if (code === 0) {
                    log('✅ Python is available on this system', 'green');
                } else {
                    log('❌ Python is not available or wrong version', 'red');
                }
            });
        } catch (pythonError) {
            log('❌ Error checking Python:', 'red');
            log(`   ${pythonError.message}`, 'red');
        }
    }
    
    log('\n🏁 Test completed!', 'bold');
    
    // Cleanup: close the Extended instance
    await extendedInstance.close();
}

// Run test
testPythonParameters().catch(error => {
    console.error('Error during test:', error);
    process.exit(1);
});