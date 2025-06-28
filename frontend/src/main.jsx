import React, { useEffect, useState } from "react";
import ReactDOM from "react-dom/client";
import { backend } from "declarations/backend";
import { AuthClient } from "@dfinity/auth-client";
import "/index.css";

const App = () => {
  const [priceInput, setPriceInput] = useState('');
  const [logs, setLogs] = useState([]);
  const [status, setStatus] = useState(false);
  const [strategy, setStrategy] = useState('basic');
  const [threshold, setThreshold] = useState(0.5);
  const [balance, setBalance] = useState(0);
  const [principal, setPrincipal] = useState(null);

  // Initialize Internet Identity Auth
  const initAuth = async () => {
    const authClient = await AuthClient.create();
    if (!await authClient.isAuthenticated()) {
      await authClient.login({
        identityProvider: "https://identity.ic0.app/#authorize",
        onSuccess: async () => {
          const identity = authClient.getIdentity();
          setPrincipal(identity.getPrincipal().toString());
        }
      });
    } else {
      const identity = authClient.getIdentity();
      setPrincipal(identity.getPrincipal().toString());
    }
  };

  const toggleBot = async () => {
    if (status) {
      await backend.stop_bot();
    } else {
      await backend.start_bot();
    }
    const active = await backend.is_bot_active();
    setStatus(active);
  };

  const submitPrices = async () => {
    const prices = priceInput.split(',').map(Number).filter(p => !isNaN(p));
    if (prices.length < 3) {
      alert("Please enter at least 3 price points");
      return;
    }
    const result = await backend.analyze_market(prices);
    alert(`Decision: ${result}`);
    refreshLogs();
    refreshBalance();
  };

  const refreshLogs = async () => {
    const newLogs = await backend.get_trade_logs();
    setLogs(newLogs.reverse());
  };

  const refreshBalance = async () => {
    const bal = await backend.get_balance();
    setBalance(bal.toFixed(2));
  };

  const refreshConfig = async () => {
    const config = await backend.get_bot_config();
    setStrategy(config.strategy);
    setThreshold(config.threshold);
  };

  const updateConfig = async () => {
    await backend.update_config(strategy, parseFloat(threshold));
    alert("Configuration updated!");
    refreshConfig();
  };

  useEffect(() => {
    (async () => {
      await initAuth();
      const active = await backend.is_bot_active();
      setStatus(active);
      refreshLogs();
      refreshBalance();
      refreshConfig();
    })();
  }, []);

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <h1 className="text-3xl font-bold mb-4 text-center">🤖 Quanturnic AI Bot</h1>
      {principal && (
        <p className="text-sm text-gray-600 mb-4 text-center">Logged in as: <code>{principal}</code></p>
      )}

      <div className="mb-6 text-center">
        <p className="text-lg">
          Bot Status:{" "}
          <span className={`font-semibold ${status ? "text-green-600" : "text-red-600"}`}>
            {status ? "Running" : "Stopped"}
          </span>
        </p>
        <p className="text-lg">Simulated Balance: <strong>${balance}</strong></p>
        <button
          onClick={toggleBot}
          className="mt-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded"
        >
          {status ? "Stop Bot" : "Start Bot"}
        </button>
      </div>

      <div className="mb-6">
        <h2 className="text-xl font-semibold mb-2">📈 Analyze Market</h2>
        <textarea
          value={priceInput}
          onChange={e => setPriceInput(e.target.value)}
          className="w-full border border-gray-300 p-2 rounded mb-2"
          placeholder="Enter price history (e.g. 30,32,31,33,35)"
        />
        <button
          onClick={submitPrices}
          className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded"
        >
          Analyze Market
        </button>
      </div>

      <div className="mb-6">
        <h2 className="text-xl font-semibold mb-2">⚙️ Bot Configuration</h2>
        <div className="flex flex-col gap-2">
          <input
            type="text"
            value={strategy}
            onChange={e => setStrategy(e.target.value)}
            className="w-full border border-gray-300 p-2 rounded"
            placeholder="Strategy (e.g. basic, macd, svm)"
          />
          <input
            type="number"
            step="0.01"
            value={threshold}
            onChange={e => setThreshold(e.target.value)}
            className="w-full border border-gray-300 p-2 rounded"
            placeholder="Threshold (e.g. 0.5)"
          />
          <button
            onClick={updateConfig}
            className="px-4 py-2 bg-yellow-500 hover:bg-yellow-600 text-white rounded"
          >
            Update Config
          </button>
        </div>
      </div>

      <div className="mb-6">
        <h2 className="text-xl font-semibold mb-2">🧾 Trade Logs</h2>
        <ul className="bg-gray-100 p-4 rounded max-h-64 overflow-y-auto">
          {logs.length === 0 && <p className="text-gray-500">No logs yet.</p>}
          {logs.map((log, idx) => (
            <li key={idx} className="mb-2 border-b border-gray-300 pb-2 text-sm">
              <strong>{log.action}</strong> at{" "}
              {new Date(Number(log.timestamp) / 1_000_000).toLocaleTimeString()}<br />
              <span className="text-gray-700">Reason:</span> {log.reason}<br />
              <span className="text-gray-700">Price:</span> ${log.price}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
