import type { Metadata } from "next";
import Link from "next/link";
import LegalDocumentShell from "../_components/legal-document-shell";

export const metadata: Metadata = {
  title: "Termos de Servico | Estudio Corpo & Alma Humanizado",
  description:
    "Termos de Servico aplicaveis aos agendamentos, atendimentos e comunicacoes digitais do Estudio Corpo & Alma Humanizado.",
};

const LAST_UPDATED = "25/02/2026";

export default function TermsOfServicePage() {
  return (
    <LegalDocumentShell
      title="Termos de Servico"
      subtitle="Condicoes de Uso e Atendimento"
      lastUpdated={LAST_UPDATED}
    >
      <p>
        Estes Termos de Servico regulam a utilizacao dos servicos do{" "}
        <strong>Estudio Corpo &amp; Alma Humanizado</strong>, incluindo agendamentos, atendimento
        presencial ou domiciliar, comunicacoes por WhatsApp e uso das funcionalidades digitais
        disponibilizadas ao cliente.
      </p>

      <p>
        Ao solicitar, contratar ou utilizar os servicos do Estudio, o usuario declara que leu e
        concorda com estes Termos e com a <strong>Politica de Privacidade</strong> vigente.
      </p>

      <h2>1. Identificacao do Prestador</h2>
      <p>
        <strong>Prestador:</strong> Estudio Corpo &amp; Alma Humanizado
        <br />
        <strong>CNPJ:</strong> 59.163.080/0001-49
        <br />
        <strong>Endereco comercial:</strong> Rua Silva Pinto, 186 - Centro Historico, Amparo/SP,
        CEP 13900-319
        <br />
        <strong>WhatsApp comercial:</strong> (19) 99944-2184
        <br />
        <strong>E-mail oficial:</strong> renatomazzarino10@gmail.com
      </p>

      <h2>2. Objeto</h2>
      <p>Estes Termos disciplinam, entre outros pontos:</p>
      <ol>
        <li>o agendamento de servicos ofertados pelo Estudio;</li>
        <li>a comunicacao operacional com clientes por canais digitais e WhatsApp;</li>
        <li>o uso de automacoes de confirmacao, lembrete, reagendamento e cancelamento;</li>
        <li>o uso de links publicos de voucher e comprovante, quando disponibilizados;</li>
        <li>as responsabilidades das partes durante a prestacao dos servicos.</li>
      </ol>

      <h2>3. Aceitacao e Capacidade</h2>
      <p>
        O usuario declara possuir capacidade civil para contratar os servicos e fornecer informacoes
        veridicas. Quando o atendimento envolver terceiro ou menor de idade, o usuario declara ter
        legitimidade para realizar a solicitacao e prestar as informacoes necessarias.
      </p>

      <h2>4. Cadastro e Informacoes do Agendamento</h2>
      <p>
        Para realizar um agendamento, o usuario deve fornecer dados minimos corretos e atualizados,
        incluindo nome, telefone e informacoes necessarias ao servico. O Estudio pode solicitar
        dados complementares quando isso for essencial para viabilizar o atendimento.
      </p>

      <p>
        O fornecimento de dados incorretos, incompletos ou inconsistentes pode impedir a
        confirmacao, a execucao ou a comunicacao adequada sobre o agendamento.
      </p>

      <h2>5. Funcionamento do Sistema Digital e Automacoes</h2>
      <p>
        O Estudio utiliza sistema proprio de gestao para organizar agenda, comunicacoes e registros
        operacionais. O sistema pode, conforme configuracao interna:
      </p>
      <ul>
        <li>registrar agendamentos e alteracoes de horario;</li>
        <li>enfileirar e processar notificacoes transacionais;</li>
        <li>enviar templates aprovados na Plataforma WhatsApp Business;</li>
        <li>processar webhooks e atualizar status de entrega/leitura;</li>
        <li>executar respostas automatizadas a botoes interativos;</li>
        <li>registrar logs tecnicos e trilhas de auditoria.</li>
      </ul>

      <p>
        As automacoes possuem finalidade operacional e de atendimento. O fluxo manual de contato da
        equipe pode coexistir com as automacoes e prevalecer quando necessario.
      </p>

      <h2>6. Comunicacao via WhatsApp</h2>
      <p>
        O cliente reconhece que o Estudio pode utilizar WhatsApp Business App e/ou WhatsApp
        Business Platform (Cloud API) para comunicacoes transacionais relacionadas a agendamento e
        atendimento, incluindo confirmacoes, lembretes e orientacoes.
      </p>

      <p>
        O uso do WhatsApp esta sujeito tambem aos termos e politicas da Meta/WhatsApp, inclusive
        regras de templates, janelas de atendimento e politicas de uso aceitavel.
      </p>

      <h2>7. Agendamento, Confirmacao, Reagendamento e Cancelamento</h2>
      <h3>7.1 Agendamento</h3>
      <p>
        O horario somente sera considerado reservado apos registro no sistema do Estudio, sujeito a
        disponibilidade da agenda no momento da confirmacao.
      </p>

      <h3>7.2 Confirmacao</h3>
      <p>
        O Estudio pode solicitar confirmacao do agendamento por mensagem. A ausencia de resposta do
        cliente pode demandar contato humano adicional e, em casos especificos, revisao da reserva
        do horario, conforme politica interna do Estudio.
      </p>

      <h3>7.3 Reagendamento</h3>
      <p>
        Reagendamentos dependem de disponibilidade da agenda e podem exigir nova confirmacao por
        parte do Estudio.
      </p>

      <h3>7.4 Cancelamento</h3>
      <p>
        Cancelamentos podem ser solicitados pelos canais oficiais. Em determinados fluxos, o
        sistema pode registrar eventos de cancelamento e, quando permitido pelas regras da
        plataforma de mensageria e pela configuracao do Estudio, enviar comunicacao automatizada
        ao cliente.
      </p>

      <h2>8. Valores, Pagamentos e Comprovantes</h2>
      <p>
        Os valores dos servicos, formas de pagamento e eventuais sinais/reservas serao informados
        pelos canais oficiais do Estudio e/ou no momento do agendamento, conforme o fluxo utilizado.
      </p>

      <p>
        Quando houver processamento de pagamento por provedores terceiros, aplicam-se tambem os
        termos e politicas desses provedores. O Estudio podera disponibilizar comprovantes ou links
        publicos de voucher para facilitar o atendimento e a organizacao do cliente.
      </p>

      <h2>9. Responsabilidades do Usuario</h2>
      <p>O usuario se compromete a:</p>
      <ul>
        <li>fornecer informacoes veridicas e atualizadas;</li>
        <li>acompanhar as comunicacoes enviadas pelos canais oficiais;</li>
        <li>comparecer no horario agendado ou avisar com antecedencia quando possivel;</li>
        <li>utilizar os canais do Estudio de forma respeitosa e sem abuso;</li>
        <li>nao praticar condutas fraudulentas ou que comprometam o sistema.</li>
      </ul>

      <h2>10. Responsabilidades do Estudio</h2>
      <p>O Estudio se compromete a:</p>
      <ul>
        <li>prestar o atendimento conforme disponibilidade e condicoes operacionais;</li>
        <li>manter canais oficiais de contato para agendamentos e comunicacoes;</li>
        <li>adotar medidas razoaveis de seguranca da informacao;</li>
        <li>tratar dados pessoais em conformidade com a Politica de Privacidade e a LGPD;</li>
        <li>buscar confiabilidade na operacao das automacoes e integrações utilizadas.</li>
      </ul>

      <h2>11. Disponibilidade, Integracoes e Limitacoes Tecnicas</h2>
      <p>
        O sistema digital do Estudio depende de infraestrutura e servicos de terceiros (ex.:
        hospedagem, nuvem, plataformas de mensageria e pagamentos). Assim, podem ocorrer
        indisponibilidades, atrasos, falhas de entrega de mensagem ou instabilidades alheias ao
        controle direto do Estudio.
      </p>

      <p>
        O Estudio nao garante funcionamento ininterrupto de APIs, webhooks, plataformas externas ou
        servicos de internet, embora adote medidas para monitoramento, reprocessamento e continuidade
        operacional.
      </p>

      <h2>12. Uso Aceitavel e Condutas Vedadas</h2>
      <p>O usuario nao deve:</p>
      <ul>
        <li>utilizar os canais do Estudio para spam, fraude, assedio ou conteudo ilicito;</li>
        <li>tentar acessar areas restritas, APIs internas ou mecanismos tecnicos sem autorizacao;</li>
        <li>
          interferir indevidamente no funcionamento do sistema, automacoes, webhooks ou rotas de
          atendimento;
        </li>
        <li>utilizar identidade de terceiros sem autorizacao.</li>
      </ul>

      <h2>13. Propriedade Intelectual</h2>
      <p>
        A identidade visual, marca, textos proprietarios, fluxos de automacao, software, estrutura
        tecnica e demais ativos intelectuais relacionados ao sistema do Estudio sao protegidos pela
        legislacao aplicavel, sendo vedado o uso nao autorizado.
      </p>

      <h2>14. Limitacao de Responsabilidade</h2>
      <p>
        O Estudio nao se responsabiliza por prejuizos decorrentes de fatos de terceiros ou fora de
        seu controle razoavel, incluindo indisponibilidade de provedores, falhas de conectividade,
        erros de operacao decorrentes de informacoes incorretas fornecidas pelo usuario ou
        indisponibilidade de plataformas externas.
      </p>

      <p>
        Nada nestes Termos exclui responsabilidades que nao possam ser afastadas por lei.
      </p>

      <h2>15. Suspensao e Encerramento de Atendimento</h2>
      <p>
        O Estudio podera suspender ou limitar o atendimento e o uso dos canais em caso de uso
        abusivo, comportamento inadequado, fraude, tentativa de comprometimento da seguranca ou
        violacao destes Termos, sem prejuizo das medidas legais cabiveis.
      </p>

      <h2>16. Alteracoes destes Termos</h2>
      <p>
        Estes Termos podem ser atualizados periodicamente para refletir ajustes operacionais, legais
        e tecnicos. A versao vigente sera a publicada nesta pagina, com indicacao da data de ultima
        atualizacao.
      </p>

      <h2>17. Legislacao Aplicavel e Foro</h2>
      <p>
        Estes Termos sao regidos pelas leis da Republica Federativa do Brasil. Fica eleito o foro
        da Comarca de <strong>Serra Negra/SP</strong>, com renuncia a qualquer outro, por mais
        privilegiado que seja, ressalvadas as hipoteses legais de competencia obrigatoria.
      </p>

      <h2>18. Contato</h2>
      <p>
        Dúvidas sobre estes Termos, agendamentos, reagendamentos ou comunicacoes podem ser tratadas
        pelos canais oficiais do Estudio, incluindo o WhatsApp comercial informado nesta pagina e o
        e-mail <strong>renatomazzarino10@gmail.com</strong>.
      </p>
      <p>
        Documentos publicos de referencia:
      </p>
      <ul>
        <li>
          <Link href="/politica-de-privacidade">Politica de Privacidade</Link>
        </li>
        <li>
          <Link href="/exclusao-de-dados">Instrucoes de Exclusao de Dados</Link>
        </li>
      </ul>
      <p>
        Solicitacoes de exclusao de dados pessoais podem ser feitas pelo e-mail oficial acima, nos
        termos e prazos descritos na pagina de instrucoes de exclusao de dados.
      </p>
    </LegalDocumentShell>
  );
}
