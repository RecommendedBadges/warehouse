const callout = require('./callout.js');

async function scaleDyno(formationType, numDynos) {
    await callout.patch(
        'heroku',
        `/formation/${formationType}`,
        {
            "quantity": numDynos,
            "size": "eco"
        }
    );
}

module.exports = {
    scaleDyno
};
