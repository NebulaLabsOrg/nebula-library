import axios from "axios";

/**
 * @function createInstance
 * @description Crea e restituisce un'istanza Axios configurata con baseURL, headers e timeout specificati.
 * @param {string} _baseURL - L'URL di base per le richieste HTTP.
 * @param {Object} [_headers={}] - Headers opzionali da includere nelle richieste.
 * @param {number} [_timeout=0] - Timeout opzionale per le richieste, in millisecondi.
 * @returns {Object} Istanza Axios configurata.
 */
export function createInstance(_baseURL, _headers = {}, _timeout = 0) {
    return axios.create({
        baseURL: _baseURL,
        responseType: "json",
        responseEncoding: "utf8",
        timeout: _timeout,
        headers: _headers
    });
}
/**
 * @function encodeGetUrl
 * @description Costruisce una URL GET con parametri di query codificati.
 * @param {string} _routeName - Il percorso base della richiesta.
 * @param {Object} _queryParams - Oggetto contenente i parametri di query.
 * @returns {string} URL completa con parametri di query codificati.
 */
export function encodeGetUrl(_routeName, _queryParams) {
    return _routeName + '?' + (new URLSearchParams(_queryParams)).toString();
}