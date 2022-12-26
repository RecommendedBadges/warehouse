const callout = require('./callout.js');

async function scaleClockDyno(numDynos) {
    await callout.patch(
        'heroku',
        `/formation/${process.env.FORMATION_TYPE}`,
        {
            "quantity": numDynos,
            "size": "eco"
        }
    );
}

module.exports = {
    scaleClockDyno
};
