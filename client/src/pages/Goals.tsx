import { useState } from "react";
import { useFinance } from "@/context/FinanceContext";
import Header from "@/components/layout/Header";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger,
  DialogFooter 
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { formatCurrency, calculatePercentage } from "@/lib/utils";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";
import { 
  Plus, 
  Trash2, 
  Edit, 
  Home, 
  Plane, 
  GraduationCap, 
  Car, 
  Heart,
  Smartphone,
  Sparkles,
  Clock,
  Target,
  AlertCircle,
  ChevronRight
} from "lucide-react";

const goalIcons: Record<string, React.ReactNode> = {
  "Home Down Payment": <Home className="text-accent w-5 h-5" />,
  "Vacation Fund": <Plane className="text-primary w-5 h-5" />,
  "Education Fund": <GraduationCap className="text-secondary w-5 h-5" />,
  "Car": <Car className="text-blue-500 w-5 h-5" />,
  "Emergency Fund": <Heart className="text-red-500 w-5 h-5" />,
  "Tech Gadget": <Smartphone className="text-purple-500 w-5 h-5" />,
  "Default": <Heart className="text-accent w-5 h-5" />
};

const goalColors: Record<string, string> = {
  "Home Down Payment": "bg-accent",
  "Vacation Fund": "bg-primary",
  "Education Fund": "bg-secondary",
  "Car": "bg-blue-500",
  "Emergency Fund": "bg-red-500",
  "Tech Gadget": "bg-purple-500",
  "Default": "bg-accent"
};

const newGoalSchema = z.object({
  name: z.string().min(1, "Goal name is required"),
  targetAmount: z.string().refine(val => !isNaN(Number(val)) && Number(val) > 0, {
    message: "Target amount must be a positive number",
  }),
});

const updateGoalSchema = z.object({
  currentAmount: z.string().refine(val => !isNaN(Number(val)) && Number(val) >= 0, {
    message: "Current amount must be a non-negative number",
  }),
});

