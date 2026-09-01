module.exports = {
  apps: [
    {
      name: 'pisairtel-webhook',
      script: '/opt/pisairtel-sms/deploy/webhook-server.mjs',
      interpreter: 'node',
      instances: 1,
      exec_mode: 'fork',
      max_memory_restart: '200M',
      env: {
        WEBHOOK_SECRET: process.env.WEBHOOK_SECRET || 'pisairtel-webhook-secret-2024',
      },
      error_file: '/var/log/pisairtel-webhook/error.log',
      out_file: '/var/log/pisairtel-webhook/out.log',
    },
  ],
};
