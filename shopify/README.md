# Quetzalli — Nova Home (Palo Alto 9.2.0)

Seções personalizadas que reproduzem o layout de "Home Quetzalli - Proposta". Funcionam como seções nativas: aparecem em *Personalizar → Adicionar seção* e todo texto, imagem e coleção é editável.

## Arquivos
| Arquivo | Vai para |
|---|---|
| assets/qtz-home.css | Assets |
| snippets/qtz-free-shipping-bar.liquid | Snippets |
| sections/qtz-hero.liquid | Sections |
| sections/qtz-sabores.liquid | Sections |
| sections/qtz-kits.liquid | Sections |
| sections/qtz-ingredientes.liquid | Sections |
| sections/qtz-split-cta.liquid | Sections |
| sections/qtz-blog.liquid | Sections |

## Instalação
1. **Loja virtual → Temas → Palo Alto → ⋯ → Duplicar.** Trabalhe só na cópia.
2. Na cópia: **⋯ → Editar código**. Em cada pasta (Assets / Snippets / Sections) clique em *Adicionar novo arquivo*, use o mesmo nome e cole o conteúdo.
3. Em **layout/theme.liquid**, antes de `</head>`, adicione:
   ```liquid
   {{ 'qtz-home.css' | asset_url | stylesheet_tag }}
   ```
4. Barra de frete grátis: em **sections/header.liquid** (ou no snippet do carrinho/drawer do Palo Alto), logo depois do header, adicione:
   ```liquid
   {% render 'qtz-free-shipping-bar', threshold: 159 %}
   ```
5. **Metafields** (Configurações → Dados personalizados → Produtos → Adicionar definição):
   | Nome | Namespace e chave | Tipo | Exemplo |
   |---|---|---|---|
   | Destilado | custom.destilado | Texto (linha única) | Tequila |
   | Frutas | custom.frutas | Texto (linha única) | Maracujá & Limão |
   | Perfil de sabor | custom.perfil_sabor | Texto (linha única) | Cítrico, refrescante, final seco. |
   | Cor do card | custom.cor_card | Cor | #F4D5A8 |
   | Selo | custom.selo | Texto (linha única) | Mais vendido |
   | Garrafas no kit | custom.garrafas | Número inteiro | 4 |
   Preencha nos 4 drinks e nos kits. Sem metafield, o card usa o título do produto.
6. **Personalizar → Página inicial**: remova as seções antigas e adicione, nesta ordem:
   Hero Quetzalli → Sabores Quetzalli (coleção *Todos os drinks*) → Kits Quetzalli (coleção *Kit*) → Ingredientes Quetzalli → Avaliações (bloco do app existente) → Eventos + Revenda → Blog Quetzalli.
7. Barra de anúncio (seção nativa): deixe **uma** mensagem: "Frete grátis acima de R$ 159 · São Paulo sem mínimo".
8. Pré-visualize no celular → **Publicar**.

## Fontes
- **Calibre** é fonte licenciada: para web, confirme a licença com a Klim Type Foundry. Com licença, suba os .woff2 em Assets e descomente o bloco @font-face no topo do CSS.
- Sem licença, o CSS cai na **Raleway** (Google Fonts) — fallback previsto no brandbook.
- **Bodoni Moda** (Google Fonts) substitui a Bodoni Poster nos títulos display.

## Imagens
- Garrafas: PNG 1200×1800 (2:3), fundo branco, garrafa centralizada ocupando ~85% da altura.
- Hero: JPG 1600×2000 (4:5), até 400 KB.

## Correções de conteúdo (fazer junto)
- Post "O consumo de Tequila no Brasil…": remover "Introdução tesstete".
- Data do blog: a seção qtz-blog já usa formato "07 ago 2025".
- Título "O que os cliente estão falando" → corrigir no app de reviews.

## Medir
Antes de publicar, anote no GA4/Shopify: conversão, taxa de add-to-cart, ticket médio. Compare após 2–4 semanas.
