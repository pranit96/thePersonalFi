import { useState } from "react";
import { Calendar, Download } from "lucide-react";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";

interface HeaderProps {
  title: string;
  subtitle?: string;
}

export default function Header({ title, subtitle }: HeaderProps) {
  const [timeRange, setTimeRange] = useState("30");
  
  return (
    <header className="py-6 md:py-8">
      <div className="flex flex-col md:flex-row justify-between md:items-center mb-8">
        <div>
          <h1 className="font-display text-2xl md:text-3xl font-bold mb-2">{title}</h1>
          {subtitle && <p className="text-text/70">{subtitle}</p>}
        </div>
        <div className="mt-4 md:mt-0 flex space-x-2">
          <div className="bg-background-light/60 backdrop-blur-xl border border-white/10 shadow-lg rounded-lg flex items-center px-3 py-2">
            <Calendar className="w-4 h-4 mr-2 text-text/70" />
            <Select value={timeRange} onValueChange={setTimeRange}>
              <SelectTrigger className="bg-transparent border-0 p-0 shadow-none h-auto">
                <SelectValue placeholder="Select time range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="30">Last 30 days</SelectItem>
                <SelectItem value="month">This month</SelectItem>
                <SelectItem value="quarter">Last 3 months</SelectItem>
                <SelectItem value="year">This year</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button 
            variant="outline" 
            className="bg-background-light/60 backdrop-blur-xl border border-white/10 shadow-lg rounded-lg"
          >
            <Download className="w-4 h-4 mr-2 text-secondary" />
            <span className="text-sm">Export</span>
          </Button>
        </div>
      </div>
    </header>
  );
}
