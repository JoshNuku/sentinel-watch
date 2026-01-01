import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight, Shield, Eye, TreePine } from "lucide-react";
import { motion } from "framer-motion";

const Hero = () => {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-20">
      {/* Forest background layer */}
      <div className="absolute inset-0">
        <img 
          src="/images/forest-pattern.svg" 
          alt="" 
          className="w-full h-full object-cover opacity-40"
        />
      </div>
      
      {/* Background effects */}
      <div className="absolute inset-0 bg-gradient-dark opacity-80" />
      <div className="absolute inset-0 bg-gradient-radial" />
      
      {/* Animated grid overlay */}
      <div className="absolute inset-0 opacity-10">
        <div 
          className="absolute inset-0"
          style={{
            backgroundImage: `linear-gradient(hsl(var(--primary) / 0.1) 1px, transparent 1px),
                              linear-gradient(90deg, hsl(var(--primary) / 0.1) 1px, transparent 1px)`,
            backgroundSize: '60px 60px',
          }}
        />
      </div>

      {/* Floating elements - trees and protection indicators */}
      <motion.div 
        className="absolute top-1/4 left-1/4 w-2 h-2 bg-primary rounded-full"
        animate={{ 
          y: [0, -20, 0],
          opacity: [0.5, 1, 0.5]
        }}
        transition={{ duration: 3, repeat: Infinity }}
      />
      <motion.div 
        className="absolute top-1/3 right-1/4 w-3 h-3 bg-primary/50 rounded-full"
        animate={{ 
          y: [0, 15, 0],
          opacity: [0.3, 0.8, 0.3]
        }}
        transition={{ duration: 4, repeat: Infinity, delay: 1 }}
      />
      <motion.div 
        className="absolute bottom-1/3 left-1/3 w-1.5 h-1.5 bg-primary/70 rounded-full"
        animate={{ 
          y: [0, -15, 0],
          opacity: [0.4, 0.9, 0.4]
        }}
        transition={{ duration: 3.5, repeat: Infinity, delay: 0.5 }}
      />
      
      {/* Additional forest indicators */}
      <motion.div
        className="absolute top-1/2 left-1/6"
        animate={{ 
          scale: [1, 1.2, 1],
          opacity: [0.3, 0.6, 0.3]
        }}
        transition={{ duration: 4, repeat: Infinity, delay: 1.5 }}
      >
        <TreePine className="h-6 w-6 text-primary/40" />
      </motion.div>
      <motion.div
        className="absolute bottom-1/4 right-1/5"
        animate={{ 
          scale: [1, 1.2, 1],
          opacity: [0.3, 0.6, 0.3]
        }}
        transition={{ duration: 3.5, repeat: Infinity, delay: 0.8 }}
      >
        <TreePine className="h-5 w-5 text-primary/30" />
      </motion.div>

      <div className="container mx-auto px-6 relative z-10">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <div className="flex items-center justify-center gap-2 mb-6">
              <div className="h-px w-12 bg-gradient-to-r from-transparent to-primary" />
              <span className="text-primary text-sm font-medium tracking-widest uppercase">
                Environmental Protection System
              </span>
              <div className="h-px w-12 bg-gradient-to-l from-transparent to-primary" />
            </div>

            <h1 className="text-5xl md:text-7xl font-bold mb-6 leading-tight">
              The Forest is{" "}
              <span className="text-gradient">Watching.</span>
            </h1>

            <p className="text-xl md:text-2xl text-muted-foreground mb-10 max-w-2xl mx-auto leading-relaxed">
              Project ORION is an autonomous surveillance network using AI to protect 
              Ghana's vital ecosystems from illegal mining.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            <Link to="/dashboard">
              <Button variant="hero" size="xl" className="group">
                Go to Dashboard
                <ArrowRight className="transition-transform group-hover:translate-x-1" />
              </Button>
            </Link>
            <Button 
              variant="outline" 
              size="xl"
              onClick={() => {
                const element = document.getElementById("features");
                element?.scrollIntoView({ behavior: "smooth" });
              }}
            >
              Learn More
            </Button>
          </motion.div>

          {/* Stats row */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.6 }}
            className="grid grid-cols-3 gap-8 mt-20 pt-12 border-t border-border/50"
          >
            <div className="text-center">
              <div className="flex items-center justify-center gap-2 mb-2">
                <Shield className="h-5 w-5 text-primary" />
                <span className="text-3xl font-bold">24/7</span>
              </div>
              <p className="text-sm text-muted-foreground">Active Monitoring</p>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center gap-2 mb-2">
                <Eye className="h-5 w-5 text-primary" />
                <span className="text-3xl font-bold">99.9%</span>
              </div>
              <p className="text-sm text-muted-foreground">Detection Accuracy</p>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center gap-2 mb-2">
                <TreePine className="h-5 w-5 text-primary" />
                <span className="text-3xl font-bold">50K+</span>
              </div>
              <p className="text-sm text-muted-foreground">Hectares Protected</p>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
