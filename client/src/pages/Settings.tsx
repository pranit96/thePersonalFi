
import React, { useState } from 'react';
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { useAuth } from "@/hooks/use-auth";
import { useFinance } from "@/context/FinanceContext";
import { Loader2, Download, Trash2, ShieldAlert, Bot, Brain, Key } from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "../lib/queryClient";
import { Input } from "@/components/ui/input";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

// Define schema for form validation
const formSchema = z.object({
  fontScale: z.number().min(80).max(150),
  highContrast: z.boolean(),
  reducedMotion: z.boolean(),
  darkMode: z.boolean(),
  groqApiKey: z.string().optional(),
});

export default function Settings() {
  const { toast } = useToast();
  const { user } = useAuth();
  const { aiServiceMeta } = useFinance();
  const [fontScale, setFontScale] = useState(100);
  const [highContrast, setHighContrast] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [darkMode, setDarkMode] = useState(true);
  const [groqApiKey, setGroqApiKey] = useState("");
  
  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: {
      fontScale: 100,
      highContrast: false,
      reducedMotion: false,
      darkMode: true,
      groqApiKey: ""
    }
  });

  // Mutation for deleting all user data
  const deleteDataMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("DELETE", "/api/user/data");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/transactions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/goals"] });
      queryClient.invalidateQueries({ queryKey: ["/api/salary"] });
      queryClient.invalidateQueries({ queryKey: ["/api/savings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/insights"] });
      
      toast({
        title: "Data Deleted",
        description: "All your financial data has been successfully deleted.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Delete Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Mutation for exporting user data
  const exportDataMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("GET", "/api/user/export");
      return res.json();
    },
    onSuccess: (data) => {
      // Create a downloadable JSON file
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `financial-data-export-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast({
        title: "Export Successful",
        description: "Your financial data has been exported successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Export Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  // Mutation for updating AI API key
  const updateApiKeyMutation = useMutation({
    mutationFn: async (apiKey: string) => {
      const res = await apiRequest("POST", "/api/admin/config/ai", { apiKey });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/insights"] });
      
      toast({
        title: "API Key Updated",
        description: "The Groq API key has been updated successfully.",
      });
      setGroqApiKey("");
    },
    onError: (error: Error) => {
      toast({
        title: "Update Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Apply accessibility settings to the document
  React.useEffect(() => {
    // Apply font scaling
    document.documentElement.style.fontSize = `${fontScale}%`;
    
    // Apply high contrast mode
    if (highContrast) {
      document.documentElement.classList.add('high-contrast');
    } else {
      document.documentElement.classList.remove('high-contrast');
    }
    
    // Apply reduced motion
    if (reducedMotion) {
      document.documentElement.classList.add('reduce-motion');
    } else {
      document.documentElement.classList.remove('reduce-motion');
    }
    
    // Apply dark/light mode
    if (darkMode) {
      document.documentElement.classList.add('dark');
      document.documentElement.classList.remove('light');
    } else {
      document.documentElement.classList.add('light');
      document.documentElement.classList.remove('dark');
    }
  }, [fontScale, highContrast, reducedMotion, darkMode]);

  return (
    <Form {...form}>
    <div className="container mx-auto py-6">
      <h1 className="text-3xl font-bold mb-6">Settings</h1>

      <Tabs defaultValue="accessibility" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="accessibility">Accessibility</TabsTrigger>
          <TabsTrigger value="data">Data Management</TabsTrigger>
          <TabsTrigger value="ai">AI Settings</TabsTrigger>
          <TabsTrigger value="account">Account</TabsTrigger>
        </TabsList>

        {/* Accessibility Settings */}
        <TabsContent value="accessibility">
          <Card>
            <CardHeader>
              <CardTitle>Accessibility Options</CardTitle>
              <CardDescription>
                Customize the app to meet your accessibility needs
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">
                      Dark Mode
                    </FormLabel>
                    <FormDescription>
                      Use dark color scheme to reduce eye strain
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={darkMode}
                      onCheckedChange={setDarkMode}
                    />
                  </FormControl>
                </FormItem>

                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">
                      High Contrast
                    </FormLabel>
                    <FormDescription>
                      Increase contrast for better readability
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={highContrast}
                      onCheckedChange={setHighContrast}
                    />
                  </FormControl>
                </FormItem>

                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">
                      Reduced Motion
                    </FormLabel>
                    <FormDescription>
                      Minimize animations and transitions
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={reducedMotion}
                      onCheckedChange={setReducedMotion}
                    />
                  </FormControl>
                </FormItem>

                <FormItem className="space-y-2 rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">
                      Font Size
                    </FormLabel>
                    <FormDescription>
                      Adjust text size for better readability
                    </FormDescription>
                  </div>
                  <div className="pt-2">
                    <FormControl>
                      <Slider
                        defaultValue={[fontScale]}
                        max={150}
                        min={80}
                        step={5}
                        onValueChange={(value) => setFontScale(value[0])}
                      />
                    </FormControl>
                    <div className="flex justify-between text-xs text-muted-foreground mt-1">
                      <span>Smaller</span>
                      <span>{fontScale}%</span>
                      <span>Larger</span>
                    </div>
                  </div>
                </FormItem>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Data Management Settings */}
        <TabsContent value="data">
          <Card>
            <CardHeader>
              <CardTitle>Data Management</CardTitle>
              <CardDescription>
                Control your financial data and privacy settings
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg flex items-center">
                      <Download className="mr-2 h-4 w-4" />
                      Export Your Data
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground mb-4">
                      Download a copy of all your financial data in JSON format.
                    </p>
                  </CardContent>
                  <CardFooter>
                    <Button 
                      onClick={() => exportDataMutation.mutate()}
                      disabled={exportDataMutation.isPending}
                      className="w-full"
                    >
                      {exportDataMutation.isPending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Exporting...
                        </>
                      ) : (
                        "Export Data"
                      )}
                    </Button>
                  </CardFooter>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg flex items-center text-destructive">
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete All Data
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground mb-4">
                      Permanently delete all your financial data from our servers.
                    </p>
                  </CardContent>
                  <CardFooter>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button 
                          variant="destructive" 
                          className="w-full"
                        >
                          Delete All Data
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This action cannot be undone. This will permanently delete all your
                            financial data including transactions, goals, salary records,
                            and insights from our servers.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => deleteDataMutation.mutate()}
                            disabled={deleteDataMutation.isPending}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            {deleteDataMutation.isPending ? (
                              <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Deleting...
                              </>
                            ) : (
                              "Yes, delete all my data"
                            )}
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </CardFooter>
                </Card>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* AI Settings */}
        <TabsContent value="ai">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Brain className="mr-2 h-5 w-5 text-primary" />
                AI Service Configuration
              </CardTitle>
              <CardDescription>
                Manage AI-powered financial insights settings
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                {/* Current Status */}
                <div className="rounded-lg border p-4 space-y-3">
                  <h3 className="text-lg font-medium flex items-center">
                    <Bot className="mr-2 h-4 w-4" />
                    Groq API Status 
                    <span className="ml-2 text-xs px-2 py-0.5 bg-primary/10 text-primary rounded-full">DeepSeek-R1-Distill-LLama-70B</span>
                  </h3>
                  
                  <div className="space-y-2">
                    {aiServiceMeta?.apiKeyMissing ? (
                      <div className="flex items-center text-yellow-400 bg-yellow-500/10 px-3 py-2 rounded-md">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2">
                          <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"></path>
                          <path d="M12 9v4"></path>
                          <path d="M12 17h.01"></path>
                        </svg>
                        <span>AI features are limited - API key not configured</span>
                      </div>
                    ) : (
                      <div className="flex items-center text-green-400 bg-green-500/10 px-3 py-2 rounded-md">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2">
                          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                          <path d="m9 11 3 3L22 4"></path>
                        </svg>
                        <span>API key configured and working properly</span>
                      </div>
                    )}
                    
                    {/* Quota Information */}
                    {!aiServiceMeta?.apiKeyMissing && aiServiceMeta?.remaining !== undefined && (
                      <div className="mt-3">
                        <div className="flex justify-between items-center text-sm">
                          <span>Current Quota Usage</span>
                          <span className="font-medium">{aiServiceMeta.remaining} / {aiServiceMeta.total}</span>
                        </div>
                        <div className="mt-1 w-full bg-background-dark/50 rounded-full h-2">
                          <div 
                            className="bg-primary h-2 rounded-full" 
                            style={{ width: `${(aiServiceMeta.remaining / (aiServiceMeta.total || 1)) * 100}%` }}
                          ></div>
                        </div>
                        {aiServiceMeta.resetsIn && (
                          <div className="text-xs mt-1 text-text/70">Quota resets in {aiServiceMeta.resetsIn}</div>
                        )}
                      </div>
                    )}
                    
                    {/* Error Message */}
                    {aiServiceMeta?.error && (
                      <div className="flex items-center text-red-400 bg-red-500/10 px-3 py-2 rounded-md mt-2">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2">
                          <path d="M12 8v4"></path>
                          <path d="M12 16h.01"></path>
                          <circle cx="12" cy="12" r="10"></circle>
                        </svg>
                        <span>{aiServiceMeta.error}</span>
                      </div>
                    )}
                  </div>
                </div>
                
                {/* API Key Configuration */}
                <div className="rounded-lg border p-4 space-y-3">
                  <h3 className="text-lg font-medium flex items-center">
                    <Key className="mr-2 h-4 w-4" />
                    Configure API Key
                  </h3>
                  
                  <div className="space-y-3">
                    <p className="text-sm text-muted-foreground">
                      Enter your Groq API key to enable AI-powered financial insights and advice.
                      You can obtain a key by signing up at <a href="https://console.groq.com" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">console.groq.com</a>.
                    </p>
                    
                    <div className="flex items-center gap-2">
                      <Input
                        type="password"
                        placeholder="Enter Groq API Key"
                        value={groqApiKey}
                        onChange={(e) => setGroqApiKey(e.target.value)}
                        className="flex-1"
                      />
                      <Button 
                        onClick={() => updateApiKeyMutation.mutate(groqApiKey)}
                        disabled={!groqApiKey || updateApiKeyMutation.isPending}
                      >
                        {updateApiKeyMutation.isPending ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Saving...
                          </>
                        ) : (
                          "Save Key"
                        )}
                      </Button>
                    </div>
                    
                    <p className="text-xs text-muted-foreground mt-2">
                      Your API key is stored securely and is used only to generate financial insights for your account.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Account Settings */}
        <TabsContent value="account">
          <Card>
            <CardHeader>
              <CardTitle>Account Settings</CardTitle>
              <CardDescription>
                Manage your account information and preferences
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <h3 className="text-lg font-medium">Account Information</h3>
                  <div className="grid grid-cols-2 gap-2 rounded-lg border p-4">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Username</p>
                      <p>{user?.username}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Account Created</p>
                      <p>{user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : "N/A"}</p>
                    </div>
                  </div>
                </div>

                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">
                      Enhanced Data Protection
                    </FormLabel>
                    <FormDescription>
                      Encrypt all sensitive financial details with AES-256
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={user?.dataEncryptionEnabled || false}
                      disabled={true}
                    />
                  </FormControl>
                </FormItem>
              </div>
            </CardContent>
            <CardFooter className="flex justify-between">
              <div className="flex items-center text-xs text-muted-foreground">
                <ShieldAlert className="h-3 w-3 mr-1" />
                Data encryption is managed by your administrator
              </div>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
    </Form>
  );
}
