const util = require('util');
const exec = util.promisify(require('child_process').exec);
const spawn = require('child_process').spawn;
const fs = require('fs');

const {
  COMMENT_PREFIX, 
  PACKAGE_ALIAS_DELIMITER, 
  PACKAGE_ID_PREFIX,
  PACKAGE_VERSION_ID_PREFIX, 
  PACKAGE_VERSION_CREATE_COMMAND, 
  PACKAGE_VERSION_PROMOTE_COMMAND, 
  SFDX_PROJECT_JSON_FILENAME, 
  SOQL_QUERY_COMMAND
} = require('../config');

const { error, github, heroku, sfdx } = require('../util');

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

async function orchestrate({sortedPackagesToUpdate, pullRequestNumber}) {
  await cloneRepo(pullRequestNumber);
  process.stdout.write('Repo cloned\n');
  
  parseSFDXProjectJSON();
  await sfdx.authorize();
  let packageLimit = await sfdx.getRemainingPackageNumber();
  let sortedPackagesToUpdateArray = sortedPackagesToUpdate.split('\n');
  process.stdout.write(`Remaining package version creation limit is ${packageLimit}\n`);
  process.stdout.write(`List of packages to update is ${sortedPackagesToUpdateArray.join(', ')}\n`);


  let packagesNotUpdated;
  let query;
  for(let packageToUpdate of sortedPackagesToUpdateArray) {
    let stdout;
    let stderr;
    
    if(packageLimit > 0 && packageToUpdate === 'TaskList') {
      try {
        query = `SELECT MajorVersion, MinorVersion, PatchVersion FROM Package2Version WHERE Package2.Name='${packageToUpdate}' ORDER BY MajorVersion DESC, MinorVersion DESC, PatchVersion DESC`;
        ({stdout, stderr} = await exec(`${SOQL_QUERY_COMMAND} -q "${query}" -t -u ${process.env.HUB_ALIAS} --json`))
        let mostRecentPackage = JSON.parse(stdout).result.records[0];
        let newPackageVersionNumber = `${mostRecentPackage.MajorVersion}.${mostRecentPackage.MinorVersion + 1}.${mostRecentPackage.PatchVersion}.0`;
        let newPackageVersionName = `${mostRecentPackage.MajorVersion}.${mostRecentPackage.MinorVersion}`;
        
        process.stdout.write(`Creating package ${packageToUpdate} version ${newPackageVersionNumber}\n`);
        ({stdout, stderr} = await exec(`${PACKAGE_VERSION_CREATE_COMMAND} -p ${packageToUpdate} -n ${newPackageVersionNumber} -a ${newPackageVersionName} -x -c -w ${process.env.WAIT_TIME} --json`));
        if(stderr) {
          error.fatal('orchestrate()', stderr);
        }
      // (add something to override default version number behavior?)
      // move to single branch system (automatically install packages as part of warehouse, remove references to packaging branch)
      // add refresh button to shortcuts

      process.stdout.write(`Releasing package ${packageToUpdate} version ${newPackageVersionNumber}\n`);
      let subscriberPackageVersionId = JSON.parse(stdout).result.SubscriberPackageVersionId;
      ({stdout, stderr} = await exec(`${PACKAGE_VERSION_PROMOTE_COMMAND} -p ${subscriberPackageVersionId} -n --json`));
      if(stderr) {
        error.fatal('orchestrate()', stderr);
      }
      console.log('updating package JSON');
      await updatePackageJSON(packageToUpdate, newPackageVersionNumber);
      packageLimit--;
    } catch(err) {
      console.error(err);
    }
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
  try {
    sfdxProjectJSON = JSON.parse(fs.readFileSync(SFDX_PROJECT_JSON_FILENAME));
    packageAliases = sfdxProjectJSON.packageAliases;
    reversePackageAliases = {};

    for(let alias in packageAliases) {
      reversePackageAliases[packageAliases[alias]] = alias;
    }
  } catch(err) {
    error.fatal('parseSFDXProjectJSON()', err.message);
  }
}

async function cloneRepo(pullRequestNumber) {
  let pullRequest = await github.getOpenPullRequestDetails({pullRequestNumber});
  let stderr;

  ({_, stderr} = await exec(
    `git clone -q https://${process.env.GITHUB_USERNAME}:${process.env.GITHUB_TOKEN}@${process.env.REPOSITORY_URL} -b ${pullRequest.head.ref}`
  ));
  if(stderr) {
    error.fatal('cloneRepo()', stderr);
  }

  try {
    process.chdir(process.env.REPOSITORY_NAME);
  } catch(err) {
    error.fatal('cloneRepo()', err);
  }
}

async function updatePackageJSON(packageName, fullPackageNumber) {
  for(let packageDirectory of sfdxProjectJSON.packageDirectories) {
    if(packageDirectory.dependencies) {
      for(let i in packageDirectory.dependencies) {
        if(packageName === await getPackageNameFromDependency(packageDirectory.dependencies[i])) {
          packageDirectory.dependencies[i] = {
            "package": packageName,
            "versionNumber": `${fullPackageNumber.substring(0, fullPackageNumber.lastIndexOf('.'))}.RELEASED`
          }
        }
      }
    }
  }
  console.log('dependencies updated, writing file');
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
      `${SOQL_QUERY_COMMAND} -q "${query}" -t -u ${process.env.HUB_ALIAS} --json`
    );
    
    if(stderr) {
      error.fatal('getPackageNameFromDependency()', stderr);
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
