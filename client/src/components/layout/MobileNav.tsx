import { useState } from "react";
import { useLocation, Link } from "wouter";
import { 
  Menu, 
  X, 
  ChartPieIcon, 
  CornerLeftUp, 
  Target, 
  Lightbulb, 
  ShieldCheck,
  Settings,
  Lock,
  LogOut
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";

export default function MobileNav() {
  const [isOpen, setIsOpen] = useState(false);
  const [location] = useLocation();
  const { user, logoutMutation } = useAuth();
  
  const toggleMenu = () => setIsOpen(!isOpen);
  
  const navItems = [
    { href: "/", icon: ChartPieIcon, label: "Dashboard" },
    { href: "/transactions", icon: CornerLeftUp, label: "Transactions" },
    { href: "/goals", icon: Target, label: "Goals" },
    { href: "/insights", icon: Lightbulb, label: "Insights" },
    { href: "/privacy", icon: ShieldCheck, label: "Privacy" },
  ];
  
  const handleLogout = () => {
    logoutMutation.mutate();
    setIsOpen(false);
  };
  
  // Get user initials for avatar
  const getUserInitials = () => {
    if (!user || !user.username) return "U";
    return user.username.substring(0, 2).toUpperCase();
  };
  
  return (
    <>
      <div className="md:hidden fixed top-0 inset-x-0 z-50 bg-background-light/60 backdrop-blur-xl border-b border-white/10 px-4 py-3 flex items-center justify-between">
        <h1 className="font-display text-xl font-bold text-text flex items-center">
          <span className="text-accent mr-1">Fin</span>Track
        </h1>
        <button 
          className="w-10 h-10 rounded-full bg-background-light/60 backdrop-blur-xl border border-white/10 flex items-center justify-center"
          onClick={toggleMenu}
        >
          {isOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>
      
      {isOpen && (
        <div className="md:hidden fixed inset-0 z-40 bg-background-dark/95 pt-16">
          <nav className="px-4 py-2">
            <ul className="space-y-2">
              {navItems.map((item) => (
                <li key={item.href}>
                  <Link href={item.href}>
                    <a 
                      className={cn(
                        "flex items-center p-3 rounded-xl transition-colors",
                        location === item.href
                          ? "text-accent bg-accent/10 font-medium"
                          : "text-text/80 hover:bg-white/5"
                      )}
                      onClick={() => setIsOpen(false)}
                    >
                      <item.icon className="w-5 h-5 mr-3" />
                      {item.label}
                    </a>
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
          
          <div className="p-4 mx-4 mt-4 bg-background-light/60 backdrop-blur-xl border border-white/10 shadow-lg rounded-xl">
            <div className="flex items-center mb-3">
              <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center mr-3">
                <Lock className="w-4 h-4" />
              </div>
              <div>
                <h4 className="font-medium text-sm">Data Security</h4>
                <p className="text-xs text-text/70">
                  {user?.dataEncryptionEnabled ? "Encryption enabled" : "Encryption disabled"}
                </p>
              </div>
            </div>
            <Link href="/privacy">
              <a 
                className="text-xs w-full py-2 rounded bg-secondary/20 text-secondary flex justify-center"
                onClick={() => setIsOpen(false)}
              >
                Manage Privacy
              </a>
            </Link>
          </div>
          
          <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-white/10">
            <div className="flex items-center">
              <div className="w-10 h-10 rounded-full bg-primary/30 flex items-center justify-center mr-3">
                <span className="text-text font-medium">{getUserInitials()}</span>
              </div>
              <div>
                <h4 className="font-medium">{user?.username || "User"}</h4>
                <p className="text-xs text-text/70">
                  {user?.email || "No email provided"}
                </p>
              </div>
              <div className="ml-auto flex gap-1">
                <Button 
                  size="icon" 
                  variant="ghost" 
                  className="h-8 w-8 text-text/50 hover:text-text"
                  onClick={handleLogout}
                  disabled={logoutMutation.isPending}
                  title="Logout"
                >
                  <LogOut className="h-4 w-4" />
                </Button>
                <Button 
                  size="icon" 
                  variant="ghost" 
                  className="h-8 w-8 text-text/50 hover:text-text"
                  title="Settings"
                >
                  <Settings className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
