const axios = require('axios');

const { API_BASES, REQUEST_HEADERS } = require('../config');
const { fatal } = require('./error.js');

async function get({site, endpoint, fullUrl}) {
    try {
        const res = await axios.get(
            fullUrl ? fullUrl : `${API_BASES[site]}${endpoint}`,
            {
                headers: REQUEST_HEADERS[site]
            },
        );
        return res.data;
    } catch(err) {
        fatal('get()', err.message);
    }
}

module.exports = {
    get
};