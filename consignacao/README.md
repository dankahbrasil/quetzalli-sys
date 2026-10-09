# Consignação de Eventos – formulário de solicitação

Mesma lógica da planilha **[Quetzalli] Parceria de Permuta**: formulário web → uma linha por solicitação
(com o `Payload` em JSON) → análise de crédito → minuta em PDF → assinada → retirada → devolução/acerto.

## Arquivos
- `Code.gs` – web app, validação no servidor, gravação na planilha, minuta em PDF, menu e alerta de vencimentos.
- `Form.html` – formulário (mobile first, claro/escuro).

## Instalação
1. Crie a planilha **[Quetzalli] Consignação de Eventos** → Extensões → Apps Script.
2. Cole `Code.gs` e crie um arquivo HTML chamado `Form` com o conteúdo de `Form.html`.
3. Em Configurações do projeto → Propriedades do script, defina:
   - `ADMIN_EMAIL` – quem recebe os avisos;
   - `TEMPLATE_DOC_ID` – Google Doc com o Termo (placeholders abaixo);
   - `PDF_FOLDER_ID` – pasta do Drive onde ficam os PDFs.
4. Rode `setup()` (cria a aba e a lista de status) e, no menu **Quetzalli**, instale a verificação diária.
5. Implantar → Nova implantação → App da Web → executar como você, acesso: qualquer pessoa. Envie o link às empresas.

## Fluxo de status
`solicitada` → `em análise` → `minuta enviada` → `assinada e enviada` → `mercadoria entregue` →
`devolvida` | `acertada` | `vencida` → `inadimplente` (ou `recusada`).

Menu **Quetzalli**: gerar minuta (pede o limite aprovado e envia o PDF por e-mail), marcar assinada,
registrar retirada, registrar devolução/acerto.

## Regras embutidas
- Preços sempre do catálogo do servidor (`CFG.CATALOGO`); o navegador só envia SKU e quantidade.
- Vencimento = data de retirada + 15 dias. Retirada não pode ser no passado nem depois do evento.
- Acima de `MAX_VALOR_SOLICITACAO` o aviso ao admin pede análise manual.
- CNPJ e CPFs validados; ao menos um sócio/avalista e uma garantia; todas as declarações são obrigatórias.
- `verificarVencimentos` (diário, 08h): avisa 2 dias antes e no dia, e marca `vencida` no dia seguinte (cobrar o valor integral, Cláusula 4.4).

## Placeholders do Termo (Google Doc)
`{{referencia}} {{nome}} {{documento}} {{qualificacao_representante}} {{endereco}} {{email}} {{telefone}}
{{evento_nome}} {{evento_data}} {{evento_horario}} {{evento_local}} {{retirada}} {{retirada_local}}
{{responsavel_retirada}} {{produtos}} {{valor_total}} {{limite_aprovado}} {{vencimento}} {{garantias}}
{{socios_avalistas}} {{data_extenso}}`

## Fiscal e cobrança (manual)
- Nota de **remessa para demonstração** na saída (colunas `NF remessa demonstração nº` / `NF retorno nº`), nota de **venda** após a apuração (`NF venda nº`).
  Confirmar CFOP, prazo e ICMS com o contador.
- Boleto do valor total com vencimento em 15 dias (coluna `Boleto nº`); na devolução, cancelar e emitir novo pelo apurado.

## Pendências
- Confirmar os preços de consignação em `CFG.CATALOGO` (usei os valores unitários da planilha de permuta).
- Conferir `LOCAIS_RETIRADA` e `MAX_VALOR_SOLICITACAO`.
