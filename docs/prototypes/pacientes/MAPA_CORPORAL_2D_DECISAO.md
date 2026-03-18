# Mapa Corporal 2D para Atendimento e Prontuário

## Objetivo

Consolidar em um único lugar:

1. o problema que queremos resolver no módulo de pacientes;
2. os critérios de escolha da solução 2D;
3. a relação com o futuro app nativo do estúdio;
4. a relação com uma futura camada 3D;
5. os três caminhos 2D mais viáveis para decisão.

## Contexto funcional

Hoje, a evolução no atendimento é principalmente textual. Isso funciona para
registrar a sessão, mas ainda não transforma o módulo de clientes em um
prontuário estruturado forte.

O que queremos agora é:

1. manter a rapidez da Jana no atendimento;
2. adicionar uma entrada visual de dor, tensão, rigidez e sensibilidade;
3. alimentar um prontuário estruturado por sessões;
4. preservar uma base que continue válida quando o app do estúdio virar Android
   nativo;
5. não tomar uma decisão que gere retrabalho quando o 3D entrar no futuro.

## Regra central de arquitetura

A base durável não deve ser a biblioteca visual. A base durável deve ser o
modelo clínico do corpo.

Em outras palavras:

1. o sistema salva regiões, intensidade, tipo de achado, observação e contexto
   da sessão;
2. a camada visual apenas renderiza isso;
3. hoje podemos renderizar em 2D;
4. amanhã podemos renderizar no app nativo;
5. depois podemos renderizar em 3D sem refazer o prontuário.

## Critérios de escolha

A opção escolhida precisa atender bem estes pontos:

1. boa usabilidade no atendimento do estúdio;
2. boa adaptação ao celular;
3. baixo retrabalho para Android nativo;
4. possibilidade de evoluir para visualização mais rica;
5. controle suficiente sobre as regiões corporais;
6. manutenção profissional no repo.

## Caminho 1: SVG próprio com regiões clínicas

### Descrição do caminho 1

Usar um SVG anatômico próprio, frente e costas, com regiões nomeadas de acordo
com as necessidades clínicas do estúdio.

Exemplos:

- cervical
- trapézio esquerdo
- trapézio direito
- lombar
- glúteo esquerdo
- glúteo direito
- panturrilha
- mandíbula

### Vantagens do caminho 1

1. maior controle de produto;
2. melhor ponte para `react-native-svg` no app nativo;
3. modelo mais neutro para evolução futura;
4. visual totalmente alinhável ao sistema atual;
5. bom equilíbrio entre rapidez e solidez.

### Riscos do caminho 1

1. exige que a gente modele as regiões com cuidado;
2. exige montar componente próprio de interação;
3. entrega um pouco mais lenta do que usar um componente pronto.

### Quando o caminho 1 faz mais sentido

Quando queremos fazer certo desde já e evitar dependência desnecessária de uma
lib pequena.

## Caminho 2: Renderização premium com Skia

### Descrição do caminho 2

Manter o mesmo modelo clínico do caminho 1, mas pensar na camada visual futura
com `React Native Skia`, usando desenho mais fluido, heatmap, overlays e
timeline visual.

### Vantagens do caminho 2

1. melhor capacidade visual para app nativo;
2. abre caminho para heatmap corporal e animação de evolução;
3. melhor base para uma experiência mais premium do estúdio.

### Riscos do caminho 2

1. mais custo de engenharia agora;
2. mais complexidade para um problema que ainda pode começar em SVG;
3. não é o melhor primeiro passo se o foco imediato é produtividade clínica.

### Quando o caminho 2 faz mais sentido

Quando quisermos elevar a experiência visual do app do estúdio sem entrar ainda
no 3D.

## Caminho 3: Componente pronto para aceleração

### Descrição do caminho 3

Usar um body map pronto, como `react-body-highlighter`, apenas para acelerar a
validação inicial da UX do atendimento.

### Vantagens do caminho 3

1. menor tempo para sair do zero;
2. clique em regiões já pronto;
3. útil para validar fluxo com a Jana.

### Riscos do caminho 3

1. menor controle sobre granularidade clínica;
2. maior chance de refactor quando o app nativo entrar;
3. dependência de um componente externo para uma parte central do módulo.

### Quando o caminho 3 faz mais sentido

Quando quisermos provar a experiência antes de investir no mapa próprio.

## Recomendação técnica atual

Se a decisão for profissional e orientada a médio prazo, a recomendação é:

1. adotar o **caminho 1** como direção principal;
2. desenhar o componente 2D e o contrato de dados já pensando em uso futuro com
   `react-native-svg`;
3. guardar o **caminho 2** como evolução premium posterior;
4. usar o **caminho 3** apenas se quisermos um spike rápido e descartável.

## Relação com o futuro app nativo

Como o app que vai virar nativo é o do estúdio, a prioridade maior é
produtividade de operação da Jana.

Logo, o melhor desenho agora é:

1. toque rápido por região;
2. poucos campos por área marcada;
3. anamnese curta por sessão;
4. evolução textual continua existindo;
5. prontuário estruturado agrega e consolida as sessões.

## Relação com o futuro 3D

A ideia de usar 3D depois continua boa, mas o 3D não deve virar pretexto para
travar o 2D.

A estratégia correta é:

1. o dado clínico nasce neutro;
2. o 2D atende o estúdio agora;
3. o 3D entra depois como nova camada de visualização.

Assim, o prontuário não precisa ser refeito quando o 3D chegar.

## O que a página real mostra

A rota real do app simula:

1. a tela de atendimento com entrada corporal e evolução;
2. a tela de prontuário estruturado;
3. os três caminhos visuais para decisão;
4. a comparação dentro da linguagem atual do sistema.

Rota:

- [http://localhost:3000/clientes/prototipo-corporal](http://localhost:3000/clientes/prototipo-corporal)

## Como usar a página

1. abrir a rota no navegador já autenticado no painel;
2. alternar entre os três caminhos;
3. alternar entre `Atendimento` e `Prontuário`;
4. interagir com o corpo e com os cards de sessão;
5. comparar o que melhor combina com o sistema e com o futuro mobile.

## Fontes técnicas usadas na análise

1. [`react-native-svg`](https://github.com/software-mansion/react-native-svg)
2. [`react-native-svg` no npm](https://www.npmjs.com/package/react-native-svg)
3. [`React Native Skia`](https://shopify.github.io/react-native-skia/)
4. [`react-body-highlighter`](https://github.com/GV79/react-body-highlighter)
5. [`react-body-highlighter` no npm](https://www.npmjs.com/package/@jpedro002/react-body-highlighter)
6. [`Annotorious`](https://annotorious.dev/)
7. [`BioDigital Developer Toolkits`](https://www.biodigital.com/product/developer-toolkits)

## Decisão que fica para você

Depois de navegar pela página real, a decisão prática é esta:

1. queremos ir direto para a base mais correta e durável, com SVG próprio;
2. queremos um salto visual premium futuro e deixamos isso previsto desde já;
3. ou queremos usar um componente pronto apenas para acelerar uma validação
   curta.
