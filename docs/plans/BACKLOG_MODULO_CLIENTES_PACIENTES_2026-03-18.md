# Backlog do Módulo Clientes e Pacientes

## Status

- Aberto
- Data: 18/03/2026
- Escopo atual: módulo `Clientes` / futuro módulo `Pacientes`

## Decisão já tomada

O comparativo de mapa corporal foi retirado do app web atual para não gerar
acoplamento e retrabalho antes da construção do app mobile do estúdio.

### Direção escolhida para retomada futura

1. Caminho preferido: `SVG segmentado`
2. Motivo:
   - melhor equilíbrio entre clareza clínica, interatividade e portabilidade
     para o app mobile;
   - preserva um contrato claro de regiões corporais;
   - reduz risco de recomeçar do zero quando o módulo sair do web e entrar no
     app nativo.

## Itens em aberto

### 1. Mapa corporal clínico

- Implementar primeiro no app mobile do estúdio
- Usar regiões corporais padronizadas, não hotspots soltos
- Definir contrato de persistência por região:
  - intensidade
  - tipo de achado
  - observação
  - data/sessão
  - profissional responsável

### 2. Prontuário estruturado

- Separar claramente:
  - anamnese base do cliente
  - histórico clínico longitudinal
  - evolução por sessão
  - sinais corporais estruturados
- Integrar o prontuário ao atendimento sem depender apenas de texto livre

### 3. Evolução futura 3D

- Não entra no app agora
- Fica registrada como trilha futura de produto
- Próximo passo quando retomarmos:
  - comparar BioDigital vs base própria com renderização 3D
  - validar custo, licenciamento e aderência ao app nativo

## Critério para retomada

Retomar este backlog somente quando:

1. o app mobile do estúdio estiver criado;
2. o contrato do prontuário textual estiver estabilizado;
3. a modelagem de regiões corporais tiver sido aprovada.

## Observação de governança

Este tema foi deliberadamente retirado da interface atual do app para evitar
protótipo vivo em rota de produção/homologação sem decisão funcional fechada.
