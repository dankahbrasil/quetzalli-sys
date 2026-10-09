/**
 * [Quetzalli] Consignação de Eventos
 *
 * Apps Script vinculado à planilha "[Quetzalli] Consignação de Eventos".
 * Fluxo (mesma lógica da planilha "[Quetzalli] Parceria de Permuta"):
 *   formulário web -> linha na planilha (payload JSON) -> análise de crédito
 *   -> minuta em PDF -> assinada -> retirada -> devolução / acerto.
 *
 * Instalação: ver README.md desta pasta.
 */

const CFG = {
  ABA: 'Consignações',
  PRAZO_DIAS: 15,                 // Cláusula 4.1 do Termo
  MAX_UNIDADES_POR_SKU: 24,
  MAX_VALOR_SOLICITACAO: 10000,   // R$ no preço de consignação; acima disso exige análise manual
  LOCAIS_RETIRADA: [
    'Av. Angélica, nº 2.503, cj. 46, Consolação, São Paulo/SP, CEP 01227-200',
    'Rua Madalena Diléo, nº 207, Galpão 1, Condomínio Empresarial São Luiz, Chácaras São Luís, Santana de Parnaíba/SP, CEP 06504-008'
  ],
  // Preço de CONSIGNAÇÃO por unidade (Anexo I do Termo). Confirmar valores antes de publicar.
  CATALOGO: [
    { sku: 'PRD-QTZ-RTD-00750-001', sabor: 'maracujá', descricao: 'Quetzalli Drink – Tequila com Maracujá – Drink Pronto',        volume: '750 ml', teor: '17% vol.', valor_unitario: 89.9 },
    { sku: 'PRD-QTZ-RTD-00750-101', sabor: 'caju',     descricao: 'Quetzalli Drink – Vodka com Caju e Acerola – Drink Pronto',     volume: '750 ml', teor: '15% vol.', valor_unitario: 75.3 },
    { sku: 'PRD-QTZ-RTD-00750-201', sabor: 'morango',  descricao: 'Quetzalli Drink – Gin com Morango e Graviola – Drink Pronto',    volume: '750 ml', teor: '15% vol.', valor_unitario: 74.9 },
    { sku: 'PRD-QTZ-RTD-00750-301', sabor: 'cambuci',  descricao: 'Quetzalli Drink – Cachaça com Cambuci e Abacaxi – Drink Pronto', volume: '750 ml', teor: '15% vol.', valor_unitario: 79.9 }
  ],
  GARANTIAS: [
    'Nota promissória com aval dos sócios',
    'Fiança / aval pessoal dos sócios',
    'Pré-autorização em cartão de crédito / caução',
    'Seguro-crédito / seguro-garantia',
    'Apólice de seguro do evento incluindo as mercadorias'
  ]
};

const COLUNAS = ['Referência', 'Recebido em', 'Status', 'Tipo', 'Nome', 'Documento', 'E-mail', 'Telefone',
  'Perfil', 'Evento', 'Data evento', 'Retirada', 'Valor total (R$)', 'Vencimento (retirada + 15d)',
  'PDF', 'Payload', 'PDF assinado', 'Limite aprovado (R$)', 'Boleto nº',
  'NF remessa demonstração nº', 'NF retorno nº', 'NF venda nº', 'Observações internas'];
const COL = COLUNAS.reduce((m, n, i) => (m[n] = i + 1, m), {});

const STATUS = ['solicitada', 'em análise', 'recusada', 'minuta enviada', 'assinada e enviada',
  'mercadoria entregue', 'vencida', 'devolvida', 'acertada', 'inadimplente'];

/* ------------------------------------------------------------------ */
/* Web app                                                             */
/* ------------------------------------------------------------------ */

