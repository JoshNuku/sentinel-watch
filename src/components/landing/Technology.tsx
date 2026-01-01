import { motion } from "framer-motion";
import { Cpu, Battery, Wifi, Camera, Mic, Thermometer } from "lucide-react";

const specs = [
  { icon: Cpu, label: "MindSpore AI", value: "On-device processing" },
  { icon: Battery, label: "Battery Life", value: "6+ months" },
  { icon: Wifi, label: "Connectivity", value: "4G LTE / Satellite" },
  { icon: Camera, label: "Camera", value: "4K Night Vision" },
  { icon: Mic, label: "Audio", value: "Acoustic Detection" },
  { icon: Thermometer, label: "Operating Temp", value: "-10°C to 60°C" },
];

const Technology = () => {
  return (
    <section id="technology" className="py-24 relative">
      <div className="absolute inset-0 bg-gradient-radial opacity-30" />
      
      {/* Environmental damage context background */}
      <div className="absolute inset-0 opacity-5">
        <img 
          src="/images/environmental-damage.svg" 
          alt="" 
          className="w-full h-full object-cover"
        />
      </div>
      
      <div className="container mx-auto px-6 relative z-10">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
          >
            <span className="text-primary text-sm font-medium tracking-widest uppercase">
              Technology
            </span>
            <h2 className="text-4xl md:text-5xl font-bold mt-4 mb-6">
              The <span className="text-gradient">Sentinel</span> Unit
            </h2>
            <p className="text-muted-foreground text-lg mb-8 leading-relaxed">
              Each Sentinel is a ruggedized, solar-powered surveillance node designed to 
              withstand Ghana's tropical climate while remaining virtually undetectable.
            </p>
            
            <div className="grid grid-cols-2 gap-4">
              {specs.map((spec, index) => (
                <motion.div
                  key={spec.label}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: index * 0.1 }}
                  viewport={{ once: true }}
                  className="glass rounded-xl p-4"
                >
                  <spec.icon className="h-5 w-5 text-primary mb-2" />
                  <p className="text-sm text-muted-foreground">{spec.label}</p>
                  <p className="font-semibold">{spec.value}</p>
                </motion.div>
              ))}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="relative"
          >
            <div className="aspect-square rounded-3xl bg-card border border-border overflow-hidden relative">
              {/* Background with forest and mining context */}
              <div className="absolute inset-0 bg-gradient-to-br from-card via-card to-primary/5" />
              
              {/* Ghana mining threat overlay */}
              <div className="absolute bottom-0 right-0 w-3/4 h-3/4 opacity-20">
                <img 
                  src="/images/ghana-mining-threat.svg" 
                  alt="" 
                  className="w-full h-full object-contain"
                />
              </div>
              
              {/* Sentinel surveillance visualization */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="relative">
                  {/* Radar animation */}
                  <div className="w-64 h-64 rounded-full border border-primary/30 animate-pulse-glow" />
                  <div className="absolute inset-8 w-48 h-48 rounded-full border border-primary/50" />
                  <div className="absolute inset-16 w-32 h-32 rounded-full border border-primary/70" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center">
                      <div className="w-8 h-8 rounded-full bg-primary animate-pulse" />
                    </div>
                  </div>
                  
                  {/* Scanning line */}
                  <motion.div
                    className="absolute inset-0 origin-center"
                    animate={{ rotate: 360 }}
                    transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                  >
                    <div className="w-1/2 h-0.5 bg-gradient-to-r from-primary to-transparent absolute top-1/2 left-1/2" />
                  </motion.div>
                  
                  {/* Detection indicators */}
                  <motion.div
                    className="absolute top-1/4 right-1/4 w-3 h-3 rounded-full bg-warning"
                    animate={{ scale: [1, 1.5, 1], opacity: [0.5, 1, 0.5] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  />
                  <motion.div
                    className="absolute bottom-1/3 left-1/4 w-2 h-2 rounded-full bg-primary"
                    animate={{ scale: [1, 1.3, 1], opacity: [0.6, 1, 0.6] }}
                    transition={{ duration: 2.5, repeat: Infinity, delay: 0.5 }}
                  />
                </div>
              </div>
              
              {/* Corner decorations */}
              <div className="absolute top-4 left-4 w-8 h-8 border-l-2 border-t-2 border-primary/50 rounded-tl-lg" />
              <div className="absolute top-4 right-4 w-8 h-8 border-r-2 border-t-2 border-primary/50 rounded-tr-lg" />
              <div className="absolute bottom-4 left-4 w-8 h-8 border-l-2 border-b-2 border-primary/50 rounded-bl-lg" />
              <div className="absolute bottom-4 right-4 w-8 h-8 border-r-2 border-b-2 border-primary/50 rounded-br-lg" />
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default Technology;
