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
  Lock
} from "lucide-react";
import { cn } from "@/lib/utils";

export default function MobileNav() {
  const [isOpen, setIsOpen] = useState(false);
  const [location] = useLocation();
  
  const toggleMenu = () => setIsOpen(!isOpen);
  
  const navItems = [
    { href: "/", icon: ChartPieIcon, label: "Dashboard" },
    { href: "/transactions", icon: CornerLeftUp, label: "Transactions" },
    { href: "/goals", icon: Target, label: "Goals" },
    { href: "/insights", icon: Lightbulb, label: "Insights" },
    { href: "/privacy", icon: ShieldCheck, label: "Privacy" },
  ];
  
  return (
    <>
      <div className="md:hidden fixed top-0 inset-x-0 z-50 bg-background-light/60 backdrop-blur-xl border-b border-white/10 px-4 py-3 flex items-center justify-between">
        <h1 className="font-display text-xl font-bold text-text flex items-center">
          <span className="text-accent mr-1">Fin</span>spire
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
          
          <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-white/10">
            <div className="flex items-center">
              <div className="w-10 h-10 rounded-full bg-primary/30 flex items-center justify-center mr-3">
                <span className="text-text font-medium">JS</span>
              </div>
              <div>
                <h4 className="font-medium">Jamie Smith</h4>
                <p className="text-xs text-text/70">Premium Plan</p>
              </div>
              <button className="ml-auto text-text/50">
                <Settings className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
