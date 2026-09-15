// Painel do dono: o que comprar, o que vai ser necessário em breve,
// avaliação do hóspede anterior e histórico de limpezas.

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

    preencherFiltroCabanas();
    document.getElementById('areaCarregando').style.display = 'none';
    document.getElementById('conteudoPainel').style.display = 'block';

    configurarAbas();
    await Promise.all([carregarComprar(), carregarEmBreve(), carregarAvaliacao(), carregarHistorico()]);
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
        botao.textContent = 'Já resolvi ✓';
        botao.addEventListener('click', () => aoResolver(i, botao));
        acao.appendChild(botao);
        linha.appendChild(acao);
      }

      div.appendChild(linha);
    });
  });
}

async function marcarResolvido(item, botao) {
  botao.disabled = true;
  botao.textContent = 'Salvando...';
  try {
    const resultado = await chamarApi('resolverItem', { cabana: item.cabana, produto: item.produto });
    if (!resultado || !resultado.ok) throw new Error();
    await Promise.all([carregarComprar(), carregarEmBreve()]);
  } catch (err) {
    botao.disabled = false;
    botao.textContent = 'Já resolvi ✓';
    alert('Não foi possível marcar como resolvido. Tente de novo.');
  }
}

async function carregarComprar() {
  try {
    const resultado = await chamarApi('getComprar');
    if (!resultado || !resultado.ok) throw new Error();
    renderizarListaItens('listaComprar', resultado.itens, 'Nada pendente de compra no momento. 🎉', true, marcarResolvido);
  } catch (err) {
    document.getElementById('listaComprar').innerHTML = '<div class="erro">Erro ao carregar.</div>';
  }
}

async function carregarEmBreve() {
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

document.getElementById('botaoFiltrarHist').addEventListener('click', carregarHistorico);

iniciar();
