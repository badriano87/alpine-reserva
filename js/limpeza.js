// Tela da Liliane: registrar o status de cada produto durante a limpeza.

const STATUS_OPCOES = ['Repus agora', 'Não necessitou reposição', 'Está em falta no estoque', 'Danificado'];
const STATUS_PADRAO = 'Não necessitou reposição';

let cabanas = [];
let produtos = [];
let cabanaEscolhida = null;
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
  estadoItens = {};
  produtos.forEach(p => {
    estadoItens[p.nome] = { status: STATUS_PADRAO, observacao: '' };
  });

  document.getElementById('tituloTopo').textContent = 'Limpeza — ' + cabana.nome;
  document.getElementById('subtituloTopo').textContent = 'Marque os itens que forem diferentes de "Ok"';
  document.getElementById('areaCabanas').style.display = 'none';

  renderChecklist();

  document.getElementById('areaChecklist').style.display = 'block';
  document.getElementById('barraSalvar').style.display = 'block';
}

function renderChecklist() {
  const container = document.getElementById('listaAmbientes');
  container.innerHTML = '';

  const ambientes = [];
  produtos.forEach(p => {
    if (ambientes.indexOf(p.ambiente) === -1) ambientes.push(p.ambiente);
  });

  ambientes.forEach(ambiente => {
    const secao = document.createElement('div');
    secao.className = 'ambiente';

    const titulo = document.createElement('div');
    titulo.className = 'ambiente-titulo';
    titulo.textContent = ambiente;
    secao.appendChild(titulo);

    produtos
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

  STATUS_OPCOES.forEach(status => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'botao-status';
    btn.dataset.status = status;
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

async function salvarLimpeza() {
  const botao = document.getElementById('botaoSalvar');
  botao.disabled = true;
  botao.textContent = 'Salvando...';

  const itens = produtos.map(p => ({
    ambiente: p.ambiente,
    produto: p.nome,
    status: estadoItens[p.nome].status,
    observacao: estadoItens[p.nome].observacao
  }));

  try {
    const resultado = await chamarApi('salvarLimpeza', {
      cabana: cabanaEscolhida.nome,
      itens: itens
    });
    if (!resultado || !resultado.ok) {
      throw new Error((resultado && resultado.erro) || 'Não foi possível salvar.');
    }

    const pendentes = itens.filter(i => i.status !== STATUS_PADRAO).length;
    document.getElementById('resumoConfirmacao').textContent =
      pendentes === 0
        ? 'Tudo certo por aqui — nenhum item pendente.'
        : pendentes + ' item(ns) marcados com atenção (reposição ou dano).';

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

document.getElementById('botaoNovaLimpeza').addEventListener('click', () => {
  document.getElementById('areaConfirmacao').style.display = 'none';
  document.getElementById('tituloTopo').textContent = 'Registrar limpeza';
  document.getElementById('subtituloTopo').textContent = 'Escolha a cabana';
  cabanaEscolhida = null;
  renderCabanas();
});

iniciar();
