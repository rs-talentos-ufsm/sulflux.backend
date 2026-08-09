# 🌐 Dicionário Técnico de Cabeçalhos HTTP (Response Headers)

Este documento mapeia detalhadamente cada cabeçalho de resposta HTTP retornado projeto, explicando o funcionamento individual, impacto arquitetural e as regras de segurança aplicadas.

---

## 🛡️ 1. Segurança e Proteção do Navegador (Configurados via Helmet)

### `content-security-policy` (CSP)

- **Valor:** `default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests`
- **Como funciona:** Restringe quais recursos (scripts, imagens, fontes) o navegador tem permissão para carregar e de onde.
- `default-src 'self'`: Por padrão, só permite recursos do próprio domínio da API.
- `object-src 'none'`: Bloqueia plugins obsoletos e perigosos (como Flash).
- `script-src 'self'`: Proíbe a execução de scripts externos ou inline não autorizados, mitigando ataques de **XSS (Cross-Site Scripting)**.
- `upgrade-insecure-requests`: Força o navegador a converter requisições HTTP locais para HTTPS antes de disparar.

### `strict-transport-security` (HSTS)

- **Valor:** `max-age=31536000; includeSubDomains`
- **Como funciona:** Garante segurança em nível de transporte. Ele diz ao navegador: _"Durante o próximo 1 ano (`31536000` segundos), você está proibido de se comunicar com este domínio e seus subdomínios via HTTP tradicional. Use estritamente HTTPS"_. Isso impede ataques de interceptação como o _Man-in-the-Middle (MITM)_ e _SSL Stripping_.

### `x-frame-options`

- **Valor:** `SAMEORIGIN`
- **Como funciona:** Protege a aplicação contra ataques de **Clickjacking**. Ele dita se a sua página/API pode ser renderizada dentro de uma tag HTML `<iframe>`, `<frame>` ou `<object>`. O valor `SAMEORIGIN` permite que apenas páginas do seu próprio domínio embutam o recurso.

### `x-content-type-options`

- **Valor:** `nosniff`
- **Como funciona:** Desativa o "MIME type sniffing" do navegador. Impede que o navegador tente adivinhar e executar um arquivo com o formato diferente do declarado pelo servidor. Se a API responde que o arquivo é `text/plain`, o navegador é obrigado a tratá-lo como texto puro, bloqueando tentativas de mascarar scripts maliciosos em uploads de imagens (.jpg contendo código executável, por exemplo).

### `x-xss-protection`

- **Valor:** `0`
- **Como funciona:** Desativa o filtro de XSS nativo e antigo do navegador. Filtros antigos continham vulnerabilidades severas de segurança e causavam falsos positivos. Atualmente, o mercado padroniza o valor `0` para anular o filtro legado e delega 100% da proteção de XSS para o cabeçalho moderno `content-security-policy` (CSP).

### `referrer-policy`

- **Valor:** `no-referrer`
- **Como funciona:** Controla quanta informação de origem (URL de onde o usuário veio) é enviada junto no cabeçalho `Referer` quando ele clica em um link que sai da sua aplicação. O valor `no-referrer` remove completamente a URL de origem, protegendo dados confidenciais contidos em query strings de vazarem para APIs de terceiros.

### `x-dns-prefetch-control`

- **Valor:** `off`
- **Como funciona:** Controla o recurso de pré-busca de DNS (DNS Prefetching) do navegador. Ao definir como `off`, o navegador não tenta resolver os endereços IP dos links externos contidos na resposta antes que o usuário clique neles. Desativar isso melhora a privacidade do usuário e reduz tráfego desnecessário.

### `x-download-options`

- **Valor:** `noopen`
- **Como funciona:** Específico para versões do Internet Explorer (IE8+). Ele impede que o navegador execute diretamente arquivos HTML baixados da sua API no contexto de segurança do seu site. O navegador é forçado a apenas salvar o arquivo localmente, anulando injeções de scripts maliciosos via download.

### `x-permitted-cross-domain-policies`

- **Valor:** `none`
- **Como funciona:** Diz para plugins como Adobe Flash Player e Adobe Reader que eles não têm permissão para carregar nenhum dado da sua API através de arquivos de política entre domínios (como `crossdomain.xml`), blindando dados contra exploits dessas ferramentas.

---

## 🌐 2. Mecanismos de Isolamento e Isolamento de Origem (Cross-Origin)

### `access-control-allow-origin`

- **Valor:** `http://localhost:5000`
- **Como funciona:** Parte central da especificação **CORS**. Declara explicitamente para o navegador qual origem externa (neste caso, o seu frontend rodando localmente) tem permissão jurídica para ler a resposta desta requisição.

### `access-control-allow-credentials`

