// O Alinhador — função serverless (padrão Arquiteto v2)
// Chave da Anthropic em variável de ambiente ANTHROPIC_API_KEY (Vercel > Settings > Environment Variables)
// Runtime Node.js padrão da Vercel: CommonJS (module.exports)

const MODEL = process.env.ANTHROPIC_MODEL || 'claude-sonnet-5';
const EFFORT = process.env.ANTHROPIC_EFFORT || 'medium';
const MAX_TOKENS = 8000;

const SYSTEM_PROMPT = `Você é O ALINHADOR, ferramenta pedagógica da disciplina Seminário de Pesquisa (Doutorado em Direito, Fadisp). Sua única função é examinar a coerência interna da cadeia de um projeto de pesquisa (tema → pergunta → hipótese → objetivos) e devolver PERGUNTAS sobre desalinhamentos.

REGRAS INEGOCIÁVEIS:
1. Você SÓ PERGUNTA. Nunca corrige, nunca reescreve, nunca sugere versão alternativa de nenhum trecho, nem como exemplo. A decisão é sempre do pesquisador.
2. Máximo de 5 perguntas. Se a cadeia estiver razoavelmente alinhada, devolva MENOS perguntas (2, 1 ou até nenhuma). É PROIBIDO inventar problema para preencher cota. Uma cadeia sólida merece reconhecimento sóbrio, sem elogio gratuito.
3. Cada pergunta deve citar LITERALMENTE os trechos em tensão, copiados exatamente dos campos fornecidos (pode recortar, nunca parafrasear nem corrigir a redação do aluno).
4. Tom exigente, nunca humilhante. Perguntas diretas, específicas, respondíveis.
5. Escreva em português brasileiro acadêmico, mas vivo.

AS 7 CATEGORIAS DE DESALINHAMENTO (use o número e o nome):
1. Pergunta órfã do tema — a pergunta trata de algo que o tema declarado não anuncia, ou vice-versa
2. Hipótese que não responde — a hipótese responde a outra pergunta, mais cômoda, que não foi a formulada
3. Hipótese-truísmo — afirmação com a qual ninguém discordaria; não há aposta arriscada
4. Objetivo geral desgarrado — o objetivo geral promete mais, menos ou outra coisa do que a pergunta pede
5. Específico sem função — objetivo específico que não contribui para o geral nem para testar a hipótese
6. Lacuna de percurso — os específicos, somados, não entregam o objetivo geral; falta um passo
7. Contrabando — elemento que aparece num elo e some nos demais (ex.: o direito comparado que está no objetivo mas não na pergunta; o recorte temporal que está no tema e evapora nos objetivos)

FORMATO DE RESPOSTA — responda APENAS com JSON válido, sem markdown, sem crase, sem preâmbulo:
{
  "diagnostico": "tensoes" | "alinhada",
  "sintese": "1 a 2 frases sóbrias sobre o estado geral da cadeia",
  "perguntas": [
    {
      "categoria": 1,
      "categoria_nome": "Pergunta órfã do tema",
      "elo_a": { "campo": "Tema", "trecho": "citação literal recortada" },
      "elo_b": { "campo": "Pergunta de pesquisa", "trecho": "citação literal recortada" },
      "pergunta": "A pergunta de desalinhamento, dirigida ao pesquisador em segunda pessoa.",
      "nota": "1 frase sobre por que este ponto importa para a tese."
    }
  ]
}

Os valores possíveis de "campo" são exatamente: "Tema", "Pergunta de pesquisa", "Hipótese", "Objetivo geral", "Objetivo específico N" (N = número), "Referências".
Se "diagnostico" for "alinhada", "perguntas" pode ser um array vazio ou conter 1 pergunta de aprofundamento honesta, se houver.`;

// Schema aplicado pela própria API (structured outputs): a resposta não pode
// voltar fora deste formato, o que elimina a classe de erro "JSON inesperado".
const RESPONSE_SCHEMA = {
  type: 'object',
  properties: {
    diagnostico: { type: 'string', enum: ['tensoes', 'alinhada'] },
    sintese: { type: 'string' },
    perguntas: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          categoria: { type: 'integer', enum: [1, 2, 3, 4, 5, 6, 7] },
          categoria_nome: { type: 'string' },
          elo_a: { $ref: '#/$defs/elo' },
          elo_b: { $ref: '#/$defs/elo' },
          pergunta: { type: 'string' },
          nota: { type: 'string' }
        },
        required: ['categoria', 'categoria_nome', 'elo_a', 'elo_b', 'pergunta', 'nota'],
        additionalProperties: false
      }
    }
  },
  required: ['diagnostico', 'sintese', 'perguntas'],
  additionalProperties: false,
  $defs: {
    elo: {
      type: 'object',
      properties: {
        campo: { type: 'string' },
        trecho: { type: 'string' }
      },
      required: ['campo', 'trecho'],
      additionalProperties: false
    }
  }
};

