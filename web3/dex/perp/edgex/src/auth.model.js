import { sha3_256 } from 'js-sha3';
import { ec as EC } from 'elliptic';

const ec = new EC('secp256k1');

/**
 * Genera gli header di autenticazione EdgeX per le API private (non L2).
 * @param {string} privateKeyHex - Chiave privata utente (hex string, senza "0x")
 * @param {string} method - Metodo HTTP ("GET", "POST", ecc)
 * @param {string} path - Path endpoint (es: "/private/order/getMaxCreateOrderSize")
 * @param {object} params - Body o query params come oggetto chiave/valore
 * @returns {object} Header da usare nella request
 */
export function generateEdgeXAuthHeaders(privateKeyHex, method, path, params = {}) {
    const keyPair = ec.keyFromPrivate(privateKeyHex, 'hex');
    const timestamp = Date.now().toString();
    const sortedParams = Object.keys(params).sort().map(k => `${k}=${params[k]}`).join('&');
    const message = `${timestamp}${method.toUpperCase()}${path}${sortedParams}`;
    const hashHex = sha3_256(message);
    const signature = keyPair.sign(hashHex, { canonical: true });
    const r = signature.r.toArrayLike(Buffer, 'be', 32).toString('hex');
    const s = signature.s.toArrayLike(Buffer, 'be', 32).toString('hex');
    const y = keyPair.getPublic().getY().toArrayLike(Buffer, 'be', 32).toString('hex');
    const sig = r + s + y;

    return {
        'X-edgeX-Api-Timestamp': timestamp,
        'X-edgeX-Api-Signature': sig
    };
}