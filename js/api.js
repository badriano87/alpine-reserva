// Funções de comunicação com o Apps Script (nosso "banco de dados").

async function chamarApi(action, dados = {}) {
  if (!APP_SCRIPT_URL || APP_SCRIPT_URL.indexOf('COLE_AQUI') !== -1) {
    throw new Error(
      'A URL do Apps Script ainda não foi configurada em js/config.js.'
    );
  }

  const senha = sessionStorage.getItem('alpine_senha') || '';
  const corpo = Object.assign({ action: action, senha: senha }, dados);

  let resposta;
  try {
    resposta = await fetch(APP_SCRIPT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(corpo)
    });
  } catch (err) {
    throw new Error('Não foi possível conectar ao servidor. Verifique sua internet.');
  }

  if (!resposta.ok) {
    throw new Error('O servidor respondeu com erro (' + resposta.status + ').');
  }

  const json = await resposta.json();
  if (json.ok === false && json.erro === 'Senha inválida.') {
    sessionStorage.removeItem('alpine_senha');
    window.location.href = 'index.html';
    return;
  }
  return json;
}
