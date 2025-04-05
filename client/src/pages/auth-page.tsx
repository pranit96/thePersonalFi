import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Redirect } from "wouter";
import { ChevronRightIcon, Lock, Mail } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";

// Login form validation schema
const loginSchema = z.object({
  email: z.string().email("Please enter a valid email"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

// Registration form validation schema
const registerSchema = z.object({
  email: z.string().email("Please enter a valid email"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  currency: z.string().min(1, "Currency is required"),
  defaultSalary: z.number().nonnegative("Salary must be a positive number"),
  dataEncryptionEnabled: z.boolean().default(true),
  dataSharingEnabled: z.boolean().default(false),
  anonymizedAnalytics: z.boolean().default(true),
});

export default function AuthPage() {
  const [activeTab, setActiveTab] = useState<string>("login");
  const { user, loginMutation, registerMutation } = useAuth();
  
  // Login form setup
  const loginForm = useForm({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });
  
  // Register form setup
  const registerForm = useForm({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      email: "",
      password: "",
      firstName: "",
      lastName: "",
      currency: "USD",
      defaultSalary: 0,
      dataEncryptionEnabled: true,
      dataSharingEnabled: false,
      anonymizedAnalytics: true,
    },
  });
  
  // Redirect to home if user is already logged in
  if (user) {
    return <Redirect to="/" />;
  }
  
  const handleLogin = (data: z.infer<typeof loginSchema>) => {
    loginMutation.mutate(data);
  };
  
  const handleRegister = (data: z.infer<typeof registerSchema>) => {
    registerMutation.mutate(data);
  };

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-black to-slate-900">
      {/* Left column - Forms */}
      <div className="flex w-full lg:w-1/2 flex-col justify-center px-5 py-10 lg:px-10">
        <div className="mx-auto w-full max-w-md">
          <h1 className="mb-2 text-3xl font-bold text-white">FinTrack</h1>
          <p className="mb-8 text-gray-400">Secure financial management at your fingertips</p>
          
          <Tabs defaultValue="login" value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="login">Login</TabsTrigger>
              <TabsTrigger value="register">Register</TabsTrigger>
            </TabsList>
            
            <TabsContent value="login">
              <Card className="border-gray-800 bg-gray-900/50 backdrop-blur-lg">
                <CardHeader>
                  <CardTitle className="text-white">Welcome back</CardTitle>
                  <CardDescription className="text-gray-300">Enter your credentials to access your account</CardDescription>
                </CardHeader>
                <form onSubmit={loginForm.handleSubmit(handleLogin)}>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="login-email" className="text-gray-200">Email</Label>
                      <div className="relative">
                        <span className="absolute left-3 top-3 text-gray-400">
                          <Mail size={16} />
                        </span>
                        <Input
                          id="login-email"
                          type="text"
                          placeholder="Enter your email"
                          className="pl-10 text-white bg-gray-800 border-gray-700"
                          {...loginForm.register("email")}
                        />
                      </div>
                      {loginForm.formState.errors.email && (
                        <p className="text-sm text-red-500">{loginForm.formState.errors.email.message}</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="login-password" className="text-gray-200">Password</Label>
                      <div className="relative">
                        <span className="absolute left-3 top-3 text-gray-400">
                          <Lock size={16} />
                        </span>
                        <Input
                          id="login-password"
                          type="password"
                          placeholder="Enter your password"
                          className="pl-10 text-white bg-gray-800 border-gray-700"
                          {...loginForm.register("password")}
                        />
                      </div>
                      {loginForm.formState.errors.password && (
                        <p className="text-sm text-red-500">{loginForm.formState.errors.password.message}</p>
                      )}
                    </div>
                  </CardContent>
                  <CardFooter>
                    <Button 
                      type="submit" 
                      className="w-full"
                      disabled={loginMutation.isPending}
                    >
                      {loginMutation.isPending ? (
                        <>
                          <span className="mr-2">Logging in</span>
                          <span className="animate-spin">⟳</span>
                        </>
                      ) : (
                        "Login"
                      )}
                    </Button>
                  </CardFooter>
                </form>
              </Card>
            </TabsContent>
            
            <TabsContent value="register">
              <Card className="border-gray-800 bg-gray-900/50 backdrop-blur-lg">
                <CardHeader>
                  <CardTitle className="text-white">Create an account</CardTitle>
                  <CardDescription className="text-gray-300">Enter your details to sign up</CardDescription>
                </CardHeader>
                <form onSubmit={registerForm.handleSubmit(handleRegister)}>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="register-firstname" className="text-gray-200">First Name</Label>
                        <Input
                          id="register-firstname"
                          type="text"
                          placeholder="First name"
                          className="text-white bg-gray-800 border-gray-700"
                          {...registerForm.register("firstName")}
                        />
                        {registerForm.formState.errors.firstName && (
                          <p className="text-sm text-red-500">{registerForm.formState.errors.firstName.message}</p>
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="register-lastname" className="text-gray-200">Last Name</Label>
                        <Input
                          id="register-lastname"
                          type="text"
                          placeholder="Last name"
                          className="text-white bg-gray-800 border-gray-700"
                          {...registerForm.register("lastName")}
                        />
                        {registerForm.formState.errors.lastName && (
                          <p className="text-sm text-red-500">{registerForm.formState.errors.lastName.message}</p>
                        )}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="register-email" className="text-gray-200">Email</Label>
                      <div className="relative">
                        <span className="absolute left-3 top-3 text-gray-400">
                          <Mail size={16} />
                        </span>
                        <Input
                          id="register-email"
                          type="email"
                          placeholder="Enter your email"
                          className="pl-10 text-white bg-gray-800 border-gray-700"
                          {...registerForm.register("email")}
                        />
                      </div>
                      {registerForm.formState.errors.email && (
                        <p className="text-sm text-red-500">{registerForm.formState.errors.email.message}</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="register-password" className="text-gray-200">Password</Label>
                      <div className="relative">
                        <span className="absolute left-3 top-3 text-gray-400">
                          <Lock size={16} />
                        </span>
                        <Input
                          id="register-password"
                          type="password"
                          placeholder="Create a password"
                          className="pl-10 text-white bg-gray-800 border-gray-700"
                          {...registerForm.register("password")}
                        />
                      </div>
                      {registerForm.formState.errors.password && (
                        <p className="text-sm text-red-500">{registerForm.formState.errors.password.message}</p>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="register-currency" className="text-gray-200">Currency</Label>
                        <select
                          id="register-currency"
                          className="w-full rounded-md text-white bg-gray-800 border-gray-700 p-2"
                          {...registerForm.register("currency")}
                        >
                          <option value="USD">USD ($)</option>
                          <option value="EUR">EUR (€)</option>
                          <option value="GBP">GBP (£)</option>
                          <option value="JPY">JPY (¥)</option>
                          <option value="CAD">CAD ($)</option>
                          <option value="AUD">AUD ($)</option>
                          <option value="CNY">CNY (¥)</option>
                          <option value="INR">INR (₹)</option>
                        </select>
                        {registerForm.formState.errors.currency && (
                          <p className="text-sm text-red-500">{registerForm.formState.errors.currency.message}</p>
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="register-salary" className="text-gray-200">Monthly Salary</Label>
                        <Input
                          id="register-salary"
                          type="number"
                          placeholder="0.00"
                          className="text-white bg-gray-800 border-gray-700"
                          {...registerForm.register("defaultSalary", { 
                            valueAsNumber: true,
                            required: "Please enter your monthly salary" 
                          })}
                        />
                        {registerForm.formState.errors.defaultSalary && (
                          <p className="text-sm text-red-500">{registerForm.formState.errors.defaultSalary.message}</p>
                        )}
                      </div>
                    </div>

                    <div className="space-y-3 pt-2">
                      <div className="flex items-center space-x-2">
                        <Checkbox 
                          id="data-encryption" 
                          defaultChecked
                          {...registerForm.register("dataEncryptionEnabled")}
                        />
                        <Label htmlFor="data-encryption" className="text-sm text-gray-200">Enable data encryption for sensitive information</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox 
                          id="data-sharing" 
                          {...registerForm.register("dataSharingEnabled")}
                        />
                        <Label htmlFor="data-sharing" className="text-sm text-gray-200">Allow data sharing for improved services</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox 
                          id="analytics" 
                          defaultChecked
                          {...registerForm.register("anonymizedAnalytics")}
                        />
                        <Label htmlFor="analytics" className="text-sm text-gray-200">Enable anonymized analytics</Label>
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter>
                    <Button 
                      type="submit" 
                      className="w-full"
                      disabled={registerMutation.isPending}
                    >
                      {registerMutation.isPending ? (
                        <>
                          <span className="mr-2">Creating account</span>
                          <span className="animate-spin">⟳</span>
                        </>
                      ) : (
                        "Create Account"
                      )}
                    </Button>
                  </CardFooter>
                </form>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
      
      {/* Right column - Hero banner */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex-col items-center justify-center px-12">
        <div className="max-w-md text-white">
          <h2 className="mb-6 text-4xl font-bold">Take control of your financial future</h2>
          <ul className="space-y-4">
            <li className="flex items-start">
              <ChevronRightIcon className="mr-2 h-6 w-6 text-pink-300" />
              <span>Track monthly income and expenses with beautiful analytics</span>
            </li>
            <li className="flex items-start">
              <ChevronRightIcon className="mr-2 h-6 w-6 text-pink-300" />
              <span>Get AI-powered insights to optimize your spending habits</span>
            </li>
            <li className="flex items-start">
              <ChevronRightIcon className="mr-2 h-6 w-6 text-pink-300" />
              <span>Set and achieve savings goals with progress tracking</span>
            </li>
            <li className="flex items-start">
              <ChevronRightIcon className="mr-2 h-6 w-6 text-pink-300" />
              <span>Upload financial documents for automatic transaction import</span>
            </li>
            <li className="flex items-start">
              <ChevronRightIcon className="mr-2 h-6 w-6 text-pink-300" />
              <span>Secured with encryption and advanced privacy controls</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}