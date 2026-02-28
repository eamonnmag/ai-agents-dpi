import { useState, useMemo } from "react";
import {
    ComposedChart, Line, Area, XAxis, YAxis, CartesianGrid,
    Tooltip, ReferenceLine, ResponsiveContainer,
} from "recharts";
import './agent-visualizer.css';

// ─── Types ────────────────────────────────────────────────────
interface ChainPoint {
    step: number;
    label: string;
    independent: number;
    correlated: number;
    bestCase: number;
    worstCase: number;
    bandLow: number;
    bandHigh: number;
}

// ─── Benchmark data ───────────────────────────────────────────
const BENCHMARKS = [
    { model: "Gemini 3 Pro",        accuracy: 56, hallucination: 88, type: "raw", note: "AA-Omniscience" },
    { model: "Grok 4",              accuracy: 39, hallucination: 64, type: "raw", note: "AA-Omniscience" },
    { model: "GPT-5.1",             accuracy: 39, hallucination: 81, type: "raw", note: "AA-Omniscience" },
    { model: "Claude 4.1 Opus",     accuracy: 34, hallucination: 25, type: "raw", note: "AA-Omniscience" },
    { model: "RAG pipeline (good)", accuracy: 82, hallucination: 15, type: "rag", note: "RAG eval studies" },
    { model: "RAG pipeline (avg)",  accuracy: 68, hallucination: 32, type: "rag", note: "RAG eval studies" },
];

// ─── Math ─────────────────────────────────────────────────────
const independent = (p: number, n: number) => Math.pow(p, n) * 100;
const correlated  = (p: number, n: number) => Math.max(0, p * Math.pow(1 - (1 - p) * 0.15, n) * 100);
const bestCase    = (n: number) => Math.pow(0.82, n) * 100;
const worstCase   = (n: number) => Math.pow(0.39, n) * 100;

function buildChainData(baseAccuracy: number, steps: number): ChainPoint[] {
    const p = baseAccuracy / 100;
    return Array.from({ length: steps + 1 }, (_, i) => {
        const ind = independent(p, i);
        const unc = ind * 0.15 * (1 + i * 0.1);
        return {
            step: i,
            label: i === 0 ? "Input" : `Agent ${i}`,
            independent: parseFloat(ind.toFixed(1)),
            correlated:  parseFloat(correlated(p, i).toFixed(1)),
            bestCase:    parseFloat(bestCase(i).toFixed(1)),
            worstCase:   parseFloat(worstCase(i).toFixed(1)),
            bandLow:     parseFloat(Math.max(0, ind - unc).toFixed(1)),
            bandHigh:    parseFloat(Math.min(100, ind + unc).toFixed(1)),
        };
    });
}

function getColor(pct: number) {
    if (pct > 70) return "var(--color-good)";
    if (pct > 40) return "var(--color-warn)";
    return "var(--color-bad)";
}

// ─── Tufte sidenote helper ────────────────────────────────────
// Replicates Tufte CSS sidenote pattern using label+input toggle
let sidenoteCounter = 0;
const Sidenote = ({
                      children,
                      variant = "",
                  }: {
    children: React.ReactNode;
    variant?: "callout" | "data" | "warn" | "";
}) => {
    const id = useMemo(() => `sn-${++sidenoteCounter}`, []);
    return (
        <>
            <label htmlFor={id} className="margin-toggle sidenote-number" />
            <input type="checkbox" id={id} className="margin-toggle" />
            <span className={`sidenote ${variant}`}>{children}</span>
        </>
    );
};

const Marginnote = ({
                        children,
                        variant = "",
                    }: {
    children: React.ReactNode;
    variant?: "callout" | "data" | "warn" | "";
}) => {
    const id = useMemo(() => `mn-${++sidenoteCounter}`, []);
    return (
        <>
            <label htmlFor={id} className="margin-toggle">⊕</label>
            <input type="checkbox" id={id} className="margin-toggle" />
            <span className={`marginnote ${variant}`}>{children}</span>
        </>
    );
};

