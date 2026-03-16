import { useRecipeStore } from './store/useRecipeStore';
import {DataIngestion} from './components/DataIngestion';
import {WizardFlow} from './components/WizardFlow';
import {MappingStudio} from './components/MappingStudio';
import {RecipePreview} from './components/RecipePreview';

export default function App() {
  const step = useRecipeStore((state) => state.step);

  return (
    <div className="w-full h-full font-sans text-slate-900 bg-slate-50">
      {step === 1 && <DataIngestion />}
      {step === 2 && <WizardFlow />}
      {step === 3 && <MappingStudio />}
      {step === 4 && <RecipePreview />}
    </div>
  );
}