const espera = (ms) => new Promise((r) => setTimeout(r, ms));

// Uma turma inteira usa a mesma chave ao mesmo tempo: 429 e 529 são esperados.
// Duas retentativas com espera crescente antes de devolver erro ao aluno.
async function chamarAnthropic(apiKey, userContent) {
  const tentativas = 3;
  let ultimaResposta = null;

  for (let i = 0; i < tentativas; i++) {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: MAX_TOKENS,
        system: SYSTEM_PROMPT,
        output_config: {
          effort: EFFORT,
          format: { type: 'json_schema', schema: RESPONSE_SCHEMA }
        },
        messages: [{ role: 'user', content: userContent }]
      })
    });

    if (response.ok) return response;

    ultimaResposta = response;
    const recuperavel = response.status === 429 || response.status === 529 || response.status >= 500;
    if (!recuperavel || i === tentativas - 1) return response;

    const retryAfter = parseInt(response.headers.get('retry-after') || '0', 10);
    await espera(retryAfter > 0 ? Math.min(retryAfter, 10) * 1000 : 1500 * (i + 1));
  }

  return ultimaResposta;
}

module.exports = async (req, res) => {
  // CORS básico (mesmo domínio na Vercel; preflight por segurança)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método não permitido.' });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'Chave da API não configurada no servidor. Configure ANTHROPIC_API_KEY na Vercel.' });
  }

  try {
    const { tema, pergunta, hipotese, objetivoGeral, especificos, referencias } = req.body || {};

    if (!tema || !pergunta || !hipotese || !objetivoGeral || !especificos || !especificos.length) {
      return res.status(400).json({ error: 'Preencha tema, pergunta, hipótese, objetivo geral e ao menos um objetivo específico.' });
    }

    const listaEspecificos = especificos
      .map((e, i) => `Objetivo específico ${i + 1}: ${e}`)
      .join('\n');

    const userContent = `CADEIA DO PROJETO A EXAMINAR:

Tema: ${tema}

Pergunta de pesquisa: ${pergunta}

Hipótese: ${hipotese}

Objetivo geral: ${objetivoGeral}

${listaEspecificos}
${referencias ? `\nReferências centrais (opcional): ${referencias}` : ''}

Examine a coerência interna desta cadeia e responda no formato JSON especificado.`;

    const response = await chamarAnthropic(apiKey, userContent);

    if (!response.ok) {
      const errBody = await response.text();
      console.error('Erro Anthropic:', response.status, errBody);
      if (response.status === 429) return res.status(429).json({ error: 'Muitas requisições simultâneas. Aguarde alguns segundos e tente novamente.' });
      if (response.status === 529) return res.status(529).json({ error: 'Servidores de IA sobrecarregados. Aguarde 1–2 minutos.' });
      return res.status(502).json({ error: 'Falha na chamada à IA. Tente novamente.' });
    }

    const data = await response.json();

    // A resposta pode terminar por outros motivos que não a conclusão normal.
    if (data.stop_reason === 'max_tokens') {
      console.error('Resposta truncada em max_tokens.');
      return res.status(502).json({ error: 'A análise ficou longa demais e foi interrompida. Tente novamente.' });
    }
    if (data.stop_reason === 'refusal') {
      console.error('Recusa do modelo:', JSON.stringify(data.stop_details || {}));
      return res.status(502).json({ error: 'A IA não conseguiu examinar esta cadeia. Revise os campos e tente novamente.' });
    }

    const text = (data.content || [])
      .filter((b) => b.type === 'text')
      .map((b) => b.text)
      .join('\n');

    // Sanitizar possível cerca de markdown antes do parse
    const clean = text.replace(/```json|```/g, '').trim();
    let parsed;
    try {
      parsed = JSON.parse(clean);
    } catch (e) {
      console.error('JSON inválido da IA:', clean.slice(0, 400));
      return res.status(502).json({ error: 'A resposta da IA veio em formato inesperado. Tente novamente.' });
    }

    // Teto duro de 5 perguntas, garantido no servidor
    if (Array.isArray(parsed.perguntas) && parsed.perguntas.length > 5) {
      parsed.perguntas = parsed.perguntas.slice(0, 5);
    }

    return res.status(200).json(parsed);
  } catch (err) {
    console.error('Erro interno:', err);
    return res.status(500).json({ error: 'Erro interno. Tente novamente.' });
  }
};
