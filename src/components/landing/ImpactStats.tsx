import { motion } from "framer-motion";
import { TreePine, Mountain, Waves, Shield } from "lucide-react";

const ImpactStats = () => {
  const stats = [
    { icon: TreePine, label: "Forest Area Monitored", value: "50,000+", unit: "hectares" },
    { icon: Mountain, label: "Protected Zones", value: "12", unit: "regions" },
    { icon: Waves, label: "Water Bodies Secured", value: "8", unit: "rivers" },
    { icon: Shield, label: "Threats Detected", value: "245", unit: "incidents" }
  ];

  return (
    <section className="py-16 relative overflow-hidden">
      {/* Background elements */}
      <div className="absolute inset-0 bg-gradient-to-b from-card/20 to-transparent" />
      
      {/* Ghana river background */}
      <div className="absolute inset-0 opacity-15">
        <img 
          src="/images/ghana-river.svg" 
          alt="" 
          className="w-full h-full object-cover"
        />
      </div>
      
      <div className="container mx-auto px-6 relative z-10">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
          {stats.map((stat, index) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              viewport={{ once: true }}
              className="relative group"
            >
              <div className="glass rounded-2xl p-6 text-center hover:border-primary/30 transition-all duration-300">
                <div className="w-12 h-12 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center mx-auto mb-4">
                  <stat.icon className="h-6 w-6 text-primary" />
                </div>
                <div className="text-3xl font-bold mb-1 text-gradient">{stat.value}</div>
                <div className="text-xs text-muted-foreground uppercase tracking-wide">{stat.unit}</div>
                <div className="text-sm text-muted-foreground mt-2 leading-tight">{stat.label}</div>
              </div>
              
              {/* Hover glow effect */}
              <div className="absolute inset-0 rounded-2xl bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity -z-10 blur-xl" />
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default ImpactStats;
