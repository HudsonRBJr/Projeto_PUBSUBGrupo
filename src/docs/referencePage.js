import { openapiDocument } from './openapi.js';

// Pagina de documentacao da API. O HTML e gerado a partir do proprio documento
// OpenAPI (src/docs/openapi.js), entao a pagina e a especificacao nunca saem de
// sincronia. Nao ha dependencia nova no package.json: o unico recurso externo e
// a fonte, que tem alternativa local caso nao carregue.

const FLOW = [
  { label: 'Publisher', detail: 'Sistema de vendas publica o pedido' },
  { label: 'Pub/Sub', detail: 'Tópico + assinatura' },
  { label: 'Consumer', detail: 'Valida a mensagem e grava' },
  { label: 'PostgreSQL', detail: 'Pedidos e itens' },
  { label: 'API REST', detail: 'Node.js + Express' }
];

const STEPS = [
  { title: 'Sobe o banco e cria as tabelas', command: 'npm run db:init' },
  { title: 'Inicia a API', command: 'npm start' },
  { title: 'Inicia o consumer', command: 'npm run consumer' },
  { title: 'Publica um pedido de exemplo', command: 'npm run publish:sample' }
];

const MODELS = [
  { title: 'Pedido', schema: 'Order' },
  { title: 'Item do pedido', schema: 'OrderItem' },
  { title: 'Mensagem do Pub/Sub', schema: 'OrderMessage' },
  { title: 'Resumo financeiro', schema: 'FinancialSummary' }
];

const SECTIONS = [
  { id: 'fluxo', title: 'Fluxo' },
  { id: 'como-rodar', title: 'Como rodar' },
  { id: 'endpoints', title: 'Endpoints' },
  { id: 'mensagem', title: 'Mensagem do Pub/Sub' },
  { id: 'modelos', title: 'Modelos' }
];

const esc = (value) =>
  String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

