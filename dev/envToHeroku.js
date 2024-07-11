const path = require('path');
const childProcess = require('child_process');
const fs = require('fs');

// Filter out any flags like --dry-run from the command-line arguments
const args = process.argv.slice(2);
const nonFlagArgs = args.filter(arg => !arg.startsWith('--'));

// Access the .env file path and Heroku app name from the command-line arguments
const envFilePath = nonFlagArgs[0];
const herokuAppName = nonFlagArgs[1];

// Check for the --dry-run option
const dryRun = args.includes('--dry-run');

// Validate the input to make sure it's an absolute path for the .env file
if (!envFilePath || !path.isAbsolute(envFilePath)) {
  console.error('Please provide a full path to the env file starting from "/"');
  process.exit(1);
}

// Check if the .env file exists
if (!fs.existsSync(envFilePath)) {
  console.error(`File not found: ${envFilePath}`);
  process.exit(1);
}

// Read the .env file and parse its lines
const envFileLines = fs.readFileSync(envFilePath, 'utf8')
  .split('\n')
  .filter(line => line.length > 0)
  .filter(line => !line.startsWith('#'));

// Construct the environment variable object
const env = envFileLines.reduce((acc, line) => {
  const [key, val] = line.split('=');
  acc[key] = val;
  return acc;
}, {});

// Generate the base Heroku command with the optional app name
let command = 'heroku config:set';
if (herokuAppName) {
  command += ` --app ${herokuAppName}`;
}

// Append environment variables to the command
command = command
  .concat(...Object.entries(env)
    .map(([key, value]) => ` ${key}=${value}`));

// Either execute the command or perform a dry run
if (dryRun) {
  console.log(`Dry Run: ${command}`);
} else {
  childProcess.execSync(command);
}
