import React, { useState, useEffect } from 'react';
import { AIThinkingIndicator } from './AIThinkingIndicator';

/**
 * Example Chat Message Layout demonstrating how to integrate AIThinkingIndicator
 * into a production-grade LLM conversation UI (like Claude, Gemini, or ChatGPT).
 */
export interface DemoChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  content: string;
  isThinking?: boolean;
  thinkingContent?: string;
  durationSeconds?: number;
  timestamp: string;
}

export const AIThinkingExample: React.FC = () => {
  // Demonstration scenario state
  const [messages, setMessages] = useState<DemoChatMessage[]>([
    {
      id: 'demo-1',
      sender: 'user',
      content: 'Could you analyze the algorithmic trade-offs between B-Trees and LSM-Trees for high-write workloads?',
      timestamp: '10:42 AM',
    },
    {
      id: 'demo-2',
      sender: 'assistant',
      isThinking: false,
      durationSeconds: 4,
      thinkingContent: `1. Deconstruct the user inquiry:
   - Target structures: B-Trees (in-place update, page-oriented) vs. Log-Structured Merge Trees (out-of-place, append-only).
   - Core focal context: High-write throughput workloads.
2. Formulate theoretical trade-offs:
   - Write Amplification Factor (WAF): LSMs buffer mutations in memory (memtable) and sequential-write to disk (SSTables), drastically lowering random I/O.
   - Read Amplification: LSM requires bloom filters and multi-level compactions (tiered vs. leveled).
   - Space Amplification: Compaction transient overhead and obsolete records.
3. Structure clear, objective answer:
   - Executive Summary
   - Structural Mechanics comparison
   - Concrete workload recommendation matrix`,
      content: `### High-Write Workload Comparison: B-Trees vs. LSM-Trees

When designing storage engines for **write-heavy workloads**, Log-Structured Merge Trees (LSM-Trees) fundamentally outperform traditional B-Trees by transforming random disk writes into sequential append operations.

#### Key Architectural Trade-offs:

1. **Write Amplification (WAF)**
   - **B-Trees**: In-place updates force page-level writes. Modifying a 64-byte row requires writing an entire 4KB–16KB page to disk, resulting in a high Write Amplification Factor and random I/O stalls.
   - **LSM-Trees**: Ingestion enters an in-memory mutable **MemTable** backed by a sequential Write-Ahead Log (WAL). Data is flushed to disk as immutable **SSTables** via sequential I/O, yielding significantly higher write throughput.

2. **Read Amplification & Compaction**
   - **Trade-off**: LSM-Trees trade read efficiency for write velocity. Retrieving a key may require searching multiple levels. This is mitigated using in-memory **Bloom filters** and asynchronous background **compaction** strategies (Leveled vs. Size-Tiered).

3. **Concurrency & Locking**
   - **B-Trees**: Require page latches and lock coupling across tree levels.
   - **LSM-Trees**: MemTable writes are append-only or use lock-free skip lists, maximizing multi-core ingestion saturation.`,
      timestamp: '10:42 AM',
    },
  ]);

  const [isSimulating, setIsSimulating] = useState<boolean>(false);
  const [activeDuration, setActiveDuration] = useState<number>(0);

  // Live simulation: demonstrates active thinking shimmer -> completed state
  const handleRunSimulation = () => {
    if (isSimulating) return;

    const newAssistantId = `sim-${Date.now()}`;
    const userMsg: DemoChatMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      content: 'Explain how Zero-Knowledge Succinct Non-Interactive Arguments of Knowledge (zk-SNARKs) verify validity without revealing secret inputs.',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    const thinkingAssistantMsg: DemoChatMessage = {
      id: newAssistantId,
      sender: 'assistant',
      isThinking: true,
      thinkingContent: '1. Parsing cryptographic primitives: Arithmetic circuits, QAPs (Quadratic Arithmetic Programs).\n2. Establishing prover-verifier relationship: Knowledge polynomial $P(x)$ vs evaluation at secret challenge point $\\tau$.\n3. Formulating concise explanation with zero information leakage mechanics.',
      content: '',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg, thinkingAssistantMsg]);
    setIsSimulating(true);
    setActiveDuration(0);

    // Duration timer simulation
    const startTime = Date.now();
    const interval = setInterval(() => {
      setActiveDuration(Math.floor((Date.now() - startTime) / 1000));
    }, 200);

    // Transition to completed state after 3.8 seconds
    setTimeout(() => {
      clearInterval(interval);
      setIsSimulating(false);
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === newAssistantId
            ? {
                ...msg,
                isThinking: false,
                durationSeconds: 4,
                content:
                  'A **zk-SNARK** allows a prover to convince a verifier that a statement is mathematically true without disclosing the underlying witness data.\n\n### Core Verification Mechanism:\n\n1. **Computation to Polynomials**: The computational task is converted into an arithmetic circuit and then into a *Quadratic Arithmetic Program (QAP)*.\n2. **Homomorphic Encryption**: The prover evaluates polynomials at an encrypted evaluation point generated during structured reference setup, proving knowledge of the roots without learning the point itself.\n3. **Bilinear Pairings**: The verifier checks an algebraic relation using elliptic curve pairings in $O(1)$ constant time.',
              }
            : msg
        )
      );
    }, 3800);
  };

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6 bg-zinc-950 border border-zinc-900 rounded-lg text-zinc-200">
      {/* Header and Controls */}
      <div className="flex items-center justify-between border-b border-zinc-900 pb-4">
        <div>
          <h2 className="text-sm font-semibold text-zinc-100 tracking-tight">
            AI Thinking State Component Showcase
          </h2>
          <p className="text-xs text-zinc-500 mt-0.5">
            Minimalist reasoning indicator inspired by Claude, Gemini & OpenAI o1/o3
          </p>
        </div>

        <button
          type="button"
          onClick={handleRunSimulation}
          disabled={isSimulating}
          className="px-3 py-1.5 text-xs font-medium bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 text-zinc-200 rounded-md transition-colors cursor-pointer"
        >
          {isSimulating ? `Thinking (${activeDuration}s)...` : 'Simulate New Query'}
        </button>
      </div>

      {/* Chat Messages Container */}
      <div className="space-y-6">
        {messages.map((msg) => (
          <div key={msg.id} className="space-y-2">
            {/* Sender Label */}
            <div className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider">
              {msg.sender === 'user' ? 'User' : 'Assistant'}
            </div>

            {/* Message Body */}
            {msg.sender === 'user' ? (
              <div className="text-xs text-zinc-300 leading-relaxed bg-zinc-900/50 p-3 rounded-md border border-zinc-800/60">
                {msg.content}
              </div>
            ) : (
              <div className="space-y-3">
                {/* 
                  PLUG-IN LOCATION: 
                  Render AIThinkingIndicator at the top of the AI response 
                  whenever the model is thinking or has finished reasoning.
                */}
                {(msg.isThinking || msg.thinkingContent) && (
                  <AIThinkingIndicator
                    isThinking={!!msg.isThinking}
                    thinkingContent={msg.thinkingContent}
                    durationSeconds={msg.durationSeconds}
                  />
                )}

                {/* Final Output Content (Rendered when available) */}
                {msg.content && (
                  <div className="text-xs text-zinc-300 leading-relaxed font-sans whitespace-pre-line pt-1">
                    {msg.content}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default AIThinkingExample;
