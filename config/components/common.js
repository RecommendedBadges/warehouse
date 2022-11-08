const REQUEST_HEADERS = {
    circleci: {
        'Accept': 'application/json',
        'Circle-Token': process.env.CIRCLE_TOKEN
    },
    github: {
        'Accept': 'application/vnd.github+json',
        'Authorization': `Bearer ${process.env.GITHUB_TOKEN}`
    },
    heroku: {
        'Accept': 'application/vnd.heroku+json; version=3',
        'Authorization': `Bearer ${process.env.WAREHOUSE_TOKEN}`
    }
};

const API_BASES = {
    circleci: process.env.CIRCLE_API_BASE,
    github: process.env.GITHUB_API_BASE,
    heroku: process.env.WAREHOUSE_API_BASE
};

const config = {
    API_BASES,
    REQUEST_HEADERS
};

module.exports = config;