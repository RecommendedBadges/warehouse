const axios = require('axios');

const { common } = require('../config');
const { fatal } = require('./error.js');

async function get(site, endpoint) {
    try {
        const res = await axios.get(
            `${common.API_BASES[site]}${endpoint}`,
            {
                headers: common.REQUEST_HEADERS[site]
            },
        );
        return res.data;
    } catch(err) {
        fatal('get()', err.message);
    }
}

async function patch(site, endpoint, body) {
    try {
        const res = await axios.patch(
            `${common.API_BASES[site]}${endpoint}`,
            body,
            {
                headers: common.REQUEST_HEADERS[site]
            }
        );
        return res.data;
    } catch(err) {
        fatal('patch()', err.message);
    }
}

async function post(site, endpoint, body) {
    try {
        const res = await axios.post(
            `${common.API_BASES[site]}${endpoint}`,
            body,
            {
                headers: common.REQUEST_HEADERS[site]
            }
        );
        return res.data;
    } catch(err) {
        fatal('post()', err.message);
    }
}

async function put(site, endpoint, body) {
    try {
        const res = await axios.put(
            `${common.API_BASES[site]}${endpoint}`,
            body,
            {
                headers: common.REQUEST_HEADERS[site]
            }
        )
        return res.data;
    } catch(err) {
        fatal('put()', err.message);
    }
}

module.exports = {
    get,
    patch,
    post,
    put
};