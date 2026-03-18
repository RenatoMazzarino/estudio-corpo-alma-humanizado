# Comparativo Real de Mapa Corporal

## Objetivo

Este material acompanha a rota real:

- [http://localhost:3000/clientes/prototipo-corporal](http://localhost:3000/clientes/prototipo-corporal)

O foco agora não é mais um comparativo conceitual. O foco é comparar:

1. aparência do corpo;
2. forma de interação com ele;
3. caminho de reaproveitamento no mobile;
4. possibilidade de evolução futura para 3D.

## O que mudou nesta rodada

Antes, a tela comparava apenas cenários visuais em cima da mesma base. Isso não
servia para decisão real.

Agora a rota foi refeita com implementações realmente diferentes:

1. `SVG com hotspots`
2. `SVG segmentado`
3. `3D interativo`

## Opção 1: SVG com hotspots

### O que o SVG com hotspots mostra

- silhueta 2D estilizada;
- pontos de dor/tensão como hotspots;
- leitura visual mais leve e mais editorial.

### Onde o SVG com hotspots é forte

1. rápida de operar;
2. visualmente suave;
3. boa para atendimento corrido.

### Limite principal do SVG com hotspots

Ela é boa para velocidade, mas menos precisa do que um corpo realmente
segmentado por regiões.

## Opção 2: SVG segmentado

### O que o SVG segmentado mostra

- corpo 2D dividido em áreas reais clicáveis;
- preenchimento por região;
- componente desenhado com `<svg>` nativo do navegador, mantendo a mesma
  modelagem de regiões que depois pode ser portada para mobile.

### Onde o SVG segmentado é forte

1. melhor caminho para compartilhar com mobile;
2. regiões clínicas mais explícitas;
3. base mais profissional para virar produto.

### Limite principal do SVG segmentado

É um pouco mais “técnica” visualmente e menos leve do que a versão por
hotspots.

## Opção 3: 3D interativo

### O que o 3D interativo mostra

- corpo tridimensional navegável;
- rotação livre;
- clique em volumes do corpo;
- preview do que o módulo pode virar no futuro.

### Onde o 3D interativo é forte

1. mostra um caminho premium real;
2. ajuda a visualizar evolução futura;
3. já usa base compatível com ecossistema web/mobile 3D.

### Limite principal do 3D interativo

Não é a melhor primeira interface para registro rápido de sessão. Hoje ele é
mais um preview forte de futuro do que a tela ideal para a operação principal da
Jana.

## Dependências reais usadas

Nesta rodada passaram a existir dependências reais no repo para o comparativo:

1. [`three`](https://www.npmjs.com/package/three)
2. [`@react-three/fiber`](https://www.npmjs.com/package/@react-three/fiber)
3. [`@react-three/drei`](https://www.npmjs.com/package/@react-three/drei)

## O que não foi usado

Nesta rodada não foi necessário:

1. token externo;
2. API paga;
3. reunião com comercial;
4. serviço 3D fechado.

## Leitura técnica atual

Se a decisão fosse tomada hoje:

1. o caminho mais equilibrado para produto é `SVG segmentado`;
2. o caminho mais leve para operação é `SVG com hotspots`;
3. o caminho mais valioso para visão futura é `3D interativo`.

## Decisão que fica para você

Ao navegar pela rota, a decisão prática é:

1. qual corpo parece mais profissional para o estúdio;
2. qual interação faz mais sentido para a Jana no dia a dia;
3. se o 3D deve ficar só como visão futura ou se já entra como trilha oficial
   depois do 2D.
