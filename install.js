const fs = require('fs');
const path = require('path');
const cp = require('child_process');
const os = require('os');

fs.readdirSync(__dirname).forEach(function (mod) {
  if (!fs.existsSync(path.join(mod, 'package.json'))) {
    return;
  }

  let npmCmd = os.platform().startsWith('win') ? 'npm.cmd' : 'npm';

  cp.spawn(npmCmd, ['i'], {
    env: process.env,
    cwd: mod,
    stdio: 'inherit',
  });
});
