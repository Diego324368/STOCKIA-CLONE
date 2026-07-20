import { createServer } from 'node:http';
import { loadEnv } from './env.mjs';
import { createDatabase, ensureSchema } from './database.mjs';
import { createRepository } from './repository.mjs';

loadEnv();

const port = Number(process.env.API_PORT ?? 3333);

const db = createDatabase();

await ensureSchema(db);

const repository = createRepository(db);

function sendJson(response, status, body) {
  const data = JSON.stringify(body);

  response.writeHead(status, {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,PUT,POST,DELETE,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json; charset=utf-8',
  });

  response.end(data);
}

async function readJson(request) {
  const chunks = [];

  for await (const chunk of request) {
    chunks.push(chunk);
  }

  if (chunks.length === 0) {
    return {};
  }

  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}

async function route(request, response) {
  const url = new URL(
    request.url ?? '/',
    `http://${request.headers.host}`
  );

  if (request.method === 'OPTIONS') {
    sendJson(response, 204, {});
    return;
  }

  if (request.method === 'GET' && url.pathname === '/api/health') {
    sendJson(response, 200, { ok: true });
    return;
  }

  if (request.method === 'GET' && url.pathname === '/api/users') {
    sendJson(response, 200, {
      users: await repository.getUsers(),
    });

    return;
  }

  if (request.method === 'PUT' && url.pathname === '/api/users') {
    const body = await readJson(request);

    await repository.saveUsers(
      Array.isArray(body.users)
        ? body.users
        : []
    );

    sendJson(response, 204, {});
    return;
  }

  if (
    request.method === 'DELETE' &&
    url.pathname.startsWith('/api/users/')
  ) {
    await repository.deleteUser(
      decodeURIComponent(
        url.pathname.slice('/api/users/'.length)
      )
    );

    sendJson(response, 204, {});
    return;
  }

  if (request.method === 'GET' && url.pathname === '/api/products') {
    sendJson(response, 200, {
      products: await repository.getProducts(),
    });

    return;
  }

  if (request.method === 'PUT' && url.pathname === '/api/products') {
    const body = await readJson(request);

    await repository.saveProducts(
      Array.isArray(body.products)
        ? body.products
        : []
    );

    sendJson(response, 204, {});
    return;
  }

  if (
    request.method === 'DELETE' &&
    url.pathname.startsWith('/api/products/')
  ) {
    await repository.deleteProduct(
      decodeURIComponent(
        url.pathname.slice('/api/products/'.length)
      )
    );

    sendJson(response, 204, {});
    return;
  }

  if (request.method === 'GET' && url.pathname === '/api/access-logs') {
    sendJson(response, 200, {
      logs: await repository.getAccessLogs(),
    });

    return;
  }

  const companyId = url.searchParams.get('companyId') ?? '00000000-0000-4000-8000-000000000001';

  if (request.method === 'GET' && url.pathname === '/api/batches') {
    sendJson(response, 200, { batches: await repository.getBatches(companyId) });
    return;
  }

  if (request.method === 'GET' && url.pathname === '/api/stock-movements') {
    sendJson(response, 200, { movements: await repository.getMovements(companyId) });
    return;
  }

  if (request.method === 'POST' && url.pathname === '/api/stock-movements') {
    await repository.moveStock(await readJson(request));
    sendJson(response, 204, {});
    return;
  }

  if (request.method === 'GET' && url.pathname === '/api/sales') {
    sendJson(response, 200, { sales: await repository.getSales(companyId) });
    return;
  }

  if (request.method === 'GET' && url.pathname === '/api/sale-items') {
    sendJson(response, 200, { saleItems: await repository.getSaleItems(companyId) });
    return;
  }

  if (request.method === 'GET' && url.pathname === '/api/suppliers') {
    sendJson(response, 200, { suppliers: await repository.getSuppliers(companyId) });
    return;
  }

  if (request.method === 'GET' && url.pathname === '/api/product-suppliers') {
    sendJson(response, 200, { productSuppliers: await repository.getProductSuppliers(companyId) });
    return;
  }

  if (request.method === 'GET' && url.pathname === '/api/alerts') {
    sendJson(response, 200, { alerts: await repository.getAlerts(companyId) });
    return;
  }

  if (request.method === 'GET' && url.pathname === '/api/recommendations') {
    sendJson(response, 200, { recommendations: await repository.getRecommendations(companyId) });
    return;
  }

  if (request.method === 'POST' && url.pathname === '/api/recommendations/decision') {
    await repository.decideRecommendation(await readJson(request));
    sendJson(response, 204, {});
    return;
  }

  if (request.method === 'GET' && url.pathname === '/api/reports') {
    sendJson(response, 200, { reports: await repository.getReports(companyId) });
    return;
  }

  if (request.method === 'GET' && url.pathname === '/api/dashboard') {
    sendJson(response, 200, { dashboard: await repository.getDashboard(companyId) });
    return;
  }

  if (request.method === 'GET' && url.pathname === '/api/expiration-risks') {
    sendJson(response, 200, { risks: await repository.getExpirationRisks(companyId) });
    return;
  }

  if (request.method === 'GET' && url.pathname === '/api/demand-forecasts') {
    sendJson(response, 200, { forecasts: await repository.getForecasts(companyId) });
    return;
  }

  if (request.method === 'GET' && url.pathname === '/api/replenishments') {
    sendJson(response, 200, { replenishments: await repository.getReplenishments(companyId) });
    return;
  }

  if (request.method === 'GET' && url.pathname === '/api/promotions') {
    sendJson(response, 200, { promotions: await repository.getPromotions(companyId) });
    return;
  }

  if (request.method === 'POST' && url.pathname === '/api/assistant/messages') {
    const body = await readJson(request);
    sendJson(response, 200, {
      response: await repository.askAssistant(
        body.companyId ?? companyId,
        body.message ?? '',
        Array.isArray(body.conversation) ? body.conversation : []
      ),
    });
    return;
  }

  if (request.method === 'PUT' && url.pathname === '/api/access-logs') {
    const body = await readJson(request);

    await repository.saveAccessLogs(
      Array.isArray(body.logs)
        ? body.logs
        : []
    );

    sendJson(response, 204, {});
    return;
  }

  sendJson(response, 404, {
    error: 'Rota nao encontrada.',
  });
}

const server = createServer(async (request, response) => {
  try {
    await route(request, response);
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : 'Erro inesperado.';

    console.error(error);

    sendJson(response, 500, {
      error: message,
    });
  }
});

server.listen(port, '0.0.0.0', () => {
  console.log(
    `API StockIA rodando em http://0.0.0.0:${port}`
  );
});

process.on('SIGINT', async () => {
  await db.close();

  server.close(() => process.exit(0));
});
