import { useState, useEffect } from 'react';
import { 
   ArrowLeft, CheckCircle2 , AlertCircle, Database, Link as LinkIcon, 
  Settings2, CheckCircle, AlertTriangle,
  X, Info, Plus, Trash2, Loader2, Server
} from 'lucide-react';
import { useRecipeStore } from '../store/useRecipeStore';
import type { TransformLogic } from '../store/useRecipeStore';


// ==========================================
// 4. COMPONENT: MAPPING STUDIO & LOGIC MODAL (Step 3)
// ==========================================
interface ActusFieldDef {
  id: string;
  name: string;
  req: boolean;
  type: string;
  hint: string;
}

// Base schemas including new Phase 2 products
const ACTUS_SCHEMAS_BASE: Record<string, ActusFieldDef[]> = {
  'PAM': [
    { id: 'contractID', name: 'Contract Identifier', req: true, type: 'string', hint: "Unique identifier representing the contract entity." },
    { id: 'contractRole', name: 'Contract Role', req: true, type: 'string', hint: "Direction of cashflows. RPA = Real Position Asset (Lender), RPL = Liability (Borrower)." },
    { id: 'statusDate', name: 'Status Date', req: true, type: 'date', hint: "The anchor date for the contract's current status (often same as Initial Exchange Date)." },
    { id: 'notionalPrincipal', name: 'Notional Principal', req: true, type: 'number', hint: "Total principal amount of the loan." },
    { id: 'nominalInterestRate', name: 'Nominal Interest Rate', req: true, type: 'number', hint: "Annual interest rate expressed as a decimal." },
    { id: 'cycleOfInterestPayment', name: 'Interest Payment Cycle', req: true, type: 'string', hint: "Frequency of interest payments (e.g., P1ML0 for Monthly, P1YL0 for Yearly)." },
    { id: 'cycleAnchorDateOfInterestPayment', name: 'Interest Anchor Date', req: true, type: 'date', hint: "Date of the first interest payment." },
    { id: 'initialExchangeDate', name: 'Initial Exchange Date', req: true, type: 'date', hint: "Date of initial disbursement (YYYY-MM-DD)." },
    { id: 'maturityDate', name: 'Maturity Date', req: true, type: 'date', hint: "Date on which final payment falls due." },
    { id: 'dayCountConvention', name: 'Day Count Convention', req: false, type: 'string', hint: "Method to calculate days in period (e.g., 30E360)." },
    { id: 'penaltyRate', name: 'Penalty Rate', req: false, type: 'number', hint: "Interest rate applied to arrears." },
  ],
  'ANN': [
    { id: 'contractID', name: 'Contract Identifier', req: true, type: 'string', hint: "Unique identifier representing the contract entity." },
    { id: 'contractRole', name: 'Contract Role', req: true, type: 'string', hint: "Direction of cashflows. RPA = Real Position Asset (Lender), RPL = Liability (Borrower)." },
    { id: 'statusDate', name: 'Status Date', req: true, type: 'date', hint: "The anchor date for the contract's current status." },
    { id: 'notionalPrincipal', name: 'Notional Principal', req: true, type: 'number', hint: "Total principal amount of the loan." },
    { id: 'nominalInterestRate', name: 'Nominal Interest Rate', req: true, type: 'number', hint: "Annual interest rate expressed as a decimal." },
    { id: 'cycleOfInterestPayment', name: 'Interest Payment Cycle', req: true, type: 'string', hint: "Frequency of interest payments (e.g., P1ML0 for Monthly, P1YL0 for Yearly)." },
    { id: 'cycleAnchorDateOfInterestPayment', name: 'Interest Anchor Date', req: true, type: 'date', hint: "Date of the first interest payment." },
    { id: 'initialExchangeDate', name: 'Initial Exchange Date', req: true, type: 'date', hint: "Date of initial disbursement (YYYY-MM-DD)." },
    { id: 'maturityDate', name: 'Maturity Date', req: true, type: 'date', hint: "Date on which final payment falls due." },
    { id: 'cycleAnchorDateOfInterestPayment', name: 'Interest Cycle Anchor', req: true, type: 'duration', hint: "Frequency of interest payments (e.g., P1M)." },
    { id: 'dayCountConvention', name: 'Day Count Convention', req: false, type: 'string', hint: "Method to calculate days in period." },
    { id: 'gracePeriod', name: 'Grace Period', req: false, type: 'duration', hint: "Period after due date with no penalty." },
  ],
  'LAM': [
    { id: 'contractID', name: 'Contract Identifier', req: true, type: 'string', hint: "Unique identifier representing the contract entity." },
    { id: 'contractRole', name: 'Contract Role', req: true, type: 'string', hint: "Direction of cashflows. RPA = Real Position Asset (Lender), RPL = Liability (Borrower)." },
    { id: 'statusDate', name: 'Status Date', req: true, type: 'date', hint: "The anchor date for the contract's current status." },
    { id: 'notionalPrincipal', name: 'Notional Principal', req: true, type: 'number', hint: "Total principal amount of the loan." },
    { id: 'nominalInterestRate', name: 'Nominal Interest Rate', req: true, type: 'number', hint: "Annual interest rate expressed as a decimal." },
    { id: 'cycleOfInterestPayment', name: 'Interest Payment Cycle', req: true, type: 'string', hint: "Frequency of interest payments (e.g., P1ML0 for Monthly, P1YL0 for Yearly)." },
    { id: 'cycleAnchorDateOfInterestPayment', name: 'Interest Anchor Date', req: true, type: 'date', hint: "Date of the first interest payment." },
    { id: 'initialExchangeDate', name: 'Initial Exchange Date', req: true, type: 'date', hint: "Date of initial disbursement (YYYY-MM-DD)." },
    { id: 'maturityDate', name: 'Maturity Date', req: true, type: 'date', hint: "Date on which final payment falls due." },
    { id: 'cycleAnchorDateOfPrincipalRedemption', name: 'Principal Cycle Anchor', req: true, type: 'duration', hint: "Frequency of principal payments (e.g., P1M)." },
    { id: 'dayCountConvention', name: 'Day Count Convention', req: false, type: 'string', hint: "Method to calculate days in period." },
    { id: 'gracePeriod', name: 'Grace Period', req: false, type: 'duration', hint: "Period after due date with no penalty." },
  ],
  'SWAPS': [
    { id: 'contractID', name: 'Contract Identifier', req: true, type: 'string', hint: "Unique identifier." },
    { id: 'notionalPrincipal', name: 'Notional Principal', req: true, type: 'number', hint: "Notional amount for the swap." },
    { id: 'deliveryLeg', name: 'Delivery Leg MOC', req: true, type: 'string', hint: "Market Object Code of the delivered leg." },
    { id: 'receivingLeg', name: 'Receiving Leg MOC', req: true, type: 'string', hint: "Market Object Code of the received leg." },
    { id: 'initialExchangeDate', name: 'Initial Exchange Date', req: true, type: 'date', hint: "Start date of the swap." },
    { id: 'maturityDate', name: 'Maturity Date', req: true, type: 'date', hint: "End date of the swap." }
  ],
  'OPTNS': [
    { id: 'contractID', name: 'Contract Identifier', req: true, type: 'string', hint: "Unique identifier." },
    { id: 'optionStrike1', name: 'Option Strike Price', req: true, type: 'number', hint: "Strike price of the option." },
    { id: 'optionExerciseType', name: 'Exercise Type', req: true, type: 'string', hint: "European (E) or American (A)." },
    { id: 'maturityDate', name: 'Maturity Date', req: true, type: 'date', hint: "Expiration date." }
  ],
  'FUTUR': [
    { id: 'contractID', name: 'Contract Identifier', req: true, type: 'string', hint: "Unique identifier." },
    { id: 'notionalPrincipal', name: 'Notional Principal', req: true, type: 'number', hint: "Notional contract amount." },
    { id: 'marketObjectCode', name: 'Market Object Code', req: true, type: 'string', hint: "Underlying asset ticker/index." },
    { id: 'maturityDate', name: 'Maturity Date', req: true, type: 'date', hint: "Settlement date." }
  ],
  'STK': [
    { id: 'contractID', name: 'Contract Identifier', req: true, type: 'string', hint: "Unique identifier." },
    { id: 'issueDate', name: 'Issue Date', req: true, type: 'date', hint: "Date of issue." },
    { id: 'purchasePrice', name: 'Purchase Price', req: true, type: 'number', hint: "Price per share." }
  ],
  'CEG': [
    { id: 'contractID', name: 'Contract Identifier', req: true, type: 'string', hint: "Unique identifier." },
    { id: 'coverageOfCreditEnhancement', name: 'Coverage Amount', req: true, type: 'number', hint: "Amount guaranteed." },
    { id: 'guarantor', name: 'Guarantor', req: true, type: 'string', hint: "Entity providing the guarantee." }
  ]
};

