import { motion } from "framer-motion";
import { Radio, Eye, Bell } from "lucide-react";

const steps = [
  {
    number: "01",
    icon: Radio,
    title: "Detect",
    description: "Ground vibration sensors and acoustic detectors trigger the surveillance system when unusual activity is detected."
  },
  {
    number: "02",
    icon: Eye,
    title: "Verify",
    description: "MindSpore AI visually confirms the threat type—excavators, water pumps, or vehicles—with high accuracy."
  },
  {
    number: "03",
    icon: Bell,
    title: "Alert",
    description: "A verified notification with GPS coordinates and video is instantly sent to the dashboard and SMS to operators."
  }
];

const HowItWorks = () => {
  return (
    <section id="how-it-works" className="py-24 relative overflow-hidden">
      {/* Forest monitoring background */}
      <div className="absolute inset-0 opacity-8">
        <img 
          src="/images/forest-monitoring-night.svg" 
          alt="" 
          className="w-full h-full object-cover"
        />
      </div>
      
      {/* Overlay pattern */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute inset-0" style={{
          backgroundImage: `repeating-linear-gradient(45deg, transparent, transparent 35px, hsl(var(--primary)) 35px, hsl(var(--primary)) 36px)`
        }} />
      </div>
      
      <div className="container mx-auto px-6 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <span className="text-primary text-sm font-medium tracking-widest uppercase">
            Process
          </span>
          <h2 className="text-4xl md:text-5xl font-bold mt-4 mb-6">
            How <span className="text-gradient">ORION</span> Works
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            From detection to response in under 30 seconds
          </p>
        </motion.div>

        <div className="relative">
          {/* Connection line */}
          <div className="hidden md:block absolute top-1/2 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent" />
          
          <div className="grid md:grid-cols-3 gap-12 relative">
            {steps.map((step, index) => (
              <motion.div
                key={step.number}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.2 }}
                viewport={{ once: true }}
                className="text-center relative"
              >
                {/* Step number badge */}
                <div className="relative inline-block mb-8">
                  <div className="w-20 h-20 rounded-full bg-card border-2 border-primary/50 flex items-center justify-center mx-auto relative z-10">
                    <step.icon className="h-8 w-8 text-primary" />
                  </div>
                  <span className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-primary text-primary-foreground text-sm font-bold flex items-center justify-center">
                    {step.number.slice(1)}
                  </span>
                  <div className="absolute inset-0 bg-primary/20 blur-2xl rounded-full animate-pulse-glow" />
                </div>
                
                <h3 className="text-2xl font-bold mb-4">{step.title}</h3>
                <p className="text-muted-foreground leading-relaxed max-w-xs mx-auto">
                  {step.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;
