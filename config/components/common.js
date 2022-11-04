const REQUEST_HEADERS = {
    circleci: {
        'Accept': 'application/json',
        'Circle-Token': process.env.CIRCLE_TOKEN
    },
    github: {
        'Accept': 'application/vnd.github+json',
        'Authorization': `Bearer ${process.env.GITHUB_TOKEN}`
    }
};

const URL_BASES = {
    circleci: process.env.CIRCLE_URL_BASE,
    github: process.env.GITHUB_URL_BASE
};

const config = {
    URL_BASES,
    REQUEST_HEADERS
};

module.exports = config;