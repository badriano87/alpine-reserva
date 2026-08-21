// Garante que só entra nesta página quem já digitou a senha em index.html.
(function () {
  const senha = sessionStorage.getItem('alpine_senha');
  if (!senha) {
    window.location.href = 'index.html';
  }
})();
