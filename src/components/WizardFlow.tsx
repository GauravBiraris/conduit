import { useState, useRef } from 'react';
import { 
  ChevronRight, ArrowLeft, CheckCircle2, Building, Briefcase,  FileSignature, UploadCloud,
   Info, 
} from 'lucide-react';
import { useRecipeStore } from '../store/useRecipeStore';
import type { WizardAnswers } from '../store/useRecipeStore';


// ==========================================
// 3. COMPONENT: WIZARD FLOW (Step 2)
// ==========================================
export function WizardFlow() {
  const { setProductTarget, setWizardAnswers, setStep, importRecipe } = useRecipeStore();
  const recipeInputRef = useRef<HTMLInputElement>(null);
  const [answers, setAnswers] = useState<WizardAnswers>({
    category: '', repayment: '', amortization: '', rateType: '', frequency: '', balloon: ''
  });

  const getActiveSteps = () => {
    if (!answers.category) return [1];
    
    if (answers.category === 'basic') {
      const steps = [1, 2];
      if (answers.repayment === 'regular') steps.push(3);
      steps.push(4);
      steps.push(5);
      if (answers.repayment === 'regular') steps.push(6);
      steps.push(7);
      return steps;
    }
    
    if (answers.category === 'derivatives') return [1, 8, 7];
    if (answers.category === 'securities') return [1, 9, 7];
    
    return [1];
  };

  const activeSteps = getActiveSteps();
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const localStep = activeSteps[currentStepIndex];

  const handleNext = () => setCurrentStepIndex(prev => Math.min(prev + 1, activeSteps.length - 1));
  const handleBack = () => setCurrentStepIndex(prev => Math.max(prev - 1, 0));

  const handleAnswer = (key: keyof WizardAnswers, value: string) => {
    setAnswers({ ...answers, [key]: value });
  };

  const handleRecipeUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        importRecipe(json);
      } catch (err) {
        alert("Invalid Recipe JSON file.");
      }
    };
    reader.readAsText(file);
  };

  const calculateActusType = () => {
    if (answers.category === 'basic') {
      if (answers.repayment === 'end') return 'PAM';
      if (answers.amortization === 'emi') return 'ANN';
      if (answers.amortization === 'linear') return 'LAM';
    } else if (answers.category === 'derivatives') {
      if (answers.derivativeType === 'swap') return 'SWAPS';
      if (answers.derivativeType === 'option') return 'OPTNS';
      if (answers.derivativeType === 'future') return 'FUTUR';
    } else if (answers.category === 'securities') {
      if (answers.securityType === 'stock') return 'STK';
      if (answers.securityType === 'guarantee') return 'CEG';
    }
    return 'UNKNOWN';
  };

  const finalizeWizard = () => {
    setWizardAnswers(answers);
    setProductTarget(calculateActusType());
    setStep(3);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center pt-12 font-sans text-slate-800 pb-12">
      <div className="max-w-3xl w-full mb-8 px-6">
        <button onClick={() => setStep(1)} className="text-slate-500 flex items-center gap-1 mb-4 hover:text-slate-800">
          <ArrowLeft className="w-4 h-4" /> Back to Data Upload
        </button>
        <h1 className="text-3xl font-bold text-slate-900">ACTUS Data Onboarding</h1>
        <p className="text-slate-500 mt-2">Define your legacy product to generate the transformation recipe.</p>
        <div>
            <input type="file" accept=".json" ref={recipeInputRef} className="hidden" onChange={handleRecipeUpload} />
            <button 
              onClick={() => recipeInputRef.current?.click()}
              className="flex items-center gap-2 bg-slate-200 hover:bg-slate-300 text-slate-700 px-4 py-2 rounded-lg font-bold transition-colors text-sm"
            >
              <UploadCloud className="w-4 h-4" /> Import Saved Recipe
            </button>
          </div>
        {/* Dynamic Progress Indicator */}
        <div className="flex gap-2 mt-6">
          {activeSteps.map((s, idx) => (
             <div key={s} className={`h-1.5 flex-1 rounded-full ${idx <= currentStepIndex ? 'bg-amber-600' : 'bg-slate-200'}`} />
          ))}
        </div>
      </div>

      <div className="bg-white max-w-3xl w-full rounded-2xl shadow-sm border border-slate-200 overflow-hidden min-h-[400px]">
        {localStep === 1 && (
          <div className="p-8 animate-in fade-in slide-in-from-bottom-4">
            <h2 className="text-xl font-bold mb-6">What family of financial product is this?</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <button onClick={() => handleAnswer('category', 'basic')} className={`p-6 border-2 rounded-xl text-left transition-all ${answers.category === 'basic' ? 'border-amber-600 bg-amber-50 ring-2 ring-amber-200' : 'border-slate-200 hover:border-amber-500 hover:bg-amber-50'}`}>
                <Building className="w-8 h-8 text-amber-600 mb-4" />
                <h3 className="font-bold text-lg mb-1">Basic Lending</h3>
                <p className="text-sm text-slate-500">Retail loans, mortgages, overdrafts.</p>
              </button>
               <button onClick={() => handleAnswer('category', 'derivatives')} className={`p-6 border-2 rounded-xl text-left transition-all ${answers.category === 'derivatives' ? 'border-purple-600 bg-purple-50 ring-2 ring-purple-200' : 'border-slate-200 hover:border-purple-500 hover:bg-purple-50'}`}>
                <FileSignature className="w-8 h-8 text-purple-600 mb-4" />
                <h3 className="font-bold text-lg mb-1">Derivatives</h3>
                <p className="text-sm text-slate-500">Swaps, options, and futures contracts.</p>
              </button>
               <button onClick={() => handleAnswer('category', 'securities')} className={`p-6 border-2 rounded-xl text-left transition-all ${answers.category === 'securities' ? 'border-emerald-600 bg-emerald-50 ring-2 ring-emerald-200' : 'border-slate-200 hover:border-emerald-500 hover:bg-emerald-50'}`}>
                <Briefcase className="w-8 h-8 text-emerald-600 mb-4" />
                <h3 className="font-bold text-lg mb-1">Securities</h3>
                <p className="text-sm text-slate-500">Stocks, bonds, and credit guarantees.</p>
              </button>
            </div>
            <div className="mt-8 flex justify-end">
              <button disabled={!answers.category} onClick={handleNext} className="bg-amber-600 text-white px-6 py-3 rounded-lg font-bold flex items-center gap-2 disabled:opacity-50 hover:bg-amber-700">
                Continue <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}

        {/* BASIC LENDING STEPS (2-6) */}
        {localStep === 2 && (
          <div className="p-8 animate-in fade-in slide-in-from-right-8">
            <button onClick={handleBack} className="text-slate-500 flex items-center gap-1 mb-6 hover:text-slate-800"><ArrowLeft className="w-4 h-4" /> Back</button>
            <h2 className="text-xl font-bold mb-8">Q1: When is the principal amount repaid?</h2>
            <div className="flex gap-4">
              <label className="flex-1 cursor-pointer">
                <input type="radio" name="repayment" className="peer sr-only" checked={answers.repayment === 'end'} onChange={() => handleAnswer('repayment', 'end')} />
                <div className="p-6 border-2 rounded-lg peer-checked:border-amber-600 peer-checked:bg-amber-50">
                  <span className="font-semibold block text-lg mb-1">All at the very end</span>
                  <span className="text-sm text-slate-500">e.g., Bullet Loan, Overdraft. </span>
                </div>
              </label>
              <label className="flex-1 cursor-pointer">
                <input type="radio" name="repayment" className="peer sr-only" checked={answers.repayment === 'regular'} onChange={() => handleAnswer('repayment', 'regular')} />
                <div className="p-6 border-2 rounded-lg peer-checked:border-amber-600 peer-checked:bg-amber-50">
                  <span className="font-semibold block text-lg mb-1">Regularly over time</span>
                  <span className="text-sm text-slate-500">e.g., Standard Mortgage.</span>
                </div>
              </label>
            </div>
            <div className="mt-10 flex justify-end">
              <button disabled={!answers.repayment} onClick={handleNext} className="bg-amber-600 text-white px-6 py-3 rounded-lg font-bold flex items-center gap-2 disabled:opacity-50">Continue <ChevronRight className="w-5 h-5" /></button>
            </div>
          </div>
        )}

        {localStep === 3 && (
          <div className="p-8 animate-in fade-in slide-in-from-right-8">
            <button onClick={handleBack} className="text-slate-500 flex items-center gap-1 mb-6 hover:text-slate-800"><ArrowLeft className="w-4 h-4" /> Back</button>
            <h2 className="text-xl font-bold mb-8">Q2: How are the regular installments calculated?</h2>
            <div className="flex gap-4">
              <label className="flex-1 cursor-pointer">
                <input type="radio" name="amortization" className="peer sr-only" checked={answers.amortization === 'emi'} onChange={() => handleAnswer('amortization', 'emi')} />
                <div className="p-6 border-2 rounded-lg peer-checked:border-amber-600 peer-checked:bg-amber-50">
                  <span className="font-semibold block text-lg mb-1">Constant Total Installment (EMI)</span>
                  <span className="text-sm text-slate-500">Principal + Interest stays the same (Annuity).</span>
                </div>
              </label>
              <label className="flex-1 cursor-pointer">
                <input type="radio" name="amortization" className="peer sr-only" checked={answers.amortization === 'linear'} onChange={() => handleAnswer('amortization', 'linear')} />
                <div className="p-6 border-2 rounded-lg peer-checked:border-amber-600 peer-checked:bg-amber-50">
                  <span className="font-semibold block text-lg mb-1">Constant Principal Reduction</span>
                  <span className="text-sm text-slate-500">Total payment decreases over time (Linear).</span>
                </div>
              </label>
            </div>
            <div className="mt-10 flex justify-end">
              <button disabled={!answers.amortization} onClick={handleNext} className="bg-amber-600 text-white px-6 py-3 rounded-lg font-bold flex items-center gap-2 disabled:opacity-50">Continue <ChevronRight className="w-5 h-5" /></button>
            </div>
          </div>
        )}

        {localStep === 4 && (
          <div className="p-8 animate-in fade-in slide-in-from-right-8">
            <button onClick={handleBack} className="text-slate-500 flex items-center gap-1 mb-6 hover:text-slate-800"><ArrowLeft className="w-4 h-4" /> Back</button>
            <h2 className="text-xl font-bold mb-8">Q3: What type of Interest Rate is applied?</h2>
            <div className="flex gap-4">
              <label className="flex-1 cursor-pointer">
                <input type="radio" name="rateType" className="peer sr-only" checked={answers.rateType === 'fixed'} onChange={() => handleAnswer('rateType', 'fixed')} />
                <div className="p-6 border-2 rounded-lg peer-checked:border-amber-600 peer-checked:bg-amber-50">
                  <span className="font-semibold block text-lg mb-1">Fixed Rate</span>
                  <span className="text-sm text-slate-500">Rate remains constant for the life of the loan.</span>
                </div>
              </label>
              <label className="flex-1 cursor-pointer">
                <input type="radio" name="rateType" className="peer sr-only" checked={answers.rateType === 'variable'} onChange={() => handleAnswer('rateType', 'variable')} />
                <div className="p-6 border-2 rounded-lg peer-checked:border-amber-600 peer-checked:bg-amber-50">
                  <span className="font-semibold block text-lg mb-1">Variable / Floating Rate</span>
                  <span className="text-sm text-slate-500">Rate tied to market index (e.g. SOFR, LIBOR).</span>
                </div>
              </label>
            </div>
            <div className="mt-10 flex justify-end">
              <button disabled={!answers.rateType} onClick={handleNext} className="bg-amber-600 text-white px-6 py-3 rounded-lg font-bold flex items-center gap-2 disabled:opacity-50">Continue <ChevronRight className="w-5 h-5" /></button>
            </div>
          </div>
        )}

        {localStep === 5 && (
          <div className="p-8 animate-in fade-in slide-in-from-right-8">
            <button onClick={handleBack} className="text-slate-500 flex items-center gap-1 mb-6 hover:text-slate-800"><ArrowLeft className="w-4 h-4" /> Back</button>
            <h2 className="text-xl font-bold mb-8">Q4: What is the primary Repayment Frequency?</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {['monthly', 'quarterly', 'annually'].map((freq) => (
                <label key={freq} className="cursor-pointer">
                  <input type="radio" name="frequency" className="peer sr-only" checked={answers.frequency === freq} onChange={() => handleAnswer('frequency', freq)} />
                  <div className="p-4 border-2 rounded-lg peer-checked:border-amber-600 peer-checked:bg-amber-50 text-center font-semibold capitalize">
                    {freq}
                  </div>
                </label>
              ))}
            </div>
            <p className="text-sm text-slate-500 mt-6"><Info className="w-4 h-4 inline mr-1"/> This will guide the 'Cycle Anchor' formatting in the logic builder.</p>
            <div className="mt-10 flex justify-end">
              <button disabled={!answers.frequency} onClick={handleNext} className="bg-amber-600 text-white px-6 py-3 rounded-lg font-bold flex items-center gap-2 disabled:opacity-50">Continue <ChevronRight className="w-5 h-5" /></button>
            </div>
          </div>
        )}

        {localStep === 6 && (
          <div className="p-8 animate-in fade-in slide-in-from-right-8">
            <button onClick={handleBack} className="text-slate-500 flex items-center gap-1 mb-6 hover:text-slate-800"><ArrowLeft className="w-4 h-4" /> Back</button>
            <h2 className="text-xl font-bold mb-8">Q5: Is there a Balloon Payment at the end?</h2>
            <div className="flex gap-4">
              <label className="flex-1 cursor-pointer">
                <input type="radio" name="balloon" className="peer sr-only" checked={answers.balloon === 'yes'} onChange={() => handleAnswer('balloon', 'yes')} />
                <div className="p-6 border-2 rounded-lg peer-checked:border-amber-600 peer-checked:bg-amber-50 text-center">
                  <span className="font-semibold block text-lg">Yes</span>
                  <span className="text-sm text-slate-500 mt-1 block">Requires mapping Amortization Date</span>
                </div>
              </label>
              <label className="flex-1 cursor-pointer">
                <input type="radio" name="balloon" className="peer sr-only" checked={answers.balloon === 'no'} onChange={() => handleAnswer('balloon', 'no')} />
                <div className="p-6 border-2 rounded-lg peer-checked:border-amber-600 peer-checked:bg-amber-50 text-center">
                  <span className="font-semibold block text-lg">No</span>
                  <span className="text-sm text-slate-500 mt-1 block">Fully amortizing</span>
                </div>
              </label>
            </div>
            <div className="mt-10 flex justify-end">
              <button disabled={!answers.balloon} onClick={handleNext} className="bg-amber-600 text-white px-6 py-3 rounded-lg font-bold flex items-center gap-2 disabled:opacity-50">Continue <ChevronRight className="w-5 h-5" /></button>
            </div>
          </div>
        )}

        {/* PHASE 2: DERIVATIVES (Step 8) */}
        {localStep === 8 && (
          <div className="p-8 animate-in fade-in slide-in-from-right-8">
            <button onClick={handleBack} className="text-slate-500 flex items-center gap-1 mb-6 hover:text-slate-800"><ArrowLeft className="w-4 h-4" /> Back</button>
            <h2 className="text-xl font-bold mb-8">Select Derivative Classification</h2>
            <div className="flex flex-col gap-4">
              {[
                { id: 'swap', label: 'Swap Contract (SWAPS)', desc: 'Exchange of cash flows (e.g., Interest Rate Swap).' },
                { id: 'option', label: 'Options Contract (OPTNS)', desc: 'Right to buy or sell an asset at a strike price.' },
                { id: 'future', label: 'Futures Contract (FUTUR)', desc: 'Obligation to buy or sell an asset at a predetermined future date.' }
              ].map((opt) => (
                <label key={opt.id} className="cursor-pointer">
                  <input type="radio" name="derivativeType" className="peer sr-only" checked={answers.derivativeType === opt.id} onChange={() => handleAnswer('derivativeType', opt.id)} />
                  <div className="p-4 border-2 rounded-lg peer-checked:border-purple-600 peer-checked:bg-purple-50 transition-colors">
                    <span className="font-semibold block text-lg">{opt.label}</span>
                    <span className="text-sm text-slate-500">{opt.desc}</span>
                  </div>
                </label>
              ))}
            </div>
            <div className="mt-10 flex justify-end">
              <button disabled={!answers.derivativeType} onClick={handleNext} className="bg-amber-600 text-white px-6 py-3 rounded-lg font-bold flex items-center gap-2 disabled:opacity-50">Continue <ChevronRight className="w-5 h-5" /></button>
            </div>
          </div>
        )}

        {/* PHASE 2: SECURITIES (Step 9) */}
        {localStep === 9 && (
          <div className="p-8 animate-in fade-in slide-in-from-right-8">
            <button onClick={handleBack} className="text-slate-500 flex items-center gap-1 mb-6 hover:text-slate-800"><ArrowLeft className="w-4 h-4" /> Back</button>
            <h2 className="text-xl font-bold mb-8">Select Security Classification</h2>
            <div className="flex flex-col gap-4">
              {[
                { id: 'stock', label: 'Stock / Equity (STK)', desc: 'Ownership share in a corporation.' },
                { id: 'guarantee', label: 'Credit Enhancement / Guarantee (CEG)', desc: 'Promise to assume debt obligation if borrower defaults.' }
              ].map((opt) => (
                <label key={opt.id} className="cursor-pointer">
                  <input type="radio" name="securityType" className="peer sr-only" checked={answers.securityType === opt.id} onChange={() => handleAnswer('securityType', opt.id)} />
                  <div className="p-4 border-2 rounded-lg peer-checked:border-emerald-600 peer-checked:bg-emerald-50 transition-colors">
                    <span className="font-semibold block text-lg">{opt.label}</span>
                    <span className="text-sm text-slate-500">{opt.desc}</span>
                  </div>
                </label>
              ))}
            </div>
            <div className="mt-10 flex justify-end">
              <button disabled={!answers.securityType} onClick={handleNext} className="bg-amber-600 text-white px-6 py-3 rounded-lg font-bold flex items-center gap-2 disabled:opacity-50">Continue <ChevronRight className="w-5 h-5" /></button>
            </div>
          </div>
        )}

        {localStep === 7 && (
          <div className="p-8 animate-in fade-in slide-in-from-right-8 text-center py-16">
             <CheckCircle2 className="w-20 h-20 text-emerald-500 mx-auto mb-6" />
             <h2 className="text-2xl font-bold text-slate-900 mb-2">Profile Identified</h2>
             
             <div className="inline-block bg-slate-50 border-2 border-slate-200 rounded-xl p-6 text-left min-w-[300px] mt-6">
                <div className="text-sm text-slate-500 font-bold uppercase tracking-wide mb-1">Target ACTUS Schema</div>
                <div className="text-3xl font-black text-amber-700 mb-2">{calculateActusType()}</div>
                {answers.rateType === 'variable' && answers.category === 'basic' && (
                  <div className="mt-3 text-xs bg-amber-100 text-amber-800 px-3 py-1.5 rounded-md font-semibold flex items-center gap-2">
                    <Info className="w-4 h-4"/> Variable Rate fields dynamically injected.
                  </div>
                )}
             </div>

             <div className="mt-12 flex justify-center gap-4">
                <button onClick={handleBack} className="px-6 py-3 font-bold text-slate-500 hover:text-slate-800">Review Answers</button>
                <button onClick={finalizeWizard} className="bg-amber-600 text-white px-8 py-3 rounded-lg font-bold shadow-lg hover:bg-amber-700">
                  Proceed to Data Mapper
                </button>
             </div>
          </div>
        )}
      </div>
    </div>
  );
}