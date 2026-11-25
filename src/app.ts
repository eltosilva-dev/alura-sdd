import express from 'express';
import type { NextFunction, Request, Response } from 'express';
import { criarBase } from './pedidos/dados.js';
import { responderProblema, rotasPedidos } from './pedidos/rotas.js';

const CAMINHO_CANCELAMENTO = /^\/pedidos\/[^/]+\/cancelamento\/?$/;

interface ErroHttp {
  status?: unknown;
  statusCode?: unknown;
  type?: unknown;
}

export function criarApp() {
  const app = express();
  app.use(express.json());
  app.use(express.static('cliente'));
  app.use(rotasPedidos(criarBase()));

  app.use((erro: unknown, req: Request, res: Response, proximo: NextFunction) => {
    if (req.method !== 'POST' || !CAMINHO_CANCELAMENTO.test(req.path) || res.headersSent) {
      proximo(erro);
      return;
    }

    const status = statusDoErro(erro);
    const { title, detail } = descreverErroDoCancelamento(erro, status);
    responderProblema(res, status, title, detail, req.originalUrl);
  });

  return app;
}

function statusDoErro(erro: unknown): number {
  const dados = dadosDoErro(erro);
  const status = dados.status ?? dados.statusCode;

  if (typeof status === 'number' && status >= 400 && status <= 599) {
    return status;
  }
  return 500;
}

function descreverErroDoCancelamento(erro: unknown, status: number) {
  const { type } = dadosDoErro(erro);

  if (type === 'entity.parse.failed') {
    return {
      title: 'Corpo inválido',
      detail: 'O corpo da requisição deve ser um JSON válido.',
    };
  }
  if (type === 'entity.too.large' || status === 413) {
    return {
      title: 'Corpo muito grande',
      detail: 'O corpo da requisição excede o limite permitido.',
    };
  }
  if (status === 415) {
    return {
      title: 'Tipo de mídia não suportado',
      detail: 'O corpo da requisição usa um tipo de mídia não suportado.',
    };
  }
  if (status >= 400 && status < 500) {
    return {
      title: 'Requisição inválida',
      detail: 'Não foi possível processar o corpo da requisição.',
    };
  }
  return {
    title: 'Erro interno',
    detail: 'Ocorreu um erro inesperado ao processar o cancelamento.',
  };
}

function dadosDoErro(erro: unknown): ErroHttp {
  return (typeof erro === 'object' && erro !== null ? erro : {}) as ErroHttp;
}
