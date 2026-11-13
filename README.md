# WR Lava Rápido — Estética Automotiva

SPA em React + TypeScript, Tailwind CSS 4, Vite e Lucide React. Sem backend. Fontes Barlow e Chakra Petch incluídas localmente.

## Executar

Requer Node.js 20.19+ ou 22.12+ e npm.

```sh
npm install
npm run dev
```

Abra a URL informada pelo Vite. Para validar e compilar:

```sh
npm test
npm run build
npm run preview
```

O diretório `dist/` é a versão estática de produção. Configure o servidor estático para retornar `index.html` nas rotas da SPA, inclusive `/caixa`.

## Uso

- **Recepção:** preencha telefone com DDD, nome, modelo, placa, serviço e valor cobrado. Os serviços contêm apenas nomes; informe livremente o valor em reais, com até duas casas decimais e maior que zero. Clientes existentes são reconhecidos pela placa ou pelo telefone; os campos continuam editáveis. O Dashboard mostra o total de clientes e serviços finalizados. Na lista de clientes, abra o perfil para ver as visitas e o histórico por placa. O sistema impede uma entrada duplicada da mesma placa.
- **Pátio:** abra o atendimento, inicie a lavagem e marque o serviço como finalizado. O WhatsApp abre em outra aba com o aviso de retirada preenchido; o envio depende de conexão e de ação do operador. No fechamento, selecione Dinheiro, PIX, Crédito ou Débito. O pagamento entra no caixa, e Crédito e Débito descontam 3%, arredondados para centavos. Lançamentos feitos pela versão anterior são reaproveitados na data original.
- **Caixa:** selecione a data, informe descrição, tipo e valor (ex.: `210,50` ou `1.234,56`). A data também seleciona o fechamento exibido. Os totais são do dia escolhido. Cada saldo começa em zero e acumula as transações daquele dia ordenadas por momento de criação. Não há transferência automática de saldo entre dias.

- **Despesas recorrentes:** cadastre no Caixa a descrição, o valor e o dia do vencimento (1 a 31). Ao abrir o sistema a partir desse dia, a saída entra no caixa da data atual uma única vez por mês e ano. Se o dia não existir no mês, não há lançamento naquele mês. Remover uma despesa impede novos lançamentos e preserva os anteriores.

## Persistência

O `localStorage` utiliza a chave `wr-lava-rapido:v2`. Um documento na versão 2 contém `clients`, `vehicles`, `transactions` e o histórico de serviços fechados, gravados juntos. Valores monetários são inteiros em centavos. Despesas fixas ficam em `wr-lava-rapido:recurring_expenses` e as confirmações mensais em `processed_recurring_logs`. O estado React só muda após uma gravação bem-sucedida, por meio de `useSyncExternalStore`; eventos `storage` atualizam outras abas. O estado mais recente é relido antes de cada alteração. Como qualquer implementação com localStorage, gravações exatamente simultâneas entre abas não são transações de banco de dados: o último documento gravado prevalece.

Dados inválidos não são sobrescritos automaticamente. Armazenamento bloqueado ou cheio produz mensagem de erro, sem anunciar sucesso. Os registros sobrevivem a F5 no mesmo navegador e origem; não sincronizam entre dispositivos. Limpar dados do navegador remove os registros. Em produção (HTTPS ou localhost), o primeiro acesso instala um service worker que guarda apenas os arquivos estáticos. Após essa preparação, Recepção e Caixa podem ser abertas e recarregadas sem rede. Todos os dados do sistema ficam exclusivamente no localStorage.

Na primeira execução, o sistema começa vazio: sem clientes, veículos ou transações, com todos os totais do caixa em R$ 0,00. Nenhum exemplo é inserido automaticamente. Os registros feitos pelo operador são mantidos após atualizar ou reabrir a página.

Esta versão utiliza uma nova chave (`wr-lava-rapido:v2`) para começar limpa também nos navegadores que carregaram a demonstração anterior. A chave antiga (`wr-lava-rapido:v1`) permanece intacta, mas não é utilizada; eventuais registros anteriores não são importados automaticamente.

## Fechamentos diário e mensal e backup

