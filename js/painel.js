// Painel do dono: pendências, alertas, histórico e consumo.

let cabanasDisponiveis = [];

function escapeHtml(texto) {
  const div = document.createElement('div');
  div.textContent = texto == null ? '' : String(texto);
  return div.innerHTML;
}

function formatarDataHora(isoString) {
  const d = new Date(isoString);
  return d.toLocaleDateString('pt-BR') + ' às ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

function formatarData(isoString) {
  return new Date(isoString).toLocaleDateString('pt-BR');
}

function etiquetaStatus(status) {
  return '<span class="etiqueta-status" data-s="' + escapeHtml(status) + '">' + escapeHtml(status) + '</span>';
}

async function iniciar() {
  try {
    const produtosResp = await chamarApi('getProdutos');
    if (!produtosResp || !produtosResp.ok) {
      throw new Error((produtosResp && produtosResp.erro) || 'Não foi possível carregar os dados.');
    }
    cabanasDisponiveis = produtosResp.cabanas;

    preencherFiltroCabanas();
    document.getElementById('areaCarregando').style.display = 'none';
    document.getElementById('conteudoPainel').style.display = 'block';

    configurarAbas();
    await Promise.all([carregarPendentes(), carregarAlertas(), carregarHistorico(), carregarConsumo()]);
  } catch (err) {
    document.getElementById('areaCarregando').style.display = 'none';
    document.getElementById('areaErro').innerHTML =
      '<div class="erro">' + escapeHtml(err.message) + '</div>';
  }
}

function preencherFiltroCabanas() {
  const select = document.getElementById('filtroCabanaHist');
  select.innerHTML = '<option value="">Todas as cabanas</option>';
  cabanasDisponiveis.forEach(c => {
    const opt = document.createElement('option');
    opt.value = c.nome;
    opt.textContent = c.nome;
    select.appendChild(opt);
  });
}

function configurarAbas() {
  document.querySelectorAll('.aba-botao').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.aba-botao').forEach(b => b.classList.remove('ativa'));
      document.querySelectorAll('.secao-painel').forEach(s => s.classList.remove('ativa'));
      btn.classList.add('ativa');
      document.getElementById('secao' + capitalizar(btn.dataset.aba)).classList.add('ativa');
    });
  });
}

