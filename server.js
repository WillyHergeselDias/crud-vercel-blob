// server.js

// --- 1. Importação das Bibliotecas ---
// Importa o framework Express para criar o servidor.
const express = require('express');
// Importa as funções 'put' (para upload) e 'list' (para listar) do SDK do Vercel Blob.
const { put, list, del } = require('@vercel/blob');
// Importa a biblioteca dotenv para carregar variáveis de ambiente do arquivo .env.
const dotenv = require('dotenv');
// Importa o módulo 'path' do Node.js para lidar com caminhos de arquivos.
const path = require('path');

// --- 2. Configuração Inicial ---
// Carrega as variáveis definidas no arquivo .env para process.env.
dotenv.config();
// Cria uma instância do aplicativo Express.
const app = express();

// --- 3. Definição das Rotas da API ---

// Rota para UPLOAD de arquivos (método POST)
app.post('/api/upload', async (req, res) => {
  // O nome do arquivo é enviado pelo frontend através de um cabeçalho personalizado.
  const filename = req.headers['x-vercel-filename'];

  if (!filename) {
    return res.status(400).json({ message: 'O nome do arquivo é obrigatório no cabeçalho x-vercel-filename.' });
  }

  try {
    // A função 'put' do @vercel/blob faz todo o trabalho pesado.
    // Ela recebe o nome do arquivo, o corpo da requisição (o arquivo em si) e opções.
    const blob = await put(filename, req, {
      access: 'public', // Define o acesso como público para que qualquer um possa ver a imagem.
    });

    // Retorna os metadados do arquivo enviado (incluindo a URL) como resposta.
    res.status(200).json(blob);

  } catch (error) {
    console.error('Erro no upload:', error);
    res.status(500).json({ message: 'Erro ao fazer upload do arquivo.', error: error.message });
  }
});

// Rota para LISTAR os arquivos da galeria (método GET)
app.get('/api/files', async (req, res) => {
  try {
    // A função 'list()' busca todos os metadados dos arquivos no seu Blob store.
    const { blobs } = await list();
    // Retornamos a lista de arquivos como JSON.
    res.status(200).json(blobs);
  } catch (error) {
    console.error('Erro ao listar arquivos:', error);
    res.status(500).json({ message: 'Erro ao buscar a lista de arquivos.', error: error.message });
  }
});

// --- 4. Servindo o Frontend ---
// Middleware do Express que serve arquivos estáticos (HTML, CSS, JS do cliente)
// da pasta 'public'. Isso é importante para o teste local.
app.use(express.static(path.join(__dirname, 'public')));

// --- 5. Inicialização do Servidor ---
// Define a porta do servidor. Usa a porta definida no ambiente ou 3000 como padrão.
const PORT = process.env.PORT || 3000;

// Deletar arquivo
app.delete('/api/delete', express.json(), async (req, res) => {
  const { pathname } = req.body;
  if (!pathname) return res.status(400).json({ message: 'Caminho do arquivo é obrigatório.' });

  try {
    await del(pathname);
    res.status(200).json({ message: 'Arquivo excluído com sucesso.' });
  } catch (error) {
    console.error('Erro ao excluir arquivo:', error);
    res.status(500).json({ message: 'Erro ao excluir arquivo.', error: error.message });
  }
});

// Renomear arquivo
app.put('/api/rename', express.json(), async (req, res) => {
  const { pathname, newName } = req.body;
  if (!pathname || !newName) {
    return res.status(400).json({ message: 'Caminho e novo nome são obrigatórios.' });
  }

  try {
    // Baixa o arquivo existente
    const fileUrl = `https://blob.vercel-storage.com/${pathname}`;
    const response = await fetch(fileUrl);
    if (!response.ok) throw new Error("Erro ao buscar o arquivo original.");
    const buffer = await response.arrayBuffer();

    // Faz upload com o novo nome
    const newPath = pathname.split('/').slice(0, -1).concat(newName).join('/');
    const blob = await put(newPath, Buffer.from(buffer), { access: 'public' });

    // Exclui o antigo
    await del(pathname);

    res.status(200).json(blob);
  } catch (error) {
    console.error('Erro ao renomear arquivo:', error);
    res.status(500).json({ message: 'Erro ao renomear arquivo.', error: error.message });
  }
});

// Inicia o servidor e o faz "escutar" por requisições na porta definida.
app.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
});