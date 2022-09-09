// Simple Discord webhook proxy for Forta WH

const Koa = require("koa");
const yaml = require("js-yaml");
const fs = require("fs");

const { router } = require("./router");

const port = process.env.PORT || 5001;
const configPath = "/etc/forta-discord.yml";
const hookRegExp = new RegExp(
  "https://discord(?:app)?.com/api/webhooks/[0-9]+/[a-zA-Z0-9_-]+"
);

if (require.main === module) {
  let config;
  let routes = {};

  try {
    config = yaml.load(fs.readFileSync(configPath));
  } catch (err) {
    console.error("Failed to read configuration file:", err.message);
  }

  if (
    config !== undefined &&
    config.hooks !== undefined &&
    Array.isArray(config.hooks)
  ) {
    for (let route of config.hooks) {
      if (
        !route.hook ||
        !route.hook.startsWith ||
        !hookRegExp.test(route.hook)
      ) {
        console.warn("Not a valid discord web hook for slug =", route.slug);
        continue;
      }

      routes[route.slug] = route.hook;
    }
  }

  const app = new Koa();

  app.context.routes = routes;
  app.use(router.routes());

  app.listen(port, (err) => {
    if (err) {
      return console.error(err);
    }

    console.info("Listening on port " + port);
  });
}
