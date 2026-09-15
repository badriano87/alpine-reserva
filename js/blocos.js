// Configuração compartilhada dos blocos do checklist (limpeza.html, estoque.html e avaliacoes.html).

const BLOCO_LIMPEZA = 'Limpeza';
const BLOCO_REPOSICAO = 'Reposicao';
const BLOCO_CONSERVACAO = 'Conservacao';

const STATUS_LIMPEZA = ['Acima da Metade', 'Pela metade', 'Menos da metade', 'Em falta'];
const STATUS_REPOSICAO = ['Repus agora', 'Não necessitou de reposição', 'Em falta'];
const STATUS_CONSERVACAO_COZINHA = ['Apto para uso', 'Quebrado/Danificado', 'Em falta'];
const STATUS_CONSERVACAO_TEXTIL = [
  'Está como novo',
  'Muito uso, mas ainda bom',
  'Muito uso, com marcas de desgaste',
  'Não é mais possível usar'
];

// Ambientes do bloco Conservação que usam a escala de tecido (Banheiro/Cama)
// em vez da escala de louça/utensílio (Cozinha).
const AMBIENTES_TEXTIL = ['Banheiro', 'Cama'];

function opcoesStatus(bloco, ambiente) {
  if (bloco === BLOCO_LIMPEZA) return STATUS_LIMPEZA;
  if (bloco === BLOCO_REPOSICAO) return STATUS_REPOSICAO;
  if (bloco === BLOCO_CONSERVACAO) {
    return AMBIENTES_TEXTIL.indexOf(ambiente) !== -1 ? STATUS_CONSERVACAO_TEXTIL : STATUS_CONSERVACAO_COZINHA;
  }
  return [];
}

function statusPadrao(bloco, ambiente) {
  // A primeira opção de cada lista é sempre o estado "tudo certo, nada a fazer".
  return opcoesStatus(bloco, ambiente)[0];
}

// Mapa de status -> nível visual, usado para colorir botões e etiquetas
// de forma consistente sem precisar de uma regra de CSS por status.
const STATUS_NIVEL = {
  'Acima da Metade': 'otimo',
  'Pela metade': 'bom',
  'Menos da metade': 'atencao',
  'Repus agora': 'bom',
  'Não necessitou de reposição': 'otimo',
  'Apto para uso': 'otimo',
  'Quebrado/Danificado': 'critico',
  'Está como novo': 'otimo',
  'Muito uso, mas ainda bom': 'bom',
  'Muito uso, com marcas de desgaste': 'atencao',
  'Não é mais possível usar': 'falta',
  'Em falta': 'falta'
};

function nivelStatus(status) {
  return STATUS_NIVEL[status] || 'bom';
}

// Nota que a Liliane dá para o estado em que o hóspede deixou a cabana.
const NOTAS_HOSPEDE = [
  'Muito sujo e bagunçado',
  'Muito sujo',
  'Sujo e bagunçado',
  'Sujo',
  'Pouco cuidado',
  'Uso razoável',
  'Bem cuidado',
  'Limpo',
  'Muito limpo e organizado',
  'Tudo limpo e arrumado'
];
