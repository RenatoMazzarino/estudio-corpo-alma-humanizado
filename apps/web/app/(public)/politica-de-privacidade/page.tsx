import type { Metadata } from "next";
import Link from "next/link";
import LegalDocumentShell from "../_components/legal-document-shell";

export const metadata: Metadata = {
  title: "Politica de Privacidade | Estudio Corpo & Alma Humanizado",
  description:
    "Politica de Privacidade do Estudio Corpo & Alma Humanizado para agendamentos, comunicacoes por WhatsApp Business e uso do sistema digital.",
};

const LAST_UPDATED = "25/02/2026";

export default function PrivacyPolicyPage() {
  return (
    <LegalDocumentShell
      title="Politica de Privacidade"
      subtitle="Privacidade e Protecao de Dados"
      lastUpdated={LAST_UPDATED}
    >
      <p>
        O <strong>Estudio Corpo &amp; Alma Humanizado</strong> trata dados pessoais para
        operacionalizar agendamentos, prestacao de servicos, comunicacoes com clientes e
        administracao de seu sistema de atendimento. Esta Politica explica, de forma transparente,
        quais dados sao tratados, para quais finalidades, por quanto tempo, com quem podem ser
        compartilhados e como o titular pode exercer seus direitos.
      </p>

      <p>
        O Estudio adota como referencia a <strong>Lei Geral de Protecao de Dados (LGPD)</strong>,
        o <strong>Marco Civil da Internet</strong> e boas praticas de seguranca, governanca e
        minimizacao de dados. Quando aplicavel, tambem considera padroes internacionais de
        protecao de dados como referencia de conformidade tecnica e organizacional.
      </p>

      <h2>1. Identificacao do Controlador</h2>
      <p>
        <strong>Controlador:</strong> Estudio Corpo &amp; Alma Humanizado
        <br />
        <strong>CNPJ:</strong> 59.163.080/0001-49
        <br />
        <strong>Endereco comercial:</strong> Rua Silva Pinto, 186 - Centro Historico, Amparo/SP,
        CEP 13900-319
        <br />
        <strong>WhatsApp comercial:</strong> (19) 99944-2184
        <br />
        <strong>E-mail oficial / privacidade:</strong> renatomazzarino10@gmail.com
      </p>

      <p>
        Para fins da LGPD, o Estudio atua, em regra, como <strong>Controlador</strong> dos dados
        pessoais tratados em seus fluxos de atendimento e comunicacao. Prestadores de infraestrutura
        e plataformas de mensageria operam como <strong>Operadores</strong> ou controladores
        independentes, conforme o caso e a natureza da integracao.
      </p>

      <h2>2. Escopo de Aplicacao</h2>
      <p>Esta Politica se aplica ao tratamento de dados pessoais no contexto de:</p>
      <ol>
        <li>agendamento de servicos presenciais e domiciliares;</li>
        <li>confirmacao, lembrete, reagendamento e cancelamento de atendimentos;</li>
        <li>comunicacao via WhatsApp Business App e/ou WhatsApp Business Platform (Cloud API);</li>
        <li>uso do sistema digital interno de gestao de clientes, agenda, pagamentos e mensagens;</li>
        <li>interacoes em paginas publicas do sistema, incluindo links de voucher e comprovantes;</li>
        <li>processamento tecnico de eventos via APIs, webhooks, logs e trilhas de auditoria;</li>
        <li>
          evolucao futura do sistema para operacao multiempresa, integracoes de parceiro e
          coexistencia WhatsApp.
        </li>
      </ol>

      <h2>3. Categorias de Dados Pessoais Tratados</h2>
      <h3>3.1 Dados fornecidos diretamente pelo titular</h3>
      <ul>
        <li>nome e forma de identificacao usada no atendimento;</li>
        <li>numero de telefone e identificadores relacionados ao WhatsApp (ex.: wa_id);</li>
        <li>endereco de atendimento, quando houver atendimento domiciliar;</li>
        <li>servico escolhido, data e horario do agendamento;</li>
        <li>mensagens enviadas pelo cliente e respostas a botoes/menus interativos;</li>
        <li>informacoes operacionais necessarias para execucao segura do atendimento.</li>
      </ul>

      <h3>3.2 Dados tecnicos e operacionais de mensageria</h3>
      <p>
        Quando o Estudio utiliza a Plataforma WhatsApp Business (Cloud API), podem ser tratados
        dados tecnicos de entrega, rastreabilidade e seguranca, incluindo:
      </p>
      <ul>
        <li>phone_number_id, wa_id, identificadores de conversa e identificadores de mensagem;</li>
        <li>status de entrega e leitura (ex.: sent, delivered, read, failed);</li>
        <li>payloads de webhook e metadados associados a eventos;</li>
        <li>registros de fila, tentativas de envio, retries e backoff;</li>
        <li>logs de auditoria e timestamps de processamento.</li>
      </ul>

      <p>
        Esses dados sao usados para integridade operacional, troubleshooting, conciliacao de
        mensagens, monitoramento e comprovacao de tentativas de contato.
      </p>

      <h3>3.3 Dados pessoais sensiveis</h3>
      <p>
        O Estudio <strong>nao coleta sistematicamente</strong> dados sensiveis. Se o titular
        fornecer voluntariamente informacoes relacionadas a saude, condicoes fisicas ou restricoes
        relevantes ao atendimento, o tratamento ocorrera de forma restrita, minimizada e limitada a
        viabilizar um atendimento mais seguro e adequado, conforme a base legal aplicavel.
      </p>

      <h2>4. Fontes de Coleta</h2>
      <p>Os dados podem ser coletados a partir de:</p>
      <ul>
        <li>formulario de agendamento (painel interno ou fluxo publico);</li>
        <li>mensagens e respostas do cliente em canais oficiais do Estudio;</li>
        <li>interacoes via WhatsApp Business Platform (templates, botoes, webhooks);</li>
        <li>cadastros internos realizados pela equipe do Estudio;</li>
        <li>registros tecnicos gerados automaticamente por APIs, servidores e servicos de nuvem.</li>
      </ul>

      <h2>5. Finalidades do Tratamento</h2>
      <p>O Estudio trata dados pessoais para as seguintes finalidades:</p>
      <ol>
        <li>registrar, confirmar, reagendar e cancelar agendamentos;</li>
        <li>enviar mensagens transacionais (ex.: aviso de agendamento e lembrete 24h);</li>
        <li>processar respostas interativas do cliente (ex.: confirmar, reagendar, falar com a Jana);</li>
        <li>manter historico de comunicacao e de atendimento;</li>
        <li>gerar vouchers, comprovantes e registros operacionais relacionados ao atendimento;</li>
        <li>monitorar falhas, reprocessar mensagens e prevenir duplicidades;</li>
        <li>cumprir obrigacoes legais, regulatórias e fiscais, quando aplicavel;</li>
        <li>exercer regularmente direitos em processos administrativos ou judiciais;</li>
        <li>melhorar a qualidade e a confiabilidade dos servicos prestados.</li>
      </ol>

      <p>
        O Estudio <strong>nao utiliza</strong> os dados pessoais tratados nesses fluxos para envio
        de publicidade em massa sem base legal adequada e sem observancia das politicas aplicaveis
        das plataformas de mensageria.
      </p>

      <h2>6. Bases Legais (LGPD)</h2>
      <p>Conforme a finalidade e o contexto, o tratamento podera se fundamentar em:</p>
      <ul>
        <li>
          <strong>execucao de contrato</strong> ou procedimentos preliminares relacionados ao
          agendamento e ao atendimento;
        </li>
        <li>
          <strong>cumprimento de obrigacao legal ou regulatoria</strong> (quando aplicavel);
        </li>
        <li>
          <strong>exercicio regular de direitos</strong> em processo judicial, administrativo ou
          arbitral;
        </li>
        <li>
          <strong>legitimo interesse</strong>, para operacao, seguranca, prevencao a fraude,
          auditoria e continuidade do servico, observada a proporcionalidade;
        </li>
        <li>
          <strong>consentimento</strong>, quando exigido pela legislacao ou necessario para
          finalidade especifica.
        </li>
      </ul>

      <h2>7. Uso da Plataforma WhatsApp Business (Meta)</h2>
      <p>
        O Estudio pode utilizar a Plataforma WhatsApp Business (Cloud API) para mensagens
        transacionais de atendimento. Esse uso pode incluir:
      </p>
      <ul>
        <li>envio de templates aprovados pela Meta;</li>
        <li>envio de mensagens livres dentro da janela de atendimento permitida;</li>
        <li>processamento de webhooks de entrega, leitura e resposta do cliente;</li>
        <li>registro de logs tecnicos para rastreabilidade e suporte;</li>
        <li>respostas automatizadas condicionadas a eventos (ex.: botoes de confirmacao).</li>
      </ul>

      <p>
        O tratamento realizado por meio da plataforma tambem esta sujeito aos{" "}
        <strong>termos e politicas da Meta</strong>, inclusive politicas da WhatsApp Business
        Platform, de mensageria e de revisao de templates.
      </p>

      <h2>8. Compartilhamento de Dados e Operadores</h2>
      <p>
        O Estudio pode compartilhar dados pessoais, na medida do necessario, com provedores e
        parceiros que apoiam a operacao do servico, tais como:
      </p>
      <ul>
        <li>Meta Platforms (WhatsApp Business Platform);</li>
        <li>provedores de infraestrutura em nuvem, hospedagem e execucao de aplicacoes;</li>
        <li>servicos de banco de dados, monitoramento e observabilidade;</li>
        <li>servicos de pagamentos e conciliacao, quando o fluxo exigir;</li>
        <li>fornecedores de suporte tecnico e seguranca da informacao.</li>
      </ul>

      <p>
        O compartilhamento ocorre conforme a finalidade, com acesso minimizado e, quando aplicavel,
        respaldado por instrumentos contratuais adequados.
      </p>

      <h2>9. Transferencia Internacional de Dados</h2>
      <p>
        Determinados fornecedores de tecnologia utilizados pelo Estudio podem processar dados fora
        do Brasil. Nessas hipoteses, o Estudio busca adotar salvaguardas adequadas, incluindo
        mecanismos contratuais, controles de seguranca e avaliacao de necessidade/proporcionalidade
        do tratamento.
      </p>

      <h2>10. Retencao, Arquivamento e Descarte</h2>
      <p>Os dados pessoais serao mantidos pelo tempo necessario para:</p>
      <ul>
        <li>prestacao do servico e gestao do relacionamento com o cliente;</li>
        <li>cumprimento de obrigacoes legais, fiscais e regulatórias;</li>
        <li>auditoria, prevencao a fraudes e defesa de direitos;</li>
        <li>continuidade operacional e suporte tecnico em prazo razoavel.</li>
      </ul>

      <p>
        Encerradas as finalidades e os prazos aplicaveis, os dados podem ser excluidos,
        anonimizados ou mantidos em formato com acesso restrito quando houver fundamento legal para
        conservacao.
      </p>

      <h2>11. Seguranca da Informacao</h2>
      <p>
        O Estudio adota medidas tecnicas e administrativas razoaveis e proporcionais para proteger
        os dados pessoais, incluindo, conforme aplicavel:
      </p>
      <ul>
        <li>criptografia de trafego (HTTPS/TLS);</li>
        <li>controle de acesso com segregacao de perfis e privilegios;</li>
        <li>segregacao de ambientes (desenvolvimento, homologacao e producao);</li>
        <li>uso de segredos e tokens com rotacao periodica;</li>
        <li>validacao de assinatura de webhooks quando suportado pelo provedor;</li>
        <li>trilhas de auditoria e logs de operacao;</li>
        <li>monitoramento de falhas e mecanismos de retry controlado;</li>
        <li>boas praticas de revisao e hardening de integracoes.</li>
      </ul>

      <p>
        Nenhum sistema e integralmente imune a incidentes. Em caso de evento relevante, o Estudio
        adotara as medidas cabiveis para contencao, avaliacao e comunicacao, nos termos da
        legislacao aplicavel.
      </p>

      <h2>12. Direitos do Titular</h2>
      <p>
        O titular pode exercer os direitos previstos na LGPD, observados os limites legais e
        tecnicos aplicaveis, incluindo:
      </p>
      <ul>
        <li>confirmacao da existencia de tratamento;</li>
        <li>acesso aos dados pessoais;</li>
        <li>correcao de dados incompletos, inexatos ou desatualizados;</li>
        <li>anonimizacao, bloqueio ou eliminacao, quando cabivel;</li>
        <li>portabilidade, quando tecnicamente possivel e legalmente aplicavel;</li>
        <li>informacao sobre compartilhamentos;</li>
        <li>revogacao de consentimento, quando essa for a base legal do tratamento.</li>
      </ul>

      <p>
        As solicitacoes podem ser encaminhadas pelos canais oficiais do Estudio. O atendimento
        dependera de validacao minima de identidade, quando necessario, para proteger o proprio
        titular.
      </p>

      <h3>12.1 Solicitacoes de exclusao de dados</h3>
      <p>
        O Estudio disponibiliza uma pagina publica com instrucoes especificas para solicitacao de
        exclusao de dados, incluindo o procedimento, os dados minimos para identificacao e os
        prazos de resposta:
      </p>
      <p>
        <strong>URL de instrucoes de exclusao de dados:</strong>{" "}
        <Link href="/exclusao-de-dados">/exclusao-de-dados</Link>
      </p>
      <p>
        Em regra, solicitacoes elegiveis de exclusao sao analisadas e processadas em ate{" "}
        <strong>24 horas</strong>, ressalvadas hipoteses de conservacao obrigatoria por lei,
        auditoria, seguranca, prevencao a fraude ou exercicio regular de direitos.
      </p>

      <h2>13. Crianças e Adolescentes</h2>
      <p>
        Os servicos do Estudio nao sao estruturados como plataforma infantil. Caso haja atendimento
        envolvendo menores de idade, o tratamento de dados pessoais devera observar as exigencias
        legais pertinentes, com participacao e/ou autorizacao de responsavel legal quando aplicavel.
      </p>

      <h2>14. Decisoes Automatizadas e Regras de Automacao</h2>
      <p>
        O sistema pode executar acoes automatizadas baseadas em eventos, como envio de lembretes,
        registro de respostas e atualizacao de status de comunicacao. Essas automacoes tem natureza
        operacional e nao substituem avaliacao humana em decisoes que produzam efeitos juridicos
        relevantes.
      </p>

      <h2>15. Atualizacoes desta Politica</h2>
      <p>
        Esta Politica pode ser atualizada para refletir mudancas legais, regulatorias, tecnicas ou
        operacionais. A versao vigente sera sempre a publicada nesta pagina, com indicacao de data
        de ultima atualizacao.
      </p>

      <h2>16. Contato</h2>
      <p>
        Para duvidas sobre esta Politica, exercicio de direitos ou solicitacoes relacionadas a
        privacidade, utilize os canais oficiais do Estudio Corpo &amp; Alma Humanizado, incluindo o
        WhatsApp comercial informado nesta pagina e o e-mail{" "}
        <strong>renatomazzarino10@gmail.com</strong>.
      </p>
    </LegalDocumentShell>
  );
}