No Caixa, **Imprimir Fechamento do Dia** primeiro aciona o download de um backup JSON completo e atualizado (clientes, veículos e transações de todas as datas) e depois abre a impressão nativa com a data de hoje, totais de entradas e saídas, saldo final e transações de hoje. O relatório sempre usa o dia atual, independentemente do dia selecionado no formulário. Selecione **Salvar como PDF** no diálogo do navegador para guardar o documento. A impressão oculta menus, formulários e botões e usa fundo branco em formato A4. Imprimir não apaga registros nem bloqueia novos lançamentos.

O backup e o relatório diário usam os dados mais recentes do localStorage. Os fechamentos mostram entradas brutas, taxa de maquininha, entradas líquidas, saídas e saldo líquido. Se houver erro ao ler os dados ou gerar o arquivo, a impressão não é aberta e uma mensagem é exibida. O navegador controla a conclusão do download e pode solicitar o local de gravação; confira o arquivo baixado. Cancelar a impressão não desfaz o download. A rotina automática está vinculada ao botão de fechamento diário; o atalho de impressão do navegador não executa o backup.

Na área mensal do Caixa, selecione **Mês / Ano do Relatório** para consultar todas as movimentações do período, totais de entradas e saídas e saldo líquido mensal. O saldo mensal começa em zero e considera apenas o mês e o ano selecionados. As linhas são ordenadas pela data da movimentação e, dentro de cada dia, pelo momento de criação. **Imprimir Fechamento do Mês** imprime esse período sem download automático; **Imprimir Fechamento do Dia** continua imprimindo somente hoje. Ambos utilizam o mesmo documento A4 com datas completas nas linhas, cabeçalho da tabela repetido nas páginas seguintes e totais. A impressão não altera o caixa.

Em **Configurações / Segurança**, **Exportar Backup** baixa `backup-wr-lavarapido-data.json` com todas as chaves do localStorage da origem, incluindo despesas e confirmações mensais. Guarde cópias regularmente fora do navegador. **Importar Backup** valida o formato, a versão, os valores, as datas e a ausência de registros duplicados antes de pedir confirmação para substituir os dados atuais. A importação substitui todo o localStorage da origem, sem mesclar. Backups antigos na versão 2 também são aceitos. Arquivos inválidos e cancelamentos preservam os dados atuais. Falhas ao gravar não são anunciadas como sucesso. Um backup válido também permite recuperar um armazenamento corrompido. Os backups são arquivos JSON sem criptografia.

## Organização

`src/pages/`: Recepção e Caixa. `src/components/`: layout, cartões e diálogo de atendimento. `src/lib/business.ts`: regras puras. `src/lib/store.ts`: persistência e sincronização. `src/lib/format.ts`: telefones, datas e valores. `tests/business.test.ts`: testes das regras críticas.

## Reprodução visual

Paleta, sidebar, formulário, cartões com placas e tabela seguem as imagens fornecidas. A logo original é exibida por recorte CSS do arquivo de referência, preservando a marca sem redesenhá-la. O arquivo completo da referência está em `public/brand-reference.png`; pode ser substituído por uma logo independente ajustando o componente e o CSS. A barra do navegador, o Dock do macOS e o selo da ferramenta de criação presentes nos prints não integram a aplicação.

Configuração de Tailwind baseada na [documentação oficial para Vite](https://tailwindcss.com/docs/installation/using-vite). Assinatura do armazenamento React baseada em [useSyncExternalStore](https://react.dev/reference/react/useSyncExternalStore).

## Verificação

Execute `npm test` para verificar inicialização vazia, histórico de clientes, validação de valores, saldos por data e recebimento único com o valor personalizado persistido. Execute `npm run build` para validar os tipos e gerar a versão de produção.

Verificação adicional: seleção e totais mensais, impressão diária e mensal, responsividade em 320, 390, 768 e 1440 px, exportação do arquivo JSON, importação válida e inválida, cancelamento da restauração, persistência após recarga e CSS de impressão exercitados no Chromium.

Rotina automática verificada no Chromium: download antes de `window.print()`, conteúdo completo e atualizado do JSON, relatório coerente com o backup, bloqueio da impressão em falha de geração e restauração integral após recarga.
# wr-lavarapido
