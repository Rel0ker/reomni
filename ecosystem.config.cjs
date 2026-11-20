const node = process.env.OMNI_NODE || "/home/rel0ker/.nvm/versions/node/v24.14.0/bin/node";

module.exports = {
  apps: [
    {
      name: "omni-api",
      cwd: "/home/rel0ker/omni",
      script: "./node_modules/wrangler/bin/wrangler.js",
      args: "dev --port 10006 --ip 0.0.0.0 --inspector-port 10016 --persist-to .wrangler/state --show-interactive-dev-session=false",
      interpreter: node,
      env: {
        WRANGLER_SEND_METRICS: "false",
      },
    },
    {
      name: "omni-web",
      cwd: "/home/rel0ker/omni",
      script: "./scripts/serve-web.mjs",
      interpreter: node,
      env: {
        PORT: "10005",
        API_ORIGIN: "http://127.0.0.1:10006",
        WEB_ROOT: "dist",
      },
    },
  ],
};
