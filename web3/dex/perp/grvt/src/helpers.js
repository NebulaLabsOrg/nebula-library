/**
 * GRVT Helper Functions
 * Internal utilities for authentication, URL management, and Python service
 */

import { createInstance } from '../../../../../utils/src/http.utils.js';
import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import {
    GRVT_AUTH_MAINNET_URL, GRVT_AUTH_TESTNET_URL, GRVT_AUTH_STAGING_URL,
    GRVT_MAINNET_URL, GRVT_TESTNET_URL, GRVT_STAGING_URL,
    GRVT_MARKET_DATA_MAINNET_URL, GRVT_MARKET_DATA_TESTNET_URL, GRVT_MARKET_DATA_STAGING_URL
} from './constant.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Get base URL for Trading API based on environment
 * @param {string} environment - Environment name
 * @returns {string} Base URL
 */
export function getBaseUrl(environment) {
    switch (environment.toLowerCase()) {
        case 'mainnet':
            return GRVT_MAINNET_URL;
        case 'staging':
            return GRVT_STAGING_URL;
        case 'testnet':
        default:
            return GRVT_TESTNET_URL;
    }
}

/**
 * Get authentication base URL (edge.* domain)
 * @param {string} environment - Environment name
 * @returns {string} Auth base URL
 */
export function getAuthUrl(environment) {
    switch (environment.toLowerCase()) {
        case 'mainnet':
            return GRVT_AUTH_MAINNET_URL;
        case 'staging':
            return GRVT_AUTH_STAGING_URL;
        case 'testnet':
        default:
            return GRVT_AUTH_TESTNET_URL;
    }
}

/**
 * Get market data base URL (market-data.* domain)
 * @param {string} environment - Environment name
 * @returns {string} Market data base URL
 */
export function getMarketDataUrl(environment) {
    switch (environment.toLowerCase()) {
        case 'mainnet':
            return GRVT_MARKET_DATA_MAINNET_URL;
        case 'staging':
            return GRVT_MARKET_DATA_STAGING_URL;
        case 'testnet':
        default:
            return GRVT_MARKET_DATA_TESTNET_URL;
    }
}

/**
 * Authenticate with GRVT API to obtain session cookie
 * @param {string} environment - Environment name
 * @param {string} apiKey - Trading API key
 * @param {string} accountId - Trading account ID
 * @param {Object} instance - Axios instance to update with auth headers
 * @returns {Promise<Object>} Auth result with sessionCookie and accountId
 */
export async function authenticate(environment, apiKey, accountId, instance) {
    try {
        // Authentication uses edge.* domain, not trades.* domain
        const authInstance = createInstance(getAuthUrl(environment), {
            'Content-Type': 'application/json',
            'Cookie': 'rm=true;'
        });
        
        const response = await authInstance.post('/auth/api_key/login', {
            api_key: apiKey
        }, {
            validateStatus: () => true // Don't throw on any status
        });
        
        // Extract session cookie from Set-Cookie header
        let sessionCookie = null;
        const setCookieHeader = response.headers['set-cookie'];
        if (setCookieHeader) {
            const gravityCookie = setCookieHeader.find(cookie => cookie.startsWith('gravity='));
            if (gravityCookie) {
                sessionCookie = gravityCookie.split(';')[0];
            }
        }
        
        // Extract account ID from response header
        const extractedAccountId = response.headers['x-grvt-account-id'] || accountId;
        
        if (sessionCookie && extractedAccountId) {
            // Update instance default headers with authentication
            instance.defaults.headers.common['Cookie'] = sessionCookie;
            instance.defaults.headers.common['X-Grvt-Account-Id'] = extractedAccountId;
            
            return { sessionCookie, accountId: extractedAccountId, authenticated: true };
        } else {
            throw new Error('Failed to obtain session cookie or account ID');
        }
    } catch (error) {
        console.error('Authentication error:', error.message);
        if (error.response) {
            console.error('Response status:', error.response.status);
            console.error('Response data:', error.response.data);
        }
        throw error;
    }
}

