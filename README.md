# O Alinhador — v1.0

Auditoria de coerência interna do projeto de pesquisa (tema → pergunta → hipótese → objetivos).
**Só pergunta. Nunca corrige. Quem decide é o pesquisador.**

Suíte pedagógica do Seminário de Pesquisa (Doutorado em Direito, Fadisp):
O Interrogador · **O Alinhador** · O Arquiteto · O Parecerista.

**Em produção:** https://oalinhadorfadisp.com (URL interna da Vercel: `alinhador-lime.vercel.app`)

## Estrutura

```
alinhador/
├── index.html      # interface única (3 etapas: cadeia → tensões → deliberação)
├── api/
│   └── chat.js     # função serverless — chave da Anthropic fica no servidor
├── package.json
└── README.md
```

## Deploy (padrão Arquiteto v2 — Vercel + GitHub)

1. Repositório: `cbrunetta-glitch/alinhador` (público).
2. Na Vercel: **Add New → Project → importar o repositório**. Framework preset: **Other**. Sem build command, sem output directory (deploy estático + funções automáticas). **Root Directory: `./` (a raiz do repo)** — o `index.html` e a pasta `api/` estão na raiz, não em subpasta.
3. Em **Settings → Environment Variables**, criar:
   - `ANTHROPIC_API_KEY` = chave `sk-ant-...` (Production, Preview e Development).
4. **Deploy.** A URL pública já funciona para presenciais e remotos, sem nenhuma configuração pelo aluno.

Observações herdadas do Arquiteto v2:
- **Não** criar `vercel.json` (conflita com o roteamento automático das funções).
- `api/chat.js` usa `module.exports` (CommonJS) — exigência do runtime Node padrão da Vercel.
- Nada é armazenado: sem banco, sem logs de conteúdo, sessão apenas no navegador.
- Toda alteração precisa de commit + push; a Vercel redeploya sozinha. Mudança em env var exige redeploy manual.

### Variáveis de ambiente opcionais

Dá para ajustar custo, velocidade e modelo sem tocar no código:

| Variável | Padrão | Para que serve |
|---|---|---|
| `ANTHROPIC_API_KEY` | — | **Obrigatória.** |
| `ANTHROPIC_MODEL` | `claude-sonnet-5` | Trocar o modelo. |
| `ANTHROPIC_EFFORT` | `medium` | `low` corta o tempo de resposta pela metade (~10s em vez de ~20s), mas em teste passou a acusar problema inventado numa cadeia sólida. Só use `low` se a aula exigir velocidade. |

### Como o JSON é garantido

A resposta é imposta pela própria API via **structured outputs** (`output_config.format` com JSON Schema) — o modelo não consegue devolver fora do formato. O teto de 5 perguntas continua sendo aplicado no servidor. A função também trata resposta truncada (`max_tokens`), recusa do modelo, e faz até 2 retentativas em 429/529 — uma turma inteira usa a mesma chave ao mesmo tempo.

## Roteiro de QA (antes da Aula 3)

**A. Fumaça**
1. Abrir a URL → header navy/dourado, lema "Só pergunta. Quem decide é você."
2. Clicar em "Examinar" com campos vazios → erro amigável, sem chamada à API.

**B. Cadeia desalinhada de propósito** (colar e examinar)
- Tema: "A proteção de dados pessoais no setor de saúde suplementar"
- Pergunta: "Como o STF interpreta a reserva do possível em demandas de medicamentos?"
- Hipótese: "A proteção de dados é importante para o direito."
- Objetivo geral: "Propor um marco regulatório para inteligência artificial no Judiciário."
- Específicos: "Estudar a história da privacidade desde Roma" / "Comparar Brasil e Alemanha" / "Analisar julgados do STJ"

Esperado: até 5 perguntas; tensões com trechos **literais** lado a lado (tons azul × dourado); categorias plausíveis (pergunta órfã, hipótese-truísmo, objetivo desgarrado, contrabando de comparado…); **nenhuma sugestão de reescrita em nenhum texto**.

**C. Cadeia bem alinhada** (usar um projeto real seu de edição anterior)
Esperado: poucas perguntas (0–2) e síntese sóbria — sem elogio inflado, sem problema inventado.

**D. Deliberação**
1. Marcar posições diferentes nas perguntas (Procede / Sustento / Preciso pensar) → campo de nota abre com o placeholder certo.
2. Tentar copiar com uma pergunta sem posição → bloqueio com aviso.
3. Copiar tudo marcado → bloco de texto formatado no clipboard; colar no Caderno e conferir legibilidade.

**E. Paridade e resiliência**
1. Testar no celular (grid vira coluna única).
2. Duas a três pessoas usando simultaneamente.
3. "Examinar outra versão da cadeia" → volta limpa à Etapa 1, sem resíduo.

## Fora de escopo da v1 (registrado)
Painel da professora com visão agregada · link permanente de compartilhamento · modo "antes/depois" da cadeia.