// ─── Tooltip ─────────────────────────────────────────────────
const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload?.length) return null;
    const d = payload[0].payload as ChainPoint;
    return (
        <div className="custom-tooltip">
            <div className="tooltip-label">{d.label}</div>
            <div className="tooltip-row">Independent: <span>{d.independent}%</span></div>
            <div className="tooltip-row">Correlated:  <span>{d.correlated.toFixed(1)}%</span></div>
            <div className="tooltip-row">Best case:   <span>{d.bestCase.toFixed(1)}%</span></div>
            <div className="tooltip-row">Worst case:  <span>{d.worstCase.toFixed(1)}%</span></div>
            <div className="tooltip-divider" />
            <div className="tooltip-row">Band: <span>{d.bandLow}%–{d.bandHigh}%</span></div>
        </div>
    );
};

// ─── Agent chain strip ────────────────────────────────────────
const AgentChain = ({ steps, accuracy }: { steps: number; accuracy: number }) => {
    const p = accuracy / 100;
    return (
        <div className="chain-wrap">
            {Array.from({ length: steps + 1 }, (_, i) => {
                const pct = Math.pow(p, i) * 100;
                const isLast = i === steps;
                return (
                    <div key={i} style={{ display: "flex", alignItems: "center" }}>
                        <div className="chain-node" style={{ borderTopColor: getColor(pct) }}>
                            <div className="chain-node-label">{i === 0 ? "Input" : `Agent ${i}`}</div>
                            <div className="chain-node-value" style={{ color: getColor(pct) }}>{pct.toFixed(0)}%</div>
                            {i > 0 && <div className="chain-node-lost">−{(100 - pct).toFixed(0)}%</div>}
                        </div>
                        {!isLast && (
                            <div className="chain-arrow">
                                <span className="chain-arrow-sym">→</span>
                                <span className="chain-arrow-mult">×{p.toFixed(2)}</span>
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
};

// ─── Main ─────────────────────────────────────────────────────
export default function DPIViz() {
    const [steps, setSteps] = useState(5);
    const [accuracy, setAccuracy] = useState(53);
    const data = useMemo(() => buildChainData(accuracy, 10), [accuracy]);
    const p = accuracy / 100;
    const finalInd = (Math.pow(p, steps) * 100).toFixed(1);
    const finalCor = correlated(p, steps).toFixed(1);
    const ragFive  = (Math.pow(0.82, 5) * 100).toFixed(0);

    return (
        <article className="page-style">

            {/* ── Title ── */}
            <section>
                <span className="section-label">Information Theory · AI Systems</span>
                <h1>The Data Processing Inequality and Chained AI Agents</h1>
                <p className="subtitle">
                    A foundational result from information theory, applied to production AI pipelines.
                    Why accuracy cannot improve through chaining — and what that means
                    for agents with write access to your infrastructure.
                </p>
            </section>

            {/* ── Principle ── */}
            <section>
                <h2>The Principle</h2>
                <p>
                    The <strong>Data Processing Inequality (DPI)</strong> is a theorem from Shannon information
                    theory.
                    <Sidenote variant="callout">
                        <strong>Shannon's formulation:</strong> For a Markov chain X → Y → Z,
                        the mutual information satisfies I(X;Z) ≤ I(X;Y). No processing of Y
                        can recover information about X that was lost in the X→Y step.
                    </Sidenote>{" "}
                    It states that no processing step — however sophisticated — can increase the
                    information content of a signal. Any transformation can only preserve or reduce it.
                </p>
                <p>
                    This is well understood in data engineering: every aggregation, filter, or model fit
                    discards information. The implication for <em>chained AI agents</em> is severe
                    and often overlooked.
                    <Sidenote>
                        This is directly analogous to lossy image compression.
                        Once you compress a JPEG, you cannot recover the original pixels — no matter
                        how sophisticated your upscaler. The DPI is the formal proof of why.
                    </Sidenote>{" "}
                    Each agent in a pipeline is a lossy channel. If the model at step one makes
                    an error, that error becomes the input to step two. The downstream agent has
                    no way to recover what was lost.
                </p>
                <p>
                    There are two distinct error regimes worth distinguishing.
                    <Marginnote variant="warn">
                        <strong>Independent vs. correlated errors</strong><br />
                        Independent: each agent fails randomly. Rare in practice.<br /><br />
                        Correlated: an early confident error propagates downstream uncorrected.
                        This is the common production case, especially when agents share context
                        without human review at intermediate steps.
                    </Marginnote>{" "}
                    In the <em>independent</em> model, each agent fails randomly — a best case.
                    In the <em>correlated</em> model, a confident early error propagates downstream
                    and compounds, because subsequent agents have no ground truth to correct against.
                    Real production pipelines tend toward the correlated regime.
                </p>
            </section>

            {/* ── Benchmarks ── */}
            <section>
                <h2>What the Benchmarks Actually Show</h2>
                <p>
                    These figures are from the AA-Omniscience benchmark (Artificial Analysis, Nov 2025),
                    which tests open-ended factual recall across 6,000 questions and 42 domains
                    with no retrieval augmentation.
                    <Sidenote variant="data">
                        <strong>Hallucination rate</strong> here means: of the answers that were
                        wrong, what fraction did the model answer confidently rather than abstain?
                        A 88% hallucination rate means the model almost never says "I don't know"
                        — it invents a plausible answer instead.
                    </Sidenote>
                </p>

                <div className="fullwidth">
                    <table className="benchmark-table">
                        <colgroup>
                            <col className="col-model" />
                            <col className="col-acc" />
                            <col className="col-bar" />
                            <col className="col-hall" />
                            <col className="col-source" />
                        </colgroup>
                        <thead>
                        <tr>
                            <th>Model</th>
                            <th>Accuracy</th>
                            <th>Visual</th>
                            <th>Hallucination</th>
                            <th>Source</th>
                        </tr>
                        </thead>
                        <tbody>
                        {BENCHMARKS.map((b, i) => (
                            <tr key={i}>
                                <td className="label-cell">{b.model}</td>
                                <td className="mono-cell">{b.accuracy}%</td>
                                <td>
                                    <div className="bar-track">
                                        <div className="bar-fill" style={{
                                            width: `${b.accuracy}%`,
                                            background: b.type === "rag" ? "var(--color-good)" : getColor(b.accuracy),
                                        }} />
                                    </div>
                                </td>
                                <td className="mono-cell" style={{
                                    color: b.hallucination > 60 ? "var(--color-bad)" : b.hallucination > 30 ? "var(--color-warn)" : "var(--color-good)"
                                }}>
                                    {b.hallucination}%
                                </td>
                                <td className="source-cell">{b.note}</td>
                            </tr>
                        ))}
                        </tbody>
                    </table>
                </div>

                <p>
                    Of 36 frontier models evaluated, only three score above zero on the reliability
                    index — meaning the majority are more likely to hallucinate than to correctly
                    answer a question from memory alone.
                    <Sidenote variant="warn">
                        <strong>The reliability index</strong> penalises hallucination heavily.
                        A model that is 56% accurate but hallucinates 88% of its wrong answers
                        scores lower than a model that is 34% accurate but abstains most of the time.
                        This is why Claude 4.1 Opus ranks better on reliability than Gemini 3 Pro
                        despite lower raw accuracy.
                    </Sidenote>{" "}
                    RAG pipelines improve this substantially — but the DPI still holds regardless
                    of the base accuracy.
                </p>
            </section>

            {/* ── Interactive controls ── */}
            <section>
                <h2>Interactive Model</h2>
                <p>Adjust the base accuracy and chain length to explore the decay curves.</p>

                <div className="controls-panel">
                    <div className="control-group">
                        <label>Base model accuracy per step</label>
                        <div className="control-row">
                            <input type="range" min={30} max={95} value={accuracy}
                                   onChange={e => setAccuracy(Number(e.target.value))} />
                            <span className="control-value" style={{ color: getColor(accuracy) }}>{accuracy}%</span>
                        </div>
                        <div className="control-note">Raw recall ≈ 34–56% · RAG-augmented ≈ 68–82%</div>
                    </div>
                    <div className="control-group">
                        <label>Agents in chain (diagram below)</label>
                        <div className="control-row">
                            <input type="range" min={1} max={10} value={steps}
                                   onChange={e => setSteps(Number(e.target.value))} />
                            <span className="control-value" style={{ color: "var(--color-text)" }}>{steps}</span>
                        </div>
                    </div>
                </div>
            </section>

            {/* ── Chain diagram ── */}
            <section>
                <span className="viz-section-title">Agent chain — independent error model</span>
                <div className="fullwidth">
                    <AgentChain steps={steps} accuracy={accuracy} />
                    <div className="chain-result">
                        After <strong>{steps} agent{steps > 1 ? "s" : ""}</strong>:{" "}
                        independent model → <strong style={{ color: getColor(parseFloat(finalInd)) }}>{finalInd}%</strong>{" "}
                        · correlated model → <strong style={{ color: getColor(parseFloat(finalCor)) }}>{finalCor}%</strong>
                        <Marginnote variant="warn">
                            The gap between these two numbers is the cost of not having human review
                            at intermediate checkpoints. The correlated model assumes each wrong answer
                            is passed confidently to the next agent. The independent model assumes
                            errors are random and don't influence downstream behaviour.
                            Neither is perfectly accurate — reality lies between them.
                        </Marginnote>
                    </div>
                </div>
            </section>

            {/* ── Decay chart ── */}
            <section>
                <span className="viz-section-title">Accuracy decay — four scenarios across 10 agents</span>
                <p className="body-text">
                    The shaded band represents uncertainty around the independent model.
                    Best-case assumes a well-configured RAG pipeline (~82% base);
                    worst-case assumes raw recall with high hallucination (~39%).
                    <Marginnote variant="data">
                        <strong>Reading this chart:</strong> any curve below the 50% line means
                        the agent chain is less reliable than a coin flip. Below 20%, the output
                        is statistical noise. For agents with write access to infrastructure,
                        the relevant question is: which curve represents your deployment?
                    </Marginnote>
                </p>
                <div className="fullwidth">
                    <div className="chart-legend">
                        <span className="legend-item"><span className="legend-swatch" style={{ background: "var(--color-line-primary)" }} />Independent ({accuracy}%)</span>
                        <span className="legend-item"><span className="legend-swatch" style={{ background: "var(--color-bad)", opacity: 0.8 }} />Correlated</span>
                        <span className="legend-item"><span className="legend-swatch" style={{ background: "var(--color-good)" }} />Best case (RAG ~82%)</span>
                        <span className="legend-item"><span className="legend-swatch" style={{ background: "var(--color-warn)" }} />Worst case (~39%)</span>
                    </div>
                    <ResponsiveContainer width="100%" height={320}>
                        <ComposedChart data={data} margin={{ top: 10, right: 24, left: 0, bottom: 24 }}>
                            <CartesianGrid strokeDasharray="2 4" stroke="#e8e8e0" />
                            <XAxis dataKey="step" stroke="#ccc" tick={{ fill: "var(--color-muted)", fontSize: 11 }}
                                   label={{ value: "Number of agents", position: "insideBottom", offset: -10, fill: "var(--color-muted)", fontSize: 11 }} />
                            <YAxis stroke="#ccc" tick={{ fill: "var(--color-muted)", fontSize: 11 }}
                                   domain={[0, 100]} tickFormatter={v => `${v}%`} />
                            <Tooltip content={<CustomTooltip />} />
                            <Area type="monotone" dataKey="bandHigh" stroke="none" fill="var(--color-band-fill)" fillOpacity={1} legendType="none" />
                            <Area type="monotone" dataKey="bandLow"  stroke="none" fill="var(--color-bg)"        fillOpacity={1} legendType="none" />
                            <ReferenceLine y={50} stroke="var(--color-warn)" strokeDasharray="4 4"
                                           label={{ value: "50% — coin flip", fill: "var(--color-warn)", fontSize: 10, position: "insideTopRight" }} />
                            <ReferenceLine y={20} stroke="var(--color-bad)"  strokeDasharray="4 4"
                                           label={{ value: "20% — noise", fill: "var(--color-bad)", fontSize: 10, position: "insideTopRight" }} />
                            <Line type="monotone" dataKey="bestCase"    stroke="var(--color-good)"         strokeWidth={1.5} strokeDasharray="6 3" dot={{ fill: "var(--color-good)",         r: 2 }} legendType="none" />
                            <Line type="monotone" dataKey="worstCase"   stroke="var(--color-warn)"         strokeWidth={1.5} strokeDasharray="6 3" dot={{ fill: "var(--color-warn)",         r: 2 }} legendType="none" />
                            <Line type="monotone" dataKey="correlated"  stroke="var(--color-bad)"          strokeWidth={1.5} opacity={0.7}         dot={{ fill: "var(--color-bad)",          r: 2 }} legendType="none" />
                            <Line type="monotone" dataKey="independent" stroke="var(--color-line-primary)" strokeWidth={2}                         dot={{ fill: "var(--color-line-primary)", r: 3 }} activeDot={{ r: 5 }} legendType="none" />
                        </ComposedChart>
                    </ResponsiveContainer>
                </div>
            </section>

            {/* ── Stat cards ── */}
            <section>
                <span className="viz-section-title">Summary at {accuracy}% base accuracy</span>
                <div className="fullwidth">
                    <div className="stat-grid">
                        {[{ label: "After 2 agents", n: 2 }, { label: "After 5 agents", n: 5 }, { label: "After 10 agents", n: 10 }].map(({ label, n }) => {
                            const val = (Math.pow(p, n) * 100).toFixed(0);
                            const color = getColor(parseFloat(val));
                            return (
                                <div key={n} className="stat-card" style={{ borderTopColor: color, borderTopWidth: 2 }}>
                                    <div className="stat-card-label">{label}</div>
                                    <div className="stat-card-value" style={{ color }}>{val}%</div>
                                    <div className="stat-card-sub">accuracy remaining</div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </section>

            {/* ── Implications ── */}
            <section>
                <h2>What This Means in Practice</h2>
                <p>
                    The DPI does not say that AI agents are useless. It says accuracy cannot improve
                    through chaining, and every step is an opportunity for it to degrade.
                    For agents in read-only or low-stakes contexts — summarising, drafting,
                    suggesting — this is manageable with good design.
                    <Sidenote>
                        A useful heuristic: if an agent's output will be reviewed by a human before
                        any action is taken, the DPI risk is contained. The risk compounds when
                        agents take actions directly, or when their output feeds another agent
                        without human review.
                    </Sidenote>
                </p>
                <p>
                    The risk profile changes fundamentally when agents have <strong>write access to
                    production infrastructure</strong>: databases, deployment pipelines, code repositories,
                    or financial systems.
                    <Sidenote variant="warn">
                        A confident error that propagates through three agents before anyone reviews
                        the output can cause damage that is difficult or impossible to undo.
                        Unlike a human who might pause and ask "does this look right?", a chained
                        agent has no such instinct — it operates on what it receives.
                    </Sidenote>{" "}
                    A confident error at step one can propagate through three agents before anyone
                    reviews the output, causing damage that is difficult or impossible to undo.
                </p>
                <p>
                    RAG helps — substantially. A well-configured pipeline can push base accuracy
                    to ~82%, which compresses the decay curve significantly. But even five RAG
                    agents in sequence still leaves you at{" "}
                    <strong>{ragFive}%</strong> accuracy in the best case.
                    <Sidenote variant="data">
                        <strong>The practical rule:</strong> before deploying agents with write
                        access, ask not "can this agent do the task?" but "what does failure look like,
                        how will we detect it, and what is the blast radius?"
                        Human oversight at critical checkpoints is not an engineering limitation
                        to work around — it is what the mathematics demands.
                    </Sidenote>{" "}
                    Retrieval augmentation is a valuable mitigation, not a guarantee.
                </p>
            </section>

        </article>
    );
}