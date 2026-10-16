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
| sections/qtz-confianca.liquid | Sections |

## Instalação
1. **Loja virtual → Temas → Palo Alto → ⋯ → Duplicar.** Trabalhe só na cópia.
2. Na cópia: **⋯ → Editar código**. Em cada pasta (Assets / Snippets / Sections) clique em *Adicionar novo arquivo*, use o mesmo nome e cole o conteúdo.
3. Em **layout/theme.liquid**, antes de `</head>`, adicione (as fontes vêm por `<link>`, não por `@import` no CSS, para não atrasar a página):
   ```liquid
   <link rel="preconnect" href="https://fonts.googleapis.com">
   <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
   <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Bodoni+Moda:ital,wght@0,700;1,700&family=Raleway:wght@400;500;600;700;800;900&display=swap">
   {{ 'qtz-home.css' | asset_url | stylesheet_tag }}
   ```
4. Barra de frete grátis: ainda em **layout/theme.liquid**, logo **depois** da linha `{% sections 'group-header' %}` (neste tema o grupo se chama `group-header`; não edite `sections/header.liquid`), adicione:
   ```liquid
   {% render 'qtz-free-shipping-bar' %}
   ```
   O valor mínimo vem sozinho das configurações do tema (*Carrinho → limite de frete grátis*, hoje **R$ 159,90**) — o mesmo da barra de anúncio. Quem decide se o frete sai grátis de verdade é o app **Frenet**: a regra lá precisa ser a mesma.
5. **Campos extras dos produtos (metafields)** — servem para o card mostrar "Tequila", "Maracujá & Limão", o selo "Mais vendido", a cor de fundo e o preço por garrafa. Sem eles a home funciona, mas o card mostra só o nome do produto.
   **Parte A — criar os campos (uma vez só):** *Configurações → Metacampos e metaobjetos → Produtos → Adicionar definição*. Para cada linha da tabela: digite o **Nome**, confira que o *Namespace e chave* ficou igual ao da tabela (se não, edite), escolha o **Tipo** e clique *Salvar*.
   | Nome | Namespace e chave | Tipo | Exemplo |
   |---|---|---|---|
   | Destilado | custom.destilado | Texto (linha única) | Tequila |
   | Frutas | custom.frutas | Texto (linha única) | Maracujá & Limão |
   | Perfil de sabor | custom.perfil_sabor | Texto (linha única) | Cítrico, refrescante, final seco. |
   | Cor do card | custom.cor_card | Cor | #F4D5A8 |
   | Selo | custom.selo | Texto (linha única) | Mais vendido |
   | Garrafas no kit | custom.garrafas | Número inteiro | 4 |
   **Parte B — preencher:** *Produtos →* abra cada drink → role até o fim da página, bloco **Metacampos** → preencha → *Salvar*. Nos kits, preencha pelo menos *Frutas*, *Perfil de sabor* e *Garrafas no kit*.
6. **Personalizar → Página inicial**: remova as seções antigas e adicione, nesta ordem:
   Hero Quetzalli → Sabores Quetzalli (coleção *Todos os drinks*) → Kits Quetzalli (coleção *Kit*) → Ingredientes Quetzalli → Avaliações (bloco do app existente) → Eventos + Revenda → Blog Quetzalli → **Pagamento e aviso legal**.
7. Barra de anúncio (seção nativa): deixe **uma** mensagem: "Frete grátis a partir de ||amount|| · São Paulo sem mínimo" (corrija também "New Qutzlover" → "Quetzlover").
8. No painel **Atacado & revenda**, cole o link do WhatsApp (`https://wa.me/5511956533601`) no campo *Link botão 1* — links externos não vão no preset.
9. Pré-visualize no celular → **Publicar**.

## Comportamento dos botões "Adicionar"
Os botões usam o formulário nativo da Shopify (`/cart/add`): o produto entra no carrinho e o cliente vai para a página `/cart`. Funciona em qualquer tema. Se quiser que abra a gaveta do carrinho do Palo Alto sem sair da home, é preciso ligar ao JavaScript do tema (envie o `assets/` do Palo Alto e isso é ajustado).

## Antes de publicar — checklist
- [ ] Metafields criados com os tipos exatos acima (Cor, Número inteiro etc.).
- [ ] Coleções *Todos os drinks* e *Kit* escolhidas nas seções.
- [ ] Preços da "escada" de kits (blocos de texto) conferidos com os preços reais.
- [ ] Seção **Pagamento e aviso legal** no fim da home (o rodapé atual já tem "Beba com moderação e Venda proibida a menores de 18 anos" + CNPJ — manter).
- [ ] Ícones de pagamento: confira se Pix, Visa, Mastercard e Elo aparecem com ícone; se algum sair só como texto, está ok (a Shopify não tem o ícone).

## Fontes
- **Calibre**: o CSS já está pronto. Em *Editar código → Assets → Adicionar novo recurso*, suba 4 arquivos com estes nomes exatos: `Calibre-Regular.woff2`, `Calibre-Semibold.woff2`, `Calibre-Bold.woff2`, `Calibre-Black.woff2`. Precisa ser **.woff2** e licença **web** (a licença desktop não cobre site). Se seus arquivos forem .otf/.ttf, converta para .woff2 antes.
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