function doGet() {
  return HtmlService.createHtmlOutputFromFile('Form')
    .setTitle('Quetzalli · Solicitação de Consignação')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

function getConfig() {
  return {
    catalogo: CFG.CATALOGO,
    garantias: CFG.GARANTIAS,
    locaisRetirada: CFG.LOCAIS_RETIRADA,
    prazoDias: CFG.PRAZO_DIAS,
    maxPorSku: CFG.MAX_UNIDADES_POR_SKU
  };
}

/** Recebe o payload do formulário. Nunca confia em preços ou totais enviados pelo navegador. */
function submitSolicitacao(p) {
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    if (p.website) throw new Error('Solicitação inválida.');            // honeypot anti-spam
    const erros = validar_(p);
    if (erros.length) throw new Error(erros.join(' '));

    const sh = aba_();
    const ref = novaReferencia_(sh);
    const agora = new Date();
    const produtos = montarProdutos_(p.produtos);
    const total = produtos.reduce((s, x) => s + x.subtotal, 0);
    const vencimento = somarDias_(p.retirada.data, CFG.PRAZO_DIAS);
    const pj = p.tipo_pessoa === 'PJ';

    const payload = {
      referencia: ref,
      tipo_pessoa: p.tipo_pessoa,
      data_solicitacao: Utilities.formatDate(agora, 'America/Sao_Paulo', 'yyyy-MM-dd'),
      contratante: contratante_(p, pj),
      socios_avalistas: p.socios.map(s => ({ nome: txt_(s.nome), cpf: txt_(s.cpf), email: txt_(s.email), telefone: txt_(s.telefone) })),
      referencias_comerciais: txt_(p.referencias_comerciais),
      evento: {
        nome: txt_(p.evento.nome), data: br_(p.evento.data), horario: txt_(p.evento.horario),
        local: txt_(p.evento.local), endereco: txt_(p.evento.endereco),
        publico: txt_(p.evento.publico) + ' pessoas (estimado)', controle_acesso: txt_(p.evento.controle_acesso),
        contratante_do_evento: txt_(p.evento.contratante)
      },
      divulgacao: { perfil: txt_(p.perfil) },
      retirada: {
        data: br_(p.retirada.data), horario: txt_(p.retirada.horario),
        local: txt_(p.retirada.local), responsavel: txt_(p.retirada.responsavel), observacoes: txt_(p.retirada.observacoes)
      },
      produtos: produtos,
      totais: { valor_total: total, vencimento: br_(vencimento), prazo_dias: CFG.PRAZO_DIAS },
      garantias: (p.garantias || []).filter(g => CFG.GARANTIAS.indexOf(g) >= 0),
      declaracoes: {
        maiores_18: true, advertencias: true, prazo_15_dias: true, cobranca_integral: true,
        devolucao_por_conta: true, risco_perda: true, consulta_credito: true, lgpd: true, veracidade: true,
        aceite_em: agora.toISOString()
      },
      analise_manual: total > CFG.MAX_VALOR_SOLICITACAO,
      data_extenso: dataExtenso_(agora)
    };

    const linha = [];
    linha[COL['Referência'] - 1] = ref;
    linha[COL['Recebido em'] - 1] = Utilities.formatDate(agora, 'America/Sao_Paulo', 'dd/MM/yyyy HH:mm:ss');
    linha[COL['Status'] - 1] = 'solicitada';
    linha[COL['Tipo'] - 1] = p.tipo_pessoa;
    linha[COL['Nome'] - 1] = payload.contratante.razao_social || payload.contratante.nome;
    linha[COL['Documento'] - 1] = payload.contratante.cnpj || payload.contratante.cpf;
    linha[COL['E-mail'] - 1] = payload.contratante.email;
    linha[COL['Telefone'] - 1] = payload.contratante.telefone;
    linha[COL['Perfil'] - 1] = payload.divulgacao.perfil;
    linha[COL['Evento'] - 1] = payload.evento.nome;
    linha[COL['Data evento'] - 1] = payload.evento.data;
    linha[COL['Retirada'] - 1] = payload.retirada.data + ' ' + payload.retirada.horario;
    linha[COL['Valor total (R$)'] - 1] = total;
    linha[COL['Vencimento (retirada + 15d)'] - 1] = br_(vencimento);
    linha[COL['Payload'] - 1] = JSON.stringify(payload);
    for (let i = 0; i < COLUNAS.length; i++) if (linha[i] === undefined) linha[i] = '';
    sh.appendRow(linha);

    avisarAdmin_(payload);
    return { referencia: ref, valor_total: total, vencimento: br_(vencimento) };
  } finally {
    lock.releaseLock();
  }
}

/* ------------------------------------------------------------------ */
/* Validação                                                           */
/* ------------------------------------------------------------------ */

