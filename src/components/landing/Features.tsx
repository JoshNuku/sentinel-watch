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

        <div className="grid md:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: index * 0.2 }}
              viewport={{ once: true }}
              className="group"
            >
              <div className="glass rounded-2xl p-8 h-full transition-all duration-300 hover:border-primary/50 hover:shadow-glow">
                <div className="relative mb-6">
                  <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                    <feature.icon className="h-7 w-7 text-primary" />
                  </div>
                  <div className="absolute inset-0 bg-primary/20 blur-2xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
                
                <h3 className="text-xl font-semibold mb-3">{feature.title}</h3>
                <p className="text-muted-foreground leading-relaxed">
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
