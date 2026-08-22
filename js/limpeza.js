// Tela da Liliane: registrar o status de cada produto durante a limpeza.

let cabanas = [];
let produtos = [];
let cabanaEscolhida = null;
let dataLimpeza = null; // "AAAA-MM-DD" escolhida por quem está limpando
let notaHospede = null;
let estadoItens = {}; // { "Produto": { status, observacao } }

function escapeHtml(texto) {
  const div = document.createElement('div');
  div.textContent = texto == null ? '' : String(texto);
  return div.innerHTML;
}

async function iniciar() {
  try {
    const resultado = await chamarApi('getProdutos');
    if (!resultado || !resultado.ok) {
      throw new Error((resultado && resultado.erro) || 'Não foi possível carregar os produtos.');
    }
    cabanas = resultado.cabanas;
    produtos = resultado.produtos;
    document.getElementById('areaCarregando').style.display = 'none';
    renderCabanas();
  } catch (err) {
    document.getElementById('areaCarregando').style.display = 'none';
    document.getElementById('areaErro').innerHTML =
      '<div class="erro">' + escapeHtml(err.message) + '</div>';
  }
}

function renderCabanas() {
  const grade = document.getElementById('gradeCabanas');
  grade.innerHTML = '';
  cabanas.forEach(c => {
    const btn = document.createElement('button');
    btn.className = 'cartao-cabana';
    btn.textContent = c.nome;
    btn.addEventListener('click', () => escolherCabana(c));
    grade.appendChild(btn);
  });
  document.getElementById('areaCabanas').style.display = 'block';
}

function escolherCabana(cabana) {
  cabanaEscolhida = cabana;

  document.getElementById('tituloTopo').textContent = 'Limpeza — ' + cabana.nome;
  document.getElementById('subtituloTopo').textContent = 'Qual o dia de hoje?';
  document.getElementById('areaCabanas').style.display = 'none';

  abrirTelaData();
}

function abrirTelaData() {
  const hoje = new Date();
  const ano = hoje.getFullYear();
  const mes = String(hoje.getMonth() + 1).padStart(2, '0');
  const dia = String(hoje.getDate()).padStart(2, '0');
  document.getElementById('campoData').value = ano + '-' + mes + '-' + dia;
  document.getElementById('areaData').style.display = 'block';
}

function confirmarData() {
  const valor = document.getElementById('campoData').value;
  if (!valor) {
    alert('Escolha a data de hoje antes de continuar.');
    return;
  }
  dataLimpeza = valor;
  notaHospede = null;

  estadoItens = {};
  produtos.forEach(p => {
    estadoItens[p.nome] = { status: statusPadrao(p.bloco, p.ambiente), observacao: '' };
  });

  document.getElementById('areaData').style.display = 'none';
  document.getElementById('subtituloTopo').textContent = 'Preencha o checklist da limpeza';

  renderChecklistCompleto();

  document.getElementById('areaChecklist').style.display = 'block';
  document.getElementById('barraSalvar').style.display = 'block';
}

function produtosDoBloco(bloco) {
  return produtos.filter(p => p.bloco === bloco);
}

function renderChecklistCompleto() {
  renderBlocoFlat('blocoLimpeza', BLOCO_LIMPEZA);
  renderBlocoAgrupado('blocoReposicao', BLOCO_REPOSICAO);
  renderBlocoAgrupado('blocoConservacao', BLOCO_CONSERVACAO);
  renderNota();
}

function renderBlocoFlat(containerId, bloco) {
  const container = document.getElementById(containerId);
  container.innerHTML = '';
  produtosDoBloco(bloco).forEach(p => container.appendChild(criarItemProduto(p)));
}

function renderBlocoAgrupado(containerId, bloco) {
  const container = document.getElementById(containerId);
  container.innerHTML = '';
  const itensBloco = produtosDoBloco(bloco);

  const ambientes = [];
  itensBloco.forEach(p => {
    if (ambientes.indexOf(p.ambiente) === -1) ambientes.push(p.ambiente);
  });

  ambientes.forEach(ambiente => {
    const secao = document.createElement('div');
    secao.className = 'ambiente';

    const titulo = document.createElement('div');
    titulo.className = 'ambiente-titulo';
    titulo.textContent = ambiente;
    secao.appendChild(titulo);

    itensBloco
      .filter(p => p.ambiente === ambiente)
      .forEach(p => secao.appendChild(criarItemProduto(p)));

    container.appendChild(secao);
  });
}

