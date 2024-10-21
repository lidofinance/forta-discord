const axios = require("axios");

const { FindingSeverity } = require("./finding");

const colors = new Map([
  ["CRITICAL", 0x6e0500],
  ["HIGH", 0xd50000],
  ["MEDIUM", 0xf19132],
  ["LOW", 0x1690ff],
  ["INFO", 0xf2f3ef],
  ["UNKNOWN", 0x888888],
]);
const defaultColor = 0xf2f3ef;

const maxEmbedsLength = 10;

async function handleHook(ctx) {
  ctx.status = 200;

  if (!Array.isArray(ctx.request.body?.variables?.alerts)) {
    ctx.status = 400;
    console.error("Unexpected request from Forta:", ctx.request.body);
    return;
  }

  function getEmbeds(minSeverity) {
    return ctx.request.body.variables.alerts
      .map((alert) => alert.finding)
      .map((alert) => {
        if (!alert || !alert.severity || !alert.name || !alert.description) {
          throw Error(`Invalid alert ${alert}`);
        }
        return alert;
      })
      .filter((alert) => (FindingSeverity[alert.severity] ?? 0) >= minSeverity)
      .map((alert) => {
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

        return e;
      });
  }

  let embeds;

  try {
    embeds = getEmbeds(-1); // All severity levels.
  } catch (e) {
    ctx.status = 400;
    console.error(e);
    console.error(
      "Got invalid alerts objects in data:",
      ctx.request.body.variables.alerts
    );
    return;
  } finally {
    console.log(`Embeds to send ${JSON.stringify(embeds)}`);
  }

  for (const hook of ctx.hooks) {
    let chunk = [];

    try {
      embeds = getEmbeds(FindingSeverity[hook.minSeverity]);
    } catch (e) {
      ctx.status = 400;
      console.error(e);
      return;
    }

    while ((chunk = embeds.splice(0, maxEmbedsLength)) && chunk.length) {
      await axios
        .post(hook.url, { embeds: chunk })
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

  // TODO: Match with the sent ones.
  ctx.body = {
    data: {
      sendAlerts: [],
    },
  };
}

async function handleHealthcheck(ctx) {
  ctx.status = 200;
  ctx.body = { uptime: process.uptime() };
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
