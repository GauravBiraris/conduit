import { create } from 'zustand';


// ==========================================
// 1. ZUSTAND GLOBAL STORE (The Brain)
// ==========================================
export interface TransformLogic {
  op: 'divide' | 'multiply' | 'date_format' | 'lookup' | 'default_value' | 'cast';
  param?: string | number | Record<string, string>;
}

export interface MappingRule {
  actus_field: string;
  legacy_column: string;
  has_logic: boolean;
  transform?: TransformLogic;
}

export interface ColumnDef {
  name: string;
  type: string;
}

export interface WizardAnswers {
  category: string;
  repayment: string;    
  amortization: string; 
  rateType: string;     
  frequency: string;    
  balloon: string;      
  derivativeType?: string; // Phase 2: 'swap' | 'option' | 'future'
  securityType?: string;   // Phase 2: 'stock' | 'guarantee'
}

export interface DBConfig {
  dialect: string;
  host: string;
  port: string;
  user: string;
  pass: string;
  dbname: string;
  query: string;
}

interface RecipeState {
  step: number;
  actus_target: string | null;
  wizardAnswers: WizardAnswers;
  mappings: MappingRule[];
  legacyColumns: ColumnDef[];
  
  setStep: (step: number) => void;
  setProductTarget: (target: string) => void;
  setWizardAnswers: (answers: WizardAnswers) => void;
  setLegacyColumns: (cols: ColumnDef[]) => void;
  addMapping: (actus_field: string, legacy_column: string) => void;
  removeMapping: (actus_field: string) => void;
  setMappingLogic: (actus_field: string, logic: TransformLogic | null) => void;

  localDataPath: string | null;
  setLocalDataPath: (path: string | null) => void;
  importRecipe: (recipeData: any) => void;

  sourceType: 'csv' | 'db';
  sourceDbConfig: DBConfig | null;
  outputPreference: 'json' | 'db';
  
  setSourceType: (type: 'csv' | 'db') => void;
  setSourceDbConfig: (config: DBConfig | null) => void;
  setOutputPreference: (pref: 'json' | 'db') => void;
}

export const useRecipeStore = create<RecipeState>((set) => ({
  step: 1, // 1: Ingestion, 2: Wizard, 3: Mapper, 4: Preview
  actus_target: null,
  wizardAnswers: { category: '', repayment: '', amortization: '', rateType: '', frequency: '', balloon: '' },
  mappings: [],
  legacyColumns: [],
  
  setStep: (step) => set({ step }),
  setProductTarget: (target) => set({ actus_target: target }),
  setWizardAnswers: (answers) => set({ wizardAnswers: answers }),
  setLegacyColumns: (cols) => set({ legacyColumns: cols }),
  
  addMapping: (actus_field, legacy_column) => set((state) => {
    const filtered = state.mappings.filter(m => m.actus_field !== actus_field);
    return { mappings: [...filtered, { actus_field, legacy_column, has_logic: false }] };
  }),
  
  removeMapping: (actus_field) => set((state) => ({
    mappings: state.mappings.filter(m => m.actus_field !== actus_field)
  })),

  setMappingLogic: (actus_field, logic) => set((state) => ({
    mappings: state.mappings.map(m => 
      m.actus_field === actus_field 
        ? { ...m, has_logic: logic !== null, transform: logic || undefined }
        : m
    )
  })),
  
  localDataPath: null,
setLocalDataPath: (path) => set({ localDataPath: path }),

sourceType: 'csv',
  sourceDbConfig: null,
  outputPreference: 'json',
  
  setSourceType: (type) => set({ sourceType: type }),
  setSourceDbConfig: (config) => set({ sourceDbConfig: config }),
  setOutputPreference: (pref) => set({ outputPreference: pref }),

  
importRecipe: (recipeData) => set({
    actus_target: recipeData.actus_target,
    wizardAnswers: recipeData._ui_wizard || { category: 'basic', repayment: 'regular', amortization: 'emi', rateType: 'fixed', frequency: 'monthly', balloon: 'no' },
    mappings: recipeData.mappings.map((m: any) => ({
      actus_field: m.actus_attr,
      legacy_column: m.legacy_col,
      has_logic: !!m._ui_transform,
      transform: m._ui_transform
    })),
    step: 3 // Jump straight to the Mapping Studio!
  })
}));
