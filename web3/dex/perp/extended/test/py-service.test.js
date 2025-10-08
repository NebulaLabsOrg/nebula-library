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
    
    const extendedInstance = new Extended(
        process.env.API_KEY,
        process.env.STARK_KEY_PRIVATE, 
        process.env.STARK_KEY_PUBLIC,
        parseInt(process.env.VAULT_NUMBER),
        0.1
    );
    
    log('✅ Extended client initialized', 'green');
    
    // Check internal configuration
    log('\n📊 Checking internal configuration:', 'yellow');
    log(`   API Key: ${extendedInstance.apiKey ? '✅ Present' : '❌ Missing'}`, extendedInstance.apiKey ? 'green' : 'red');
    log(`   Stark Private Key: ${extendedInstance.account.starkKeyPrv ? '✅ Present' : '❌ Missing'}`, extendedInstance.account.starkKeyPrv ? 'green' : 'red');
    log(`   Stark Public Key: ${extendedInstance.account.starkKeyPub ? '✅ Present' : '❌ Missing'}`, extendedInstance.account.starkKeyPub ? 'green' : 'red');
    log(`   Vault Number: ${extendedInstance.account.vaultNr}`, 'blue');
    log(`   Environment: ${extendedInstance.environment}`, 'blue');
    log(`   Python Path: ${extendedInstance.pythonPath}`, 'blue');
    log(`   Script Path: ${extendedInstance.scriptPath}`, 'blue');
    
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
}

// Run test
testPythonParameters().catch(error => {
    console.error('Error during test:', error);
    process.exit(1);
});