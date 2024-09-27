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

  if (!Array.isArray(ctx.request.body?.variables?.alerts)) {
    ctx.status = 400;
    console.error("Unexpected request from Forta:", ctx.request.body);
    return;
  }

  const embeds = [];
  let hasInvalidAlerts = false;

  ctx.request.body.variables.alerts
    .map((alert) => alert.finding)
    .forEach((alert) => {
      if (!alert || !alert.severity || !alert.name || !alert.description) {
        hasInvalidAlerts = true;
        return;
      }

      const e = {
        title: `[${alert.severity}] ${alert.name}`,
        description: alert.description,
        color: colors.get(alert.severity) || defaultColor,
        fields: [],
      };

      const { chainId, blockHash, txHash } = getSourceFromAlert(alert);
      const explorerBase = etherscanBase(chainId);

      if (blockHash) {
        e.fields.push({
          name: "",
          value: `[Block](${explorerBase}/block/${blockHash})`,
          inline: true,
        });
      }
      if (txHash) {
        e.fields.push({
          name: "",
          value: `[Transaction](${explorerBase}/tx/${txHash})`,
          inline: true,
        });
      }

      embeds.push(e);
    });

  if (hasInvalidAlerts) {
    ctx.status = 400;
    console.warn(
      "Got invalid alerts objects in data:",
      ctx.request.body.variables.alerts
    );
    return;
  }

  // TODO: Match with the sent ones.
  if (embeds.length) {
    ctx.body = {
      data: {
        sendAlerts: [],
      },
    };
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

function getSourceFromAlert(alert) {
  let o = {
    chainId: undefined,
    blockHash: undefined,
    txHash: undefined,
  };

  const block = alert.source?.blocks?.at(0);
  if (block) {
    o = {
      ...o,
      blockHash: block.hash,
      chainId: o.chainId ?? block.chainId,
    };
  }

  const tx = alert.source?.transactions?.at(0);
  if (tx) {
    o = {
      ...o,
      txHash: tx.hash,
      chainId: o.chainId ?? tx.chainId,
    };
  }

  return o;
}

function etherscanBase(chainId) {
  let subdomain = "";
  if (chainId === 17_000) subdomain = "holesky";
  return `https://${subdomain}${subdomain ? "." : ""}etherscan.io`;
}

module.exports = {
  handleHook,
  handleHealthcheck,
};