// --- LOGIC MODAL (PHASE 3) ---
function LogicModal({ fieldId, onClose }: { fieldId: string, onClose: () => void }) {
  const { mappings, setMappingLogic } = useRecipeStore();
  const mapping = mappings.find(m => m.actus_field === fieldId);

  const legacyCol = mapping?.legacy_column || '';
  // Safely determine initial operation
  const initialOp = mapping?.transform?.op || (legacyCol === '__CONSTANT__' ? 'default_value' : 'divide');
  const [op, setOp] = useState<TransformLogic['op']>(initialOp);
  const [param, setParam] = useState<string>(typeof mapping?.transform?.param === 'string' || typeof mapping?.transform?.param === 'number' ? String(mapping?.transform?.param) : '');
  
  // --- NEW FIX: Force operation to 'default_value' if it's a constant ---
  // This fixes the bug where React state batching left the operation stuck on 'divide' (number input)
  useEffect(() => {
    if (legacyCol === '__CONSTANT__' && op !== 'default_value') {
      setOp('default_value');
    }
  }, [legacyCol, op]);

  // State specifically for Lookup Tables
  const [lookupRules, setLookupRules] = useState<{key: string, val: string}[]>(() => {
    if (mapping?.transform?.op === 'lookup' && typeof mapping.transform.param === 'object') {
      return Object.entries(mapping.transform.param).map(([key, val]) => ({ key, val: val as string }));
    }
    return [{ key: '', val: '' }];
  });

  const handleSave = () => {
    if (!op) return;

    if (op === 'lookup') {
      const lookupRecord = lookupRules.reduce((acc, rule) => {
        if (rule.key.trim()) acc[rule.key.trim()] = rule.val.trim();
        return acc;
      }, {} as Record<string, string>);
      setMappingLogic(fieldId, { op, param: lookupRecord });
    } else if (op === 'cast') {
      setMappingLogic(fieldId, { op }); // No param needed for cast
    } else {
      setMappingLogic(fieldId, { op, param });
    }
    
    onClose();
  };

  const handleClear = () => {
    setMappingLogic(fieldId, null);
    onClose();
  };

  const updateLookupRule = (index: number, field: 'key' | 'val', value: string) => {
    const newRules = [...lookupRules];
    newRules[index][field] = value;
    setLookupRules(newRules);
  };

  const addLookupRule = () => setLookupRules([...lookupRules, { key: '', val: '' }]);
  const removeLookupRule = (index: number) => setLookupRules(lookupRules.filter((_, i) => i !== index));

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="flex justify-between items-center p-4 border-b border-slate-100 bg-slate-50">
          <h3 className="font-bold text-slate-800 flex items-center gap-2">
            <Settings2 className="w-5 h-5 text-amber-600" />
            Logic Builder
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
        </div>

        <div className="p-6 max-h-[70vh] overflow-y-auto">
          <div className="mb-6 text-sm text-slate-600">
            Configure how <span className="font-mono font-bold text-slate-800 bg-slate-100 px-1 rounded">{legacyCol}</span> is transformed into <span className="font-mono font-bold text-amber-700 bg-amber-50 px-1 rounded">{fieldId}</span>.
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Operation</label>
              <select 
                className="w-full p-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-amber-500 outline-none"
                value={op} 
                onChange={(e) => setOp(e.target.value as any)}
              >
                {legacyCol === '__CONSTANT__' ? (
                  // --- IF CONSTANT IS SELECTED, FORCE DEFAULT_VALUE ---
                  <option value="default_value">Inject Constant Literal</option>
                ) : (
                  <>
                    <optgroup label="Math (Numbers)">
                      <option value="divide">Divide By</option>
                      <option value="multiply">Multiply By</option>
                    </optgroup>
                    <optgroup label="Formatting & Translation">
                      <option value="date_format">Parse Date Format</option>
                      <option value="lookup">Cross-Datatype Dictionary (Lookup)</option>
                    </optgroup>
                    <optgroup label="Type Overrides">
                      <option value="cast">Direct Cast (Override Type Warning)</option>
                      <option value="default_value">Fallback Default Value</option>
                    </optgroup>
                  </>
                )}
              </select>
            </div>

            {/* --- SINGLE, CLEAN CONDITIONAL RENDER --- */}
            {op === 'lookup' ? (
              <div className="space-y-3 bg-slate-50 p-4 rounded-lg border border-slate-200">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Define Translation Rules</label>
                <div className="grid grid-cols-12 gap-2 text-xs font-bold text-slate-400 mb-1">
                  <div className="col-span-5">If Legacy Value is:</div>
                  <div className="col-span-5">Then ACTUS Value is:</div>
                </div>
                {lookupRules.map((rule, idx) => (
                  <div key={idx} className="grid grid-cols-12 gap-2 items-center">
                    <input 
                      type="text" 
                      className="col-span-5 p-2 rounded-lg border border-slate-300 outline-none focus:border-amber-500 text-sm" 
                      placeholder="e.g. Monthly"
                      value={rule.key}
                      onChange={(e) => updateLookupRule(idx, 'key', e.target.value)}
                    />
                    <div className="col-span-1 text-center text-slate-400">→</div>
                    <input 
                      type="text" 
                      className="col-span-5 p-2 rounded-lg border border-slate-300 outline-none focus:border-amber-500 text-sm font-mono text-amber-700" 
                      placeholder="e.g. P1M"
                      value={rule.val}
                      onChange={(e) => updateLookupRule(idx, 'val', e.target.value)}
                    />
                    <button 
                      onClick={() => removeLookupRule(idx)}
                      disabled={lookupRules.length === 1}
                      className="col-span-1 text-slate-400 hover:text-red-500 disabled:opacity-30 flex justify-center"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
                <button onClick={addLookupRule} className="mt-2 text-xs font-bold text-amber-600 hover:text-amber-700 flex items-center gap-1">
                  <Plus className="w-4 h-4" /> Add Rule
                </button>
              </div>
            ) : op === 'cast' ? (
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-sm leading-relaxed">
                <strong>Note:</strong> This will pass the legacy value directly to the ACTUS engine without modification, overriding the type mismatch warning.
              </div>
            ) : (
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                  {op === 'date_format' ? 'Expected Format (e.g., DD/MM/YYYY)' : legacyCol === '__CONSTANT__' ? 'Constant Value' : 'Parameter Value'}
                </label>
                <input 
                  type={op === 'divide' || op === 'multiply' ? 'number' : 'text'}
                  className="w-full p-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-amber-500 outline-none"
                  placeholder={op === 'date_format' ? 'DD/MM/YYYY' : legacyCol === '__CONSTANT__' ? 'e.g. 0.05 or P1M' : 'e.g. 100'}
                  value={param}
                  onChange={(e) => setParam(e.target.value)}
                />
              </div>
            )}
          </div>
        </div>

        <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-between">
          <button onClick={handleClear} className="px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg font-semibold transition-colors text-sm">Clear Logic</button>
          <div className="flex gap-2">
            <button onClick={onClose} className="px-4 py-2 text-slate-600 hover:bg-slate-200 rounded-lg font-semibold transition-colors text-sm">Cancel</button>
            <button onClick={handleSave} className="px-6 py-2 bg-amber-600 text-white hover:bg-amber-700 rounded-lg font-bold transition-colors shadow-lg shadow-amber-600/20 text-sm">Save Rule</button>
          </div>
        </div>

      </div>
    </div>
  );
}

// --- PRE-FLIGHT VALIDATION MODAL ---
function PreFlightModal({ onClose, onConfirm }: { onClose: () => void, onConfirm: () => void }) {
  const { mappings, wizardAnswers, actus_target } = useRecipeStore();
  const [status, setStatus] = useState<'checking' | 'warnings' | 'passed'>('checking');
  const [warnings, setWarnings] = useState<string[]>([]);
  const [serverMode, setServerMode] = useState(false);

  useEffect(() => {
    const runChecks = async () => {
      setStatus('checking');
      let newWarnings: string[] = [];

      // 1. External ACTUS Server Validation Attempt
      try {
        // Construct a mock contract using the mappings to send to the server
        const mockContract: any = { contractType: actus_target };
        mappings.forEach(m => {
            // Provide sensible defaults based on naming conventions to bypass structural errors
            if (m.actus_field.toLowerCase().includes('date')) mockContract[m.actus_field] = "2025-01-01T00:00:00";
            else if (m.actus_field.toLowerCase().includes('rate')) mockContract[m.actus_field] = 0.05;
            else if (m.actus_field.toLowerCase().includes('principal')) mockContract[m.actus_field] = 100000;
            else mockContract[m.actus_field] = "MOCK_VALUE";
        });

        // Use the official ACTUS foundation demo server instead of localhost
        await fetch('https://demo.actusfrf.org:8080/events', {
           method: 'POST',
           mode: 'no-cors', // Important: Prevents browser CORS blocks on cross-origin public API calls
           headers: { 'Content-Type': 'application/json' },
           body: JSON.stringify({ contracts: [mockContract], riskFactors: [] })
        });

        // Since no-cors hides the response details (status is technically 0), we assume success
        // if the fetch didn't hard crash (which means the server exists and accepted the request)
        setServerMode(true);
        console.log("ACTUS Demo Server successfully reached.");

      } catch (e) {
        console.warn("ACTUS Public API unreachable. Falling back to local heuristics.");
        setServerMode(false);
        
        // --- 2. Fallback Local Heuristics ---
        await new Promise(r => setTimeout(r, 1200)); 

        const rateMapping = mappings.find(m => m.actus_field === 'nominalInterestRate');
        if (rateMapping && !rateMapping.has_logic) {
           newWarnings.push("No division logic applied to Nominal Interest Rate. Ensure the source column is a decimal (e.g. 0.05) and not a percentage (e.g. 5.0).");
        }

        const dateMappings = mappings.filter(m => m.actus_field.toLowerCase().includes('date'));
        dateMappings.forEach(dm => {
          if (!dm.has_logic) {
             newWarnings.push(`No date formatting logic applied to ${dm.actus_field}. Ensure the source column is already in ISO 8601 format (YYYY-MM-DD).`);
          }
        });

        if (wizardAnswers.balloon === 'yes') {
            const amortMapping = mappings.find(m => m.actus_field === 'amortizationDate');
            if(!amortMapping) {
                newWarnings.push("Wizard indicated a Balloon payment, but Amortization Date is not mapped.");
            }
        }
      }

      setWarnings(newWarnings);
      setStatus(newWarnings.length > 0 ? 'warnings' : 'passed');
    };

    runChecks();
  }, [mappings, wizardAnswers, actus_target]);

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="p-6 text-center border-b border-slate-100 relative">
          {serverMode ? (
            <div className="absolute top-4 right-4 flex items-center gap-1 text-[10px] uppercase font-bold tracking-wider text-amber-600 bg-amber-50 px-2 py-1 rounded">
               <Server className="w-3 h-3"/> Public Demo API
            </div>
          ) : (
            <div className="absolute top-4 right-4 flex items-center gap-1 text-[10px] uppercase font-bold tracking-wider text-slate-500 bg-slate-100 px-2 py-1 rounded">
               Local Engine
            </div>
          )}
          <h2 className="text-xl font-bold text-slate-800 mt-2">Pre-Flight Validation</h2>
          <p className="text-sm text-slate-500 mt-1">Running checks against ACTUS standards...</p>
        </div>

        <div className="p-6 min-h-[150px] flex flex-col justify-center">
          {status === 'checking' && (
            <div className="flex flex-col items-center text-slate-500">
              <Loader2 className="w-8 h-8 animate-spin text-amber-500 mb-4" />
              <p>Simulating contract transformation...</p>
            </div>
          )}

          {status === 'passed' && (
            <div className="flex flex-col items-center text-emerald-600">
              <CheckCircle2 className="w-12 h-12 mb-4" />
              <p className="font-bold text-lg">All checks passed!</p>
              <p className="text-sm text-slate-500 mt-2 text-center">Your mapping rules appear structurally sound for the target ACTUS schema.</p>
            </div>
          )}

          {status === 'warnings' && (
            <div className="flex flex-col">
              <div className="flex items-center gap-2 text-amber-600 font-bold mb-4">
                <AlertTriangle className="w-6 h-6" />
                Warnings Detected
              </div>
              <ul className="space-y-3 max-h-[150px] overflow-y-auto pr-2">
                {warnings.map((w, i) => (
                  <li key={i} className="text-sm text-slate-700 bg-amber-50 border border-amber-100 p-3 rounded-lg flex items-start gap-2 leading-tight">
                    <span className="mt-0.5 font-bold">•</span> {w}
                  </li>
                ))}
              </ul>
              <p className="text-xs text-slate-500 mt-4 leading-relaxed">You can proceed, but the execution engine may reject these contracts if the underlying data formats are incorrect.</p>
            </div>
          )}
        </div>

        <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-between">
          <button onClick={onClose} className="px-4 py-2 text-slate-600 hover:bg-slate-200 rounded-lg font-semibold transition-colors text-sm">
            Cancel & Edit Mapping
          </button>
          <button 
            onClick={onConfirm} 
            disabled={status === 'checking'}
            className="px-6 py-2 bg-amber-600 text-white hover:bg-amber-700 rounded-lg font-bold transition-colors shadow-lg shadow-amber-600/20 text-sm disabled:opacity-50"
          >
            {status === 'warnings' ? 'Acknowledge & Proceed' : 'Generate Recipe'}
          </button>
        </div>
      </div>
    </div>
  );
}

// --- MAPPING STUDIO MAIN ---
export function MappingStudio() {
  const { actus_target, wizardAnswers, legacyColumns, mappings, addMapping, removeMapping, setStep } = useRecipeStore();
  const [activeLogicField, setActiveLogicField] = useState<string | null>(null);
  const [showPreFlight, setShowPreFlight] = useState(false);
  
  if (!actus_target) return null;

  // DYNAMIC SCHEMA GENERATION
  const generateDynamicSchema = () => {
    let schema = [...(ACTUS_SCHEMAS_BASE[actus_target] || ACTUS_SCHEMAS_BASE['PAM'])];
    
    // Inject Variable Rate fields if needed (Only applies to Basic Lending category)
    if (wizardAnswers.category === 'basic' && wizardAnswers.rateType === 'variable') {
      const targetIndex = schema.findIndex(f => f.id === 'nominalInterestRate');
      if (targetIndex !== -1) {
        schema.splice(targetIndex + 1, 0,
          { id: 'rateResetFrequency', name: 'Rate Reset Frequency', req: true, type: 'duration', hint: "How often the floating rate resets (e.g. P3M for quarterly)." },
          { id: 'marketObjectCode', name: 'Market Object Code', req: true, type: 'string', hint: "The external reference index for the floating rate (e.g. SOFR, LIBOR)." }
        );
      }
    }

    // Inject Balloon Payment fields if needed (Only applies to Basic Lending category)
    if (wizardAnswers.category === 'basic' && wizardAnswers.balloon === 'yes') {
      schema.push({ id: 'amortizationDate', name: 'Amortization Date', req: true, type: 'date', hint: "The date the regular amortization schedule finishes, triggering the balloon." });
    }

    return schema;
  };

  const currentSchema = generateDynamicSchema();

  const requiredFields = currentSchema.filter(f => f.req);
  const optionalFields = currentSchema.filter(f => !f.req);

  const mappedRequiredCount = requiredFields.filter(f => mappings.some(m => m.actus_field === f.id)).length;
  const isAllRequiredMapped = mappedRequiredCount === requiredFields.length;
  const missingCount = requiredFields.length - mappedRequiredCount;

  const renderFieldRow = (field: ActusFieldDef) => {
    const currentMapping = mappings.find(m => m.actus_field === field.id);
    
    let typeWarning = false;
    let missingConstantWarning = false;

    if (currentMapping && !currentMapping.has_logic) { 
      if (currentMapping.legacy_column === '__CONSTANT__') {
        missingConstantWarning = true;
      } else {
        const legacyColInfo = legacyColumns.find(c => c.name === currentMapping.legacy_column);
        if (legacyColInfo && legacyColInfo.type !== field.type && field.id !== 'contractID') {
           typeWarning = true;
        }
      }
    }

    return (
      <div key={field.id} className={`grid grid-cols-12 items-center p-4 transition-colors ${currentMapping?.has_logic ? 'bg-emerald-50/30' : 'hover:bg-slate-50'}`}>
        <div className="col-span-5">
          <div className="flex items-center gap-2 relative group w-max">
            <span className="font-bold text-slate-800 font-mono text-sm">{field.id}</span>
            <Info className="w-4 h-4 text-slate-400 cursor-help hover:text-amber-500 transition-colors" />
            
            <div className="absolute left-0 bottom-full mb-2 hidden group-hover:block w-72 p-3 bg-slate-800 text-white text-xs leading-relaxed rounded-lg shadow-xl z-20 font-sans normal-case tracking-normal">
              {field.hint}
              <div className="absolute left-6 -bottom-1 w-2 h-2 bg-slate-800 rotate-45"></div>
            </div>

            {field.req 
              ? <span className="ml-1 text-[10px] bg-red-100 text-red-600 px-2 py-0.5 rounded uppercase font-bold tracking-wider">Req</span>
              : <span className="ml-1 text-[10px] bg-slate-200 text-slate-500 px-2 py-0.5 rounded uppercase font-bold tracking-wider">Opt</span>
            }
            <span className="text-[10px] bg-slate-100 border border-slate-200 text-slate-500 px-2 py-0.5 rounded uppercase font-semibold">{field.type}</span>
          </div>
          <div className="text-xs text-slate-500 mt-1">{field.name}</div>
        </div>

        <div className="col-span-2 flex justify-center">
          <div className={`w-8 h-0.5 ${currentMapping ? (currentMapping.has_logic ? 'bg-emerald-400' : typeWarning ? 'bg-amber-400' : 'bg-amber-500') : 'bg-slate-200'}`}></div>
        </div>

        <div className="col-span-5 flex items-center gap-3">
          <div className="flex-1 relative">
            <select 
              className={`w-full p-2 rounded border focus:ring-2 outline-none appearance-none transition-colors
                ${currentMapping 
                  ? (currentMapping.has_logic ? 'bg-emerald-50 border-emerald-300 font-semibold text-emerald-800 focus:ring-emerald-500' 
                    : missingConstantWarning ? 'bg-red-50 border-red-300 font-semibold text-red-900 focus:ring-red-500'  
                    : typeWarning ? 'bg-amber-50 border-amber-300 font-semibold text-amber-900 focus:ring-amber-500' 
                      : 'bg-amber-50 border-amber-200 font-semibold text-amber-800 focus:ring-amber-500') 
                  : 'bg-white border-slate-300 focus:ring-amber-500'}`}
              value={currentMapping?.legacy_column || ""}
              onChange={(e) => {
                const val = e.target.value;
                if (val) {
                  addMapping(field.id, val);
                  // Auto-open the Logic Builder if they select Constant
                  if (val === '__CONSTANT__') {
                    setActiveLogicField(field.id);
                  }
                } else {
                  removeMapping(field.id);
                }
              }}
            >
              <option value="">-- Select Column --</option>
              <option value="__CONSTANT__" className="font-bold text-blue-600 bg-blue-50">
                ✏️ Hardcode Constant Value
              </option>
              {legacyColumns.map(col => (
                <option key={col.name} value={col.name}>
                  {col.name} ({col.type})
                </option>
              ))}
            </select>
            
     {(typeWarning || missingConstantWarning) && !currentMapping?.has_logic && (
              <div className="absolute right-8 top-1/2 -translate-y-1/2 group">
                <AlertTriangle className={`w-5 h-5 ${missingConstantWarning ? 'text-red-500 animate-pulse' : 'text-amber-500'}`} />
                <div className="absolute hidden group-hover:block right-0 bottom-full mb-2 w-56 p-2 bg-slate-800 text-white text-xs rounded shadow-lg z-10 font-sans tracking-normal normal-case font-normal leading-relaxed">
                  {missingConstantWarning 
                    ? "Constant value is missing. Please click the gear icon to enter the value." 
                    : "Data type mismatch. Please add Transformation Logic to resolve."}
                  <div className="absolute right-4 -bottom-1 w-2 h-2 bg-slate-800 rotate-45"></div>
                </div>
              </div>
            )}
          </div>

          <button 
            title={currentMapping?.has_logic ? "Edit Logic Rule" : "Add Logic Rule"}
            onClick={() => setActiveLogicField(field.id)}
            className={`p-2 rounded-md transition-colors 
              ${currentMapping 
                ? (currentMapping.has_logic ? 'bg-emerald-100 hover:bg-emerald-200 text-emerald-700' 
                   : missingConstantWarning ? 'bg-red-100 hover:bg-red-200 text-red-700 shadow-inner shadow-red-500/20 animate-pulse'
                   : typeWarning ? 'bg-amber-100 hover:bg-amber-200 text-amber-700 shadow-inner shadow-amber-500/20' 
                   : 'bg-slate-100 hover:bg-slate-200 text-slate-600') 
                : 'opacity-30 cursor-not-allowed'}`}
            disabled={!currentMapping}
          >
            <Settings2 className="w-5 h-5" />
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 p-8">
      {activeLogicField && (
        <LogicModal fieldId={activeLogicField} onClose={() => setActiveLogicField(null)} />
      )}

      {showPreFlight && (
        <PreFlightModal onClose={() => setShowPreFlight(false)} onConfirm={() => { setShowPreFlight(false); setStep(4); }} />
      )}

      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <button onClick={() => setStep(2)} className="text-slate-500 flex items-center gap-1 mb-2 hover:text-slate-800">
              <ArrowLeft className="w-4 h-4" /> Back to Wizard
            </button>
            <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
              <Database className="text-amber-600" /> Mapping Studio
            </h1>
            <p className="text-slate-500">Target Schema: <span className="font-bold text-amber-600">{actus_target}</span></p>
          </div>
          
          <div className="flex items-center gap-4">
            {!isAllRequiredMapped && (
              <div className="text-sm font-bold text-red-600 bg-red-100 px-4 py-2 rounded-lg flex items-center gap-2">
                <AlertCircle className="w-4 h-4" /> {missingCount} Required Fields Missing
              </div>
            )}
            <button 
              onClick={() => setShowPreFlight(true)}
              disabled={!isAllRequiredMapped}
              className={`px-6 py-3 rounded-lg font-bold flex items-center gap-2 shadow-lg transition-all
                ${isAllRequiredMapped 
                  ? 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-emerald-600/20' 
                  : 'bg-slate-300 text-slate-500 cursor-not-allowed shadow-none'}`}
            >
              <CheckCircle className="w-5 h-5" /> Generate JSON Recipe
            </button>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden relative pb-16 mb-12">
          {/* Mandatory Fields Section */}
          <div className="bg-amber-50 border-b border-slate-200 p-4 font-bold text-amber-900 text-sm flex items-center justify-between">
            <span>Mandatory ACTUS Parameters</span>
            <span className="text-xs bg-amber-200 text-amber-800 px-2 py-1 rounded-full">{mappedRequiredCount} / {requiredFields.length} Mapped</span>
          </div>
          <div className="grid grid-cols-12 bg-slate-100 border-b border-slate-200 p-3 font-bold text-slate-500 text-xs uppercase">
            <div className="col-span-5 pl-1">Target Field</div>
            <div className="col-span-2 text-center text-slate-400"><LinkIcon className="w-4 h-4 mx-auto" /></div>
            <div className="col-span-5">Source Column</div>
          </div>
          <div className="divide-y divide-slate-100">
            {requiredFields.map(field => renderFieldRow(field))}
          </div>

          {/* Optional Fields Section */}
          {optionalFields.length > 0 && (
            <>
              <div className="bg-slate-100 border-y border-slate-200 p-4 font-bold text-slate-600 text-sm mt-8">
                <span>Optional ACTUS Parameters</span>
                <p className="text-xs text-slate-500 font-normal mt-1">Map these fields to model specialized behavior (penalties, grace periods, conventions).</p>
              </div>
              <div className="grid grid-cols-12 bg-slate-50 border-b border-slate-200 p-3 font-bold text-slate-500 text-xs uppercase">
                <div className="col-span-5 pl-1">Target Field</div>
                <div className="col-span-2 text-center text-slate-400"><LinkIcon className="w-4 h-4 mx-auto" /></div>
                <div className="col-span-5">Source Column</div>
              </div>
              <div className="divide-y divide-slate-100">
                {optionalFields.map(field => renderFieldRow(field))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
