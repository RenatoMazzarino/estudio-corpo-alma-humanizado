import type { Metadata } from "next";
import Link from "next/link";
import LegalDocumentShell from "../_components/legal-document-shell";

export const metadata: Metadata = {
  title: "Exclusao de Dados | Estudio Corpo & Alma Humanizado",
  description:
    "Instrucoes publicas para solicitacao de exclusao de dados pessoais tratados pelo Estudio Corpo & Alma Humanizado.",
};

const LAST_UPDATED = "25/02/2026";

export default function DataDeletionInstructionsPage() {
  return (
    <LegalDocumentShell
      title="Instrucoes de Exclusao de Dados"
      subtitle="Atendimento ao Titular (LGPD)"
      lastUpdated={LAST_UPDATED}
    >
      <p>
        Esta pagina descreve como solicitar a exclusao de dados pessoais tratados pelo{" "}
        <strong>Estudio Corpo &amp; Alma Humanizado</strong>, nos termos da Lei Geral de Protecao
        de Dados (LGPD), bem como as etapas de validacao, os prazos e as situacoes em que a
        exclusao pode ser parcial, anonimizacao ou conservacao obrigatoria.
      </p>

      <h2>1. Identificacao do controlador</h2>
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
        <strong>E-mail oficial para solicitacoes:</strong> renatomazzarino10@gmail.com
      </p>

      <h2>2. Como solicitar a exclusao</h2>
      <p>
        A solicitacao deve ser enviada para o e-mail <strong>renatomazzarino10@gmail.com</strong>{" "}
        com o assunto:
      </p>
      <p>
        <strong>
          Solicitacao de Exclusao de Dados - [Seu nome]
        </strong>
      </p>
      <p>Para agilizar e validar sua solicitacao com seguranca, inclua no corpo do e-mail:</p>
      <ol>
        <li>nome completo;</li>
        <li>numero de telefone utilizado no agendamento/WhatsApp (com DDD);</li>
        <li>data aproximada do atendimento ou do agendamento (se souber);</li>
        <li>descricao do pedido (ex.: exclusao total, exclusao de mensagens, exclusao de cadastro);</li>
        <li>se possivel, identificacao adicional para localizacao do registro (ex.: nome do servico).</li>
      </ol>

      <h2>3. Prazos de atendimento</h2>
      <p>
        O Estudio se compromete a realizar o atendimento inicial e o processamento da solicitacao{" "}
        <strong>em ate 24 horas</strong>, contado do recebimento do pedido, quando a solicitacao
        estiver completa e nao houver impedimento legal ou tecnico de conservacao.
      </p>
      <p>
        Se houver necessidade de confirmacao adicional de identidade, esclarecimentos ou
        verificacao de base legal de retencao, o Estudio respondera no mesmo canal com orientacao
        sobre os proximos passos e prazo estimado de conclusao.
      </p>

      <h2>4. O que pode ser excluido</h2>
      <p>Dependendo do contexto e da base legal aplicavel, a solicitacao pode abranger:</p>
      <ul>
        <li>cadastro de cliente no sistema;</li>
        <li>dados de contato (telefone, identificadores de mensageria, endereco cadastrado);</li>
        <li>historico de mensagens operacionais armazenadas internamente;</li>
        <li>registros de agendamento, quando nao houver obrigacao de conservacao;</li>
        <li>dados tecnicos associados, quando tecnicamente possivel e compativel com auditoria.</li>
      </ul>

      <h2>5. Situacoes em que a exclusao pode ser limitada</h2>
      <p>
        Em algumas situacoes, a exclusao total pode nao ser possivel de imediato. Nesses casos, o
        Estudio podera realizar <strong>bloqueio</strong>, <strong>restricao de uso</strong> ou{" "}
        <strong>anonimizacao</strong>, mantendo apenas o minimo necessario, por exemplo para:
      </p>
      <ul>
        <li>cumprimento de obrigacoes legais, regulatórias, fiscais ou contabeis;</li>
        <li>exercicio regular de direitos em processo judicial, administrativo ou arbitral;</li>
        <li>prevencao a fraude e seguranca da informacao;</li>
        <li>integridade de logs tecnicos e trilhas de auditoria essenciais.</li>
      </ul>
      <p>
        Quando isso ocorrer, o titular recebera resposta com explicacao objetiva sobre quais dados
        foram excluidos, quais foram mantidos e o fundamento legal correspondente.
      </p>

      <h2>6. Validacao de identidade</h2>
      <p>
        Para proteger os dados do proprio titular, o Estudio pode solicitar confirmacao adicional
        de identidade antes de concluir a exclusao, especialmente quando houver risco de
        solicitacao indevida por terceiros.
      </p>

      <h2>7. Exclusao em plataformas de terceiros</h2>
      <p>
        O Estudio pode utilizar plataformas de terceiros (por exemplo, infraestrutura em nuvem,
        mensageria e pagamentos). A exclusao nos sistemas internos sera processada conforme esta
        instrucao. Ja os dados tratados por terceiros controladores independentes podem depender de
        politicas e fluxos proprios dessas plataformas.
      </p>

      <h2>8. Confirmacao da conclusao</h2>
      <p>
        Apos o processamento, o titular recebera resposta por e-mail informando o resultado da
        solicitacao (exclusao, anonimizacao, bloqueio ou impossibilidade parcial de exclusao, com
        justificativa).
      </p>

      <h2>9. Canais e documentos relacionados</h2>
      <ul>
        <li>
          <strong>E-mail de solicitacoes:</strong> renatomazzarino10@gmail.com
        </li>
        <li>
          <strong>Politica de Privacidade:</strong>{" "}
          <Link href="/politica-de-privacidade">/politica-de-privacidade</Link>
        </li>
        <li>
          <strong>Termos de Servico:</strong>{" "}
          <Link href="/termos-de-servico">/termos-de-servico</Link>
        </li>
      </ul>

      <h2>10. Observacao para plataformas e integracoes (ex.: Meta)</h2>
      <p>
        Esta pagina constitui a <strong>URL de instrucoes de exclusao de dados</strong> do
        aplicativo, com orientacoes publicas e acessiveis para solicitacao, processamento e
        confirmacao de exclusao de dados pessoais.
      </p>
    </LegalDocumentShell>
  );
}