function validar_(p) {
  const e = [];
  const pj = p.tipo_pessoa === 'PJ';
  if (['PF', 'PJ'].indexOf(p.tipo_pessoa) < 0) e.push('Informe se é pessoa física ou jurídica.');
  const c = p.contratante || {};
  if (pj) {
    if (!txt_(c.razao_social)) e.push('Informe a razão social.');
    if (!cnpjOk_(c.cnpj)) e.push('CNPJ inválido.');
    const r = c.representante || {};
    if (!txt_(r.nome) || !txt_(r.cargo)) e.push('Informe nome e cargo do representante legal.');
    if (!cpfOk_(r.cpf)) e.push('CPF do representante inválido.');
  } else {
    if (!txt_(c.nome)) e.push('Informe o nome completo.');
    if (!cpfOk_(c.cpf)) e.push('CPF inválido.');
  }
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(txt_(c.email))) e.push('E-mail inválido.');
  if (txt_(c.telefone).replace(/\D/g, '').length < 10) e.push('Telefone inválido.');
  if (!txt_(c.endereco) || txt_(c.cep).replace(/\D/g, '').length !== 8) e.push('Informe endereço e CEP.');
  if (!txt_(p.perfil)) e.push('Informe o perfil (Instagram) da organização.');

  const ev = p.evento || {};
  if (!txt_(ev.nome) || !txt_(ev.local) || !txt_(ev.endereco) || !ev.data) e.push('Complete os dados do evento.');
  if (!(Number(ev.publico) > 0)) e.push('Informe o público estimado.');

  const r = p.retirada || {};
  if (!r.data || !r.horario || !txt_(r.responsavel) || CFG.LOCAIS_RETIRADA.indexOf(r.local) < 0) e.push('Complete os dados da retirada.');
  const hoje = Utilities.formatDate(new Date(), 'America/Sao_Paulo', 'yyyy-MM-dd');
  if (r.data && r.data < hoje) e.push('A retirada não pode ser no passado.');
  if (r.data && ev.data && r.data > ev.data) e.push('A retirada deve ser até a data do evento.');

  let qtd = 0;
  (p.produtos || []).forEach(x => { qtd += Number(x.quantidade) || 0; });
  if (!qtd) e.push('Selecione ao menos um produto.');
  (p.produtos || []).forEach(x => {
    const q = Number(x.quantidade) || 0;
    if (q < 0 || q > CFG.MAX_UNIDADES_POR_SKU || q !== Math.floor(q)) e.push('Quantidade inválida para ' + x.sku + '.');
  });

  if (!p.socios || !p.socios.length) e.push('Informe ao menos um sócio/avalista.');
  (p.socios || []).forEach((s, i) => { if (!txt_(s.nome) || !cpfOk_(s.cpf)) e.push('Sócio/avalista ' + (i + 1) + ': nome ou CPF inválido.'); });
  if (!p.garantias || !p.garantias.length) e.push('Selecione ao menos uma garantia.');

  ['maiores_18', 'advertencias', 'prazo_15_dias', 'cobranca_integral', 'devolucao_por_conta',
   'risco_perda', 'consulta_credito', 'lgpd', 'veracidade'].forEach(k => { if (!(p.declaracoes && p.declaracoes[k])) e.push('É necessário aceitar todas as declarações.'); });
  return e.filter((v, i, a) => a.indexOf(v) === i);
}

function cpfOk_(v) {
  const s = String(v || '').replace(/\D/g, '');
  if (s.length !== 11 || /^(\d)\1+$/.test(s)) return false;
  for (let t = 9; t < 11; t++) {
    let d = 0;
    for (let c = 0; c < t; c++) d += Number(s[c]) * (t + 1 - c);
    d = ((10 * d) % 11) % 10;
    if (Number(s[t]) !== d) return false;
  }
  return true;
}

function cnpjOk_(v) {
  const s = String(v || '').replace(/\D/g, '');
  if (s.length !== 14 || /^(\d)\1+$/.test(s)) return false;
  const calc = n => {
    let soma = 0, pos = n - 7;
    for (let i = n; i >= 1; i--) { soma += Number(s[n - i]) * pos--; if (pos < 2) pos = 9; }
    const r = soma % 11;
    return r < 2 ? 0 : 11 - r;
  };
  return calc(12) === Number(s[12]) && calc(13) === Number(s[13]);
}

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

function txt_(v) { return String(v == null ? '' : v).replace(/\s+/g, ' ').trim().slice(0, 500); }

