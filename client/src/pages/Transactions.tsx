import { useState, useMemo } from "react";
import { useFinance } from "@/context/FinanceContext";
import Header from "@/components/layout/Header";
import TransactionItem from "@/components/transactions/TransactionItem";
import PDFUploader from "@/components/PDFUploader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger,
  DialogFooter 
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Filter, Search, Upload } from "lucide-react";

const categories = [
  "Dining", 
  "Shopping", 
  "Subscription", 
  "Income", 
  "Transportation",
  "Housing",
  "Healthcare",
  "Technology",
  "Utilities",
  "Personal"
];

const newTransactionSchema = z.object({
  merchant: z.string().min(1, "Merchant name is required"),
  amount: z.string().refine(val => !isNaN(Number(val)) && Number(val) !== 0, {
    message: "Amount must be a non-zero number",
  }),
  category: z.string().min(1, "Category is required"),
  isIncome: z.boolean().default(false),
});

export default function Transactions() {
  const { transactions, addTransaction, isLoading } = useFinance();
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isFilterDialogOpen, setIsFilterDialogOpen] = useState(false);
  
  const form = useForm<z.infer<typeof newTransactionSchema>>({
    resolver: zodResolver(newTransactionSchema),
    defaultValues: {
      merchant: "",
      amount: "",
      category: "",
      isIncome: false,
    },
  });
  
  const filteredTransactions = useMemo(() => {
    let filtered = [...transactions];
    
    // Sort by date, newest first
    filtered.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    
    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        t => t.merchant.toLowerCase().includes(query) || 
             t.category.toLowerCase().includes(query)
      );
    }
    
    // Apply category filter
    if (categoryFilter) {
      filtered = filtered.filter(t => t.category === categoryFilter);
    }
    
    return filtered;
  }, [transactions, searchQuery, categoryFilter]);
  
  const onSubmit = async (values: z.infer<typeof newTransactionSchema>) => {
    try {
      const amountValue = parseFloat(values.amount);
      const finalAmount = values.isIncome ? Math.abs(amountValue) : -Math.abs(amountValue);
      
      await addTransaction({
        merchant: values.merchant,
        amount: finalAmount,
        category: values.category,
        description: null,
        encryptedData: null,
        userId: 0 // This will be set by the server
      });
      
      form.reset();
      setIsAddDialogOpen(false);
    } catch (error) {
      console.error("Failed to add transaction:", error);
    }
  };
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-text font-medium">Loading your transactions...</p>
        </div>
      </div>
    );
  }
  
  return (
    <>
      <Header title="Transactions" subtitle="Manage and track your spending" />
      
      <Tabs defaultValue="list" className="mb-8">
        <TabsList className="grid grid-cols-2 w-full sm:w-64 mb-6 bg-background-dark/30 backdrop-blur-xl border border-white/10">
          <TabsTrigger value="list" className="data-[state=active]:bg-primary/20 data-[state=active]:text-primary">
            <Search className="h-4 w-4 mr-2" />
            Transactions
          </TabsTrigger>
          <TabsTrigger value="import" className="data-[state=active]:bg-primary/20 data-[state=active]:text-primary">
            <Upload className="h-4 w-4 mr-2" />
            Import
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="list" className="mt-0">
          <div className="bg-background-light/60 backdrop-blur-xl border border-white/10 shadow-lg rounded-xl p-5 mb-8">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-text/50 w-4 h-4" />
                <Input
                  placeholder="Search transactions..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 bg-background-dark/50 border-white/10 text-text"
                />
              </div>
              
              <div className="flex gap-2 w-full sm:w-auto">
                <Dialog open={isFilterDialogOpen} onOpenChange={setIsFilterDialogOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" className="bg-background-light/60 backdrop-blur-xl border border-white/10 shadow-lg">
                      <Filter className="w-4 h-4 mr-2" />
                      Filter
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="bg-background-light/95 backdrop-blur-xl border border-white/10">
                    <DialogHeader>
                      <DialogTitle className="text-text">Filter Transactions</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div>
                        <h4 className="mb-2 font-medium text-text">Category</h4>
                        <div className="flex flex-wrap gap-2">
                          <Button 
                            variant="ghost"
                            size="sm"
                            className={`rounded-full ${categoryFilter === null ? 'bg-primary/20 text-primary' : 'bg-white/5'}`}
                            onClick={() => setCategoryFilter(null)}
                          >
                            All
                          </Button>
                          {categories.map(category => (
                            <Button 
                              key={category}
                              variant="ghost"
                              size="sm"
                              className={`rounded-full ${categoryFilter === category ? 'bg-primary/20 text-primary' : 'bg-white/5'}`}
                              onClick={() => setCategoryFilter(category)}
                            >
                              {category}
                            </Button>
                          ))}
                        </div>
                      </div>
                    </div>
                    <DialogFooter>
                      <Button 
                        variant="outline" 
                        onClick={() => {
                          setCategoryFilter(null);
                          setIsFilterDialogOpen(false);
                        }}
                      >
                        Reset Filters
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
                
                <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                  <DialogTrigger asChild>
                    <Button className="bg-primary hover:bg-primary/90 text-white">
                      <Plus className="w-4 h-4 mr-2" />
                      Add Transaction
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="bg-background-light/95 backdrop-blur-xl border border-white/10">
                    <DialogHeader>
                      <DialogTitle className="text-text">Add New Transaction</DialogTitle>
                    </DialogHeader>
                    <Form {...form}>
                      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <FormField
                          control={form.control}
                          name="merchant"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-text">Merchant</FormLabel>
                              <FormControl>
                                <Input 
                                  placeholder="e.g. Grocery Store" 
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
                          name="amount"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-text">Amount</FormLabel>
                              <FormControl>
                                <Input 
                                  placeholder="e.g. 45.67" 
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
                          name="category"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-text">Category</FormLabel>
                              <Select 
                                onValueChange={field.onChange} 
                                defaultValue={field.value}
                              >
                                <FormControl>
                                  <SelectTrigger className="bg-background-dark/50 border-white/10 text-text">
                                    <SelectValue placeholder="Select category" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent className="bg-background-light/95 backdrop-blur-xl border-white/10 text-text">
                                  {categories.map(category => (
                                    <SelectItem key={category} value={category}>
                                      {category}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={form.control}
                          name="isIncome"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-center space-x-3 space-y-0 rounded-md border border-white/10 p-4">
                              <FormControl>
                                <input
                                  type="checkbox"
                                  checked={field.value}
                                  onChange={field.onChange}
                                  className="h-4 w-4 text-primary focus:ring-primary"
                                />
                              </FormControl>
                              <div className="space-y-1 leading-none">
                                <FormLabel className="text-text">
                                  This is income
                                </FormLabel>
                              </div>
                            </FormItem>
                          )}
                        />
                        
                        <DialogFooter>
                          <Button type="submit" className="bg-primary hover:bg-primary/90 text-white">
                            Add Transaction
                          </Button>
                        </DialogFooter>
                      </form>
                    </Form>
                  </DialogContent>
                </Dialog>
              </div>
            </div>
            
            <div className="space-y-3">
              {filteredTransactions.length === 0 ? (
                <div className="text-center py-8 text-text/70">
                  <p>No transactions found.</p>
                  {searchQuery || categoryFilter ? (
                    <p className="text-sm mt-2">Try adjusting your filters.</p>
                  ) : (
                    <p className="text-sm mt-2">Start by adding a transaction!</p>
                  )}
                </div>
              ) : (
                filteredTransactions.map(transaction => (
                  <TransactionItem key={transaction.id} transaction={transaction} />
                ))
              )}
            </div>
          </div>
        </TabsContent>
        
        <TabsContent value="import" className="mt-0">
          <PDFUploader />
        </TabsContent>
      </Tabs>
    </>
  );
}