- **Valor:** `true`
- **Como funciona:** Informa ao navegador que a resposta da requisição pode ser exposta ao frontend quando a requisição original incluir credenciais (Cookies, cabeçalhos de autenticação Authorization ou certificados TLS locais). Sem esse header como `true`, o navegador bloqueia a leitura de cookies compartilhados.

### `vary`

- **Valor:** `Origin`
- **Como funciona:** Orienta servidores de cache intermediários (como CDNs). Ele avisa: _"A resposta deste endpoint muda dinamicamente dependendo do cabeçalho `Origin` enviado pelo cliente"_. Isso impede que uma resposta CORS autorizada para o `localhost:5000` seja entregue por engano em cache para uma requisição vinda de um domínio malicioso.

### `cross-origin-opener-policy` (COOP)

- **Valor:** `same-origin`
- **Como funciona:** Isola o contexto de execução da sua aba. Se um site externo abrir a sua aplicação usando `window.open()`, o valor `same-origin` quebra a referência de navegação do objeto `window.opener`. Isso impede ataques de roubo de sessão conhecidos como _Cross-Origin Window PostMessage Exploits_.

### `cross-origin-resource-policy` (CORP)

- **Valor:** `same-origin`
- **Como funciona:** Diz ao navegador para bloquear requisições de outros domínios que tentem carregar recursos estáticos (como imagens, scripts ou fontes) diretamente da sua API. Evita ataques de leitura paralela de hardware (como _Spectre_ e _Meltdown_ adaptados para web).

### `origin-agent-cluster`

- **Valor:** `?1`
- **Como funciona:** Solicita explicitamente ao navegador que coloque a origem da aplicação em um processo de execução isolado (cluster dedicado de threads do sistema operacional). Melhora a estabilidade da página e adiciona barreiras físicas de memória contra ataques de vazamento de dados entre abas.

---

## 🚦 3. Controle de Tráfego (Rate Limit)

### `ratelimit-limit`

- **Valor:** `100`
- **Como funciona:** Informa o limite máximo de requisições permitidas dentro da janela de tempo definida pela política de segurança da API.

### `ratelimit-policy`

- **Valor:** `100;w=900`
- **Como funciona:** Define formalmente os parâmetros da política. O valor expressa que o limite é de `100` requisições por janela (`w`) de `900` segundos (15 minutos).

### `ratelimit-remaining`

- **Valor:** `94`
- **Como funciona:** Um contador regressivo dinâmico. Indica quantas requisições o cliente atual ainda pode fazer antes de ser bloqueado com um erro `429 Too Many Requests`.

### `ratelimit-reset`

- **Valor:** `893`
- **Como funciona:** O tempo restante em segundos (`893` segundos) para que a janela atual de rate-limit expire e o contador do cliente seja resetado de volta para 100.

---

## ⚡ 4. Otimização, Conexão e Cache

### `connection`

- **Valor:** `keep-alive`
- **Como funciona:** Controla a persistência da conexão TCP de rede. O valor `keep-alive` diz ao cliente que a conexão não deve ser fechada após a entrega desta resposta. Isso permite que múltiplas requisições sequenciais reutilizem o mesmo canal aberto, economizando o tempo de handshake TLS/TCP.

### `keep-alive`

- **Valor:** `timeout=5`
- **Como funciona:** Define as regras de tolerância para a conexão persistente. Informa que o servidor manterá o canal aberto por até `5` segundos de inatividade antes de fechar a conexão à força.

### `etag`

- **Valor:** `W/"15a-KyUvStjeUX3ee1knfMorHJmGRkA"`
- **Como funciona:** Um identificador único em formato de hash (Entity Tag) que representa o estado exato do corpo da resposta. Se o frontend fizer uma nova requisição enviando esse hash no cabeçalho `If-None-Match` e os dados no banco não tiverem mudado, o servidor poupa banda respondendo um código vazio `304 Not Modified`.
  _(O prefixo `W/` indica "Weak validation", significando que a resposta é semanticamente idêntica, mesmo que byte a byte haja diferenças imperceptíveis)._

### `content-length`

- **Valor:** `346`
- **Como funciona:** Indica o tamanho exato do corpo da resposta expresso em bytes. Ajuda o cliente a validar se o arquivo ou JSON foi baixado por completo sem corrupção de dados.

---

## 📦 5. Informações Gerais de Conteúdo

### `content-type`

- **Valor:** `application/json; charset=utf-8`
- **Como funciona:** Especifica o formato de mídia do recurso retornado. Informa que o corpo é um objeto estruturado em **JSON** e codificado sob o mapeamento de caracteres internacional **UTF-8** (garantindo a renderização correta de acentos e caracteres especiais).

### `date`

- **Valor:** `Tue, 19 May 2026 01:03:16 GMT`
- **Como funciona:** Carimba a data e a hora exata em que a resposta foi gerada pelo servidor de backend, usando estritamente o fuso horário padrão mundial Greenwich Mean Time (GMT).

---