function br_(iso) {                           // 2026-10-19 -> 19/10/2026
  const m = String(iso || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return m ? m[3] + '/' + m[2] + '/' + m[1] : (iso instanceof Date ? Utilities.formatDate(iso, 'America/Sao_Paulo', 'dd/MM/yyyy') : txt_(iso));
}

function somarDias_(iso, dias) {
  const [y, m, d] = iso.split('-').map(Number);
  return Utilities.formatDate(new Date(y, m - 1, d + dias, 12), 'America/Sao_Paulo', 'yyyy-MM-dd');
}

function dataExtenso_(dt) {
  const meses = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
  const d = Utilities.formatDate(dt, 'America/Sao_Paulo', 'dd'), m = Number(Utilities.formatDate(dt, 'America/Sao_Paulo', 'MM'));
  return d + ' de ' + meses[m - 1] + ' de ' + Utilities.formatDate(dt, 'America/Sao_Paulo', 'yyyy');
}

function contratante_(p, pj) {
  const c = p.contratante;
  const base = { endereco: txt_(c.endereco), cep: txt_(c.cep), email: txt_(c.email).toLowerCase(), telefone: txt_(c.telefone) };
  if (!pj) return Object.assign({ nome: txt_(c.nome).toUpperCase(), cpf: txt_(c.cpf), rg: txt_(c.rg), orgao_emissor: txt_(c.orgao_emissor) }, base);
  const r = c.representante;
  return Object.assign({
    razao_social: txt_(c.razao_social).toUpperCase(), cnpj: txt_(c.cnpj),
    representante: { nome: txt_(r.nome).toUpperCase(), cargo: txt_(r.cargo), cpf: txt_(r.cpf), rg: txt_(r.rg), orgao_emissor: txt_(r.orgao_emissor),
      endereco: txt_(r.endereco), cep: txt_(r.cep), email: txt_(r.email), telefone: txt_(r.telefone) }
  }, base);
}

/** Preços sempre do catálogo do servidor. */
function montarProdutos_(itens) {
  const out = [];
  (itens || []).forEach(it => {
    const q = Number(it.quantidade) || 0;
    const prod = CFG.CATALOGO.filter(c => c.sku === it.sku)[0];
    if (!prod || q <= 0) return;
    out.push(Object.assign({}, prod, { quantidade: q, subtotal: Math.round(prod.valor_unitario * q * 100) / 100 }));
  });
  return out;
}

function novaReferencia_(sh) {
  const usados = sh.getLastRow() > 1 ? sh.getRange(2, 1, sh.getLastRow() - 1, 1).getValues().map(r => r[0]) : [];
  let ref;
  do { ref = 'QTZ-CSG-' + new Date().getFullYear() + '-' + String(Math.floor(100000 + Math.random() * 900000)); } while (usados.indexOf(ref) >= 0);
  return ref;
}

function aba_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName(CFG.ABA);
  if (!sh) sh = ss.insertSheet(CFG.ABA);
  return sh;
}

function prop_(k) { return PropertiesService.getScriptProperties().getProperty(k); }

function avisarAdmin_(pl) {
  const to = prop_('ADMIN_EMAIL');
  if (!to) return;
  const nome = pl.contratante.razao_social || pl.contratante.nome;
  MailApp.sendEmail(to, '[Consignação] Nova solicitação ' + pl.referencia + ' – ' + nome,
    'Solicitante: ' + nome + '\nEvento: ' + pl.evento.nome + ' (' + pl.evento.data + ')\n' +
    'Valor (preço de consignação): R$ ' + pl.totais.valor_total.toFixed(2).replace('.', ',') + '\n' +
    'Retirada: ' + pl.retirada.data + ' ' + pl.retirada.horario + '\nVencimento: ' + pl.totais.vencimento + '\n' +
    'Garantias: ' + (pl.garantias.join('; ') || '—') + '\n' +
    (pl.analise_manual ? '\n⚠ Acima do limite automático: análise manual obrigatória.\n' : '') +
    '\nPlanilha: ' + SpreadsheetApp.getActiveSpreadsheet().getUrl());
}

/* ------------------------------------------------------------------ */
/* Administração (menu da planilha)                                    */
/* ------------------------------------------------------------------ */

