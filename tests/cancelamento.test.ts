import assert from 'node:assert/strict';
import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { afterEach, beforeEach, describe, test } from 'node:test';
import { criarApp } from '../src/app.js';

type PedidoSerializado = Record<string, any>;

let servidor: Server;
let baseUrl: string;

beforeEach(async () => {
  servidor = criarApp().listen(0);
  await new Promise<void>((resolve) => servidor.once('listening', resolve));
  const endereco = servidor.address() as AddressInfo;
  baseUrl = `http://127.0.0.1:${endereco.port}`;
});

afterEach(async () => {
  await new Promise<void>((resolve, reject) => {
    servidor.close((erro) => (erro ? reject(erro) : resolve()));
    servidor.closeAllConnections();
  });
});

async function cancelar(id: string, corpo?: unknown) {
  const opcoes: RequestInit = { method: 'POST' };
  if (corpo !== undefined) {
    opcoes.headers = { 'content-type': 'application/json' };
    opcoes.body = JSON.stringify(corpo);
  }
  return fetch(`${baseUrl}/pedidos/${id}/cancelamento`, opcoes);
}

async function buscarPedido(id: string) {
  const resposta = await fetch(`${baseUrl}/pedidos/${id}`);
  assert.equal(resposta.status, 200);
  return (await resposta.json()) as PedidoSerializado;
}

async function lerProblema(resposta: Response) {
  assert.match(resposta.headers.get('content-type') ?? '', /^application\/problem\+json/);
  const corpo = (await resposta.json()) as PedidoSerializado;
  assert.deepEqual(Object.keys(corpo).sort(), ['detail', 'instance', 'status', 'title', 'type']);
  assert.equal(corpo.type, 'about:blank');
  assert.equal(typeof corpo.title, 'string');
  assert.equal(typeof corpo.detail, 'string');
  assert.equal(typeof corpo.instance, 'string');
  assert.equal(corpo.status, resposta.status);
  return corpo;
}

describe('US1 - cancelar pedido ainda não enviado', () => {
  test('cancela pedido criado sem motivo e preserva os campos legados', async () => {
    const resposta = await cancelar('PED-1001');
    assert.equal(resposta.status, 200);

    const pedido = (await resposta.json()) as PedidoSerializado;
    assert.equal(pedido.status, 'cancelado');
    assert.equal(typeof pedido.canceladoEm, 'string');
    assert.ok(!Number.isNaN(Date.parse(pedido.canceladoEm)));
    assert.equal('motivoCancelamento' in pedido, false);

    assert.equal(pedido.id, 'PED-1001');
    assert.equal(pedido.cliente, 'Ana Souza');
    assert.equal(pedido.valor_total, 79.8);
    assert.equal(pedido.criadoEm, '2026-09-28T10:15:00Z');
    assert.deepEqual(pedido.forma_pagamento, { tipo: 'pix', chave: 'ana.souza@exemplo.com' });
    assert.deepEqual(pedido.itens, [{ sku: 'CX-PEQ', quantidade: 2, preco_unitario: 39.9 }]);
  });

  test('cancela pedido pago com motivo e remove espaços das extremidades', async () => {
    const resposta = await cancelar('PED-1002', { motivo: '  Cliente desistiu  ' });
    assert.equal(resposta.status, 200);

    const pedido = (await resposta.json()) as PedidoSerializado;
    assert.equal(pedido.status, 'cancelado');
    assert.equal(pedido.motivoCancelamento, 'Cliente desistiu');
    assert.equal(typeof pedido.canceladoEm, 'string');
  });

  test('aceita motivo com exatamente 200 caracteres', async () => {
    const motivo = 'x'.repeat(200);
    const resposta = await cancelar('PED-1001', { motivo });
    assert.equal(resposta.status, 200);

    const pedido = (await resposta.json()) as PedidoSerializado;
    assert.equal(pedido.motivoCancelamento, motivo);
  });

  test('recusa motivo com 201 caracteres sem alterar o pedido', async () => {
    const resposta = await cancelar('PED-1001', { motivo: 'x'.repeat(201) });
    assert.equal(resposta.status, 400);

    const problema = await lerProblema(resposta);
    assert.equal(problema.title, 'Motivo inválido');
    assert.equal(problema.detail, 'O motivo deve ter no máximo 200 caracteres.');
    assert.equal(problema.instance, '/pedidos/PED-1001/cancelamento');

    const pedido = await buscarPedido('PED-1001');
    assert.equal(pedido.status, 'criado');
    assert.equal('canceladoEm' in pedido, false);
    assert.equal('motivoCancelamento' in pedido, false);
  });

  test('trata motivo vazio ou só com espaços como ausência de motivo', async () => {
    const resposta = await cancelar('PED-1001', { motivo: '   ' });
    assert.equal(resposta.status, 200);

    const pedido = (await resposta.json()) as PedidoSerializado;
    assert.equal(pedido.status, 'cancelado');
    assert.equal('motivoCancelamento' in pedido, false);
  });

  test('recusa motivo com tipo inválido sem alterar o pedido', async () => {
    const resposta = await cancelar('PED-1001', { motivo: 123 });
    assert.equal(resposta.status, 400);

    const problema = await lerProblema(resposta);
    assert.equal(problema.title, 'Motivo inválido');
    assert.equal(problema.detail, 'O motivo deve ser um texto.');

    const pedido = await buscarPedido('PED-1001');
    assert.equal(pedido.status, 'criado');
  });

  test('pedido já cancelado é devolvido sem alterar data e motivo', async () => {
    const primeira = await cancelar('PED-1002', { motivo: 'Primeiro motivo' });
    assert.equal(primeira.status, 200);
    const pedidoOriginal = (await primeira.json()) as PedidoSerializado;

    const segunda = await cancelar('PED-1002', { motivo: 'Segundo motivo' });
    assert.equal(segunda.status, 200);
    const pedidoAtualizado = (await segunda.json()) as PedidoSerializado;

    assert.equal(pedidoAtualizado.status, 'cancelado');
    assert.equal(pedidoAtualizado.canceladoEm, pedidoOriginal.canceladoEm);
    assert.equal(pedidoAtualizado.motivoCancelamento, 'Primeiro motivo');
  });
});

