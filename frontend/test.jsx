// CodexTest.jsx
import React, { useState } from "react";

export default function CodexTest() {
  const [prompt, setPrompt] = useState("Écris une fonction JS qui inverse une chaîne.");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState("");
  const [error, setError] = useState("");

  const onSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setResult("");
    setError("");

    try {
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      });

      // Si ton API renvoie une erreur
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || `Erreur HTTP ${res.status}`);
      }

      const data = await res.json();
      // attendu: { output: "..." } (tu peux changer selon ta réponse backend)
      setResult(data.output ?? JSON.stringify(data, null, 2));
    } catch (err) {
      setError(err.message || "Une erreur est survenue.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 760, margin: "40px auto", padding: 16, fontFamily: "system-ui, Arial" }}>
      <h2 style={{ marginBottom: 8 }}>Test Codex / IA</h2>
      <p style={{ marginTop: 0, opacity: 0.75 }}>
        Envoie un prompt à <code>/api/ai</code> et affiche la réponse.
      </p>

      <form onSubmit={onSubmit} style={{ display: "grid", gap: 12 }}>
        <label style={{ display: "grid", gap: 6 }}>
          <span>Prompt</span>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            rows={6}
            placeholder="Tape ton prompt ici..."
            style={{
              width: "100%",
              padding: 12,
              borderRadius: 10,
              border: "1px solid #ddd",
              outline: "none",
              resize: "vertical",
            }}
          />
        </label>

        <button
          type="submit"
          disabled={loading || !prompt.trim()}
          style={{
            padding: "10px 14px",
            borderRadius: 10,
            border: "1px solid #ddd",
            cursor: loading ? "not-allowed" : "pointer",
            fontWeight: 600,
          }}
        >
          {loading ? "Envoi..." : "Envoyer"}
        </button>
      </form>

      {error && (
        <div style={{ marginTop: 16, padding: 12, borderRadius: 10, background: "#ffe8e8" }}>
          <strong>Erreur :</strong> {error}
        </div>
      )}

      {result && (
        <div style={{ marginTop: 16 }}>
          <h3 style={{ marginBottom: 8 }}>Réponse</h3>
          <pre
            style={{
              padding: 12,
              borderRadius: 10,
              background: "#f6f6f6",
              overflowX: "auto",
              whiteSpace: "pre-wrap",
              wordBreak: "break-word",
            }}
          >
            {result}
          </pre>
        </div>
      )}
    </div>
  );
}
