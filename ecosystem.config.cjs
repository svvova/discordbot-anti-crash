const path = require('path');

module.exports = {
  apps: [
    {
      name: 'anticrash-bot',
      script: path.join(__dirname, 'dist/src/index.js'),
      cwd: __dirname,
      env_file: path.join(__dirname, '.env'),
      instances: 1,
      autorestart: true,
      max_restarts: 10,
      min_uptime: '10s',
      watch: false,
      exec_mode: 'fork',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      error_file: './logs/err.log',
      out_file: './logs/out.log',
      merge_logs: true,
      kill_timeout: 5000,
      listen_timeout: 10000,
    },
  ],
};