export default function Goals() {
  const { goals, goalAdvice, hasGoalAdvice, addGoal, updateGoal, deleteGoal, isLoading } = useFinance();
  const [isNewGoalDialogOpen, setIsNewGoalDialogOpen] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState<number | null>(null);
  const [isUpdateDialogOpen, setIsUpdateDialogOpen] = useState(false);
  
  const newGoalForm = useForm<z.infer<typeof newGoalSchema>>({
    resolver: zodResolver(newGoalSchema),
    defaultValues: {
      name: "",
      targetAmount: "",
    },
  });
  
  const updateGoalForm = useForm<z.infer<typeof updateGoalSchema>>({
    resolver: zodResolver(updateGoalSchema),
    defaultValues: {
      currentAmount: "",
    },
  });
  
  const onSubmitNewGoal = async (values: z.infer<typeof newGoalSchema>) => {
    try {
      await addGoal({
        name: values.name,
        targetAmount: Number(values.targetAmount),
      });
      
      newGoalForm.reset();
      setIsNewGoalDialogOpen(false);
    } catch (error) {
      console.error("Failed to add goal:", error);
    }
  };
  
  const onSubmitUpdateGoal = async (values: z.infer<typeof updateGoalSchema>) => {
    if (selectedGoal === null) return;
    
    try {
      await updateGoal(selectedGoal, Number(values.currentAmount));
      updateGoalForm.reset();
      setIsUpdateDialogOpen(false);
      setSelectedGoal(null);
    } catch (error) {
      console.error("Failed to update goal:", error);
    }
  };
  
  const openUpdateDialog = (goalId: number, currentAmount: number) => {
    setSelectedGoal(goalId);
    updateGoalForm.setValue("currentAmount", currentAmount.toString());
    setIsUpdateDialogOpen(true);
  };
  
  const handleDeleteGoal = async (goalId: number) => {
    if (confirm("Are you sure you want to delete this goal?")) {
      try {
        await deleteGoal(goalId);
      } catch (error) {
        console.error("Failed to delete goal:", error);
      }
    }
  };
  
  const getIconForGoal = (goalName: string) => {
    return goalIcons[goalName] || goalIcons.Default;
  };
  
  const getColorForGoal = (goalName: string) => {
    return goalColors[goalName] || goalColors.Default;
  };
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-text font-medium">Loading your goals...</p>
        </div>
      </div>
    );
  }
  
  return (
    <>
      <Header title="Saving Goals" subtitle="Track and manage your financial targets" />
      
      {/* AI-powered goal advice section */}
      {hasGoalAdvice && goalAdvice && goalAdvice.length > 0 && (
        <div className="bg-background-light/60 backdrop-blur-xl border border-primary/20 shadow-lg rounded-xl p-5 mb-8">
          <div className="flex items-center mb-4">
            <Sparkles className="h-5 w-5 text-primary mr-2" />
            <h3 className="font-display font-bold">AI-Powered Goal Insights</h3>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {goalAdvice.map((advice, idx) => {
              // Determine the icon based on advice content
              let icon = <Target className="h-5 w-5" />;
              if (advice.title.toLowerCase().includes('time') || advice.timeframe) {
                icon = <Clock className="h-5 w-5" />;
              } else if (advice.title.toLowerCase().includes('warn') || advice.title.toLowerCase().includes('caution')) {
                icon = <AlertCircle className="h-5 w-5" />;
              }
              
              return (
                <Alert key={idx} className="bg-background-dark/30 border-primary/10">
                  <div className="flex items-start">
                    <div className="bg-primary/10 p-2 rounded-full mr-3">
                      {icon}
                    </div>
                    <div>
                      <AlertTitle className="text-base flex items-center">
                        {advice.title}
                        {advice.goalName && advice.goalName !== 'General' && (
                          <span className="ml-2 text-xs py-0.5 px-2 bg-primary/20 text-primary rounded-full">
                            {advice.goalName}
                          </span>
                        )}
                      </AlertTitle>
                      <AlertDescription className="text-text/80 mt-1">
                        {advice.description}
                        
                        {advice.timeframe && (
                          <div className="flex items-center mt-2 text-sm text-primary/80">
                            <Clock className="h-4 w-4 mr-1" />
                            <span>{advice.timeframe}</span>
                          </div>
                        )}
                        
                        {advice.actionText && (
                          <div className="mt-3 bg-background-light/30 p-2 rounded-md flex items-center text-sm border-l-2 border-primary">
                            <ChevronRight className="h-4 w-4 text-primary mr-1 flex-shrink-0" />
                            <span>{advice.actionText}</span>
                          </div>
                        )}
                      </AlertDescription>
                    </div>
                  </div>
                </Alert>
              );
            })}
          </div>
        </div>
      )}
      
      <div className="bg-background-light/60 backdrop-blur-xl border border-white/10 shadow-lg rounded-xl p-5 mb-8">
        <div className="flex justify-between items-center mb-6">
          <h3 className="font-display font-bold">Your Goals</h3>
          <Dialog open={isNewGoalDialogOpen} onOpenChange={setIsNewGoalDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-secondary hover:bg-secondary/90 text-white">
                <Plus className="w-4 h-4 mr-2" />
                New Goal
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-background-light/95 backdrop-blur-xl border border-white/10">
              <DialogHeader>
                <DialogTitle className="text-text">Create New Goal</DialogTitle>
              </DialogHeader>
              <Form {...newGoalForm}>
                <form onSubmit={newGoalForm.handleSubmit(onSubmitNewGoal)} className="space-y-4">
                  <FormField
                    control={newGoalForm.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-text">Goal Name</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="e.g. New Car Fund" 
                            {...field} 
                            className="bg-background-dark/50 border-white/10 text-text" 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={newGoalForm.control}
                    name="targetAmount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-text">Target Amount</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="e.g. 5000" 
                            {...field}
                            className="bg-background-dark/50 border-white/10 text-text" 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <DialogFooter>
                    <Button type="submit" className="bg-secondary hover:bg-secondary/90 text-white">
                      Create Goal
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
        
        {goals.length === 0 ? (
          <div className="text-center py-12 text-text/70">
            <p className="mb-4">You don't have any saving goals yet.</p>
            <p className="text-sm mb-6">Setting financial goals helps you stay focused and motivated.</p>
            <Button 
              onClick={() => setIsNewGoalDialogOpen(true)}
              className="bg-secondary hover:bg-secondary/90 text-white"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create Your First Goal
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {goals.map(goal => {
              const percentage = calculatePercentage(goal.currentAmount, goal.targetAmount);
              const icon = getIconForGoal(goal.name);
              const color = getColorForGoal(goal.name);
              
              return (
                <div key={goal.id} className="bg-background-light/40 backdrop-blur-xl border border-white/10 shadow-lg rounded-xl p-5">
                  <div className="flex justify-between items-center mb-4">
                    <div className="flex items-center">
                      <div className={`w-10 h-10 rounded-full ${color.replace('bg-', 'bg-').replace('500', '500/20')} flex items-center justify-center mr-3`}>
                        {icon}
                      </div>
                      <div>
                        <h4 className="font-medium text-lg">{goal.name}</h4>
                        <p className="text-xs text-text/70">Created: {new Date(goal.date).toLocaleDateString()}</p>
                      </div>
                    </div>
                    <div className="flex space-x-1">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="text-text/70 hover:text-text h-8 w-8 p-0"
                        onClick={() => openUpdateDialog(goal.id, goal.currentAmount)}
                      >
                        <Edit className="h-4 w-4" />
                        <span className="sr-only">Edit</span>
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="text-red-400 hover:text-red-300 h-8 w-8 p-0"
                        onClick={() => handleDeleteGoal(goal.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                        <span className="sr-only">Delete</span>
                      </Button>
                    </div>
                  </div>
                  
                  <div className="mb-2 flex justify-between items-center">
                    <span className="text-sm font-medium">Progress</span>
                    <span className="text-sm font-mono">{percentage}%</span>
                  </div>
                  <Progress value={percentage} className="h-3 bg-white/10" indicatorClassName={color} />
                  
                  <div className="mt-4 grid grid-cols-2 gap-4">
                    <div className="bg-background-dark/30 rounded-lg p-3">
                      <p className="text-xs text-text/70 mb-1">Current</p>
                      <p className="text-lg font-display font-medium">{formatCurrency(goal.currentAmount)}</p>
                    </div>
                    <div className="bg-background-dark/30 rounded-lg p-3">
                      <p className="text-xs text-text/70 mb-1">Target</p>
                      <p className="text-lg font-display font-medium">{formatCurrency(goal.targetAmount)}</p>
                    </div>
                  </div>
                  
                  {percentage < 100 && (
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="w-full mt-4 border-white/10"
                      onClick={() => openUpdateDialog(goal.id, goal.currentAmount)}
                    >
                      Update Progress
                    </Button>
                  )}
                  
                  {percentage >= 100 && (
                    <div className="w-full mt-4 py-2 text-center bg-secondary/20 text-secondary rounded-lg text-sm">
                      Goal Completed! 🎉
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
      
      <Dialog open={isUpdateDialogOpen} onOpenChange={setIsUpdateDialogOpen}>
        <DialogContent className="bg-background-light/95 backdrop-blur-xl border border-white/10">
          <DialogHeader>
            <DialogTitle className="text-text">Update Goal Progress</DialogTitle>
          </DialogHeader>
          <Form {...updateGoalForm}>
            <form onSubmit={updateGoalForm.handleSubmit(onSubmitUpdateGoal)} className="space-y-4">
              <FormField
                control={updateGoalForm.control}
                name="currentAmount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-text">Current Amount</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="e.g. 2500" 
                        {...field}
                        className="bg-background-dark/50 border-white/10 text-text" 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="submit" className="bg-primary hover:bg-primary/90 text-white">
                  Update
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </>
  );
}
