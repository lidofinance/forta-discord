const Router = require("@koa/router");
const bodyParser = require("koa-bodyparser");

const { handleHook, handleHealthcheck } = require("./handlers");

const router = new Router();

router
  .post(
    "/api",
    bodyParser({
      enableTypes: ["json"],
      extendTypes: {
        json: ["*/*"],
      },
      onerror: (err, ctx) => {
        console.warn(err);
        ctx.throw(400);
      },
    }),
    handleHook
  )
  .get("/health", handleHealthcheck);

module.exports = {
  router,
};