/**
 * Finds the best Python path to use (virtual environment first, then system Python)
 * @returns {Promise<string>} Python path
 */
export async function findPythonPath() {
    try {
        const fs = await import('fs');
        const { execSync } = await import('child_process');
        
        // First try virtual environment python (multiple possible locations)
        const venvPaths = [
            path.join(__dirname, '../venv/bin/python'),      // Created by setup.sh
            path.join(__dirname, '../.venv/bin/python'),     // Alternative location
            path.join(process.cwd(), 'venv/bin/python'),     // Current working directory
            path.join(process.cwd(), '.venv/bin/python')     // Alternative in cwd
        ];
        
        for (const venvPython of venvPaths) {
            if (fs.existsSync(venvPython)) {
                return venvPython;
            }
        }
        
        // Fallback to system python versions
        const pythonVersions = ['python3.13', 'python3.12', 'python3.11', 'python3'];
        
        for (const pythonCmd of pythonVersions) {
            try {
                execSync(`${pythonCmd} --version`, { stdio: 'ignore' });
                return pythonCmd;
            } catch (error) {
                continue;
            }
        }
        
        // Final fallback
        return 'python3';
    } catch (error) {
        console.warn('Failed to find Python path, using default python3');
        return 'python3';
    }
}

/**
 * Initialize Python service for SDK operations
 * @param {string} pythonPath - Path to Python executable
 * @returns {Promise<Object>} Python service process
 */
export async function initPythonService(pythonPath) {
    const pythonScript = path.join(__dirname, '..', 'python-service', 'service.py');
    
    try {
        const pythonService = spawn(pythonPath, [pythonScript], {
            stdio: ['pipe', 'pipe', 'pipe'],
            detached: false,
            env: {
                ...process.env,
                PYTHONUNBUFFERED: '1'
            }
        });
        
        pythonService.stderr.on('data', (data) => {
            console.error('Python service stderr:', data.toString());
        });
        
        pythonService.on('error', (error) => {
            console.error('Python service error:', error);
        });
        
        pythonService.on('exit', (code) => {
            if (code !== 0 && code !== null) {
                console.error(`Python service exited with code ${code}`);
            }
        });
        
        return pythonService;
    } catch (error) {
        console.error('Failed to initialize Python service:', error);
        throw error;
    }
}

/**
 * Send command to Python SDK
 * @param {Object} pythonService - Python service process
 * @param {string} command - Command name
 * @param {Object} params - Command parameters (includes credentials and environment)
 * @returns {Promise<Object>} Command result
 */
export async function sendCommand(pythonService, command, params = {}) {
    return new Promise((resolve, reject) => {
        if (!pythonService) {
            reject(new Error('Python service not initialized'));
            return;
        }
        
        const request = { command, params };
        const requestJson = JSON.stringify(request) + '\n';
        
        let output = '';
        const timeoutId = setTimeout(() => {
            pythonService.stdout.removeListener('data', onData);
            reject(new Error(`Command timeout: ${command}`));
        }, 30000); // 30 second timeout
        
        const onData = (data) => {
            output += data.toString();
            
            try {
                const lines = output.split('\n');
                for (let i = 0; i < lines.length - 1; i++) {
                    const line = lines[i].trim();
                    if (line) {
                        const result = JSON.parse(line);
                        clearTimeout(timeoutId);
                        pythonService.stdout.removeListener('data', onData);
                        
                        if (result.error) {
                            reject(new Error(result.error));
                        } else {
                            resolve(result.data || result);
                        }
                        return;
                    }
                }
                output = lines[lines.length - 1];
            } catch (e) {
                // Wait for more data
            }
        };
        
        pythonService.stdout.on('data', onData);
        pythonService.stdin.write(requestJson);
    });
}
