import { useState } from 'react';
import { useRecipeStore,  } from '../store/useRecipeStore';
import { UploadCloud, FileSpreadsheet, AlertTriangle, Database, FileJson, Loader2 } from 'lucide-react';
import type { ColumnDef, DBConfig } from '../store/useRecipeStore';

function MinimalLogo() {
  return (
    <svg width="200" height="200" viewBox="0 0 200 200" fill="none">
      {/* Simplified pipe/conduit icon */}
      <rect x="50" y="85" width="100" height="30" rx="15" fill="#2563eb" />
      
      {/* Data flow indicators */}
      <circle cx="70" cy="100" r="6" fill="#ebb625">
        <animate attributeName="cx" values="70;130;70" dur="3s" repeatCount="indefinite" />
      </circle>
      <circle cx="100" cy="100" r="6" fill="#d0d406">
        <animate attributeName="cx" values="100;160;100" dur="3s" repeatCount="indefinite" begin="0.5s" />
      </circle>
      <circle cx="130" cy="100" r="6" fill="#e39506">
        <animate attributeName="cx" values="130;190;130" dur="3s" repeatCount="indefinite" begin="1s" />
      </circle>
      
      {/* Connection points */}
      <circle cx="35" cy="100" r="8" fill="#1e3a8a" />
      <circle cx="165" cy="100" r="8" fill="#1e3a8a" />
      
      {/* Connecting lines */}
      <line x1="35" y1="100" x2="50" y2="100" stroke="#2563eb" strokeWidth="3" />
      <line x1="150" y1="100" x2="165" y2="100" stroke="#2563eb" strokeWidth="3" />
    </svg>
  );
}

