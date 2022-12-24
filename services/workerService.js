const util = require('util');
const exec = util.promisify(require('child_process').exec);
const fs = require('fs');

const { 
  GIT_CHECKOUT_COMMAND,
  GIT_CLONE_COMMAND,
  GIT_COMMIT_COMMAND,
  GIT_PUSH_COMMAND,
  PACKAGE_ALIAS_DELIMITER,
  PACKAGE_BUILD_NUMBER,
  PACKAGE_ID_PREFIX,
  PACKAGE_INSTALL_COMMAND,
  PACKAGE_VERSION_CREATE_COMMAND,
  PACKAGE_VERSION_ID_PREFIX, 
  PACKAGE_VERSION_INCREMENT,
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
  let mostRecentPackageCommentBody;
  let mostRecentPackageCommentDate;

  for(let issueComment of issueComments) {
      let issueCommentDate = new Date(issueComment.createdDate);
      let issueCommentBody = JSON.parse(issueComment.body);

      if(
        ('packagesToUpdate' in issueCommentBody) && 
        ('updatedPackages' in issueCommentBody) && 
        (!mostRecentPackageCommentBody || (mostRecentPackageCommentDate > issueCommentDate))
        ) {
          mostRecentPackageCommentBody = issueCommentBody;
          mostRecentPackageCommentDate = new Date(issueComment.createdDate);
      }
  }

  await orchestrate({
    sortedPackagesToUpdate: mostRecentPackageCommentBody.packagesToUpdate,
    pullRequestNumber: mostRecentPackageCommentBody.pullRequestNumber,
    updatedPackages: mostRecentPackageCommentBody.updatedPackages
  });
}

async function orchestrate({pullRequestNumber, sortedPackagesToUpdate, updatedPackages = {}}) {
  await cloneRepo(pullRequestNumber);
  process.stdout.write('Repo cloned\n');
  
  parseSFDXProjectJSON();
  await sfdx.authorize();
  let packageLimit = await sfdx.getRemainingPackageNumber();
  let sortedPackagesToUpdateArray = sortedPackagesToUpdate.split('\n');
  process.stdout.write(`Remaining package version creation limit is ${packageLimit}\n`);
  process.stdout.write(`List of packages to update is ${sortedPackagesToUpdateArray.join(', ')}\n`);

  let packagesNotUpdated = [];
  ({updatedPackages, packagesNotUpdated} = await updatePackages(sortedPackagesToUpdateArray, updatedPackages));

  if(packagesNotUpdated.length > 0) {
    console.log('in if');
    try {
      let pullRequestComment = {
        pullRequestNumber,
        updatedPackages,
        packagesNotUpdated
      };
    github.commentOnPullRequest(pullRequestNumber, pullRequestComment);
    await heroku.scaleClockDyno(1);
    } catch(err) {
      console.error(err);
    }
  } else {
    console.log('in else');
    try {
      await installPackages(updatedPackages);
    await github.mergeOpenPullRequest(pullRequestNumber);
      await pushUpdatedPackageJSON(updatedPackages);
    await heroku.scaleClockDyno(0);
    } catch(err) {
      console.error(err);
    }
  }
}

async function cloneRepo(pullRequestNumber) {
  let pullRequest = await github.getOpenPullRequestDetails({pullRequestNumber});
  let stderr;

  ({_, stderr} = await exec(
    `${GIT_CLONE_COMMAND} -q https://${process.env.GITHUB_USERNAME}:${process.env.GITHUB_TOKEN}@${process.env.REPOSITORY_URL} -b ${pullRequest.head.ref}`
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

async function updatePackages(sortedPackagesToUpdateArray, updatedPackages) {
  let packagesNotUpdated = [];
  let query;
  for(let packageToUpdate of sortedPackagesToUpdateArray) {
    let stdout;
    let stderr;
    
    if(packageLimit > 0) {
      console.log('in if');
      query = `SELECT MajorVersion, MinorVersion, PatchVersion FROM Package2Version WHERE Package2.Name='${packageToUpdate}' ORDER BY MajorVersion DESC, MinorVersion DESC, PatchVersion DESC`;
      ({stdout, stderr} = await exec(`${SOQL_QUERY_COMMAND} -q "${query}" -t -u ${process.env.HUB_ALIAS} --json`))
      let mostRecentPackage = JSON.parse(stdout).result.records[0];
      let newPackageVersionNumber = `${mostRecentPackage.MajorVersion}.${mostRecentPackage.MinorVersion + PACKAGE_VERSION_INCREMENT}.${mostRecentPackage.PatchVersion}.${PACKAGE_BUILD_NUMBER}`;
      let newPackageVersionName = `${mostRecentPackage.MajorVersion}.${mostRecentPackage.MinorVersion + PACKAGE_VERSION_INCREMENT}`;
      
      process.stdout.write(`Creating package ${packageToUpdate} version ${newPackageVersionNumber}\n`);
      ({stdout, stderr} = await exec(
        `${PACKAGE_VERSION_CREATE_COMMAND} -p ${packageToUpdate} -n ${newPackageVersionNumber} -a ${newPackageVersionName} -x -c -w ${process.env.WAIT_TIME} --json`
      ));
      if(stderr) {
        error.fatal('updatePackages()', stderr);
      }

      process.stdout.write(`Releasing package ${packageToUpdate} version ${newPackageVersionNumber}\n`);
      let subscriberPackageVersionId = JSON.parse(stdout).result.SubscriberPackageVersionId;
      ({stdout, stderr} = await exec(`${PACKAGE_VERSION_PROMOTE_COMMAND} -p ${subscriberPackageVersionId} -n --json`));
      if(stderr) {
        error.fatal('updatePackages()', stderr);
      }
      updatedPackages[`${packageToUpdate}@${newPackageVersionNumber}`] = subscriberPackageVersionId;

      await updatePackageJSON(packageToUpdate, newPackageVersionNumber);
      packageLimit--;
    } else {
      packagesNotUpdated.push(packageToUpdate);
    }
  }
  return {packagesNotUpdated, updatedPackages};
}

async function installPackages(updatedPackages) {
  for(let updatedPackageAlias in updatedPackages) {
    let {stderr} = await exec(
      `${PACKAGE_INSTALL_COMMAND} -p ${updatedPackages[updatedPackageAlias]} -u ${process.env.HUB_ALIAS} -w ${process.env.WAIT_TIME} -r --json`
    );
    if(stderr) {
      error.fatal('installPackages()', stderr);
    }
  }
}

async function pushUpdatedPackageJSON(updatedPackages) {
  let stderr;
  ({stderr} = await exec(`${GIT_CHECKOUT_COMMAND} main`));
  if(stderr) {
    error.fatal('pushUpdatedPackageJSON()', stderr);
  }
  for(let updatedPackageAlias in updatedPackages) {
    sfdxProjectJSON.packageAliases[updatedPackageAlias] = updatePackages[updatedPackageAlias];
  }
  fs.writeFileSync(SFDX_PROJECT_JSON_FILENAME, JSON.stringify(sfdxProjectJSON, null, 2));
  ({stderr} = await exec(`${GIT_COMMIT_COMMAND}`));
  if(stderr) {
    error.fatal('pushUpdatedPackageJSON()', stderr);
  }
  ({stderr} = await exec(GIT_PUSH_COMMAND));
  if(stderr) {
    error.fatal('pushUpdatedPackageJSON()', stderr);
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
