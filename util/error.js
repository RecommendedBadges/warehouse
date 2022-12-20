function fatal(origin, err) {
    console.error(`Error in ${origin}: ${err}`);
    process.stderr.write(`Error in ${origin}: ${err}`);
    process.exit(1);
}

module.exports = {
    fatal
};