const slug = (method, path) =>
  `${method}${path}`
    .toLowerCase()
    .replace(/[{}]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');

// "integer · int64", "string · enum", "Item[]" etc.
function typeLabel(schema = {}) {
  if (schema.$ref) return schema.$ref.split('/').pop();

  if (schema.type === 'array') {
    return `${typeLabel(schema.items)}[]`;
  }

  const parts = [schema.type ?? 'object'];

  if (schema.enum) parts.push('enum');
  else if (schema.format) parts.push(schema.format);

  if (schema.readOnly) parts.push('calculado');

  return parts.join(' · ');
}

function jsonBlock(value, extraClass = '') {
  return `<pre class="code ${extraClass}">${esc(JSON.stringify(value, null, 2))}</pre>`;
}

function parameterRows(parameters) {
  if (parameters.length === 0) return '';

  const rows = parameters
    .map(
      (parameter) => `
            <div class="param">
              <span class="param-name">${esc(parameter.name)}</span>
              <span class="param-type">${esc(typeLabel(parameter.schema))}${
                parameter.required ? ' · obrigatório' : ''
              }</span>
              <span class="param-desc">${esc(parameter.description ?? '')}</span>
            </div>`
    )
    .join('');

  return `
          <h4 class="label">Parâmetros</h4>
          <div class="params">${rows}
          </div>`;
}

// Campos do formulario de teste, ja preenchidos com os exemplos da especificacao.
function testerFields(parameters) {
  if (parameters.length === 0) {
    return '<p class="tester-empty">Esta rota não recebe parâmetros.</p>';
  }

  return parameters
    .map((parameter) => {
      // Filtro de exemplo preenchido devolveria resultado vazio no teste, entao ele
      // vira dica do campo: so o que tem padrao (ou e parametro de rota) ja vem escrito.
      const value =
        parameter.schema?.default ??
        (parameter.in === 'path' ? parameter.example ?? '' : '');

      const hint =
        parameter.example != null
          ? `ex.: ${parameter.example}`
          : parameter.schema?.type ?? '';

      const options = parameter.schema?.enum;

      const field = options
        ? `<select data-name="${esc(parameter.name)}" data-in="${esc(parameter.in)}">
                  <option value=""></option>
                  ${options
                    .map(
                      (option) =>
                        `<option value="${esc(option)}"${
                          String(value) === String(option) ? ' selected' : ''
                        }>${esc(option)}</option>`
                    )
                    .join('')}
                </select>`
        : `<input
                  type="text"
                  data-name="${esc(parameter.name)}"
                  data-in="${esc(parameter.in)}"
                  value="${esc(value)}"
                  placeholder="${esc(hint)}"
                />`;

      return `
              <label class="field">
                <span class="field-name">${esc(parameter.name)}</span>
                ${field}
              </label>`;
    })
    .join('');
}

function responseExample(operation) {
  const success = operation.responses?.[200]?.content?.['application/json'];
  if (!success?.example) return '';

  return `
          <h4 class="label">Resposta de exemplo</h4>
          ${jsonBlock(success.example, 'code-scroll')}`;
}

function otherResponses(operation) {
  const codes = Object.keys(operation.responses ?? {}).filter((code) => code !== '200');
  if (codes.length === 0) return '';

  const items = codes
    .map(
      (code) =>
        `<li><span class="status-code">${esc(code)}</span> ${esc(
          operation.responses[code].description ?? ''
        )}</li>`
    )
    .join('');

  return `
          <h4 class="label">Outras respostas</h4>
          <ul class="responses">${items}</ul>`;
}

function operationBlock(path, method, operation) {
  const id = slug(method, path);
  const parameters = operation.parameters ?? [];
  const search = [path, operation.summary, operation.description]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  return `
        <article class="endpoint" id="${id}" data-endpoint data-search="${esc(search)}">
          <button class="endpoint-head" type="button" aria-expanded="false" aria-controls="${id}-body">
            <span class="method">${esc(method.toUpperCase())}</span>
            <span class="path">${esc(path)}</span>
            <span class="summary">${esc(operation.summary ?? '')}</span>
            <span class="toggle" aria-hidden="true">+</span>
          </button>

          <div class="endpoint-body" id="${id}-body" hidden>
            ${
              operation.description
                ? `<p class="endpoint-desc">${esc(operation.description)}</p>`
                : ''
            }
            ${parameterRows(parameters)}
            ${responseExample(operation)}
            ${otherResponses(operation)}

            <h4 class="label">Testar agora</h4>
            <form class="tester" data-method="${esc(method)}" data-path="${esc(path)}">
              <div class="fields">${testerFields(parameters)}
              </div>
              <div class="tester-actions">
                <button class="run" type="submit">Executar</button>
                <code class="preview" data-preview>${esc(path)}</code>
              </div>

              <h4 class="label">Linha de comando</h4>
              <pre class="code" data-curl></pre>

              <div class="result" data-result hidden></div>
            </form>
          </div>
        </article>`;
}

function modelBlock({ title, schema: schemaName }) {
  const schema = openapiDocument.components.schemas[schemaName];
  const properties = schema?.properties ?? {};
  const required = new Set(schema?.required ?? []);

  const fields = Object.entries(properties)
    .map(
      ([name, property]) => `
            <div class="field-row">
              <div class="field-head">
                <span class="field-key">${esc(name)}${
                  required.has(name) ? '<span class="field-req">*</span>' : ''
                }</span>
                <span class="field-type">${esc(typeLabel(property))}</span>
              </div>
              ${
                property.description
                  ? `<p class="field-desc">${esc(property.description)}</p>`
                  : ''
              }
            </div>`
    )
    .join('');

  return `
        <article class="model">
          <h3 class="model-title">${esc(title)}</h3>
          <div class="field-list">${fields}
          </div>
        </article>`;
}

function messageSection() {
  const webhook = openapiDocument.webhooks?.['pedido-publicado']?.post;
  if (!webhook) return '';

  const example = webhook.requestBody?.content?.['application/json']?.example;

  return `
      <section class="section" id="mensagem">
        <h2 class="label">Mensagem do Pub/Sub</h2>
        <p class="section-lead">${esc(webhook.description ?? '')}</p>
        ${example ? jsonBlock(example, 'code-scroll') : ''}
      </section>`;
}

const styles = `
  :root {
    color-scheme: dark;
    --bg: #0d0b0a;
    --text: #efece5;
    --muted: #8b857b;
    --line: #2b2724;
    --accent: #d98f52;
    --ok: #7fb069;
    --err: #d9695f;
    --mono: "IBM Plex Mono", ui-monospace, "Cascadia Mono", Consolas, monospace;
    --sans: "Helvetica Neue", Helvetica, Arial, sans-serif;
  }

  * { margin: 0; padding: 0; box-sizing: border-box; }

  html { scroll-behavior: smooth; scroll-padding-top: 24px; }

  body {
    background: var(--bg);
    color: var(--text);
    font-family: var(--sans);
    -webkit-font-smoothing: antialiased;
  }

  .shell {
    display: grid;
    grid-template-columns: 236px minmax(0, 1fr);
    gap: 48px;
    max-width: 1320px;
    margin: 0 auto;
    padding: 56px 32px 120px;
  }

  .label {
    font-family: var(--mono);
    font-size: 12px;
    font-weight: 500;
    letter-spacing: 1.2px;
    text-transform: uppercase;
    color: var(--muted);
  }

  /* ---------- navegacao lateral ---------- */

  .nav {
    position: sticky;
    top: 40px;
    align-self: start;
    max-height: calc(100vh - 80px);
    overflow-y: auto;
    padding-right: 8px;
  }

  .nav-search {
    width: 100%;
    margin: 14px 0 22px;
    padding: 9px 11px;
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid var(--line);
    color: var(--text);
    font-family: var(--mono);
    font-size: 12.5px;
  }

  .nav-search:focus { outline: none; border-color: var(--accent); }

  .nav-group { margin-bottom: 22px; }

  .nav-title {
    display: block;
    margin-bottom: 10px;
    font-family: var(--mono);
    font-size: 11px;
    letter-spacing: 1.2px;
    text-transform: uppercase;
    color: var(--muted);
  }

  .nav-link {
    display: block;
    padding: 6px 0 6px 10px;
    border-left: 1px solid var(--line);
    color: var(--muted);
    font-size: 13.5px;
    text-decoration: none;
    transition: color 0.15s ease, border-color 0.15s ease;
  }

  .nav-link:hover { color: var(--text); }

  .nav-link.active {
    color: var(--text);
    border-left-color: var(--accent);
  }

  .nav-link.endpoint-link {
    display: grid;
    grid-template-columns: 34px 1fr;
    gap: 8px;
    font-family: var(--mono);
    font-size: 12px;
  }

  .nav-link .nav-method { color: var(--accent); }
  .nav-link .nav-path { overflow: hidden; text-overflow: ellipsis; }

  .nav-empty { padding: 6px 0 6px 10px; font-size: 12.5px; color: var(--muted); }

  /* ---------- cabecalho ---------- */

  .eyebrow, .version {
    font-family: var(--mono);
    font-size: 12px;
    letter-spacing: 1.2px;
    text-transform: uppercase;
    color: var(--muted);
  }

  .version { margin-top: 6px; text-transform: none; }

  h1 {
    margin: 22px 0 18px;
    font-size: 44px;
    font-weight: 500;
    letter-spacing: -0.02em;
  }

  .lead {
    max-width: 62ch;
    font-size: 16px;
    line-height: 1.65;
    color: #cdc7bc;
  }

  .meta {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 10px 28px;
    margin-top: 32px;
    padding-bottom: 28px;
    border-bottom: 1px solid var(--line);
    font-family: var(--mono);
    font-size: 13px;
  }

  .meta-key { color: var(--muted); margin-right: 10px; }
  .meta a { color: var(--text); text-decoration: underline; text-underline-offset: 3px; }
  .meta a:hover { color: var(--accent); }

  .status { display: inline-flex; align-items: center; gap: 8px; color: var(--muted); }

  .status-dot { width: 7px; height: 7px; border-radius: 50%; background: var(--muted); }

  .status[data-state="online"] .status-dot { background: var(--ok); }
  .status[data-state="online"] { color: var(--text); }
  .status[data-state="offline"] .status-dot { background: var(--err); }

  /* ---------- secoes ---------- */

  .section { margin-top: 64px; scroll-margin-top: 24px; }

  .section-lead {
    max-width: 78ch;
    margin: 18px 0 20px;
    line-height: 1.65;
    color: #cdc7bc;
  }

  .flow {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 12px;
    margin: 22px 0 26px;
    font-family: var(--mono);
    font-size: 14px;
  }

  .flow-arrow { color: var(--muted); }

  .flow-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(190px, 1fr));
    gap: 1px;
    background: var(--line);
    border: 1px solid var(--line);
  }

  .flow-cell { background: var(--bg); padding: 18px 20px; }
  .flow-cell strong { display: block; font-size: 14px; font-weight: 500; }
  .flow-cell span {
    display: block;
    margin-top: 6px;
    font-size: 13px;
    line-height: 1.5;
    color: var(--muted);
  }

  .steps { margin-top: 22px; }

  .step {
    display: grid;
    grid-template-columns: 44px 1fr auto;
    align-items: baseline;
    gap: 16px;
    padding: 12px 0;
    border-bottom: 1px solid var(--line);
  }

  .step-index { font-family: var(--mono); font-size: 12px; color: var(--muted); }
  .step-title { font-size: 15px; }

  code, .code, .mono { font-family: var(--mono); }

  .step code, .preview { font-size: 13px; color: var(--accent); }

  .note {
    margin-top: 26px;
    padding-left: 16px;
    border-left: 1px solid var(--accent);
    max-width: 76ch;
    line-height: 1.65;
    color: #cdc7bc;
  }

  /* ---------- endpoints ---------- */

  .endpoints { margin-top: 22px; border-top: 1px solid var(--line); }

  .endpoint { border-bottom: 1px solid var(--line); scroll-margin-top: 24px; }
  .endpoint[hidden] { display: none; }

  .endpoint-head {
    display: grid;
    grid-template-columns: 52px minmax(180px, 260px) 1fr 20px;
    align-items: baseline;
    gap: 18px;
    width: 100%;
    padding: 16px 0;
    background: none;
    border: 0;
    color: inherit;
    text-align: left;
    cursor: pointer;
  }

  .endpoint-head:hover .path { color: var(--accent); }

  .method {
    font-family: var(--mono);
    font-size: 11px;
    letter-spacing: 0.06em;
    color: var(--accent);
  }

  .path { font-family: var(--mono); font-size: 14px; transition: color 0.15s ease; }
  .summary { font-size: 14px; color: var(--muted); }

  .toggle {
    font-family: var(--mono);
    font-size: 15px;
    color: var(--muted);
    justify-self: end;
  }

  .endpoint-body { padding: 4px 0 34px; }

  .endpoint-desc {
    max-width: 78ch;
    margin-bottom: 26px;
    line-height: 1.65;
    color: #cdc7bc;
  }

  .endpoint-body .label { display: block; margin: 26px 0 12px; }
  .endpoint-body .label:first-child { margin-top: 0; }

  .params { border-top: 1px solid var(--line); }

  .param {
    display: grid;
    grid-template-columns: minmax(120px, 180px) minmax(140px, 200px) 1fr;
    gap: 18px;
    padding: 11px 0;
    border-bottom: 1px solid var(--line);
    font-size: 14px;
  }

  .param-name { font-family: var(--mono); }
  .param-type { font-family: var(--mono); font-size: 12px; color: var(--accent); }
  .param-desc { color: var(--muted); }

  /* ---------- blocos de codigo ---------- */

  .code-wrap { position: relative; }

  .code {
    padding: 18px 20px;
    border: 1px solid var(--line);
    font-size: 12.5px;
    line-height: 1.6;
    color: #cdc7bc;
    white-space: pre-wrap;
    word-break: break-word;
    overflow: auto;
  }

  .code-scroll { max-height: 320px; white-space: pre; word-break: normal; }

  .copy {
    position: absolute;
    top: 8px;
    right: 8px;
    padding: 5px 10px;
    background: var(--bg);
    border: 1px solid var(--line);
    color: var(--muted);
    font-family: var(--mono);
    font-size: 11px;
    cursor: pointer;
    opacity: 0;
    transition: opacity 0.15s ease, color 0.15s ease;
  }

  .code-wrap:hover .copy, .copy:focus { opacity: 1; }
  .copy:hover { color: var(--accent); border-color: var(--accent); }

  .responses { list-style: none; font-size: 14px; color: var(--muted); }
  .responses li { padding: 8px 0; border-bottom: 1px solid var(--line); }
  .status-code { font-family: var(--mono); color: var(--accent); margin-right: 12px; }

  /* ---------- testador ---------- */

  .fields {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(210px, 1fr));
    gap: 14px 20px;
  }

  .field { display: flex; flex-direction: column; gap: 7px; }

  .field-name { font-family: var(--mono); font-size: 12px; color: var(--muted); }

  .field input, .field select {
    padding: 9px 11px;
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid var(--line);
    color: var(--text);
    font-family: var(--mono);
    font-size: 13px;
  }

  .field input:focus, .field select:focus { outline: none; border-color: var(--accent); }

  .tester-empty { font-size: 14px; color: var(--muted); }

  .tester-actions {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 16px;
    margin-top: 18px;
  }

  .run {
    padding: 10px 22px;
    background: var(--accent);
    border: 0;
    color: #16120f;
    font-family: var(--mono);
    font-size: 13px;
    cursor: pointer;
  }

  .run:hover { background: #e5a06a; }
  .run[disabled] { opacity: 0.55; cursor: default; }

  .preview { color: var(--muted); word-break: break-all; }

  .result { margin-top: 18px; }

  .result-head {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 12px;
    margin-bottom: 10px;
    font-family: var(--mono);
    font-size: 12px;
    color: var(--muted);
  }

  .result-status { color: var(--ok); }
  .result-status[data-error] { color: var(--err); }

  /* ---------- modelos ---------- */

  .models {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
    gap: 34px;
    margin-top: 24px;
  }

  .model-title { font-size: 16px; font-weight: 500; margin-bottom: 14px; }
  .field-list { border-top: 1px solid var(--line); }

  .field-row { padding: 10px 0; border-bottom: 1px solid var(--line); }

  .field-head {
    display: flex;
    justify-content: space-between;
    gap: 16px;
    font-family: var(--mono);
    font-size: 12.5px;
  }

  .field-req { color: var(--accent); }
  .field-type { color: var(--muted); text-align: right; }

  .field-desc {
    margin-top: 5px;
    font-size: 12.5px;
    line-height: 1.5;
    color: var(--muted);
  }

  footer {
    display: flex;
    flex-wrap: wrap;
    justify-content: space-between;
    gap: 14px;
    margin-top: 80px;
    padding-top: 26px;
    border-top: 1px solid var(--line);
    font-family: var(--mono);
    font-size: 12px;
    color: var(--muted);
  }

  footer a { color: var(--muted); text-decoration: underline; text-underline-offset: 3px; }
  footer a:hover { color: var(--accent); }

  @media (max-width: 1080px) {
    .shell { grid-template-columns: minmax(0, 1fr); gap: 0; padding: 40px 20px 80px; }
    .nav { position: static; max-height: none; margin-bottom: 40px; }
    .nav-list-sections { display: flex; flex-wrap: wrap; gap: 8px 18px; }
    .nav-group-endpoints { display: none; }
  }

  @media (max-width: 860px) {
    h1 { font-size: 32px; }
    .endpoint-head { grid-template-columns: 46px 1fr 20px; }
    .endpoint-head .summary { grid-column: 2 / 4; color: var(--muted); }
    .param { grid-template-columns: 1fr; gap: 4px; }
  }
`;

// Script do cliente: busca, sanfona, ancora por endpoint, botoes de copiar,
// indicador de status, curl e o testador. Escrito com concatenacao para nao
// conflitar com o template literal do modulo.
const clientScript = (baseUrl) => `
  (function () {
    var BASE_URL = ${JSON.stringify(baseUrl)};

    var statusEl = document.getElementById('status');
    var statusText = document.getElementById('status-text');

    fetch('/health')
      .then(function (response) {
        if (!response.ok) throw new Error('http ' + response.status);
        statusEl.dataset.state = 'online';
        statusText.textContent = 'API no ar';
      })
      .catch(function () {
        statusEl.dataset.state = 'offline';
        statusText.textContent = 'API fora do ar';
      });

    /* ---------- sanfona + ancora ---------- */

    function setOpen(endpoint, open) {
      var head = endpoint.querySelector('.endpoint-head');
      var body = endpoint.querySelector('.endpoint-body');

      body.hidden = !open;
      head.setAttribute('aria-expanded', String(open));
      endpoint.querySelector('.toggle').textContent = open ? '\\u2212' : '+';
    }

    document.querySelectorAll('[data-endpoint]').forEach(function (endpoint) {
      endpoint.querySelector('.endpoint-head').addEventListener('click', function () {
        var open = endpoint.querySelector('.endpoint-body').hidden;
        setOpen(endpoint, open);

        if (open) {
          history.replaceState(null, '', '#' + endpoint.id);
        }
      });
    });

    function openFromHash() {
      var id = decodeURIComponent(window.location.hash.replace('#', ''));
      if (!id) return;

      var endpoint = document.getElementById(id);
      if (!endpoint || !endpoint.hasAttribute('data-endpoint')) return;

      setOpen(endpoint, true);
      endpoint.scrollIntoView({ block: 'start' });
    }

    window.addEventListener('hashchange', openFromHash);
    openFromHash();

    /* ---------- busca ---------- */

    var search = document.getElementById('search');
    var navEmpty = document.getElementById('nav-empty');

    search.addEventListener('input', function () {
      var term = search.value.trim().toLowerCase();
      var visible = 0;

      document.querySelectorAll('[data-endpoint]').forEach(function (endpoint) {
        var match = !term || endpoint.dataset.search.indexOf(term) !== -1;
        endpoint.hidden = !match;

        var link = document.querySelector('.endpoint-link[href="#' + endpoint.id + '"]');
        if (link) link.hidden = !match;

        if (match) visible++;
      });

      navEmpty.hidden = visible > 0;
    });

    /* ---------- navegacao ativa ---------- */

    var links = [].slice.call(document.querySelectorAll('.nav-link'));

    var targets = links
      .map(function (link) {
        return { link: link, el: document.getElementById(link.getAttribute('href').slice(1)) };
      })
      .filter(function (item) {
        return item.el;
      });

    function highlight() {
      var position = window.scrollY + 140;
      var current = null;

      targets.forEach(function (item) {
        if (item.el.offsetTop <= position) current = item.link;
      });

      links.forEach(function (link) {
        link.classList.toggle('active', link === current);
      });
    }

    window.addEventListener('scroll', highlight, { passive: true });
    highlight();

    /* ---------- botoes de copiar ---------- */

    function addCopy(block) {
      var wrap = document.createElement('div');
      wrap.className = 'code-wrap';
      block.parentNode.insertBefore(wrap, block);
      wrap.appendChild(block);

      var button = document.createElement('button');
      button.className = 'copy';
      button.type = 'button';
      button.textContent = 'copiar';

      button.addEventListener('click', function () {
        navigator.clipboard.writeText(block.textContent).then(function () {
          button.textContent = 'copiado';
          setTimeout(function () {
            button.textContent = 'copiar';
          }, 1400);
        });
      });

      wrap.appendChild(button);
    }

    document.querySelectorAll('pre.code').forEach(addCopy);

    /* ---------- testador ---------- */

    function buildUrl(form) {
      var path = form.dataset.path;
      var query = [];

      form.querySelectorAll('[data-name]').forEach(function (field) {
        var value = field.value.trim();
        if (!value) return;

        if (field.dataset.in === 'path') {
          path = path.replace('{' + field.dataset.name + '}', encodeURIComponent(value));
        } else {
          query.push(encodeURIComponent(field.dataset.name) + '=' + encodeURIComponent(value));
        }
      });

      return path + (query.length ? '?' + query.join('&') : '');
    }

    function refresh(form) {
      var url = buildUrl(form);
      var method = form.dataset.method.toUpperCase();

      form.querySelector('[data-preview]').textContent = url;
      form.querySelector('[data-curl]').textContent =
        'curl' + (method === 'GET' ? '' : ' -X ' + method) + " '" + BASE_URL + url + "'";
    }

    document.querySelectorAll('.tester').forEach(function (form) {
      refresh(form);

      form.addEventListener('input', function () {
        refresh(form);
      });

      form.addEventListener('submit', function (event) {
        event.preventDefault();

        var url = buildUrl(form);
        var result = form.querySelector('[data-result]');
        var button = form.querySelector('.run');

        button.disabled = true;
        result.hidden = false;
        result.innerHTML = '<div class="result-head">executando ' + url + '</div>';

        var started = Date.now();

        fetch(url, { method: form.dataset.method.toUpperCase() })
          .then(function (response) {
            return response.text().then(function (text) {
              var body = text;

              try {
                body = JSON.stringify(JSON.parse(text), null, 2);
              } catch (error) {
                // resposta que nao e JSON: mostra como veio.
              }

              var head = document.createElement('div');
              head.className = 'result-head';
              head.innerHTML =
                '<span class="result-status"' + (response.ok ? '' : ' data-error') + '>' +
                response.status + ' ' + response.statusText + '</span>' +
                '<span>' + url + '</span>' +
                '<span>' + (Date.now() - started) + ' ms</span>';

              var pre = document.createElement('pre');
              pre.className = 'code code-scroll';
              pre.textContent = body;

              result.innerHTML = '';
              result.appendChild(head);
              result.appendChild(pre);
              addCopy(pre);
            });
          })
          .catch(function (error) {
            result.innerHTML =
              '<div class="result-head"><span class="result-status" data-error>falhou</span>' +
              '<span>' + url + '</span></div>';

            var pre = document.createElement('pre');
            pre.className = 'code';
            pre.textContent = String(error) + '\\n\\nA API está em execução?';
            result.appendChild(pre);
          })
          .then(function () {
            button.disabled = false;
          });
      });
    });
  })();
`;

export function renderReferencePage({ specUrl = '/openapi.json' } = {}) {
  const { info, servers } = openapiDocument;
  const baseUrl = servers?.[0]?.url ?? '';

  const operations = Object.entries(openapiDocument.paths).flatMap(([path, methods]) =>
    Object.entries(methods).map(([method, operation]) => ({ path, method, operation }))
  );

  const flowChain = FLOW.map((step) => `<span>${esc(step.label)}</span>`).join(
    '<span class="flow-arrow">→</span>'
  );

  const flowCells = FLOW.map(
    (step) => `
          <div class="flow-cell">
            <strong>${esc(step.label)}</strong>
            <span>${esc(step.detail)}</span>
          </div>`
  ).join('');

  const steps = STEPS.map(
    (step, index) => `
        <div class="step">
          <span class="step-index">${String(index + 1).padStart(2, '0')}</span>
          <span class="step-title">${esc(step.title)}</span>
          <code>${esc(step.command)}</code>
        </div>`
  ).join('');

  const endpoints = operations
    .map(({ path, method, operation }) => operationBlock(path, method, operation))
    .join('');

  const navSections = SECTIONS.map(
    (section) =>
      `<a class="nav-link" href="#${section.id}">${esc(section.title)}</a>`
  ).join('');

  const navEndpoints = operations
    .map(
      ({ path, method }) => `
            <a class="nav-link endpoint-link" href="#${slug(method, path)}">
              <span class="nav-method">${esc(method.toUpperCase())}</span>
              <span class="nav-path">${esc(path)}</span>
            </a>`
    )
    .join('');

  const models = MODELS.map(modelBlock).join('');

  return `<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Mensageria de Pedidos — Documentação da API</title>
    <meta
      name="description"
      content="Documentação da API de pedidos consumidos do Google Cloud Pub/Sub."
    />
    <link
      rel="icon"
      href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>📦</text></svg>"
    />
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link
      href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500&display=swap"
      rel="stylesheet"
    />
    <style>${styles}</style>
  </head>
  <body>
    <div class="shell">
      <aside class="nav">
        <span class="nav-title">Índice</span>

        <input
          id="search"
          class="nav-search"
          type="search"
          placeholder="buscar endpoint…"
          autocomplete="off"
        />

        <div class="nav-group">
          <div class="nav-list-sections">${navSections}</div>
        </div>

        <div class="nav-group nav-group-endpoints">
          <span class="nav-title">Rotas</span>
          ${navEndpoints}
          <p class="nav-empty" id="nav-empty" hidden>nenhuma rota encontrada</p>
        </div>
      </aside>

      <main>
        <header>
          <p class="eyebrow">Computação em Nuvem 2 · DSM · FATEC</p>
          <p class="version">v${esc(info.version)} · OpenAPI ${esc(
            openapiDocument.openapi
          )}</p>

          <h1>Mensageria de Pedidos</h1>

          <p class="lead">
            API REST sobre os pedidos publicados no Google Cloud Pub/Sub, consumidos por
            uma aplicação Node.js e gravados no PostgreSQL. Cada rota abaixo pode ser
            executada direto nesta página.
          </p>

          <div class="meta">
            <span><span class="meta-key">Base URL</span>${esc(baseUrl)}</span>
            <span class="status" id="status" data-state="checking">
              <span class="status-dot"></span>
              <span id="status-text">verificando…</span>
            </span>
            <a href="${esc(specUrl)}">Especificação OpenAPI</a>
            <a href="/health">Health check</a>
          </div>
        </header>

        <section class="section" id="fluxo">
          <h2 class="label">Fluxo</h2>
          <div class="flow">${flowChain}</div>
          <div class="flow-grid">${flowCells}
          </div>
        </section>

        <section class="section" id="como-rodar">
          <h2 class="label">Como rodar</h2>
          <div class="steps">${steps}
          </div>
          <p class="note">
            O total do item (<code>unit_price × quantity</code>) e o total do pedido não são
            gravados no banco — são calculados em cada consulta. A coluna
            <code>pedido.indexed_at</code> guarda quando a mensagem foi persistida.
          </p>
        </section>

        <section class="section" id="endpoints">
          <h2 class="label">Endpoints</h2>
          <div class="endpoints">${endpoints}
          </div>
        </section>

        ${messageSection()}

        <section class="section" id="modelos">
          <h2 class="label">Modelos</h2>
          <div class="models">${models}
          </div>
        </section>

        <footer>
          <span>Mensageria de Pedidos · DSM FATEC</span>
          <span>
            <a href="${esc(specUrl)}">openapi.json</a> ·
            <a href="/health">GET /health</a>
          </span>
        </footer>
      </main>
    </div>

    <script>${clientScript(baseUrl)}</script>
  </body>
</html>
`;
}
