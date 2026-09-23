import { Router } from 'express';
import { openapiDocument } from '../docs/openapi.js';
import { renderReferencePage } from '../docs/referencePage.js';

export const docsRouter = Router();

const SPEC_PATH = '/openapi.json';

// Especificacao crua: alimenta a pagina e pode ser importada no Postman/Insomnia.
docsRouter.get(SPEC_PATH, (_req, res) => {
  res.json(openapiDocument);
});

docsRouter.get('/docs', (_req, res) => {
  res.type('html').send(renderReferencePage({ specUrl: SPEC_PATH }));
});