export function DataIngestion() {
  const { 
    setLegacyColumns, setStep, setLocalDataPath, 
    sourceType, setSourceType, outputPreference, setOutputPreference, setSourceDbConfig 
  } = useRecipeStore();
  
  const [error, setError] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  
  // Database Form State
  const [dbForm, setDbForm] = useState<DBConfig>({
    dialect: 'postgresql', host: 'localhost', port: '5432', user: '', pass: '', dbname: '', query: ''
  });

  const inferType = (values: string[]) => {
    const validValues = values.filter(v => v !== undefined && v.trim() !== '');
    if (validValues.length === 0) return 'string';
    const isNumeric = validValues.every(v => !isNaN(Number(v)));
    if (isNumeric) return 'number';
    const isDate = validValues.every(v => /^\d{4}-\d{2}-\d{2}/.test(v) || /^\d{1,2}\/\d{1,2}\/\d{2,4}/.test(v) || (!isNaN(Date.parse(v)) && isNaN(Number(v))));
    if (isDate) return 'date';
    const isDuration = validValues.every(v => /^P(?:\d+[YMWD])+(?:T(?:\d+[HMS])*)?$/.test(v));
    if (isDuration) return 'duration';
    return 'string';
  };

  // --- CSV PARSING LOGIC ---
  const parseCSV = (csvText: string): string[][] => {
    // ... keep your robust parseCSV function logic here ...
    const rows: string[][] = [];
    const lines = csvText.split('\n'); // Simplified here for brevity, paste your exact parser inside
    lines.forEach(line => rows.push(line.split(','))); 
    return rows;
  };

  const processCSV = (text: string) => {
    try {
      const parsedRows = parseCSV(text);
      if (parsedRows.length < 2) throw new Error("CSV must contain headers and data.");
      const headers = parsedRows[0];
      const sampleRows = parsedRows.slice(1, 6);

      const columns: ColumnDef[] = headers.map((header, index) => ({
        name: header.trim(),
        type: inferType(sampleRows.map(row => row[index]))
      }));

      setLegacyColumns(columns);
      setStep(2); 
    } catch (err: any) { setError(err.message); }
  };

  const handleNativeFilePick = async () => {
    setError(null);
    try {
      // @ts-ignore
      const result = await window.electronAPI.openFileDialog();
      if (result) {
        setLocalDataPath(result.filePath); 
        processCSV(result.fileContent);   
      }
    } catch (err: any) { setError("Failed to open file: " + err.message); }
  };

  // --- NEW: DATABASE CONNECTION LOGIC ---
  const handleDBConnect = async () => {
    setError(null);
    setIsConnecting(true);
    
    try {
      setSourceDbConfig(dbForm); // Save to store for the engine later
      
      // @ts-ignore
      const result = await window.electronAPI.profileDatabase(JSON.stringify(dbForm));
      
      if (result.success) {
        const columns: ColumnDef[] = result.headers.map((header: string, index: number) => ({
          name: header,
          type: inferType(result.rows.map((row: any[]) => row[index]))
        }));
        
        setLegacyColumns(columns);
        setLocalDataPath('DATABASE_CONNECTION'); // Dummy path so it passes validations
        setStep(2);
      } else {
        setError("Database Connection Failed: " + result.error);
      }
    } catch (err: any) {
      setError("IPC Error: " + err.message);
    } finally {
      setIsConnecting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center pt-12 font-sans text-slate-800 pb-12">
      {/* --- BRANDING HEADER --- */}
      <div className="flex items-center gap-6 mb-8">
        {/* Your custom PNG from the public folder */}
        <img src="/logo.png" alt="App Logo" className="w-24 h-24 object-contain drop-shadow-sm" />
        
        <div className="h-12 w-px bg-slate-300"></div> {/* Divider line */}
        
         
        <MinimalLogo />
      </div>
      <div className="max-w-3xl w-full mb-8 px-6 text-center">
        <h1 className="text-3xl font-bold text-slate-900">Connect Your Data</h1>
        <p className="text-slate-500 mt-2">Select your input source and configure your output preferences.</p>
      </div>

      <div className="bg-white max-w-2xl w-full rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        
        {/* TAB NAVIGATION */}
        <div className="flex border-b border-slate-200">
          <button 
            onClick={() => { setSourceType('csv'); setOutputPreference('json'); }}
            className={`flex-1 py-4 font-bold text-sm flex justify-center items-center gap-2 ${sourceType === 'csv' ? 'bg-lime-50 text-lime-700 border-b-2 border-lime-600' : 'text-slate-500 hover:bg-slate-50'}`}
          >
            <FileSpreadsheet className="w-5 h-5" /> Local CSV File
          </button>
          <button 
            onClick={() => { setSourceType('db'); setOutputPreference('db'); }} // Enforce Output to DB
            className={`flex-1 py-4 font-bold text-sm flex justify-center items-center gap-2 ${sourceType === 'db' ? 'bg-lime-50 text-lime-700 border-b-2 border-lime-600' : 'text-slate-500 hover:bg-slate-50'}`}
          >
            <Database className="w-5 h-5" /> Database Connection
          </button>
        </div>

        <div className="p-8">
          {error && (
            <div className="mb-6 p-4 bg-red-50 text-red-700 rounded-lg flex items-center gap-2 text-sm font-semibold border border-red-100">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              {error}
            </div>
          )}

          {sourceType === 'csv' ? (
            <div className="space-y-6">
              {/* CSV Upload Area */}
              <div onClick={handleNativeFilePick} className="border-2 border-dashed rounded-xl p-12 text-center transition-colors cursor-pointer border-slate-300 hover:border-lime-500 hover:bg-lime-50">
                <UploadCloud className="w-16 h-16 text-lime-500 mx-auto mb-4" />
                <h3 className="text-lg font-bold text-slate-700 mb-1">Click to browse your computer</h3>
                <p className="text-sm text-slate-500">Select a local CSV file</p>
              </div>

              {/* Output Preference Toggle */}
              <div className="mt-6 bg-slate-50 p-4 rounded-xl border border-slate-200">
  <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Output Format Strategy</p>
  <div className="flex gap-4">
    <label className="flex-1 flex items-center gap-3 p-3 border rounded-lg cursor-pointer bg-white hover:border-blue-400">
      <input 
        type="radio" 
        checked={outputPreference === 'json'} 
        onChange={() => setOutputPreference('json')} 
        className="w-4 h-4 text-blue-600" 
      />
      <div>
        <span className="block font-bold text-sm text-slate-800">JSON Document</span>
        <span className="block text-xs text-slate-500">Standard _ACTUS.json file</span>
      </div>
    </label>
    <label className="flex-1 flex items-center gap-3 p-3 border rounded-lg cursor-pointer bg-white hover:border-blue-400">
      <input 
        type="radio" 
        checked={outputPreference === 'db'} 
        onChange={() => setOutputPreference('db')} 
        className="w-4 h-4 text-blue-600" 
      />
      <div>
        <span className="block font-bold text-sm text-slate-800">PostgreSQL</span>
        <span className="block text-xs text-slate-500">Direct df.to_sql() batch insert</span>
      </div>
    </label>
  </div>
</div>

            </div>
          ) : (
            <div className="space-y-4">
              {/* Database Form */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Engine Dialect</label>
                  <select className="w-full p-2 rounded border outline-none focus:border-lime-500 bg-slate-50"
                    value={dbForm.dialect} onChange={e => setDbForm({...dbForm, dialect: e.target.value})}>
                    <option value="postgresql">PostgreSQL</option>
                    <option value="mysql+pymysql">MySQL</option>
                    <option value="mssql+pyodbc">SQL Server</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Database Name</label>
                  <input type="text" className="w-full p-2 rounded border outline-none focus:border-lime-500" placeholder="e.g. bank_legacy_db"
                    value={dbForm.dbname} onChange={e => setDbForm({...dbForm, dbname: e.target.value})} />
                </div>
              </div>
              
              <div className="grid grid-cols-12 gap-4">
                <div className="col-span-8">
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Host / Server</label>
                  <input type="text" className="w-full p-2 rounded border outline-none focus:border-lime-500" placeholder="localhost"
                    value={dbForm.host} onChange={e => setDbForm({...dbForm, host: e.target.value})} />
                </div>
                <div className="col-span-4">
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Port</label>
                  <input type="text" className="w-full p-2 rounded border outline-none focus:border-lime-500" placeholder="5432"
                    value={dbForm.port} onChange={e => setDbForm({...dbForm, port: e.target.value})} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Username</label>
                  <input type="text" className="w-full p-2 rounded border outline-none focus:border-lime-500"
                    value={dbForm.user} onChange={e => setDbForm({...dbForm, user: e.target.value})} />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Password</label>
                  <input type="password" className="w-full p-2 rounded border outline-none focus:border-lime-500"
                    value={dbForm.pass} onChange={e => setDbForm({...dbForm, pass: e.target.value})} />
                </div>
              </div>

              <div className="pt-2">
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Source Table or SQL Query</label>
                <textarea rows={3} className="w-full p-2 rounded border outline-none focus:border-lime-500 font-mono text-sm" placeholder="SELECT * FROM legacy_mortgages WHERE status = 'ACTIVE'"
                  value={dbForm.query} onChange={e => setDbForm({...dbForm, query: e.target.value})} />
              </div>

              <div className="bg-amber-50 p-4 rounded-xl border border-amber-200 mt-2">
                <p className="text-xs font-bold text-amber-800 uppercase tracking-wider mb-1 flex items-center gap-1"><FileJson className="w-4 h-4"/> Enforced Output</p>
                <p className="text-sm text-amber-900">Database source mode locks output mapping to <strong>PostgreSQL</strong> via <code className="bg-amber-200 px-1 rounded">df.to_sql()</code> to support large batch operations.</p>
              </div>

              <div className="mt-6 flex justify-end">
                <button 
                  onClick={handleDBConnect}
                  disabled={!dbForm.dbname || !dbForm.query || isConnecting}
                  className="bg-lime-600 text-white px-6 py-3 rounded-lg font-bold flex items-center gap-2 hover:bg-lime-700 disabled:opacity-50"
                >
                  {isConnecting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Database className="w-5 h-5" />}
                  {isConnecting ? 'Profiling Data...' : 'Connect & Profile DB'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}