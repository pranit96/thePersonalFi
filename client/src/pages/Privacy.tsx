import { useState } from "react";
import Header from "@/components/layout/Header";
import { 
  ShieldCheck, 
  Lock, 
  Trash2, 
  Database, 
  Download, 
  EyeOff, 
  Key 
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { apiRequest } from "@/lib/queryClient";

export default function Privacy() {
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [encryptedStorage, setEncryptedStorage] = useState(true);
  const [dataSharingDisabled, setDataSharingDisabled] = useState(true);
  const [anonymizedAnalytics, setAnonymizedAnalytics] = useState(false);
  
  const handleDeleteAllData = async () => {
    try {
      await apiRequest('DELETE', '/api/user/data');
      setIsDeleteDialogOpen(false);
      // Show success message
      alert("All your data has been successfully deleted.");
      // Redirect to dashboard
      window.location.href = "/";
    } catch (error) {
      console.error("Failed to delete data:", error);
    }
  };
  
  const exportData = async () => {
    try {
      const response = await apiRequest('GET', '/api/user/export');
      const data = await response.json();
      
      // Create a download link for the data
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'finspire_data_export.json';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Failed to export data:", error);
    }
  };
  
  return (
    <>
      <Header title="Privacy & Security" subtitle="Manage your data and privacy settings" />
      
      <div className="space-y-8">
        {/* Data Security Section */}
        <div className="bg-background-light/60 backdrop-blur-xl border border-white/10 shadow-lg rounded-xl p-6">
          <div className="flex items-center mb-6">
            <div className="w-12 h-12 rounded-full bg-secondary/20 flex items-center justify-center mr-4">
              <ShieldCheck className="w-6 h-6 text-secondary" />
            </div>
            <div>
              <h3 className="font-display font-bold text-xl">Data Security</h3>
              <p className="text-text/70">How your financial information is protected</p>
            </div>
          </div>
          
          <div className="space-y-6">
            <div className="flex justify-between items-center p-4 bg-background-dark/30 rounded-lg">
              <div className="flex">
                <Lock className="w-5 h-5 text-primary mr-3 mt-0.5" />
                <div>
                  <h4 className="font-medium">End-to-End Encryption</h4>
                  <p className="text-sm text-text/70">All your data is encrypted and can only be accessed by you</p>
                </div>
              </div>
              <Switch 
                checked={encryptedStorage} 
                onCheckedChange={setEncryptedStorage}
                disabled
              />
            </div>
            
            <div className="flex justify-between items-center p-4 bg-background-dark/30 rounded-lg">
              <div className="flex">
                <EyeOff className="w-5 h-5 text-accent mr-3 mt-0.5" />
                <div>
                  <h4 className="font-medium">Third-Party Data Sharing</h4>
                  <p className="text-sm text-text/70">Disable sharing data with third parties</p>
                </div>
              </div>
              <Switch 
                checked={dataSharingDisabled} 
                onCheckedChange={setDataSharingDisabled}
              />
            </div>
            
            <div className="flex justify-between items-center p-4 bg-background-dark/30 rounded-lg">
              <div className="flex">
                <Database className="w-5 h-5 text-secondary mr-3 mt-0.5" />
                <div>
                  <h4 className="font-medium">Anonymized Analytics</h4>
                  <p className="text-sm text-text/70">Allow anonymized usage data to improve our service</p>
                </div>
              </div>
              <Switch 
                checked={anonymizedAnalytics} 
                onCheckedChange={setAnonymizedAnalytics}
              />
            </div>
          </div>
          
          <div className="mt-6 p-4 bg-primary/10 border border-primary/20 rounded-lg">
            <div className="flex">
              <Key className="w-5 h-5 text-primary mr-3 mt-0.5 flex-shrink-0" />
              <p className="text-sm">
                Your data is stored securely and encrypted with industry-standard AES-256 encryption. 
                We never store your financial credentials, and your data is fully anonymized for internal processing.
              </p>
            </div>
          </div>
        </div>
        
        {/* Data Management Section */}
        <div className="bg-background-light/60 backdrop-blur-xl border border-white/10 shadow-lg rounded-xl p-6">
          <div className="flex items-center mb-6">
            <div className="w-12 h-12 rounded-full bg-accent/20 flex items-center justify-center mr-4">
              <Database className="w-6 h-6 text-accent" />
            </div>
            <div>
              <h3 className="font-display font-bold text-xl">Data Management</h3>
              <p className="text-text/70">Export or delete your financial information</p>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-5 bg-background-dark/30 rounded-lg">
              <div className="flex items-center mb-4">
                <Download className="w-5 h-5 text-primary mr-3" />
                <h4 className="font-medium">Export Your Data</h4>
              </div>
              <p className="text-sm text-text/70 mb-4">
                Download a copy of all your financial data in JSON format.
                This includes all your transactions, goals, and settings.
              </p>
              <Button 
                variant="outline" 
                className="w-full border-primary/20 text-primary"
                onClick={exportData}
              >
                <Download className="w-4 h-4 mr-2" />
                Export Data
              </Button>
            </div>
            
            <div className="p-5 bg-background-dark/30 rounded-lg">
              <div className="flex items-center mb-4">
                <Trash2 className="w-5 h-5 text-red-400 mr-3" />
                <h4 className="font-medium">Delete All Data</h4>
              </div>
              <p className="text-sm text-text/70 mb-4">
                Permanently delete all your data from our servers.
                This action cannot be undone.
              </p>
              <Button 
                variant="destructive"
                className="w-full"
                onClick={() => setIsDeleteDialogOpen(true)}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete All Data
              </Button>
            </div>
          </div>
          
          <div className="mt-6 p-4 bg-accent/10 border border-accent/20 rounded-lg">
            <p className="text-sm">
              <span className="font-medium">Privacy Notice:</span> We respect your right to privacy and data control. 
              You can export or delete your data at any time. When you delete your data, it is permanently removed 
              from our servers within 30 days, in accordance with data protection regulations.
            </p>
          </div>
        </div>
      </div>
      
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent className="bg-background-light/95 backdrop-blur-xl border border-white/10">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-text">Delete All Data</AlertDialogTitle>
            <AlertDialogDescription className="text-text/70">
              This action cannot be undone. This will permanently delete all your financial data,
              including transactions, goals, and settings from our servers.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-background-dark text-text border-white/10">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction 
              className="bg-red-500 hover:bg-red-600 text-white"
              onClick={handleDeleteAllData}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
