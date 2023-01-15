const COMMIT_MESSAGE = 'Updating package.json';

const GIT_CHECKOUT_COMMAND = 'git checkout -f';
const GIT_CLONE_COMMAND = 'git clone';
const GIT_COMMIT_COMMAND = `git commit -a -m ${COMMIT_MESSAGE}`;
const GIT_PULL_COMMAND = 'git pull -q';
const GIT_PUSH_COMMAND = 'git push';

module.exports = {
    GIT_CHECKOUT_COMMAND,
    GIT_CLONE_COMMAND,
    GIT_COMMIT_COMMAND,
    GIT_PULL_COMMAND,
    GIT_PUSH_COMMAND
}