function capitalizar(texto) {
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

// ---- Pendentes ----

async function carregarPendentes() {
  const resultado = await chamarApi('getPendentes');
  const div = document.getElementById('listaPendentes');
  if (!resultado || !resultado.ok) {
    div.innerHTML = '<div class="erro">Erro ao carregar pendentes.</div>';
    return;
  }
  if (resultado.pendentes.length === 0) {
    div.innerHTML = '<div class="vazio">Nenhum item pendente no momento. 🎉</div>';
    return;
  }

  const porCabana = {};
  resultado.pendentes.forEach(p => {
    if (!porCabana[p.cabana]) porCabana[p.cabana] = [];
    porCabana[p.cabana].push(p);
  });

  let html = '';
  Object.keys(porCabana).forEach(cabana => {
    html += '<h3>' + escapeHtml(cabana) + '</h3>';
    porCabana[cabana].forEach(p => {
      html +=
        '<div class="linha-tabela"><div>' +
        '<strong>' + escapeHtml(p.produto) + '</strong> — ' + escapeHtml(p.ambiente) +
        (p.observacao ? '<br><span style="color:var(--cor-texto-suave); font-size:0.85rem;">' + escapeHtml(p.observacao) + '</span>' : '') +
        '</div><div style="text-align:right;">' +
        etiquetaStatus(p.status) +
        '<br><span style="font-size:0.75rem; color:var(--cor-texto-suave);">' + formatarDataHora(p.dataHora) + '</span>' +
        '</div></div>';
    });
  });
  div.innerHTML = html;
}

// ---- Alertas ----

async function carregarAlertas() {
  const resultado = await chamarApi('getAlertas');
  const div = document.getElementById('listaAlertas');
  if (!resultado || !resultado.ok) {
    div.innerHTML = '<div class="erro">Erro ao carregar alertas.</div>';
    return;
  }
  if (resultado.alertas.length === 0) {
    div.innerHTML = '<div class="vazio">Nenhum alerta de estoque mínimo.</div>';
    return;
  }

  let html = '';
  resultado.alertas.forEach(a => {
    html +=
      '<div class="linha-tabela"><div>' +
      '<strong>' + escapeHtml(a.produto) + '</strong> — ' + escapeHtml(a.cabana) + ' · ' + escapeHtml(a.ambiente) +
      '</div><div style="text-align:right;">' +
      etiquetaStatus(a.ultimoStatus) +
      '<br><span style="font-size:0.75rem; color:var(--cor-texto-suave);">' +
      a.limpezasSeguidasPendente + ' limpezas seguidas pendente</span>' +
      '</div></div>';
  });
  div.innerHTML = html;
}

// ---- Histórico ----

async function carregarHistorico() {
  const cabana = document.getElementById('filtroCabanaHist').value;
  const dataInicio = document.getElementById('filtroDataInicioHist').value;
  const dataFim = document.getElementById('filtroDataFimHist').value;

  const params = {};
  if (cabana) params.cabana = cabana;
  if (dataInicio) params.dataInicio = dataInicio + 'T00:00:00';
  if (dataFim) params.dataFim = dataFim + 'T23:59:59';

  const resultado = await chamarApi('getHistorico', params);
  const div = document.getElementById('listaHistorico');
  if (!resultado || !resultado.ok) {
    div.innerHTML = '<div class="erro">Erro ao carregar histórico.</div>';
    return;
  }
  if (resultado.historico.length === 0) {
    div.innerHTML = '<div class="vazio">Nenhuma limpeza registrada nesse período.</div>';
    return;
  }

  let html = '';
  resultado.historico.forEach((sessao, indice) => {
    const pendentes = sessao.itens.filter(i => i.status !== 'Não necessitou reposição').length;
    const idDetalhe = 'detalhe-' + indice;
    html +=
      '<div class="linha-tabela" style="cursor:pointer;" onclick="document.getElementById(\'' + idDetalhe + '\').classList.toggle(\'aberto\')">' +
      '<div><strong>' + escapeHtml(sessao.cabana) + '</strong><br>' +
      '<span style="font-size:0.85rem; color:var(--cor-texto-suave);">' + formatarDataHora(sessao.dataHora) + '</span>' +
      '</div><div style="text-align:right;">' +
      (pendentes === 0
        ? '<span class="etiqueta-status" data-s="Não necessitou reposição">Tudo Ok</span>'
        : '<span class="etiqueta-status" data-s="Está em falta no estoque">' + pendentes + ' com atenção</span>') +
      '</div></div>' +
      '<div class="detalhe-sessao" id="' + idDetalhe + '">' +
      sessao.itens.map(i =>
        '<div class="linha-item-sessao"><span>' + escapeHtml(i.ambiente) + ' — ' + escapeHtml(i.produto) +
        (i.observacao ? ' <em>(' + escapeHtml(i.observacao) + ')</em>' : '') + '</span>' +
        etiquetaStatus(i.status) + '</div>'
      ).join('') +
      '</div>';
  });
  div.innerHTML = html;
}

document.getElementById('botaoFiltrarHist').addEventListener('click', carregarHistorico);

// ---- Consumo ----

async function carregarConsumo() {
  const dataInicio = document.getElementById('filtroDataInicioCons').value;
  const dataFim = document.getElementById('filtroDataFimCons').value;

  const params = {};
  if (dataInicio) params.dataInicio = dataInicio + 'T00:00:00';
  if (dataFim) params.dataFim = dataFim + 'T23:59:59';

  const resultado = await chamarApi('getConsumo', params);
  const div = document.getElementById('listaConsumo');
  if (!resultado || !resultado.ok) {
    div.innerHTML = '<div class="erro">Erro ao carregar consumo.</div>';
    return;
  }
  if (resultado.consumo.length === 0) {
    div.innerHTML = '<div class="vazio">Nenhuma reposição registrada nesse período.</div>';
    return;
  }

  let html = '';
  resultado.consumo.forEach(c => {
    html +=
      '<div class="linha-tabela"><div><strong>' + escapeHtml(c.produto) + '</strong> — ' + escapeHtml(c.cabana) + '</div>' +
      '<div>' + c.vezesReposto + 'x reposto</div></div>';
  });
  div.innerHTML = html;
}

document.getElementById('botaoFiltrarConsumo').addEventListener('click', carregarConsumo);

iniciar();
