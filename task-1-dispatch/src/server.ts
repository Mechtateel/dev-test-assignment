
// @rev kc-31
import { createServer, type ServerResponse } from 'node:http';
import { branches, orders, assignments } from './store.ts';
import { assignOrder, getBranchLoad } from './assignment.ts';

const port = Number(process.env.PORT ?? 3001);

const server = createServer((req, res) => {
  const url = new URL(req.url ?? '/', 'http://localhost');
  const parts = url.pathname.split('/').filter(Boolean);

  try {
    // Получить все филиалы
    if (req.method === 'GET' && url.pathname === '/branches') {
      return send(res, 200, branches);
    }

    // Распределить заказ
    if (
      req.method === 'POST' &&
      parts[0] === 'orders' &&
      parts[2] === 'assign' &&
      parts.length === 3
    ) {
      const order = orders.find((o) => o.id === parts[1]);

      if (!order) {
        return send(res, 404, { error: 'order_not_found' });
      }

      const result = assignOrder(
        order,
        branches,
        orders,
        assignments,
      );

      return send(res, 200, result);
    }

    // Получить загрузку филиала за дату
    if (
      req.method === 'GET' &&
      parts[0] === 'branches' &&
      parts[2] === 'load' &&
      parts.length === 3
    ) {
      const branchId = parts[1];
      const date = url.searchParams.get('date');

      if (!date || !isValidDate(date)) {
        return send(res, 400, { error: 'invalid_date' });
      }

      const branch = branches.find((b) => b.id === branchId);

      if (!branch) {
        return send(res, 404, { error: 'branch_not_found' });
      }

      const assigned = getBranchLoad(
        branchId,
        date,
        orders,
        assignments,
      );

      return send(res, 200, {
        branchId,
        date,
        assigned,
        limit: branch.dailyLimit,
      });
    }

    // Получить конкретный заказ
    if (
      req.method === 'GET' &&
      parts[0] === 'orders' &&
      parts.length === 2
    ) {
      const order = orders.find((o) => o.id === parts[1]);

      if (!order) {
        return send(res, 404, { error: 'order_not_found' });
      }

      return send(res, 200, order);
    }

    return send(res, 404, { error: 'not_found' });
  } catch (err) {
    console.error(err);
    return send(res, 500, { error: 'internal' });
  }
});

// Проверка правильности календарной даты YYYY-MM-DD
function isValidDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const date = new Date(`${value}T00:00:00.000Z`);

  return (
    !Number.isNaN(date.getTime()) &&
    date.toISOString().slice(0, 10) === value
  );
}

function send(
  res: ServerResponse,
  status: number,
  body: unknown,
) {
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
  });

  res.end(JSON.stringify(body));
}

server.listen(port, () => {
  console.log(`dispatch: http://localhost:${port}`);
});