function criarItemProduto(produto) {
  const item = document.createElement('div');
  item.className = 'item-produto';

  const nome = document.createElement('div');
  nome.className = 'item-produto-nome';
  nome.textContent = produto.nome;
  item.appendChild(nome);

  const grade = document.createElement('div');
  grade.className = 'grade-status';

  const opcoes = opcoesStatus(produto.bloco, produto.ambiente);
  opcoes.forEach(status => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'botao-status nivel-' + nivelStatus(status);
    btn.textContent = status;
    if (estadoItens[produto.nome].status === status) {
      btn.classList.add('selecionado');
    }
    btn.addEventListener('click', () => {
      estadoItens[produto.nome].status = status;
      grade.querySelectorAll('.botao-status').forEach(b => b.classList.remove('selecionado'));
      btn.classList.add('selecionado');
    });
    grade.appendChild(btn);
  });

  item.appendChild(grade);

  const campoObs = document.createElement('div');
  campoObs.className = 'campo-obs';
  const inputObs = document.createElement('input');
  inputObs.type = 'text';
  inputObs.placeholder = 'Observação (opcional)';
  inputObs.addEventListener('input', () => {
    estadoItens[produto.nome].observacao = inputObs.value;
  });
  campoObs.appendChild(inputObs);
  item.appendChild(campoObs);

  return item;
}

function renderNota() {
  const container = document.getElementById('blocoNota');
  container.innerHTML = '';
  const grade = document.createElement('div');
  grade.className = 'grade-notas';
  NOTAS_HOSPEDE.forEach((texto, indice) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'botao-nota';
    btn.textContent = (indice + 1) + ' — ' + texto;
    if (notaHospede === texto) btn.classList.add('selecionado');
    btn.addEventListener('click', () => {
      notaHospede = texto;
      grade.querySelectorAll('.botao-nota').forEach(b => b.classList.remove('selecionado'));
      btn.classList.add('selecionado');
    });
    grade.appendChild(btn);
  });
  container.appendChild(grade);
}

async function salvarLimpeza() {
  if (!notaHospede) {
    alert('Escolha a nota que você dá para este hóspede antes de salvar.');
    return;
  }

  const botao = document.getElementById('botaoSalvar');
  botao.disabled = true;
  botao.textContent = 'Salvando...';

  const itens = produtos.map(p => ({
    bloco: p.bloco,
    ambiente: p.ambiente,
    produto: p.nome,
    status: estadoItens[p.nome].status,
    observacao: estadoItens[p.nome].observacao
  }));

  try {
    const resultado = await chamarApi('salvarLimpeza', {
      cabana: cabanaEscolhida.nome,
      dataLimpeza: dataLimpeza,
      nota: notaHospede,
      itens: itens
    });
    if (!resultado || !resultado.ok) {
      throw new Error((resultado && resultado.erro) || 'Não foi possível salvar.');
    }

    const pendentes = itens.filter(i => nivelStatus(i.status) !== 'otimo').length;
    document.getElementById('resumoConfirmacao').textContent =
      pendentes === 0
        ? 'Tudo certo por aqui — nenhum item pendente.'
        : pendentes + ' item(ns) marcados com atenção (reposição, falta ou dano).';

    document.getElementById('areaChecklist').style.display = 'none';
    document.getElementById('barraSalvar').style.display = 'none';
    document.getElementById('areaConfirmacao').style.display = 'block';
  } catch (err) {
    alert('Erro ao salvar: ' + err.message);
  } finally {
    botao.disabled = false;
    botao.textContent = '💾 Salvar limpeza';
  }
}

document.getElementById('botaoSalvar').addEventListener('click', salvarLimpeza);
document.getElementById('botaoConfirmarData').addEventListener('click', confirmarData);

document.getElementById('botaoNovaLimpeza').addEventListener('click', () => {
  document.getElementById('areaConfirmacao').style.display = 'none';
  document.getElementById('tituloTopo').textContent = 'Registrar limpeza';
  document.getElementById('subtituloTopo').textContent = 'Escolha a cabana';
  cabanaEscolhida = null;
  dataLimpeza = null;
  notaHospede = null;
  renderCabanas();
});

iniciar();
