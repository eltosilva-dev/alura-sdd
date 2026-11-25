import { Router } from 'express';
import type { Response } from 'express';
import type { Base, FormaPagamento, Item } from './dados.js';
import { serializarPedido } from './serializar.js';

export function rotasPedidos(base: Base) {
  const rotas = Router();

  rotas.get('/pedidos', (req, res) => {
    const status = typeof req.query.status === 'string' ? req.query.status : undefined;
    res.json(base.listar(status).map(serializarPedido));
  });

  rotas.get('/pedidos/:id', (req, res) => {
    const pedido = base.buscar(req.params.id);
    if (!pedido) {
      // Formato de erro antigo, mantido porque clientes dependem dele.
      res.status(404).json({ erro: 'Pedido não encontrado' });
      return;
    }
    res.json(serializarPedido(pedido));
  });

  rotas.post('/pedidos', (req, res) => {
    const corpo = req.body ?? {};
    if (!corpo.cliente) {
      // Outro formato de erro, de outra época da API.
      res.status(400).json({ message: 'cliente é obrigatório', code: 'VALIDACAO' });
      return;
    }
    const itens: Item[] = corpo.itens.map((i: any) => ({
      sku: i.sku,
      quantidade: i.quantidade,
      precoUnitario: i.preco_unitario,
    }));
    const valorTotal = Math.round(itens.reduce((t, i) => t + i.quantidade * i.precoUnitario, 0) * 100) / 100;
    const formaPagamento = lerPagamento(corpo.forma_pagamento);
    const pedido = base.inserir({
      cliente: corpo.cliente,
      status: 'criado',
      itens,
      valorTotal,
      criadoEm: new Date().toISOString(),
      formaPagamento,
    });
    res.status(201).json(serializarPedido(pedido));
  });

  rotas.post('/pedidos/:id/cancelamento', (req, res) => {
    const resultado = lerMotivo(req.body);
    if (!resultado.valido) {
      responderProblema(res, 400, 'Motivo inválido', resultado.detalhe, req.originalUrl);
      return;
    }

    const pedido = base.buscar(req.params.id);
    if (!pedido) {
      responderProblema(
        res,
        404,
        'Pedido não encontrado',
        'Não existe pedido com o identificador informado.',
        req.originalUrl,
      );
      return;
    }

    if (pedido.status === 'enviado' || pedido.status === 'entregue') {
      responderProblema(
        res,
        409,
        'Cancelamento não permitido',
        `O pedido está com status "${pedido.status}" e não pode ser cancelado.`,
        req.originalUrl,
      );
      return;
    }

    if (pedido.status === 'cancelado') {
      res.json(serializarPedido(pedido));
      return;
    }

    const atualizado = base.cancelar(pedido.id, resultado.motivo);
    res.json(serializarPedido(atualizado ?? pedido));
  });

  return rotas;
}

type ResultadoMotivo =
  | { valido: true; motivo?: string }
  | { valido: false; detalhe: string };

function lerMotivo(corpo: unknown): ResultadoMotivo {
  if (corpo === undefined || corpo === null) {
    return { valido: true };
  }
  if (typeof corpo !== 'object' || Array.isArray(corpo)) {
    return { valido: false, detalhe: 'O corpo da requisição deve ser um objeto JSON.' };
  }

  const motivo = (corpo as { motivo?: unknown }).motivo;
  if (motivo === undefined || motivo === null) {
    return { valido: true };
  }
  if (typeof motivo !== 'string') {
    return { valido: false, detalhe: 'O motivo deve ser um texto.' };
  }

  const texto = motivo.trim();
  if (texto.length === 0) {
    return { valido: true };
  }
  if (texto.length > 200) {
    return { valido: false, detalhe: 'O motivo deve ter no máximo 200 caracteres.' };
  }
  return { valido: true, motivo: texto };
}

export function responderProblema(
  res: Response,
  status: number,
  title: string,
  detail: string,
  instance: string,
) {
  res.status(status).type('application/problem+json').json({
    type: 'about:blank',
    title,
    status,
    detail,
    instance,
  });
}

function lerPagamento(fp: any): FormaPagamento {
  if (fp?.tipo === 'cartao') {
    return { tipo: 'cartao', bandeira: fp.bandeira, parcelas: fp.parcelas, finalCartao: fp.final_cartao };
  }
  if (fp?.tipo === 'boleto') {
    return { tipo: 'boleto', linhaDigitavel: fp.linha_digitavel, vencimento: fp.vencimento };
  }
  return { tipo: 'pix', chave: fp?.chave };
}
