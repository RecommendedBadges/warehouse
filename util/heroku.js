const callout = require('./callout.js');

async function scaleClockDyno(numDynos) {
    await callout.patch(
        'heroku',
        `/formation/${FORMATION_TYPE}`,
        {
            "quantity": numDynos,
            "size": "eco"
        }
    );
}

module.exports = scaleClockDyno;
