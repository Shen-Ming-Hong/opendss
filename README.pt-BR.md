# Bancada OpenDSS na nuvem (OpenDSS Cloud Workbench)

[繁體中文](README.md) | [简体中文](README.zh-CN.md) | [English](README.en.md) | [日本語](README.ja.md) | [한국어](README.ko.md) | [Español](README.es.md) | [Português (Brasil)](README.pt-BR.md)

Site oficial: https://opendss.esperar-ai.org

Interface web que mantém os menus nativos do OpenDSS e o fluxo de trabalho com scripts. Usa uma versão WASM do EPRI OpenDSS (a versão oficial em C++, VersionC) e faz os cálculos no Cloudflare Workers. O site é público e não exige login.

## Uso

Abra um arquivo `.dss` com os arquivos que ele referencia, ou uma pasta de modelo inteira; escolha o script principal e compile. Você pode executar um fluxo de potência (Snapshot) ou um estudo de curto-circuito (FaultStudy), ou usar «Conforme o script» para rodar modos como Daily ou Harmonics. Veja as tensões nas barras (Bus Voltages), as correntes e potências dos elementos no terminal 1 e as correntes de curto-circuito (Fault Currents), e exporte relatórios em CSV, JSON ou texto de Show/Export.

A aba «Plotar» oferece um gráfico de tensões nas barras, um diagrama do circuito (Plot Circuit, requer Buscoords), um perfil de tensão (Plot Profile, requer um EnergyMeter) e curvas (Plot Monitor, pode plotar qualquer relatório CSV).

Cada operação recompila o script principal e depois aplica os comandos adicionais. Para gerar um relatório de texto depois de modificar elementos, digite em ordem `Edit …`, `Solve`, `Show …`. O botão Resolver resolve no modo selecionado depois que os comandos adicionais forem executados.

Os rascunhos ficam salvos no navegador atual e não são sincronizados entre dispositivos. Salve com «Arquivo → Baixar projeto completo» e abra o `.opendss.json` em outro dispositivo. O modelo só é enviado para a nuvem ao compilar ou resolver, e nunca é gravado em armazenamento permanente.

Os caminhos do modelo devem ser relativos. Cada execução aceita até 100 arquivos e 2 MB; a saída é limitada a 2.000 barras e 5.000 elementos. Cálculos grandes ou demorados continuam sujeitos aos limites de CPU e memória do Worker. Não há suporte a DLLs nativas, COM, comandos externos do sistema nem Actors em paralelo. A compatibilidade completa com todos os recursos nativos ainda não foi verificada.

## Idiomas da interface

A interface oferece 7 idiomas: 繁體中文, 简体中文, English, 日本語, 한국어, Español e Português (Brasil). Por padrão, segue o idioma do navegador (configurações de Taiwan, Hong Kong e chinês tradicional mostram chinês tradicional; outras configurações de chinês mostram chinês simplificado; sem idioma correspondente, usa-se o inglês). É possível trocar no canto superior direito da barra de título, e a escolha fica salva no navegador. Nas interfaces que não estão em inglês, os termos técnicos vêm acompanhados do inglês (por exemplo «Tensões nas barras Bus Voltages»); comandos do OpenDSS, nomes de elementos e o conteúdo dos relatórios permanecem em inglês.

Os dicionários de textos ficam em [lib/i18n.ts](lib/i18n.ts) e [lib/locales/](lib/locales/): o código é escrito com o texto original em chinês tradicional dentro de `t()`, e cada dicionário usa esse texto original como chave. As mensagens de erro do servidor também são traduzidas ali. Para adicionar um idioma, inclua uma entrada em `languages`, um dicionário em `lib/locales/` e atualize `detectLang` e `legacyEncoding`. Os idiomas além do chinês tradicional e do inglês foram traduzidos pelo Claude e ainda não foram revisados por falantes nativos; sugestões de terminologia são bem-vindas.

Este README também está disponível nos idiomas listados no topo. A versão em chinês tradicional é a de referência.

## Desenvolvimento local

```sh
npm ci
npm run dev -- --host 127.0.0.1
npx tsc --noEmit
python scripts/check-engine.py   # requer o servidor dev em execução
node engine/port/test/run.mjs    # verifica o WASM diretamente: fonte 500.21 kW, curto-circuito na ponta da carga 22,902.3 A
npx tsx scripts/check-i18n.ts     # completude dos dicionários de cada idioma
node scripts/visual-check.mjs    # requer o servidor dev em execução: testes de interação e capturas em desktop/notebook/tablet/celular (inclui gráficos e troca para inglês)
npm run build
```

Todas as verificações rodam localmente (ou em um ambiente de desenvolvimento na nuvem); o GitHub Actions só faz o deploy.

A página inicial e a API de cálculo podem ser usadas anonimamente. Cada requisição executa o modelo em sua própria instância WASM; a API mantém a verificação de mesma origem e a validação de caminhos e tamanhos de arquivo, e não armazena tabelas de usuários nem arquivos de modelo.

A origem do WASM, como recompilá-lo, os avisos de licença e a validação numérica estão em [engine/port/README.md](engine/port/README.md).

## Deploy

A cada push para `main`, `.github/workflows/deploy.yml` compila o site e o publica com `wrangler deploy` como o Cloudflare Worker `opendss` (o nome é definido em `vite.config.ts`), vinculado a `opendss.esperar-ai.org` por um domínio personalizado do Workers. Mudanças apenas na documentação ou em `.claude/` não disparam deploy; o workflow também pode ser executado manualmente na página de Actions.

Secrets do repositório necessários: `CLOUDFLARE_API_TOKEN` (um token de API criado com o modelo «Edit Cloudflare Workers» da Cloudflare) e `CLOUDFLARE_ACCOUNT_ID`.

## Licença

O motor OpenDSS é © Electric Power Research Institute, Inc., sob a licença BSD-3; o texto completo está em [engine/port/OPENDSS_LICENSE.txt](engine/port/OPENDSS_LICENSE.txt). Componentes de matrizes esparsas como o KLU são LGPL 2.1; veja [engine/port/licenses/](engine/port/licenses/). Este site é uma adaptação experimental e não é uma versão certificada nem suportada pela EPRI.
