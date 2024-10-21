// Simple Discord webhook proxy for Forta WH

const Koa = require("koa");
const yaml = require("js-yaml");
const fs = require("fs");

const { FindingSeverity } = require("./finding");
const { router } = require("./router");

const port = process.env.PORT || 5001;
const configPath = "/etc/forta-discord.yml";
const hookRegExp = new RegExp(
  "https://discord(?:app)?.com/api/webhooks/[0-9]+/[a-zA-Z0-9_-]+"
);

/**
 * @typedef {Object} Hook
 * @property {string} url
 * @property {string} minSeverity
 */

if (require.main === module) {
  let config;

  /** @type {Hook[]} */
  let hooks = [];

  try {
    config = yaml.load(fs.readFileSync(configPath));
  } catch (err) {
    console.error("Failed to read configuration file:", err.message);
  }

  if (Array.isArray(config?.hooks)) {
    for (const key in config.hooks) {
      /** @type {Hook} */
      const hook = config.hooks[key];

      if (!hookRegExp.test(hook.url)) {
        console.error(`Not a valid discord web hook at index ${key}`);
        process.exit(1);
      }

      if (!hook.minSeverity || !(hook.minSeverity in FindingSeverity)) {
        console.error(
          `Invalid severity level ${
            hook.minSeverity
          } at index ${key}, expected one of ${Object.keys(FindingSeverity)}`
        );
        process.exit(1);
      }

      hooks.push(hook);
    }
  }

  const app = new Koa();

  app.context.hooks = hooks;
  app.use(router.routes());

  app.listen(port, (err) => {
    if (err) {
      return console.error(err);
    }

    console.info("Listening on port " + port);
  });
}
