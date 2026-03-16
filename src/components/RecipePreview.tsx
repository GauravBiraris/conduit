import { 
  ArrowLeft, CheckCircle2,  
  Copy, Download, Code2, Play, Loader2, ServerCrash, Database, BarChart3
} from 'lucide-react';
import { useRecipeStore } from '../store/useRecipeStore';
import type { TransformLogic, DBConfig  } from '../store/useRecipeStore';
import { useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer 
} from 'recharts';

// ==========================================
// 5. COMPONENT: RECIPE PREVIEW (Step 4)
// ==========================================
export function RecipePreview() {
  // Destructure the new DB configuration states from the store
  const { actus_target, mappings, setStep, localDataPath, wizardAnswers, sourceType, outputPreference, sourceDbConfig } = useRecipeStore();
  
  const [etlStatus, setEtlStatus] = useState<'idle' | 'running' | 'success' | 'error'>('idle');
  const [etlMessage, setEtlMessage] = useState('');

  const [simStatus, setSimStatus] = useState<'idle' | 'running' | 'success' | 'error'>('idle');
  const [simMessage, setSimMessage] = useState('');
  const [chartData, setChartData] = useState<any[] | null>(null);

  
  // Local state for the Target DB. Defaults to the Source DB if they provided one in Step 1.
  const [targetDb, setTargetDb] = useState<DBConfig>({
    dialect: 'postgresql', host: 'localhost', port: '5432', user: '', pass: '', dbname: '', query: ''
  });
  

  // JsonLogic Compiler Function
  const compileToJsonLogic = (transform: TransformLogic, legacyCol: string) => {
    switch(transform.op) {
      case 'divide': 
        return { "/": [{ "var": legacyCol }, Number(transform.param)] };
      case 'multiply': 
        return { "*": [{ "var": legacyCol }, Number(transform.param)] };
      case 'lookup': {
        const rules = transform.param as Record<string, string>;
        const ifArray: any[] = [];
        for (const [k, v] of Object.entries(rules)) {
          ifArray.push({ "==": [{ "var": legacyCol }, k] });
          ifArray.push(v);
        }
        ifArray.push({ "var": legacyCol });
        return { "if": ifArray };
      }
      case 'date_format': 
        return { "parse_date": [{ "var": legacyCol }, transform.param] };
      case 'cast':
        return { "var": legacyCol };
      case 'default_value': 
        if (transform.param !== "" && !isNaN(Number(transform.param))) {
          return Number(transform.param);
        }
        return transform.param;
      default: 
        return { "var": legacyCol };
    }
  };

  const recipe = {
    tenant_id: "local_tenant_001",
    product_name: "Legacy_Mapped_Product",
    actus_target: actus_target,
    _ui_wizard: wizardAnswers,
    mappings: mappings.map(m => {
      const compiledMapping: any = {
        actus_attr: m.actus_field,
        legacy_col: m.legacy_column,
      };

      if (m.has_logic && m.transform) {
        compiledMapping.json_logic = compileToJsonLogic(m.transform, m.legacy_column);
        compiledMapping._ui_transform = m.transform;
      } else if (m.legacy_column === '__CONSTANT__') {
        compiledMapping.json_logic = null; 
      } else {
        compiledMapping.json_logic = { "var": m.legacy_column };
      }
      return compiledMapping;
    })
  };

  const jsonString = JSON.stringify(recipe, null, 2);

  const handleRunETL = async () => {
    if (sourceType === 'csv' && !localDataPath) {
      setEtlStatus('error');
      setEtlMessage("Error: No local file path found. Please upload a real CSV rather than using Demo Data.");
      return;
    }

    // ---  Validation for Target DB ---
    if (outputPreference === 'db') {
      if (!targetDb.host || !targetDb.dbname || !targetDb.user) {
        setEtlStatus('error');
        setEtlMessage("Validation Error: Please provide the Target Database Name, Host, and Username.");
        return; // Stops execution gracefully
      }
    }

    setEtlStatus('running');
    try {
      // Package distinct Source and Target configs for Python
      const engineConfig = {
        sourceType,
        dataPath: localDataPath,
        sourceDbConfig, 
        targetDbConfig: targetDb, // Clearly isolated
        outputPreference
      };

      // @ts-ignore
      const result = await window.electronAPI.runPythonETL(recipe, engineConfig);
        
      if (result.success) {
        setEtlStatus('success');
        setEtlMessage(result.message);
      } else {
        setEtlStatus('error');
        setEtlMessage(result.message);
      }
    } catch (err: any) {
      setEtlStatus('error');
      setEtlMessage(err.message || "Failed to communicate with Electron backend.");
    }
  };
  
  const handleSimulation = async () => {
    setSimStatus('running');
    setChartData(null);
    try {
      const engineConfig = { sourceType, dataPath: localDataPath, sourceDbConfig, targetDbConfig: targetDb, outputPreference };
      
      // @ts-ignore
      const result = await window.electronAPI.runSimulation(engineConfig);
      
      if (result.success) {
        setSimStatus('success');
        setSimMessage(result.message);
        if (result.chartData) setChartData(result.chartData);
      } else {
        setSimStatus('error');
        setSimMessage(result.message);
      }
    } catch (err: any) {
      setSimStatus('error');
      setSimMessage(err.message || "Failed to communicate with Electron backend.");
    }
  };
  
  const handleCopy = () => {
    navigator.clipboard.writeText(jsonString);
    alert("Recipe copied to clipboard!");
  };

  const handleDownload = () => {
    const blob = new Blob([jsonString], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `actus_recipe_${actus_target}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-300 flex flex-col items-center pt-12 pb-12 font-sans w-full">
      <div className="max-w-3xl w-full px-6">
        
        <button onClick={() => setStep(3)} className="text-slate-400 flex items-center gap-1 mb-8 hover:text-white transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to Mapper
        </button>

        <div className="text-center mb-8">
          <CheckCircle2 className="w-16 h-16 text-emerald-500 mx-auto mb-4" />
          <h1 className="text-3xl font-bold text-white mb-2">Recipe Generated Successfully</h1>
          <p className="text-slate-400">
            This configuration file is ready to be fed into the Python ETL Engine.
          </p>
        </div>

        <div className="flex justify-end gap-4 mb-4">
          <button onClick={handleCopy} className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg transition-colors border border-slate-700">
            <Copy className="w-4 h-4" /> Copy
          </button>
          <button onClick={handleDownload} className="flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-50 text-white rounded-lg transition-colors shadow-lg shadow-amber-900/20">
            <Download className="w-4 h-4" /> Download JSON
          </button>
        </div>

        {/* ---  TARGET DATABASE CONFIGURATION PANEL --- */}
        {outputPreference === 'db' && (
  <div className="bg-slate-800 rounded-xl p-6 mb-8 border border-slate-700">
    <h3 className="text-white font-bold text-lg flex items-center gap-2 mb-4">
      <Database className="w-5 h-5 text-blue-400" /> Target Database (Output)
    </h3>
    
    <div className="grid grid-cols-2 gap-4 mb-4 text-slate-900">
      <div>
        <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Database Name</label>
        <input type="text" className="w-full p-2 rounded bg-slate-700 border border-slate-600 text-white outline-none focus:border-blue-500" 
          value={targetDb.dbname} onChange={e => setTargetDb({...targetDb, dbname: e.target.value})} />
      </div>
      <div className="flex gap-2">
        <div className="flex-1">
          <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Host</label>
          <input type="text" className="w-full p-2 rounded bg-slate-700 border border-slate-600 text-white outline-none focus:border-blue-500" 
            value={targetDb.host} onChange={e => setTargetDb({...targetDb, host: e.target.value})} />
        </div>
        <div className="w-20">
          <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Port</label>
          <input type="text" className="w-full p-2 rounded bg-slate-700 border border-slate-600 text-white outline-none focus:border-blue-500" 
            value={targetDb.port} onChange={e => setTargetDb({...targetDb, port: e.target.value})} />
        </div>
      </div>
      <div>
        <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Username</label>
        <input type="text" className="w-full p-2 rounded bg-slate-700 border border-slate-600 text-white outline-none focus:border-blue-500" 
          value={targetDb.user} onChange={e => setTargetDb({...targetDb, user: e.target.value})} />
      </div>
      <div>
        <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Password</label>
        <input type="password" className="w-full p-2 rounded bg-slate-700 border border-slate-600 text-white outline-none focus:border-blue-500" 
          value={targetDb.pass} onChange={e => setTargetDb({...targetDb, pass: e.target.value})} />
      </div>
    </div>

    {/* Schema Info Guideline */}
    <div className="bg-slate-900/50 p-4 rounded-lg border border-slate-700 mt-2 text-sm text-slate-400">
      <p className="text-blue-400 font-bold mb-1">ℹ️ Table Auto-Creation Guidelines</p>
      <p className="mb-2 text-xs leading-relaxed">The engine will automatically generate the schema via SQLAlchemy if it does not exist. Manual creation is not required. Recommended schema structure:</p>
      <pre className="text-xs text-slate-500 font-mono bg-slate-900 p-2 rounded border border-slate-800">
        CREATE TABLE actus_contracts ({'\n'}
        {'  '}contract_id TEXT PRIMARY KEY,{'\n'}
        {'  '}contract_type TEXT,{'\n'}
        {'  '}payload JSONB{'\n'}
        );
      </pre>
    </div>
  </div>
)}

        {/* --- ETL ENGINE CONTROLS --- */}
        <div className="bg-slate-800 rounded-xl p-6 mb-8 border border-slate-700">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-white font-bold text-lg flex items-center gap-2">
                Local Execution Engine
              </h3>
              <p className="text-sm text-slate-400 mt-1">
                Data Source: <span className="font-mono text-blue-400">{localDataPath || "Demo Data (Cannot execute)"}</span>
              </p>
            </div>
            
            <button 
              onClick={handleRunETL}
              disabled={etlStatus === 'running'}
              className="flex items-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {etlStatus === 'running' ? <Loader2 className="w-5 h-5 animate-spin" /> : <Play className="w-5 h-5 fill-current" />}
              {etlStatus === 'running' ? 'Processing...' : 'Run Python Transformation'}
            </button>
          </div>

          {/* Engine Output Console */}
          {etlStatus !== 'idle' && (
            <div className={`mt-4 p-4 rounded-lg border text-sm font-mono whitespace-pre-wrap
              ${etlStatus === 'success' ? 'bg-emerald-900/30 border-emerald-800 text-emerald-300' : ''}
              ${etlStatus === 'error' ? 'bg-red-900/30 border-red-800 text-red-300' : ''}
              ${etlStatus === 'running' ? 'bg-slate-900 border-slate-700 text-slate-400 animate-pulse' : ''}
            `}>
              {etlStatus === 'error' && <ServerCrash className="w-5 h-5 mb-2 inline-block mr-2" />}
              {etlStatus === 'running' ? 'Executing python engine...' : etlMessage}
            </div>
          )}
        </div>
{/* --- NEW: ANALYTICS DASHBOARD --- */}
        <div className="bg-slate-800 rounded-xl p-6 mb-8 border border-slate-700">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-white font-bold text-lg flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-emerald-400" /> Cashflow Projections (ACTUS Engine)
              </h3>
              <p className="text-sm text-slate-400 mt-1">Generates granular cashflows via Demo API & Aggregates locally.</p>
            </div>
            
            <button 
              onClick={handleSimulation}
              disabled={etlStatus !== 'success' || simStatus === 'running'}
              className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {simStatus === 'running' ? <Loader2 className="w-5 h-5 animate-spin" /> : <Play className="w-5 h-5 fill-current" />}
              {simStatus === 'running' ? 'Simulating...' : 'Run Simulation'}
            </button>
          </div>

          {/* Simulation Output Message */}
          {simStatus !== 'idle' && (
            <div className={`mt-4 mb-6 p-4 rounded-lg border text-sm font-mono whitespace-pre-wrap
              ${simStatus === 'success' ? 'bg-blue-900/30 border-blue-800 text-blue-300' : ''}
              ${simStatus === 'error' ? 'bg-red-900/30 border-red-800 text-red-300' : ''}
              ${simStatus === 'running' ? 'bg-slate-900 border-slate-700 text-slate-400 animate-pulse' : ''}
            `}>
              {simStatus === 'error' && <ServerCrash className="w-5 h-5 mb-2 inline-block mr-2" />}
              {simStatus === 'running' ? 'Connecting to ACTUS API and generating cashflows...' : simMessage}
            </div>
          )}

          {/* Recharts Visualization */}
          {chartData && chartData.length > 0 && (
            <div className="bg-slate-900 p-4 rounded-xl border border-slate-700 h-80 w-full mt-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis dataKey="date" stroke="#94a3b8" />
                  <YAxis stroke="#94a3b8" />
                  <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155' }} />
                  <Legend />
                  <Bar dataKey="principal" name="Principal Flow" fill="#3b82f6" stackId="a" />
                  <Bar dataKey="interest" name="Interest Flow" fill="#10b981" stackId="a" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
        {/* Recipe Preview Panel (Same as before) */}
        <div className="bg-[#0d1117] rounded-xl border border-slate-800 overflow-hidden shadow-2xl">
          <div className="bg-slate-800/50 px-4 py-3 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Code2 className="w-4 h-4 text-blue-400" />
              <span className="text-sm font-mono text-slate-300">recipe_{actus_target?.toLowerCase()}.json</span>
            </div>
          </div>
          <pre className="p-6 overflow-x-auto text-sm font-mono text-blue-300 leading-relaxed">
            <code>{jsonString}</code>
          </pre>
        </div>
      </div>
    </div>
  );
}