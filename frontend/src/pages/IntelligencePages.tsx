import { useState } from 'react';
import { Badge } from '../components/Badge';
import { MetricCard } from '../components/MetricCard';
import type {
  AssistantResponse,
  DashboardIntelligence,
  DemandForecastResult,
  ExpirationRiskItem,
  PromotionSuggestion,
  ReplenishmentRecommendation,
} from '../types/models';
import { dateTime, money } from '../lib/format';

export function BatchesPage({ risks }: { risks: ExpirationRiskItem[] }) {
  const valueAtRisk = risks.reduce((sum, risk) => sum + risk.valueAtRisk, 0);

  return (
    <>
      <section className="cards">
        <MetricCard label="Lotes em analise" value={risks.length} />
        <MetricCard label="Vencidos" value={risks.filter((risk) => risk.riskLevel === 'vencido').length} tone="warning" />
        <MetricCard label="Criticos" value={risks.filter((risk) => risk.riskLevel === 'critico').length} tone="warning" />
        <MetricCard label="Valor em risco" value={money(valueAtRisk)} tone="accent" />
      </section>

      <section className="panel">
        <div className="section-head"><div><p className="eyebrow">FEFO</p><h3>Lotes por prioridade de vencimento</h3></div></div>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Produto</th><th>Lote</th><th>Validade</th><th>Risco</th><th>Qtd.</th><th>Valor em risco</th><th>Metodo</th></tr></thead>
            <tbody>
              {risks.length > 0 ? risks.map((risk) => (
                <tr key={risk.batch.id}>
                  <td>{risk.product.name}</td>
                  <td>{risk.batch.batchNumber}</td>
                  <td>{dateTime(risk.batch.expirationDate)}</td>
                  <td><Badge label={risk.riskLevel} tone={risk.riskLevel === 'baixo' ? 'ok' : risk.riskLevel === 'medio' ? 'low' : 'warning'} /></td>
                  <td>{risk.availableQuantity}</td>
                  <td>{money(risk.valueAtRisk)}</td>
                  <td>{risk.confidenceLevel}</td>
                </tr>
              )) : <tr><td colSpan={7}>Nenhum lote com dados suficientes para analise.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}

export function ForecastsPage({ forecasts }: { forecasts: DemandForecastResult[] }) {
  return (
    <section className="panel">
      <div className="section-head"><div><p className="eyebrow">Historico de vendas</p><h3>Previsao explicavel de demanda</h3></div></div>
      <div className="product-list">
        {forecasts.length > 0 ? forecasts.map((forecast) => (
          <article className="product-card" key={forecast.product.id}>
            <div className="row-between"><strong>{forecast.product.name}</strong><Badge label={forecast.nivelConfianca} tone={forecast.nivelConfianca === 'alta' ? 'ok' : 'warning'} /></div>
            <div className="product-meta">
              <span>7 dias: <strong>{forecast.demandaPrevista7Dias}</strong></span>
              <span>30 dias: <strong>{forecast.demandaPrevista30Dias}</strong></span>
              <span>Media/dia: <strong>{forecast.mediaDiaria.toFixed(2)}</strong></span>
              <span>Tendencia: <strong>{forecast.tendencia}</strong></span>
            </div>
            <p className="helper">{forecast.metodoUtilizado}</p>
            {forecast.observacoes.length > 0 && <p className="caption">{forecast.observacoes.join(' ')}</p>}
          </article>
        )) : <p className="empty">Sem vendas registradas para calcular previsoes.</p>}
      </div>
    </section>
  );
}

export function ReplenishmentsPage({
  recommendations,
  onDecision,
}: {
  recommendations: ReplenishmentRecommendation[];
  onDecision: (recommendation: ReplenishmentRecommendation, action: string) => void;
}) {
  return (
    <section className="panel">
      <div className="section-head"><div><p className="eyebrow">Compra sugerida</p><h3>Recomendacoes de reposicao</h3></div></div>
      <div className="product-list">
        {recommendations.length > 0 ? recommendations.map((item) => (
          <article className="product-card" key={item.product.id}>
            <div className="row-between"><strong>{item.product.name}</strong><Badge label={item.priority} tone={item.priority === 'critica' ? 'danger' : 'warning'} /></div>
            <div className="product-meta">
              <span>Atual: <strong>{item.currentStock}</strong></span>
              <span>Ponto: <strong>{item.reorderPoint}</strong></span>
              <span>Comprar: <strong>{item.suggestedQuantity}</strong></span>
              <span>Custo: <strong>{money(item.estimatedCost)}</strong></span>
            </div>
            <p>{item.reason}</p>
            <p className="caption">Fornecedor: {item.supplier?.name ?? 'Sem fornecedor preferencial'} - prazo {item.supplierLeadTimeDays} dias - confianca {item.confidenceLevel}</p>
            {item.risks.length > 0 && <p className="caption">{item.risks.join(' ')}</p>}
            <div className="actions">
              <button type="button" className="primary" onClick={() => onDecision(item, 'aceitar')}>Aceitar</button>
              <button type="button" onClick={() => onDecision(item, 'ajustar')}>Ajustar</button>
              <button type="button" className="danger" onClick={() => onDecision(item, 'rejeitar')}>Rejeitar</button>
            </div>
          </article>
        )) : <p className="empty">Nenhuma compra recomendada com os dados atuais.</p>}
      </div>
    </section>
  );
}

export function PromotionsPage({ promotions }: { promotions: PromotionSuggestion[] }) {
  return (
    <section className="panel">
      <div className="section-head"><div><p className="eyebrow">Reducao de perdas</p><h3>Sugestoes de promocao</h3></div></div>
      <div className="product-list">
        {promotions.length > 0 ? promotions.map((item) => (
          <article className="product-card" key={`${item.product.id}-${item.batch.id}`}>
            <div className="row-between"><strong>{item.product.name}</strong><Badge label={`${item.suggestedDiscountPercentage}%`} tone="warning" /></div>
            <div className="product-meta">
              <span>Atual: <strong>{money(item.currentPrice)}</strong></span>
              <span>Promocional: <strong>{money(item.promotionalPrice)}</strong></span>
              <span>Qtd. risco: <strong>{item.quantityAtRisk.toFixed(0)}</strong></span>
              <span>Perda evitavel: <strong>{money(item.avoidableLossValue)}</strong></span>
            </div>
            <p>{item.justification}</p>
            <p className="caption">Margem atual {item.currentMargin.toFixed(1)}% - margem estimada {item.estimatedMargin.toFixed(1)}% - confianca {item.confidenceLevel}</p>
            {item.warnings.length > 0 && <p className="caption">{item.warnings.join(' ')}</p>}
          </article>
        )) : <p className="empty">Nenhuma promocao recomendada neste momento.</p>}
      </div>
    </section>
  );
}

export function SmartDashboardSections({ dashboard }: { dashboard: DashboardIntelligence | null }) {
  if (!dashboard) {
    return <section className="panel"><p className="empty">Indicadores inteligentes indisponiveis no momento.</p></section>;
  }

  return (
    <section className="content-grid two-columns">
      <article className="panel">
        <div className="section-head"><div><p className="eyebrow">Alertas</p><h3>Prioridade operacional</h3></div></div>
        <div className="stack">
          {dashboard.priorityAlerts.length > 0 ? dashboard.priorityAlerts.map((alert) => (
            <article className="alert-card" key={alert.logicalKey}>
              <div className="row-between"><strong>{alert.title}</strong><Badge label={alert.priority} tone={alert.priority === 'critica' ? 'danger' : 'warning'} /></div>
              <p>{alert.message}</p>
            </article>
          )) : <p className="empty">Sem alertas prioritarios.</p>}
        </div>
      </article>

      <article className="panel">
        <div className="section-head"><div><p className="eyebrow">Resumo</p><h3>Ultima atualizacao</h3></div><span className="info-chip">{dateTime(dashboard.updatedAt)}</span></div>
        <div className="summary-grid compact">
          <div className="summary-chip"><strong>{dashboard.expiringBatches}</strong><span>Lotes proximos</span></div>
          <div className="summary-chip"><strong>{dashboard.replenishments.length}</strong><span>Reposicoes</span></div>
          <div className="summary-chip"><strong>{dashboard.promotionSuggestions.length}</strong><span>Promocoes</span></div>
          <div className="summary-chip"><strong>{money(dashboard.monthLosses)}</strong><span>Perdas no mes</span></div>
        </div>
      </article>
    </section>
  );
}

export function AssistantPage({
  onAsk,
}: {
  onAsk: (message: string, conversation: Array<{ from: 'user' | 'assistant'; text: string }>) => Promise<AssistantResponse>;
}) {
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<Array<{ from: 'user' | 'assistant'; text: string; response?: AssistantResponse }>>([]);

  async function submit(nextMessage = message) {
    const clean = nextMessage.trim();
    if (!clean) return;
    setLoading(true);
    setError(null);
    const priorConversation = history.map(({ from, text }) => ({ from, text }));
    setHistory((items) => [...items, { from: 'user', text: clean }]);
    setMessage('');
    try {
      const response = await onAsk(clean, priorConversation);
      setHistory((items) => [...items, { from: 'assistant', text: response.answer, response }]);
    } catch {
      setError('Nao foi possivel consultar o assistente agora. Tente novamente em instantes.');
    } finally {
      setLoading(false);
    }
  }

  const suggestions = ['Quais produtos estao acabando?', 'O que vence nos proximos 15 dias?', 'Quanto dinheiro esta em risco?', 'O que devo comprar esta semana?', 'Quais promocoes sao recomendadas?'];

  return (
    <section className="panel chat-panel">
      <div className="section-head"><div><p className="eyebrow">Intencoes controladas</p><h3>Assistente de estoque</h3></div></div>
      <div className="suggestion-row">
        {suggestions.map((item) => <button type="button" key={item} onClick={() => { void submit(item); }}>{item}</button>)}
      </div>
      <div className="chat-history">
        {history.length > 0 ? history.map((item, index) => (
          <article className={`chat-message ${item.from}`} key={`${item.from}-${index}`}>
            <strong>{item.from === 'user' ? 'Voce' : 'Assistente'}</strong>
            <p>{item.text}</p>
            {item.response && item.response.cards.length > 0 && (
              <div className="summary-grid compact">
                {item.response.cards.map((card) => <div className="summary-chip" key={`${card.title}-${card.value ?? ''}`}><strong>{card.value ?? card.title}</strong><span>{card.title} - {card.description}</span></div>)}
              </div>
            )}
          </article>
        )) : <p className="empty">Faca uma pergunta sobre estoque, validade, reposicao ou promocoes.</p>}
      </div>
      {error && <p className="caption error-text">{error}</p>}
      <form className="chat-form" onSubmit={(event) => { event.preventDefault(); void submit(); }}>
        <input value={message} maxLength={500} onChange={(event) => setMessage(event.target.value)} placeholder="Pergunte sobre o estoque" />
        <button type="submit" className="primary" disabled={loading}>{loading ? 'Consultando...' : 'Enviar'}</button>
      </form>
    </section>
  );
}
