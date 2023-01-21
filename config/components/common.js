const REQUEST_HEADERS = {
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
    github: process.env.GITHUB_API_BASE,
    heroku: process.env.WAREHOUSE_API_BASE
};

module.exports = {
    API_BASES,
    REQUEST_HEADERS 
};