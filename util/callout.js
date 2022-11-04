const axios = require('axios');

const { common } = require('../config');
const { fatal } = require('../util');

async function makeRequest(site, endpoint) {
    try {
        const res = await axios.get(
            `${common.URL_BASES[site]}${endpoint}`,
            {
                headers: common.REQUEST_HEADERS[site]
            },
        );
        return res.data;
    } catch(err) {
        fatal('makeRequest()', err);
    }
}

module.exports = makeRequest;