function onOpen() {
  SpreadsheetApp.getUi().createMenu('Quetzalli')
    .addItem('Gerar minuta (linha selecionada)', 'gerarMinuta')
    .addItem('Marcar como assinada', 'marcarAssinada')
    .addItem('Registrar retirada (mercadoria entregue)', 'marcarEntregue')
    .addItem('Registrar devolução / acerto', 'registrarAcerto')
    .addSeparator()
    .addItem('Instalar verificação diária de vencimentos', 'instalarTrigger')
    .addToUi();
}

/** Prepara a aba, cabeçalho e lista de status. Rode uma vez. */
function setup() {
  const sh = aba_();
  sh.getRange(1, 1, 1, COLUNAS.length).setValues([COLUNAS]).setFontWeight('bold').setBackground('#f1ece4');
  sh.setFrozenRows(1);
  sh.getRange(2, COL['Status'], 1000, 1).setDataValidation(
    SpreadsheetApp.newDataValidation().requireValueInList(STATUS, true).build());
  sh.setColumnWidth(COL['Payload'], 160);
  SpreadsheetApp.getUi().alert('Aba "' + CFG.ABA + '" pronta. Defina as propriedades do script (ver README) e publique o web app.');
}

function linhaSelecionada_() {
  const sh = SpreadsheetApp.getActiveSheet();
  const r = sh.getActiveRange().getRow();
  if (sh.getName() !== CFG.ABA || r < 2) throw new Error('Selecione uma linha de solicitação na aba "' + CFG.ABA + '".');
  return { sh: sh, r: r, get: n => sh.getRange(r, COL[n]).getValue(), set: (n, v) => sh.getRange(r, COL[n]).setValue(v) };
}

function gerarMinuta() {
  const L = linhaSelecionada_();
  const tpl = prop_('TEMPLATE_DOC_ID'), pasta = prop_('PDF_FOLDER_ID');
  if (!tpl || !pasta) throw new Error('Defina TEMPLATE_DOC_ID e PDF_FOLDER_ID nas propriedades do script.');
  const pl = JSON.parse(L.get('Payload'));
  const ui = SpreadsheetApp.getUi();
  const limite = ui.prompt('Limite aprovado (R$) para ' + pl.referencia, 'Valor da solicitação: R$ ' + pl.totais.valor_total.toFixed(2).replace('.', ','), ui.ButtonSet.OK_CANCEL);
  if (limite.getSelectedButton() !== ui.Button.OK) return;
  const lim = Number(String(limite.getResponseText()).replace(/\./g, '').replace(',', '.'));
  if (!(lim >= pl.totais.valor_total)) throw new Error('O limite aprovado deve cobrir o valor da solicitação.');

  const copia = DriveApp.getFileById(tpl).makeCopy('Termo_Consignacao_Quetzalli_' + pl.referencia, DriveApp.getFolderById(pasta));
  const doc = DocumentApp.openById(copia.getId());
  const body = doc.getBody();
  const mapa = placeholders_(pl, lim);
  Object.keys(mapa).forEach(k => body.replaceText('\\{\\{' + k + '\\}\\}', String(mapa[k]).replace(/\$/g, '$$$$')));
  doc.saveAndClose();

  const nomePdf = 'Termo_Consignacao_Quetzalli_' + pl.referencia + '.pdf';
  const pdf = DriveApp.getFolderById(pasta).createFile(copia.getAs('application/pdf').setName(nomePdf));
  copia.setTrashed(true);

  L.set('PDF', nomePdf);
  L.set('Limite aprovado (R$)', lim);
  L.set('Status', 'minuta enviada');
  GmailApp.sendEmail(pl.contratante.email, 'Quetzalli · Termo de Consignação ' + pl.referencia,
    'Olá!\n\nSua solicitação ' + pl.referencia + ' foi aprovada. Segue o Termo de Consignação para assinatura.\n\n' +
    'Pontos principais: prazo de ' + CFG.PRAZO_DIAS + ' dias corridos; na falta de devolução o valor integral é cobrado; ' +
    'o custo da devolução é por conta da consignatária.\n\nDevolva o termo assinado respondendo este e-mail. ' +
    'A retirada será liberada após o recebimento do termo assinado e das garantias.\n\nQuetzalli',
    { attachments: [pdf.getAs('application/pdf')], name: 'Quetzalli' });
  ui.alert('Minuta gerada e enviada para ' + pl.contratante.email + '.');
}

