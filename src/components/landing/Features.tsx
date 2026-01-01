import { BrainCircuit, Sun, MapPin } from "lucide-react";
import { motion } from "framer-motion";

const features = [
  {
    icon: BrainCircuit,
    title: "AI-Powered Detection",
    description: "On-device MindSpore AI identifies threats in real-time, eliminating false alarms with 99.9% accuracy."
  },
  {
    icon: Sun,
    title: "Autonomous & Covert",
    description: "Solar-powered, camouflaged Sentinels operate for months without intervention in remote locations."
  },
  {
    icon: MapPin,
    title: "Instant, Verified Alerts",
    description: "Receive immediate SMS and dashboard alerts with precise GPS locations and on-demand video."
  }
];

const Features = () => {
  return (
    <section id="features" className="py-24 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-radial opacity-50" />
      
      {/* Decorative forest elements in background */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute top-0 left-0 w-full h-full">
          <svg className="w-full h-full" viewBox="0 0 1920 800" preserveAspectRatio="none">
            <path d="M0,400 Q480,300 960,400 T1920,400 L1920,800 L0,800 Z" fill="currentColor" className="text-primary" />
          </svg>
        </div>
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
            Capabilities
          </span>
          <h2 className="text-4xl md:text-5xl font-bold mt-4 mb-6">
            Intelligent <span className="text-gradient">Protection</span>
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Our Sentinel network combines cutting-edge AI with robust hardware 
            designed for Ghana's challenging terrain.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-6 md:gap-8">
          {features.map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: index * 0.2 }}
              viewport={{ once: true }}
              className="group"
            >
              <div className="relative p-6 md:p-8 h-full rounded-xl border border-border/40 bg-card/30 hover:border-primary/30 transition-all duration-300 hover:shadow-lg hover:shadow-primary/10">
                {/* Icon */}
                <div className="w-12 h-12 rounded-lg border border-primary/30 bg-primary/5 flex items-center justify-center mb-6 group-hover:border-primary/50 group-hover:bg-primary/10 transition-all">
                  <feature.icon className="h-5 w-5 text-primary" />
                </div>
                
                <h3 className="text-lg font-semibold mb-2 text-foreground">{feature.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  {feature.description}
                </p>
                
                {/* Hover effect indicator */}
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-primary to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Features;
