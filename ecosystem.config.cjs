module.exports = {
  apps: [
    {
      name: 'pisairtel-sms',
      script: 'server/index.mjs',
      interpreter: 'node',
      node_args: '--import tsx',
      cwd: '/var/www/pisairtel-sms',
      instances: 1,
      exec_mode: 'fork',
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        PORT: 3001,
      },
      // NOTE: PM2 does not support `env_file`. server/index.mjs loads .env
      // itself at boot (Node 18 has no --env-file / process.loadEnvFile).
      error_file: '/var/log/pisairtel-sms/error.log',
      out_file: '/var/log/pisairtel-sms/out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      merge_logs: true,
      autorestart: true,
      max_restarts: 10,
      restart_delay: 3000,
    },
  ],
};