function placeholders_(pl, limite) {
  const c = pl.contratante, r = c.representante || {};
  const pj = pl.tipo_pessoa === 'PJ';
  const brl = n => 'R$ ' + Number(n).toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return {
    referencia: pl.referencia,
    nome: pj ? c.razao_social : c.nome,
    documento: pj ? c.cnpj : c.cpf,
    qualificacao_representante: pj ? r.nome + ', ' + r.cargo + ', RG ' + r.rg + ' ' + r.orgao_emissor + ', CPF ' + r.cpf : 'RG ' + c.rg + ' ' + c.orgao_emissor,
    endereco: c.endereco + ', CEP ' + c.cep, email: c.email, telefone: c.telefone,
    evento_nome: pl.evento.nome, evento_data: pl.evento.data, evento_horario: pl.evento.horario,
    evento_local: pl.evento.local + ' – ' + pl.evento.endereco,
    retirada: pl.retirada.data + ' às ' + pl.retirada.horario, retirada_local: pl.retirada.local,
    responsavel_retirada: pl.retirada.responsavel,
    produtos: pl.produtos.map(p => p.quantidade + ' × ' + p.descricao + ' (' + p.volume + '; ' + p.teor + '; SKU ' + p.sku + ') a ' + brl(p.valor_unitario) + ' = ' + brl(p.subtotal)).join('\n'),
    valor_total: brl(pl.totais.valor_total), limite_aprovado: brl(limite), vencimento: pl.totais.vencimento,
    garantias: pl.garantias.join('; '),
    socios_avalistas: pl.socios_avalistas.map(s => s.nome + ' (CPF ' + s.cpf + ')').join('; '),
    data_extenso: pl.data_extenso
  };
}

function marcarAssinada()  { const L = linhaSelecionada_(); L.set('Status', 'assinada e enviada'); L.set('PDF assinado', L.get('PDF').replace('.pdf', '-assinado.pdf')); }
function marcarEntregue()  { linhaSelecionada_().set('Status', 'mercadoria entregue'); }

function registrarAcerto() {
  const L = linhaSelecionada_(), ui = SpreadsheetApp.getUi();
  const a = ui.alert('Houve devolução total sem pendências?\nSim = "devolvida" (cancelar boleto). Não = "acertada" (cancelar boleto e emitir novo pelo apurado).', ui.ButtonSet.YES_NO);
  L.set('Status', a === ui.Button.YES ? 'devolvida' : 'acertada');
}

/* ------------------------------------------------------------------ */
/* Vencimentos (gatilho diário)                                        */
/* ------------------------------------------------------------------ */

function instalarTrigger() {
  ScriptApp.getProjectTriggers().filter(t => t.getHandlerFunction() === 'verificarVencimentos').forEach(t => ScriptApp.deleteTrigger(t));
  ScriptApp.newTrigger('verificarVencimentos').timeBased().everyDays(1).atHour(8).create();
  SpreadsheetApp.getUi().alert('Verificação diária instalada (08h).');
}

function verificarVencimentos() {
  const sh = aba_(), n = sh.getLastRow() - 1;
  if (n < 1) return;
  const dados = sh.getRange(2, 1, n, COLUNAS.length).getValues();
  const hoje = new Date(); hoje.setHours(0, 0, 0, 0);
  const avisos = [];
  dados.forEach((row, i) => {
    const status = row[COL['Status'] - 1];
    if (['mercadoria entregue', 'vencida'].indexOf(status) < 0) return;
    const [d, m, y] = String(row[COL['Vencimento (retirada + 15d)'] - 1]).split('/').map(Number);
    if (!d) return;
    const dias = Math.round((new Date(y, m - 1, d) - hoje) / 86400000);
    const ref = row[0], nome = row[COL['Nome'] - 1];
    if (dias < 0 && status !== 'vencida') { sh.getRange(i + 2, COL['Status']).setValue('vencida'); avisos.push('VENCIDA há ' + (-dias) + ' dia(s): ' + ref + ' – ' + nome + ' (cobrar o valor integral, Cláusula 4.4)'); }
    else if (dias === 2 || dias === 0) avisos.push('Vence ' + (dias === 0 ? 'HOJE' : 'em 2 dias') + ': ' + ref + ' – ' + nome);
  });
  if (avisos.length && prop_('ADMIN_EMAIL')) MailApp.sendEmail(prop_('ADMIN_EMAIL'), '[Consignação] Vencimentos', avisos.join('\n'));
}