describe('US2 - impedir cancelamento de pedido enviado ou entregue', () => {
  test('recusa pedido enviado e mantém o pedido inalterado', async () => {
    const resposta = await cancelar('PED-1003');
    assert.equal(resposta.status, 409);

    const problema = await lerProblema(resposta);
    assert.equal(problema.title, 'Cancelamento não permitido');
    assert.match(problema.detail, /enviado/);
    assert.equal(problema.instance, '/pedidos/PED-1003/cancelamento');

    const pedido = await buscarPedido('PED-1003');
    assert.equal(pedido.status, 'enviado');
    assert.equal('canceladoEm' in pedido, false);
  });

  test('recusa pedido entregue e mantém o pedido inalterado', async () => {
    const resposta = await cancelar('PED-1004');
    assert.equal(resposta.status, 409);

    const problema = await lerProblema(resposta);
    assert.equal(problema.title, 'Cancelamento não permitido');
    assert.match(problema.detail, /entregue/);
    assert.equal(problema.instance, '/pedidos/PED-1004/cancelamento');

    const pedido = await buscarPedido('PED-1004');
    assert.equal(pedido.status, 'entregue');
    assert.equal('canceladoEm' in pedido, false);
  });

  test('responde pedido inexistente com Problem Details', async () => {
    const resposta = await cancelar('PED-9999');
    assert.equal(resposta.status, 404);

    const problema = await lerProblema(resposta);
    assert.equal(problema.title, 'Pedido não encontrado');
    assert.equal(problema.detail, 'Não existe pedido com o identificador informado.');
    assert.equal(problema.instance, '/pedidos/PED-9999/cancelamento');
  });
});

describe('US3 - manter pedidos cancelados visíveis na lista', () => {
  test('pedido cancelado continua na lista completa com status e data', async () => {
    await cancelar('PED-1001', { motivo: 'Lista' });

    const resposta = await fetch(`${baseUrl}/pedidos`);
    assert.equal(resposta.status, 200);
    const pedidos = (await resposta.json()) as PedidoSerializado[];

    const pedido = pedidos.find((p) => p.id === 'PED-1001');
    assert.ok(pedido);
    assert.equal(pedido.status, 'cancelado');
    assert.equal(typeof pedido.canceladoEm, 'string');
    assert.equal(pedido.motivoCancelamento, 'Lista');
  });

  test('filtro por status cancelado retorna o pedido cancelado', async () => {
    await cancelar('PED-1001');

    const resposta = await fetch(`${baseUrl}/pedidos?status=cancelado`);
    assert.equal(resposta.status, 200);
    const pedidos = (await resposta.json()) as PedidoSerializado[];

    assert.deepEqual(
      pedidos.map((p) => p.id),
      ['PED-1001'],
    );
  });

  test('pedido não cancelado mantém a representação legada', async () => {
    const pedido = await buscarPedido('PED-1003');

    assert.equal(pedido.status, 'enviado');
    assert.equal('canceladoEm' in pedido, false);
    assert.equal('motivoCancelamento' in pedido, false);
  });
});

describe('Convergence - erros de corpo do cancelamento', () => {
  test('responde JSON malformado com Problem Details e não altera o pedido', async () => {
    const resposta = await fetch(`${baseUrl}/pedidos/PED-1001/cancelamento`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: '{"motivo":',
    });
    assert.equal(resposta.status, 400);

    const problema = await lerProblema(resposta);
    assert.equal(problema.title, 'Corpo inválido');
    assert.equal(problema.detail, 'O corpo da requisição deve ser um JSON válido.');
    assert.equal(problema.instance, '/pedidos/PED-1001/cancelamento');

    const pedido = await buscarPedido('PED-1001');
    assert.equal(pedido.status, 'criado');
  });

  test('responde corpo acima do limite com Problem Details e não altera o pedido', async () => {
    const resposta = await fetch(`${baseUrl}/pedidos/PED-1002/cancelamento`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ motivo: 'x'.repeat(150_000) }),
    });
    assert.equal(resposta.status, 413);

    const problema = await lerProblema(resposta);
    assert.equal(problema.title, 'Corpo muito grande');
    assert.equal(problema.detail, 'O corpo da requisição excede o limite permitido.');
    assert.equal(problema.instance, '/pedidos/PED-1002/cancelamento');

    const pedido = await buscarPedido('PED-1002');
    assert.equal(pedido.status, 'pago');
  });
});
