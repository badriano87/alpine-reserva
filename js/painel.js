// Painel do dono: o que comprar, o que vai ser necessário em breve,
// avaliação do hóspede anterior e histórico de limpezas.

let cabanasDisponiveis = [];
let produtosDisponiveis = [];

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
  const d = new Date(isoString);
  return d.toLocaleDateString('pt-BR');
}

function formatarValor(valor) {
  const numero = Number(valor) || 0;
  return numero.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatarQuantidade(numero) {
  return Number(numero).toLocaleString('pt-BR', { maximumFractionDigits: 3 });
}

function pluralizar(n, singular, plural) {
  return n === 1 ? singular : plural;
}

function etiquetaStatus(status) {
  return '<span class="etiqueta-status nivel-' + nivelStatus(status) + '">' + escapeHtml(status) + '</span>';
}

async function iniciar() {
  try {
    const produtosResp = await chamarApi('getProdutos');
    if (!produtosResp || !produtosResp.ok) {
      throw new Error((produtosResp && produtosResp.erro) || 'Não foi possível carregar os dados.');
    }
    cabanasDisponiveis = produtosResp.cabanas;
    produtosDisponiveis = produtosResp.produtos;

    preencherFiltroCabanas();
    preencherSelectProdutos();
    prepararFormularioCompra();
    document.getElementById('areaCarregando').style.display = 'none';
    document.getElementById('conteudoPainel').style.display = 'block';

    configurarAbas();
    await Promise.all([carregarComprar(), carregarEmBreve(), carregarAvaliacao(), carregarHistorico(), carregarCompras(), carregarAnalises()]);
  } catch (err) {
    document.getElementById('areaCarregando').style.display = 'none';
    document.getElementById('areaErro').innerHTML =
      '<div class="erro">' + escapeHtml(err.message) + '</div>';
  }
}

function preencherFiltroCabanas() {
  const select = document.getElementById('filtroCabanaHist');
  if (!select) return;
  select.innerHTML = '<option value="">Todas as cabanas</option>';
  cabanasDisponiveis.forEach(c => {
    const opt = document.createElement('option');
    opt.value = c.nome;
    opt.textContent = c.nome;
    select.appendChild(opt);
  });
}

function preencherSelectProdutos() {
  const select = document.getElementById('compraProduto');
  if (!select) return;
  select.innerHTML = '';
  produtosDisponiveis.forEach(p => {
    const opt = document.createElement('option');
    opt.value = p.nome;
    opt.textContent = p.nome;
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

// ---- Listas genéricas de itens (comprar / em breve) ----

function renderizarListaItens(divId, itens, mensagemVazia, permitirResolver, aoResolver) {
  const div = document.getElementById(divId);
  if (itens.length === 0) {
    div.innerHTML = '<div class="vazio">' + mensagemVazia + '</div>';
    return;
  }

  const porCabana = {};
  itens.forEach(i => {
    if (!porCabana[i.cabana]) porCabana[i.cabana] = [];
    porCabana[i.cabana].push(i);
  });

  div.innerHTML = '';
  Object.keys(porCabana).forEach(cabana => {
    const titulo = document.createElement('h3');
    titulo.textContent = cabana;
    div.appendChild(titulo);

    porCabana[cabana].forEach(i => {
      const linha = document.createElement('div');
      linha.className = 'linha-tabela';
      linha.innerHTML =
        '<div>' +
        '<strong>' + escapeHtml(i.produto) + '</strong>' +
        (i.ambiente ? ' — ' + escapeHtml(i.ambiente) : '') +
        (i.observacao ? '<br><span style="color:var(--cor-texto-suave); font-size:0.85rem;">' + escapeHtml(i.observacao) + '</span>' : '') +
        '</div><div style="text-align:right;">' +
        etiquetaStatus(i.status) +
        '<br><span style="font-size:0.75rem; color:var(--cor-texto-suave);">' + formatarDataHora(i.dataHora) + '</span>' +
        '</div>';

      if (permitirResolver) {
        const acao = document.createElement('div');
        acao.style.textAlign = 'right';
        acao.style.marginTop = '0.4rem';
        const botao = document.createElement('button');
        botao.className = 'botao-resolver';
        botao.textContent = 'Dar baixa';
        botao.addEventListener('click', () => aoResolver(i, botao));
        acao.appendChild(botao);
        linha.appendChild(acao);
      }

      div.appendChild(linha);
    });
  });
}

function esperar(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function marcarResolvido(item, botao) {
  botao.disabled = true;
  botao.textContent = 'Salvando...';
  try {
    const resultado = await chamarApi('resolverItem', { cabana: item.cabana, produto: item.produto });
    if (!resultado || !resultado.ok) throw new Error();
    botao.classList.add('resolvido');
    botao.textContent = 'Já resolvi ✓';
    await esperar(900);
    await Promise.all([carregarComprar(), carregarEmBreve()]);
  } catch (err) {
    botao.disabled = false;
    botao.classList.remove('resolvido');
    botao.textContent = 'Dar baixa';
    alert('Não foi possível marcar como resolvido. Tente de novo.');
  }
}

async function carregarComprar() {
  if (!document.getElementById('listaComprar')) return;
  try {
    const resultado = await chamarApi('getComprar');
    if (!resultado || !resultado.ok) throw new Error();
    renderizarListaItens('listaComprar', resultado.itens, 'Nada pendente de compra no momento. 🎉', true, marcarResolvido);
  } catch (err) {
    document.getElementById('listaComprar').innerHTML = '<div class="erro">Erro ao carregar.</div>';
  }
}

async function carregarEmBreve() {
  if (!document.getElementById('listaEmbreve')) return;
  try {
    const resultado = await chamarApi('getEmBreve');
    if (!resultado || !resultado.ok) throw new Error();
    renderizarListaItens('listaEmbreve', resultado.itens, 'Nada precisando de atenção em breve.', true, marcarResolvido);
  } catch (err) {
    document.getElementById('listaEmbreve').innerHTML = '<div class="erro">Erro ao carregar.</div>';
  }
}

// ---- Avaliação do hóspede anterior ----

async function carregarAvaliacao() {
  const div = document.getElementById('listaAvaliacao');
  if (!div) return;
  try {
    const resultado = await chamarApi('getAvaliacaoHospede');
    if (!resultado || !resultado.ok) throw new Error();
    if (resultado.avaliacoes.length === 0) {
      div.innerHTML = '<div class="vazio">Nenhuma avaliação registrada ainda.</div>';
      return;
    }
    let html = '';
    resultado.avaliacoes.forEach(a => {
      const pct = Math.round(a.percentualNaoUsado * 100);
      html +=
        '<div class="cartao-avaliacao">' +
        '<h3>' + escapeHtml(a.cabana) + '</h3>' +
        '<div style="font-size:0.85rem; color:var(--cor-texto-suave);">' + formatarDataHora(a.dataHora) + '</div>' +
        '<div style="margin-top:0.5rem;"><strong>Nota da limpeza:</strong> ' +
        (NOTAS_HOSPEDE.indexOf(a.nota) + 1) + '/10 — ' + escapeHtml(a.nota) + '</div>' +
        '<div style="margin-top:0.25rem;"><strong>Uso dos itens de reposição:</strong> ' + escapeHtml(a.nivelUso) +
        ' <span style="color:var(--cor-texto-suave);">(' + pct + '% não precisou repor)</span></div>' +
        '</div>';
    });
    div.innerHTML = html;
  } catch (err) {
    div.innerHTML = '<div class="erro">Erro ao carregar.</div>';
  }
}

// ---- Histórico ----

async function carregarHistorico() {
  if (!document.getElementById('listaHistorico')) return;
  const cabana = document.getElementById('filtroCabanaHist').value;
  const dataInicio = document.getElementById('filtroDataInicioHist').value;
  const dataFim = document.getElementById('filtroDataFimHist').value;

  const params = {};
  if (cabana) params.cabana = cabana;
  if (dataInicio) params.dataInicio = dataInicio + 'T00:00:00';
  if (dataFim) params.dataFim = dataFim + 'T23:59:59';

  const div = document.getElementById('listaHistorico');
  try {
    const resultado = await chamarApi('getHistorico', params);
    if (!resultado || !resultado.ok) throw new Error();
    if (resultado.historico.length === 0) {
      div.innerHTML = '<div class="vazio">Nenhuma limpeza registrada nesse período.</div>';
      return;
    }

    let html = '';
    resultado.historico.forEach((sessao, indice) => {
      const niveisAtencao = ['atencao', 'critico', 'falta'];
      const pendentes = sessao.itens.filter(i => niveisAtencao.includes(nivelStatus(i.status))).length;
      const idDetalhe = 'detalhe-' + indice;
      html +=
        '<div class="linha-tabela" style="cursor:pointer;" onclick="document.getElementById(\'' + idDetalhe + '\').classList.toggle(\'aberto\')">' +
        '<div><strong>' + escapeHtml(sessao.cabana) + '</strong><br>' +
        '<span style="font-size:0.85rem; color:var(--cor-texto-suave);">' + formatarDataHora(sessao.dataHora) + '</span>' +
        '</div><div style="text-align:right;">' +
        (pendentes === 0
          ? '<span class="etiqueta-status nivel-otimo">Tudo Ok</span>'
          : '<span class="etiqueta-status nivel-falta">' + pendentes + ' com atenção</span>') +
        '</div></div>' +
        '<div class="detalhe-sessao" id="' + idDetalhe + '">' +
        sessao.itens.map(i =>
          '<div class="linha-item-sessao"><span>' + escapeHtml(i.ambiente || i.bloco) + ' — ' + escapeHtml(i.produto) +
          (i.observacao ? ' <em>(' + escapeHtml(i.observacao) + ')</em>' : '') + '</span>' +
          etiquetaStatus(i.status) + '</div>'
        ).join('') +
        '</div>';
    });
    div.innerHTML = html;
  } catch (err) {
    div.innerHTML = '<div class="erro">Erro ao carregar histórico.</div>';
  }
}

const botaoFiltrarHistEl = document.getElementById('botaoFiltrarHist');
if (botaoFiltrarHistEl) botaoFiltrarHistEl.addEventListener('click', carregarHistorico);

// ---- Compras ----

let compraEmEdicaoId = null;

function prepararFormularioCompra() {
  const campoData = document.getElementById('compraData');
  if (!campoData) return;
  const hoje = new Date();
  campoData.value = hoje.toISOString().slice(0, 10);

  document.getElementById('formCompra').addEventListener('submit', async (evento) => {
    evento.preventDefault();
    await enviarCompra();
  });

  document.getElementById('botaoCancelarEdicaoCompra').addEventListener('click', cancelarEdicaoCompra);
}

function iniciarEdicaoCompra(compra) {
  compraEmEdicaoId = compra.idCompra;
  document.getElementById('compraProduto').value = compra.produto;
  document.getElementById('compraQuantidade').value = compra.quantidade;
  document.getElementById('compraUnidade').value = compra.unidade;
  document.getElementById('compraValor').value = compra.valor;
  document.getElementById('compraData').value = compra.dataCompra.slice(0, 10);
  document.getElementById('compraLoja').value = compra.loja;
  document.getElementById('compraObs').value = compra.observacao;

  document.getElementById('tituloFormCompra').textContent = 'Editar compra';
  document.getElementById('botaoEnviarCompra').textContent = 'Salvar alteração';
  document.getElementById('botaoCancelarEdicaoCompra').style.display = 'block';
  document.getElementById('mensagemCompra').innerHTML = '';
  document.getElementById('formCompra').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function limparFormularioCompra() {
  document.getElementById('compraQuantidade').value = '';
  document.getElementById('compraUnidade').value = '';
  document.getElementById('compraValor').value = '';
  document.getElementById('compraLoja').value = '';
  document.getElementById('compraObs').value = '';
  const hoje = new Date();
  document.getElementById('compraData').value = hoje.toISOString().slice(0, 10);
}

function cancelarEdicaoCompra() {
  compraEmEdicaoId = null;
  limparFormularioCompra();
  document.getElementById('tituloFormCompra').textContent = 'Registrar compra';
  document.getElementById('botaoEnviarCompra').textContent = 'Registrar compra';
  document.getElementById('botaoCancelarEdicaoCompra').style.display = 'none';
  document.getElementById('mensagemCompra').innerHTML = '';
}

async function enviarCompra() {
  const botao = document.getElementById('botaoEnviarCompra');
  const mensagem = document.getElementById('mensagemCompra');
  mensagem.innerHTML = '';

  const estaEditando = !!compraEmEdicaoId;
  const dados = {
    produto: document.getElementById('compraProduto').value,
    quantidade: document.getElementById('compraQuantidade').value,
    unidade: document.getElementById('compraUnidade').value,
    valor: document.getElementById('compraValor').value,
    dataCompra: document.getElementById('compraData').value,
    loja: document.getElementById('compraLoja').value,
    observacao: document.getElementById('compraObs').value
  };
  if (estaEditando) dados.idCompra = compraEmEdicaoId;

  botao.disabled = true;
  botao.textContent = 'Salvando...';
  try {
    const resultado = await chamarApi(estaEditando ? 'editarCompra' : 'registrarCompra', dados);
    if (!resultado || !resultado.ok) throw new Error();

    if (estaEditando) {
      cancelarEdicaoCompra();
      mensagem.innerHTML = '<div class="mensagem-sucesso">Compra atualizada!</div>';
    } else {
      limparFormularioCompra();
      mensagem.innerHTML = '<div class="mensagem-sucesso">Compra registrada! O item também foi dado como resolvido nas listas de alerta.</div>';
    }

    await Promise.all([carregarCompras(), carregarComprar(), carregarEmBreve(), carregarAnalises()]);
  } catch (err) {
    mensagem.innerHTML = '<div class="erro">Não foi possível salvar a compra. Tente de novo.</div>';
  } finally {
    botao.disabled = false;
    botao.textContent = compraEmEdicaoId ? 'Salvar alteração' : 'Registrar compra';
  }
}

async function carregarCompras() {
  const div = document.getElementById('listaCompras');
  if (!div) return;
  try {
    const resultado = await chamarApi('getCompras');
    if (!resultado || !resultado.ok) throw new Error();
    if (resultado.compras.length === 0) {
      div.innerHTML = '<div class="vazio">Nenhuma compra registrada ainda.</div>';
      return;
    }
    div.innerHTML = '';
    resultado.compras.forEach(c => {
      const quantidade = Number(c.quantidade) || 0;
      const valorUnitario = quantidade > 0 ? c.valor / quantidade : null;

      const linha = document.createElement('div');
      linha.className = 'linha-tabela';
      linha.innerHTML =
        '<div>' +
        '<strong>' + escapeHtml(c.produto) + '</strong><br>' +
        '<span style="font-size:0.85rem; color:var(--cor-texto-suave);">' +
        escapeHtml(c.quantidade) + ' ' + escapeHtml(c.unidade) +
        (c.loja ? ' — ' + escapeHtml(c.loja) : '') +
        '</span>' +
        (c.observacao ? '<br><span style="color:var(--cor-texto-suave); font-size:0.85rem;">' + escapeHtml(c.observacao) + '</span>' : '') +
        '</div><div style="text-align:right;">' +
        '<strong>' + formatarValor(c.valor) + '</strong>' +
        '<br><span style="font-size:0.75rem; color:var(--cor-texto-suave);">' + formatarData(c.dataCompra) + '</span>' +
        (valorUnitario !== null
          ? '<br><span style="font-size:0.75rem; color:var(--cor-texto-suave);">' + formatarValor(valorUnitario) + '/' + escapeHtml(c.unidade || 'unidade') + '</span>'
          : '') +
        '<br><button type="button" class="botao-resolver" style="margin-top:0.4rem;">Editar</button>' +
        '</div>';

      linha.querySelector('button').addEventListener('click', () => iniciarEdicaoCompra(c));
      div.appendChild(linha);
    });
  } catch (err) {
    div.innerHTML = '<div class="erro">Erro ao carregar.</div>';
  }
}

// ---- Análises ----

async function carregarAnalises() {
  const div = document.getElementById('listaAnalises');
  if (!div) return;
  try {
    const resultado = await chamarApi('getAnalises');
    if (!resultado || !resultado.ok) throw new Error();
    if (resultado.analises.length === 0) {
      div.innerHTML = '<div class="vazio">Ainda sem dados suficientes. Registre compras na aba "Registrar compra" para começar a calcular as médias.</div>';
      return;
    }
    let html = '';
    resultado.analises.forEach(a => {
      const temMedia = a.mediaPorLimpeza !== null;
      html += '<div class="linha-tabela"><div>';
      html += '<strong>' + escapeHtml(a.produto) + '</strong><br>';
      if (temMedia) {
        html +=
          '<span style="color:var(--cor-texto-suave); font-size:0.85rem;">' +
          'baseado em ' + a.ciclos + ' ' + pluralizar(a.ciclos, 'reposição', 'reposições') +
          ' e ' + a.totalLimpezas + ' ' + pluralizar(a.totalLimpezas, 'limpeza', 'limpezas') +
          '</span>';
        if (a.mediaCustoPorLimpeza) {
          html += '<br><span style="color:var(--cor-texto-suave); font-size:0.85rem;">custo médio: ' +
            formatarValor(a.mediaCustoPorLimpeza) + ' por limpeza</span>';
        }
      } else {
        html += '<span style="color:var(--cor-texto-suave); font-size:0.85rem;">ainda sem média — aguardando ficar "Em falta" de novo</span>';
      }
      if (a.temCicloAberto) {
        html += '<br><span style="color:var(--cor-texto-suave); font-size:0.8rem;">' +
          formatarQuantidade(a.quantidadeEmAberto) + ' ' + escapeHtml(a.unidade) + ' em uso agora, ainda não entra na média</span>';
      }
      html += '</div><div style="text-align:right;">';
      html += temMedia
        ? '<strong>' + formatarQuantidade(a.mediaPorLimpeza) + ' ' + escapeHtml(a.unidade) + '</strong><br><span style="font-size:0.75rem; color:var(--cor-texto-suave);">por limpeza</span>'
        : '<span class="etiqueta-status nivel-bom">Coletando dados</span>';
      html += '</div></div>';
    });
    div.innerHTML = html;
  } catch (err) {
    div.innerHTML = '<div class="erro">Erro ao carregar.</div>';
  }
}

iniciar();
