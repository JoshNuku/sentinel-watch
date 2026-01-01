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
    <section id="features" className="py-24 relative">
      <div className="absolute inset-0 bg-gradient-radial opacity-50" />
      
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
              <div className="relative p-6 md:p-8 h-full rounded-xl border border-border/40 bg-card/30 hover:border-primary/30 transition-all duration-300">
                {/* Icon */}
                <div className="w-12 h-12 rounded-lg border border-primary/30 bg-primary/5 flex items-center justify-center mb-6">
                  <feature.icon className="h-5 w-5 text-primary" />
                </div>
                
                <h3 className="text-lg font-semibold mb-2 text-foreground">{feature.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  {feature.description}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Features;
