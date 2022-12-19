const util = require('util');
const exec = util.promisify(require('child_process').exec);
const fs = require('fs');

const {COMMENT_PREFIX, PACKAGE_ALIAS_DELIMITER, PACKAGE_ID_PREFIX, PACKAGE_VERSION_ID_PREFIX, SFDX_PROJECT_JSON_FILENAME} = require('../config');
const { authorize, fatal, github, getRemainingPackageNumber, heroku } = require('../util');

let packageAliases = {};
let reversePackageAliases = {};
let sfdxProjectJSON = {};

async function setupScheduledJob() {
  let pullRequestNumber = github.getOpenPullRequestDetails({}).number;
  let issueComments = github.getIssueComments(pullRequestNumber);
  let mostRecentPackageComment;
  let mostRecentPackageCommentDate;

  for(let issueComment of issueComments) {
      let issueCommentDate = new Date(issueComment.createdDate);
      if(issueComment.body.startsWith(COMMENT_PREFIX) && (!mostRecentPackageComment || (mostRecentPackageCommentDate > issueCommentDate))) {
          mostRecentPackageComment = issueComment;
          mostRecentPackageCommentDate = new Date(issueComment.createdDate);
      }
  }

  let packagesToUpdate = mostRecentPackageComment.body.slice(COMMENT_PREFIX.length + 1);
  await orchestrate(packagesToUpdate);
}

async function orchestrate({packagesToUpdate, pullRequestNumber}) {
  console.log('Orchestrating');
  await cloneRepo(pullRequestNumber);
  console.log('Repo cloned');
  parseSFDXProjectJSON();
  console.log('Parsed');
  let packageLimit = await getRemainingPackageNumber();
  console.log('Package limit retrieved');
  console.log(packagesToUpdate);
  let packagesToUpdateArray = packagesToUpdate.split('\n');
  console.log(`List of packages to update is ${packagesToUpdateArray.join(', ')}\n`);

  await authorize();

  let packagesNotUpdated;
  for(let packageToUpdate of packagesToUpdateArray) {
    console.log(`Creating package version for ${packageToUpdate}\n`);
    let stdout;
    let stderr;
    
    if(packageLimit > 0) {
      ({stdout, stderr} = await exec(`sfdx force:package:version:create -p ${packageToUpdate} -x -w ${process.env.WAIT_TIME} --json`));
      if(stderr) {
        fatal('orchestrate()', stderr);
      }

      let subscriberPackageVersionId = JSON.parse(stdout).result.SubscriberPackageVersionId;

      ({stdout, stderr} = await exec(`sfdx force:package:version:promote -p ${subscriberPackageVersionId} -n --json`));
      if(stderr) {
        fatal('orchestrate()', stderr);
      }

      let query = `SELECT MajorVersion, MinorVersion, PatchVersion, Package2.Name FROM Package2Version WHERE SubscriberPackageVersionId='${JSON.parse(stdout).result.id}'`
      ({stdout, stderr} = await exec(`sfdx force:data:soql:query -q "${query}" -t -u ${process.env.HUB_ALIAS} --json`));

      let package = JSON.parse(stdout).result.records[0];
      await updatePackageJSON(package);
      packageLimit--;
    } else {
      packagesNotUpdated.push(packageToUpdate);
    }
  }

  if(packagesNotUpdated.length > 0) {
    github.commentOnPullRequest(pullRequestNumber, `${COMMENT_PREFIX}${packagesNotUpdated.join(' ')}`);
    await heroku.scaleClockDyno(1);
  } else {
    await github.mergeOpenPullRequest(pullRequestNumber);
    await heroku.scaleClockDyno(0);
  }
}

function parseSFDXProjectJSON() {
  console.log('in parseSFDXProjectJSON()');
  try {
    sfdxProjectJSON = JSON.parse(fs.readFileSync(SFDX_PROJECT_JSON_FILENAME));
    console.log('file read');
    packageAliases = sfdxProjectJSON.packageAliases;
    reversePackageAliases = {};

    console.log('before for loop');
    for(let alias in packageAliases) {
      console.log(alias);
      reversePackageAliases[packageAliases[alias]] = alias;
    }
  } catch(err) {
    fatal('parseSFDXProjectJSON()', err.message);
  }
}

async function cloneRepo(pullRequestNumber) {
  let stderr;
  let pullRequest = await github.getOpenPullRequestDetails({pullRequestNumber});

  ({_, stderr} = await exec(
    `git clone -q https://${process.env.GITHUB_USERNAME}:${process.env.GITHUB_TOKEN}@${process.env.REPOSITORY_URL} -b ${pullRequest.head.ref}`
  ));
  if(stderr) {
    fatal('cloneRepo()', stderr);
  }
  console.log('repo cloned');
  ({_, stderr} = await exec(`cd ${process.env.REPOSITORY_NAME}`));
  if(stderr) {
    fatal('cloneRepo()', stderr);
  }
  console.log('in repo folder');
  ({_, stderr} = await exec(`git config user.email ${process.env.GIT_USER_EMAIL}`));
  if(stderr) {
    fatal('cloneRepo()', stderr);
  }
  console.log('email set');
  ({_, stderr} = await exec(`git config user.name ${process.env.GIT_USER_NAME}`));
  if(stderr) {
    fatal('cloneRepo()', stderr);
  }
}

async function updatePackageJSON(package) {
  for(let packageDirectory of sfdxProjectJSON.packageDirectories) {
    if(packageDirectory.dependencies) {
      for(let i in packageDirectory.dependencies) {
        let packageName = await getPackageNameFromDependency(packageDirectory.dependencies[i]);
        if(package.Package2.Name === packageName) {
          packageDirectory.dependencies[i] = {
            "package": package.Package2.Name,
            "versionNumber": `${package.MajorVersion}.${package.MinorVersion}.${package.PatchVersion}.RELEASED`
          }
        }
      }
    }
  }

  fs.writeFileSync(SFDX_PROJECT_JSON_FILENAME, JSON.stringify(sfdxProjectJSON, null, 2));
  parseSFDXProjectJSON();
}

async function getPackageNameFromDependency(dependentPackage) {
  let endIndex = dependentPackage.package.indexOf(PACKAGE_ALIAS_DELIMITER);
  if(endIndex == -1) {
    endIndex = dependentPackage.package.length;
  }

  if(dependentPackage.package.startsWith(PACKAGE_VERSION_ID_PREFIX) && Object.keys(reversePackageAliases).includes(dependentPackage.package)) {
    let alias = reversePackageAliases[dependentPackage.package];
    return alias.slice(0, alias.indexOf(PACKAGE_ALIAS_DELIMITER));
  } else if(dependentPackage.package.startsWith(PACKAGE_VERSION_ID_PREFIX)) {
    let query = `SELECT Package2Id FROM Package2Version WHERE SubscriberPackageVersionId='${dependentPackage.package}'`
    const {stderr, stdout} = await exec(
      `sfdx force:data:soql:query -q "${query}" -t -u ${process.env.HUB_ALIAS} --json`
    );
    
    if(stderr) {
      fatal('getPackageNameFromDependency()', stderr);
    }
    let result = JSON.parse(stdout).result.records;
    if(result.length > 0 && reversePackageAliases[result[0].Package2Id]) {
      return reversePackageAliases[result[0].Package2Id];
    }
  } else if(dependentPackage.package.startsWith(PACKAGE_ID_PREFIX)) {
    return reversePackageAliases[dependentPackage.package];
  } else {
    return dependentPackage.package.slice(0, endIndex);
  }
}

module.exports = {
  orchestrate,
  setupScheduledJob
}
