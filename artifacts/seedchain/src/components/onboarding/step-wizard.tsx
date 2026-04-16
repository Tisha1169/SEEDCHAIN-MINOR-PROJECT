import { ReactNode, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { CheckCircle, ArrowRight, ArrowLeft, Loader2 } from "lucide-react";

interface Step {
  title: string;
  description?: string;
  content: ReactNode;
}

interface StepWizardProps {
  steps: Step[];
  onComplete: () => void;
  title: string;
  loading?: boolean;
  completedTitle?: string;
  completedMessage?: string;
  completedAction?: { label: string; href: string };
}

export function StepWizard({ steps, onComplete, title, loading, completedTitle, completedMessage, completedAction }: StepWizardProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [completed, setCompleted] = useState(false);
  const [direction, setDirection] = useState(1);

  const next = () => {
    if (currentStep < steps.length - 1) {
      setDirection(1);
      setCurrentStep((s) => s + 1);
    } else {
      onComplete();
      setCompleted(true);
    }
  };

  const back = () => {
    if (currentStep > 0) {
      setDirection(-1);
      setCurrentStep((s) => s - 1);
    }
  };

  const variants = {
    enter: (dir: number) => ({ x: dir > 0 ? 200 : -200, opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (dir: number) => ({ x: dir > 0 ? -200 : 200, opacity: 0 }),
  };

  if (completed) {
    return (
      <div className="min-h-screen bg-[#E8E6E1] flex items-center justify-center px-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white/80 backdrop-blur-xl rounded-[32px] p-12 shadow-xl border border-white/40 max-w-lg w-full text-center"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", delay: 0.2 }}
            className="mx-auto w-20 h-20 rounded-full bg-[#3FAF5E]/10 flex items-center justify-center mb-6"
          >
            <CheckCircle className="w-10 h-10 text-[#3FAF5E]" />
          </motion.div>
          <h2 className="text-2xl font-bold text-[#1A1A1A] mb-2">{completedTitle || "Setup Complete!"}</h2>
          <p className="text-muted-foreground mb-8">{completedMessage || "Your profile has been successfully created."}</p>
          {completedAction && (
            <a href={completedAction.href}>
              <Button className="rounded-xl bg-[#3FAF5E] text-white hover:bg-[#3FAF5E]/90 h-12 px-8 font-semibold">
                {completedAction.label} <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
            </a>
          )}
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#E8E6E1] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-[640px]">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-8">
          <h1 className="text-2xl font-bold text-[#1A1A1A] mb-2">{title}</h1>
          <p className="text-sm text-muted-foreground">Step {currentStep + 1} of {steps.length}</p>
        </motion.div>

        {/* Progress bar */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {steps.map((_, i) => (
            <div key={i} className="flex items-center gap-2">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-300 ${
                i < currentStep ? "bg-[#3FAF5E] text-white" :
                i === currentStep ? "bg-[#3FAF5E] text-white shadow-lg scale-110" :
                "bg-white text-muted-foreground border-2 border-border"
              }`}>
                {i < currentStep ? <CheckCircle className="w-5 h-5" /> : i + 1}
              </div>
              {i < steps.length - 1 && (
                <div className={`w-12 h-1 rounded-full transition-all duration-300 ${
                  i < currentStep ? "bg-[#3FAF5E]" : "bg-border"
                }`} />
              )}
            </div>
          ))}
        </div>

        {/* Card with step content */}
        <div className="bg-white/80 backdrop-blur-xl rounded-[32px] p-8 shadow-xl border border-white/40 overflow-hidden">
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={currentStep}
              custom={direction}
              variants={variants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.3 }}
            >
              <h3 className="text-xl font-bold text-[#1A1A1A] mb-1">{steps[currentStep].title}</h3>
              {steps[currentStep].description && (
                <p className="text-sm text-muted-foreground mb-6">{steps[currentStep].description}</p>
              )}
              <div className="mb-6">{steps[currentStep].content}</div>
            </motion.div>
          </AnimatePresence>

          {/* Navigation */}
          <div className="flex items-center justify-between pt-4 border-t border-border/50">
            <Button
              variant="ghost"
              onClick={back}
              disabled={currentStep === 0}
              className="rounded-xl"
            >
              <ArrowLeft className="w-4 h-4 mr-2" /> Back
            </Button>
            <Button
              onClick={next}
              disabled={loading}
              className="rounded-xl bg-[#3FAF5E] text-white hover:bg-[#3FAF5E]/90 font-semibold px-8"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : currentStep === steps.length - 1 ? (
                <>Complete Setup <CheckCircle className="ml-2 w-4 h-4" /></>
              ) : (
                <>Next <ArrowRight className="ml-2 w-4 h-4" /></>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
