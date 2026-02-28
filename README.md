# AI Agents & the Data Processing Inequality

**[→ Open the interactive visualisation](https://eamonnmag.github.io/ai-agents-dpi/)**

A principle from information theory that doesn't get enough attention in AI agent design.

The Data Processing Inequality states that information cannot increase through processing — any transformation can only preserve it or reduce it. Applied to chained AI agents, this means accuracy cannot improve as you add steps. Each agent is a lossy channel, and errors compound.

This tool makes that concrete. It shows four decay scenarios across a chain of up to ten agents — independent errors, correlated errors, best-case RAG-augmented pipelines, and worst-case raw recall — alongside real benchmark data from the AA-Omniscience evaluation (Artificial Analysis, Nov 2025).

## What you can explore

- Adjust base model accuracy and chain length to see how quickly accuracy degrades
- Compare independent vs. correlated error regimes and understand why the difference matters in production
- See where frontier models actually sit on the accuracy/hallucination spectrum
- Understand why human review at pipeline checkpoints is an architectural requirement, not a workaround

## Built with

React · TypeScript · Recharts · [Tufte CSS](https://edwardtufte.github.io/tufte-css/)

## Running locally

```bash
npm install
npm run dev
```
