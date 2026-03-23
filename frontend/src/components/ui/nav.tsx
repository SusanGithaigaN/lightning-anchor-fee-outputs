import React from 'react'
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Zap, ArrowRight } from "lucide-react";

const Nav = () => {
  return (
   <>   
         <nav className="sticky top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-md">
           <div className="container max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
             <div className="flex items-center gap-2">
               <div className="flex items-center justify-center h-8 w-8 rounded-md bg-primary/10">
                 <Zap className="h-5 w-5 text-primary" />
               </div>
               <span className="font-bold text-lg tracking-tight">Lightning Fee Bumper</span>
             </div>
             <div className="flex items-center gap-3">
               <ThemeToggle />
               <Button asChild size="sm">
                 <Link to="/app">Get Started</Link>
               </Button>
             </div>
           </div>
         </nav>
   </>
  )
}
export default Nav;