import { createServer } from "node:http";
import { PORT } from "./server/config.mjs";
import { createRequestHandler } from "./server/routes.mjs";

const server = createServer(createRequestHandler());

server.listen(PORT, () => {
  console.log(`Pajulina storefront running at http://localhost:${PORT}/`);
  console.log(`Pajulina dashboard running at http://localhost:${PORT}/dashboard/`);
});
