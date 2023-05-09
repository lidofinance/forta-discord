const axios = require("axios");

const colors = new Map([
  ["CRITICAL", 0x6e0500],
  ["HIGH", 0xd50000],
  ["MEDIUM", 0xf19132],
  ["LOW", 0x1690ff],
  ["INFO", 0xf2f3ef],
]);
const defaultColor = 0xf2f3ef;

const maxEmbedsLength = 10;

async function handleHook(ctx) {
  ctx.status = 200;

  let hook = ctx.routes[ctx.params.slug];
  if (hook === undefined) {
    ctx.status = 404;
    console.warn(`Slug "${ctx.params.slug}" was not found in routes`);
    return;
  }

  if (
    ctx.request.body === undefined ||
    !Array.isArray(ctx.request.body.alerts)
  ) {
    ctx.status = 400;
    console.error("Unexpected request from Forta:", ctx.request.body);
    return;
  }

  const embeds = [];

  ctx.request.body.alerts.forEach((alert) => {
    if (alert.severity && alert.name && alert.description) {
      embeds.push({
        title: `[${alert.severity}] ${alert.name}`,
        description:
          alert.description +
          (alert.source.tx != undefined
            ? `\nTX: ${alert.source.tx.hash}`
            : "") +
          `\nBlock: ${alert.source.block.hash}`,
        color: colors.get(alert.severity) || defaultColor,
      });
    }
  });

  if (!embeds.length) {
    ctx.status = 400;
    console.warn(
      "Nothing to send, all alerts has been filtered out. Received data:",
      ctx.request.body.alerts
    );
    return;
  }

  let chunk = [];
  while ((chunk = embeds.splice(0, maxEmbedsLength)) && chunk.length) {
    await axios
      .post(hook, { embeds: chunk })
      .then(() => {
        console.log(chunk.length + " embeds sent");
      })
      .catch((err) => {
        ctx.status = 500;
        console.error(err);
        return;
      });
  }
}

async function handleHealthcheck(ctx) {
  let hook;

  for (const key in ctx.routes) {
    hook = ctx.routes[key];
    break;
  }

  if (hook === undefined) {
    console.warn("No routes has been configured!");
    ctx.status = 503;
    return;
  }

  await axios
    .get(hook)
    .then(() => {
      ctx.status = 200;
      ctx.body = { uptime: process.uptime() };
    })
    .catch((err) => {
      ctx.status = 503;
      if (err.response && err.response.data) {
        console.error(err.response.data);
      } else {
        console.error(err);
      }
    });
}

module.exports = {
  handleHook,
  handleHealthcheck,
};
