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

- **Recepção:** preencha telefone com DDD, nome, modelo, placa, serviço e valor cobrado. Os serviços contêm apenas nomes; informe livremente o valor em reais, com até duas casas decimais e maior que zero. Clientes existentes são reconhecidos pelo número normalizado; os campos continuam editáveis. O sistema impede uma entrada duplicada da mesma placa.
- **Pátio:** clique em um cartão para iniciar lavagem, marcar como pronto e finalizar o atendimento. O cadastro lança o serviço e o valor no caixa do dia. Finalizar retira o veículo do pátio. Veículos cadastrados antes dessa mudança, sem lançamento vinculado, continuam sendo lançados ao finalizar.
- **Caixa:** selecione a data, informe descrição, tipo e valor (ex.: `210,50` ou `1.234,56`). A data também seleciona o fechamento exibido. Os totais são do dia escolhido. Cada saldo começa em zero e acumula as transações daquele dia ordenadas por momento de criação. Não há transferência automática de saldo entre dias.

## Persistência

O `localStorage` utiliza a chave `wr-lava-rapido:v2`. Um documento na versão 2 contém `clients`, `vehicles` e `transactions`, gravados juntos. Valores monetários são inteiros em centavos. Cada veículo salva seu próprio `amount`; o cadastro lança exatamente esse valor no caixa. O estado React só muda após uma gravação bem-sucedida, por meio de `useSyncExternalStore`; eventos `storage` atualizam outras abas. O estado mais recente é relido antes de cada alteração. Como qualquer implementação com localStorage, gravações exatamente simultâneas entre abas não são transações de banco de dados: o último documento gravado prevalece.

Dados inválidos não são sobrescritos automaticamente. Armazenamento bloqueado ou cheio produz mensagem de erro, sem anunciar sucesso. Os registros sobrevivem a F5 no mesmo navegador e origem; não sincronizam entre dispositivos. Limpar dados do navegador remove os registros. A aplicação não exige conexão após os arquivos estáticos serem carregados, mas não inclui um service worker para recarga offline.

Na primeira execução, o sistema começa vazio: sem clientes, veículos ou transações, com todos os totais do caixa em R$ 0,00. Nenhum exemplo é inserido automaticamente. Os registros feitos pelo operador são mantidos após atualizar ou reabrir a página.

Esta versão utiliza uma nova chave (`wr-lava-rapido:v2`) para começar limpa também nos navegadores que carregaram a demonstração anterior. A chave antiga (`wr-lava-rapido:v1`) permanece intacta, mas não é utilizada; eventuais registros anteriores não são importados automaticamente.

## Fechamentos diário e mensal e backup

No Caixa, **Imprimir Fechamento do Dia** primeiro aciona o download de um backup JSON completo e atualizado (clientes, veículos e transações de todas as datas) e depois abre a impressão nativa com a data de hoje, totais de entradas e saídas, saldo final e transações de hoje. O relatório sempre usa o dia atual, independentemente do dia selecionado no formulário. Selecione **Salvar como PDF** no diálogo do navegador para guardar o documento. A impressão oculta menus, formulários e botões e usa fundo branco em formato A4. Imprimir não apaga registros nem bloqueia novos lançamentos.

O backup e o relatório diário usam a mesma leitura dos dados mais recentes do localStorage. Se houver erro ao ler os dados ou gerar o arquivo, a impressão não é aberta e uma mensagem é exibida. O navegador controla a conclusão do download e pode solicitar o local de gravação; confira o arquivo baixado. Cancelar a impressão não desfaz o download. A rotina automática está vinculada ao botão de fechamento diário; o atalho de impressão do navegador não executa o backup.

Na área mensal do Caixa, selecione **Mês / Ano do Relatório** para consultar todas as movimentações do período, totais de entradas e saídas e saldo líquido mensal. O saldo mensal começa em zero e considera apenas o mês e o ano selecionados. As linhas são ordenadas pela data da movimentação e, dentro de cada dia, pelo momento de criação. **Imprimir Fechamento do Mês** imprime esse período sem download automático; **Imprimir Fechamento do Dia** continua imprimindo somente hoje. Ambos utilizam o mesmo documento A4 com datas completas nas linhas, cabeçalho da tabela repetido nas páginas seguintes e totais. A impressão não altera o caixa.

No rodapé das duas telas, **Exportar Backup** baixa um JSON com todo o banco desta aplicação: clientes, veículos com seus valores e transações de todas as datas. Guarde cópias regularmente fora do navegador. **Importar Backup** valida o formato, a versão, os valores, as datas e a ausência de registros duplicados antes de pedir confirmação para substituir os dados atuais. A importação substitui o banco completo; não mescla os registros. Arquivos inválidos e cancelamentos preservam os dados atuais. Falhas ao gravar não são anunciadas como sucesso. Um backup válido também permite recuperar um armazenamento corrompido. Os backups são arquivos JSON sem criptografia.

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
