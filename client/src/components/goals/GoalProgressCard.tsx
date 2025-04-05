import { useState } from "react";
import { Goal } from "@shared/schema";
import { Home, Plane, GraduationCap, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { formatCurrency, calculatePercentage } from "@/lib/utils";
import { useFinance } from "@/context/FinanceContext";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter,
  DialogTrigger 
} from "@/components/ui/dialog";
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

const goalIcons: Record<string, React.ReactNode> = {
  "Home Down Payment": <Home className="text-accent" />,
  "Vacation Fund": <Plane className="text-primary" />,
  "Education Fund": <GraduationCap className="text-secondary" />,
};

const goalColors: Record<string, string> = {
  "Home Down Payment": "bg-accent",
  "Vacation Fund": "bg-primary",
  "Education Fund": "bg-secondary",
};

const newGoalSchema = z.object({
  name: z.string().min(1, "Goal name is required"),
  targetAmount: z.string().refine(val => !isNaN(Number(val)) && Number(val) > 0, {
    message: "Target amount must be a positive number",
  }),
});

export default function GoalProgressCard({ goals }: { goals: Goal[] }) {
  const { addGoal } = useFinance();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  
  const form = useForm<z.infer<typeof newGoalSchema>>({
    resolver: zodResolver(newGoalSchema),
    defaultValues: {
      name: "",
      targetAmount: "",
    },
  });
  
  const onSubmit = async (values: z.infer<typeof newGoalSchema>) => {
    try {
      await addGoal({
        name: values.name,
        targetAmount: Number(values.targetAmount),
      });
      form.reset();
      setIsDialogOpen(false);
    } catch (error) {
      console.error("Failed to add goal:", error);
    }
  };
  
  return (
    <div className="bg-background-light/60 backdrop-blur-xl border border-white/10 shadow-lg rounded-xl p-5">
      <div className="flex justify-between items-center mb-6">
        <h3 className="font-display font-bold">Saving Goals</h3>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="text-xs px-3 py-1 rounded-full bg-secondary/20 text-secondary h-auto">
              <Plus className="w-3 h-3 mr-1" /> New Goal
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-background-light/95 backdrop-blur-xl border border-white/10">
            <DialogHeader>
              <DialogTitle className="text-text">Create New Goal</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
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
                  control={form.control}
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
      
      <div className="space-y-6">
        {goals.length === 0 ? (
          <div className="text-center py-8 text-text/70">
            <p>No saving goals yet.</p>
            <p className="text-sm mt-2">Create a goal to start tracking your progress!</p>
          </div>
        ) : (
          goals.map((goal) => {
            const percentage = calculatePercentage(goal.currentAmount, goal.targetAmount);
            const icon = goalIcons[goal.name] || <Home className="text-accent" />;
            const color = goalColors[goal.name] || "bg-accent";
            
            return (
              <div key={goal.id} className="mb-6 last:mb-0">
                <div className="flex justify-between items-center mb-2">
                  <div className="flex items-center">
                    <div className="mr-2">{icon}</div>
                    <h4 className="font-medium">{goal.name}</h4>
                  </div>
                  <span className="text-sm font-mono">{percentage}%</span>
                </div>
                <Progress value={percentage} className="h-3 bg-white/10" indicatorClassName={color} />
                <div className="flex justify-between mt-2 text-xs">
                  <span>{formatCurrency(goal.currentAmount)}</span>
                  <span className="text-text/70">{formatCurrency(goal.targetAmount)}</span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
